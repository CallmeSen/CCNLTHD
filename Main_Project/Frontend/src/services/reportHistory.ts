const HISTORY_INDEX_KEY = 'agent-report-history';
const REPORT_PREFIX = 'agent-report-';

export interface StoredReportEntry {
  run_id: string;
  timestamp: number;
  status?: string;
  request?: string;
  report?: string;
  final_report?: string;
  summary?: string;
  metrics?: Record<string, any> | null;
  user_profile?: Record<string, any> | null;
  proposed_portfolio?: Record<string, number> | null;
  validation_result?: Record<string, any> | null;
  llm_commentary?: string | null;
  market_news?: string | null;
  visualization_url?: string | null;
  source?: 'chat' | 'analysis' | 'backend';
}

function readIndex(): StoredReportEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredReportEntry[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(entries: StoredReportEntry[]) {
  try {
    localStorage.setItem(HISTORY_INDEX_KEY, JSON.stringify(entries.slice(0, 50)));
  } catch {
    // ignore storage errors
  }
}

export function saveReportHistory(entry: StoredReportEntry) {
  try {
    const normalized: StoredReportEntry = {
      ...entry,
      timestamp: entry.timestamp || Date.now(),
    };

    localStorage.setItem(`${REPORT_PREFIX}${normalized.run_id}`, JSON.stringify(normalized));

    const current = readIndex().filter((item) => item.run_id !== normalized.run_id);
    current.unshift(normalized);
    writeIndex(current);
  } catch {
    // ignore storage errors
  }
}

export function getStoredReport(runId: string): StoredReportEntry | null {
  try {
    const legacy = localStorage.getItem(`${REPORT_PREFIX}${runId}`);
    if (legacy) {
      return JSON.parse(legacy) as StoredReportEntry;
    }

    const found = readIndex().find((item) => item.run_id === runId);
    return found || null;
  } catch {
    return null;
  }
}

export function listStoredReports(): StoredReportEntry[] {
  return readIndex();
}