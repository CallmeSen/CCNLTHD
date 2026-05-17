export interface MarketNewsItem {
  url: string;
  title: string;
  content: string;
  score?: number;
}

export type MarketNewsContentSegment =
  | { type: 'markdown'; content: string }
  | { type: 'market-news'; items: MarketNewsItem[] };

function findBalancedEnd(text: string, start: number, openChar: string, closeChar: string) {
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '\'' || char === '"') {
      quote = char;
    } else if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }

  return null;
}

function parseQuotedValue(text: string, start: number) {
  const quote = text[start];
  let value = '';
  let escaped = false;

  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      if (char === 'n') value += '\n';
      else if (char === 'r') value += '\r';
      else if (char === 't') value += '\t';
      else value += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === quote) return value;
    value += char;
  }

  return '';
}

function readObjectValue(objectText: string, key: string) {
  const keyPattern = new RegExp(`['"]${key}['"]\\s*:`);
  const match = keyPattern.exec(objectText);
  if (!match) return '';

  let index = match.index + match[0].length;
  while (index < objectText.length && /\s/.test(objectText[index])) index += 1;

  if (objectText[index] === '\'' || objectText[index] === '"') {
    return parseQuotedValue(objectText, index).trim();
  }

  const end = objectText.slice(index).search(/[,}\]]/);
  return objectText.slice(index, end === -1 ? undefined : index + end).trim();
}

function normalizeNewsItem(item: unknown): MarketNewsItem | null {
  const record = item as Partial<MarketNewsItem> | null | undefined;
  const url = String(record?.url || '').trim();
  if (!url) return null;

  return {
    url,
    title: String(record?.title || url).trim(),
    content: String(record?.content || '').trim(),
    score: typeof record?.score === 'number' ? record.score : undefined,
  };
}

function extractTopLevelObjects(listText: string) {
  const objects: string[] = [];
  let index = 0;

  while (index < listText.length) {
    if (listText[index] !== '{') {
      index += 1;
      continue;
    }

    const end = findBalancedEnd(listText, index, '{', '}');
    if (!end) break;
    objects.push(listText.slice(index, end));
    index = end;
  }

  return objects;
}

export function parseMarketNewsItems(payload: string): MarketNewsItem[] {
  const resultsMatch = /['"]results['"]\s*:/.exec(payload);
  if (!resultsMatch) return [];

  const listStart = payload.indexOf('[', resultsMatch.index + resultsMatch[0].length);
  if (listStart === -1) return [];

  const listEnd = findBalancedEnd(payload, listStart, '[', ']');
  if (!listEnd) return [];

  return extractTopLevelObjects(payload.slice(listStart, listEnd))
    .map((objectText) => {
      const url = readObjectValue(objectText, 'url');
      if (!url) return null;
      const score = Number(readObjectValue(objectText, 'score'));

      return {
        url,
        title: readObjectValue(objectText, 'title') || url,
        content: readObjectValue(objectText, 'content'),
        score: Number.isFinite(score) ? score : undefined,
      };
    })
    .filter((item): item is MarketNewsItem => Boolean(item));
}

export function parseMarketNewsField(raw: unknown): MarketNewsItem[] {
  if (!raw || typeof raw !== 'string') return [];

  try {
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : parsed?.results;
    if (Array.isArray(items)) {
      return items.map(normalizeNewsItem).filter((item): item is MarketNewsItem => Boolean(item));
    }
  } catch {
    // Some agent tools return Python-style dict text instead of JSON.
  }

  return parseMarketNewsItems(raw);
}

function findPayloadStart(content: string, resultsIndex: number) {
  const lineStart = content.lastIndexOf('\n', resultsIndex) + 1;
  const lineBrace = content.indexOf('{', lineStart);
  if (lineBrace !== -1 && lineBrace < resultsIndex) return lineBrace;
  return content.lastIndexOf('{', resultsIndex);
}

export function parseContentWithMarketNews(content: string) {
  const segments: MarketNewsContentSegment[] = [];
  const newsItems: MarketNewsItem[] = [];
  const resultsPattern = /['"]results['"]\s*:/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = resultsPattern.exec(content))) {
    const payloadStart = findPayloadStart(content, match.index);
    if (payloadStart < cursor) continue;

    const payloadEnd = findBalancedEnd(content, payloadStart, '{', '}');
    if (!payloadEnd) continue;

    const payload = content.slice(payloadStart, payloadEnd);
    const items = parseMarketNewsItems(payload);
    if (items.length === 0) continue;

    const before = content.slice(cursor, payloadStart).trimEnd();
    if (before) segments.push({ type: 'markdown', content: before });
    segments.push({ type: 'market-news', items });
    newsItems.push(...items);
    cursor = payloadEnd;
    resultsPattern.lastIndex = payloadEnd;
  }

  const rest = content.slice(cursor).trimStart();
  if (rest) segments.push({ type: 'markdown', content: rest });

  return {
    segments: segments.length > 0 ? segments : [{ type: 'markdown', content } satisfies MarketNewsContentSegment],
    newsItems,
  };
}

export function dedupeNewsItems(items: MarketNewsItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}
