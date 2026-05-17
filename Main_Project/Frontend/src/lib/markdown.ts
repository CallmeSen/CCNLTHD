function getPipeCells(row: string) {
  const trimmed = row.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return [];
  return trimmed
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function isSeparatorRow(rowText: string): boolean {
  const cells = getPipeCells(rowText);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function findInlineTableHeader(text: string, separatorStart: number, columnCount: number) {
  const lineStart = text.lastIndexOf('\n', separatorStart) + 1;

  for (let index = separatorStart - 1; index >= lineStart; index -= 1) {
    if (text[index] !== '|') continue;

    const row = text.slice(index, separatorStart).trim();
    const cells = getPipeCells(row);

    if (cells.length === columnCount) {
      return { row, start: index };
    }

    if (cells.length > columnCount) {
      const lastCells = cells.slice(-columnCount);
      const lastCellStr = lastCells.join(' | ');
      const lastCellStart = row.lastIndexOf(lastCellStr);
      const adjustedStart = index + lastCellStart;
      const adjustedRow = '| ' + lastCells.join(' | ') + ' |';
      return { row: adjustedRow, start: adjustedStart };
    }
  }

  return null;
}

function readPipeRow(text: string, start: number, columnCount: number) {
  let pipeCount = 0;

  for (let index = start; index < text.length; index += 1) {
    if (text[index] !== '|') continue;

    pipeCount += 1;
    if (pipeCount !== columnCount + 1) continue;

    const row = text.slice(start, index + 1);
    const cells = getPipeCells(row);

    if (cells.length !== columnCount) continue;

    if (isSeparatorRow(row.trim())) {
      return { row: row.trim(), end: index + 1, isSeparator: true };
    }

    return { row: row.trim(), end: index + 1 };
  }

  return null;
}

export function normalizeInlineMarkdownTables(content: string) {
  const separatorPattern = /\|\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|/g;
  let normalized = '';
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = separatorPattern.exec(content))) {
    const separator = match[0].trim();
    const columnCount = getPipeCells(separator).length;
    const header = findInlineTableHeader(content, match.index, columnCount);
    if (!header || header.start < cursor) {
      separatorPattern.lastIndex = match.index + match[0].length;
      continue;
    }

    const rows: string[] = [];
    let rowCursor = match.index + match[0].length;

    while (rowCursor < content.length) {
      while (rowCursor < content.length && /\s/.test(content[rowCursor])) rowCursor += 1;
      if (content[rowCursor] !== '|') break;

      const row = readPipeRow(content, rowCursor, columnCount);
      if (!row) break;

      if (row.isSeparator) {
        rowCursor = row.end;
        continue;
      }

      rows.push(row.row);
      rowCursor = row.end;
    }

    const before = content.slice(cursor, header.start).trimEnd();
    if (before) normalized += `${before}\n\n`;
    normalized += [header.row, separator, ...rows].join('\n');
    cursor = rowCursor;
    separatorPattern.lastIndex = rowCursor;

    if (cursor < content.length && content[cursor] && content[cursor] !== '\n') {
      normalized += '\n\n';
    }
  }

  return cursor === 0 ? content : normalized + content.slice(cursor).trimStart();
}
