import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  History as HistoryIcon,
  RefreshCw,
  Search,
} from 'lucide-react';
import { sessionApi } from '../services/sessionApi';
import { listStoredReports, type StoredReportEntry } from '../services/reportHistory';
import { formatAppDateTime, parseAppTimestamp } from '../lib/dateTime';
import { cn } from '../lib/utils';
import type { HistoryItem } from '../types/agent';

type HistoryRow = (HistoryItem | StoredReportEntry) & {
  run_id: string;
  timestamp: string | number;
  status?: string;
  request?: string;
  summary?: string;
  report?: string;
  source?: string;
};

function normalizeTimestamp(value: string | number | undefined) {
  return parseAppTimestamp(value);
}

function StatusBadge({ status = 'completed' }: { status?: string }) {
  const normalized = status.toLowerCase();
  const isComplete = normalized === 'completed' || normalized === 'done' || normalized === 'success';
  const isError = normalized === 'failed' || normalized === 'error';

  return (
    <span
      className={cn(
        'badge',
        isComplete && 'badge-success',
        isError && 'badge-error',
        !isComplete && !isError && 'badge-warning',
      )}
    >
      {isComplete && <CheckCircle2 className="w-3 h-3" />}
      {isError && <AlertCircle className="w-3 h-3" />}
      {!isComplete && !isError && <Clock className="w-3 h-3" />}
      {status}
    </span>
  );
}

async function loadHistory() {
  const [remoteHistory, localHistory] = await Promise.all([
    sessionApi.getHistory().catch(() => []),
    Promise.resolve(listStoredReports()),
  ]);

  const merged = [...remoteHistory, ...localHistory]
    .filter((item): item is HistoryRow => Boolean(item?.run_id))
    .map((item) => ({
      ...item,
      timestamp: item.timestamp || Date.now(),
      status: item.status || 'completed',
    }))
    .sort((a, b) => normalizeTimestamp(b.timestamp) - normalizeTimestamp(a.timestamp));

  return merged.filter(
    (item, index, array) => array.findIndex((candidate) => candidate.run_id === item.run_id) === index,
  );
}

export default function HistoryPage() {
  const [search, setSearch] = useState('');
  const { data: history = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['analysis-history'],
    queryFn: loadHistory,
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return history;
    return history.filter((item) =>
      [item.run_id, item.request, item.summary, item.report]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [history, search]);

  const stats = {
    total: history.length,
    completed: history.filter((item) => item.status === 'completed').length,
    failed: history.filter((item) => item.status === 'failed' || item.status === 'error').length,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Lịch sử báo cáo</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Các báo cáo phân tích danh mục được tạo bởi hệ thống multi-agent
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 animate-slide-up">
        {[
          { label: 'Tổng', value: stats.total, color: 'bg-primary/10 text-primary' },
          { label: 'Hoàn tất', value: stats.completed, color: 'bg-success/10 text-success' },
          { label: 'Lỗi', value: stats.failed, color: 'bg-danger/10 text-danger' },
        ].map((item) => (
          <div key={item.label} className="card p-5 flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', item.color)}>
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="stat-value">{item.value}</p>
              <p className="stat-label">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4 flex items-center gap-4 animate-slide-up">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Tìm theo yêu cầu, run id hoặc nội dung..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-ghost" title="Làm mới">
          <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
        </button>
      </div>

      {isLoading ? (
        <div className="card p-12 flex flex-col items-center justify-center gap-3">
          <HistoryIcon className="w-8 h-8 text-primary animate-pulse" />
          <p className="text-muted-foreground font-medium">Đang tải lịch sử...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <HistoryIcon className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-foreground font-semibold">Không tìm thấy báo cáo</p>
          <p className="text-muted-foreground text-sm">
            {search ? 'Thử từ khóa khác' : 'Gửi một yêu cầu phân tích trong Chat AI để tạo báo cáo đầu tiên'}
          </p>
          {!search && (
            <Link to="/agent" className="btn-primary mt-2 text-sm">
              Mở Chat AI
            </Link>
          )}
        </div>
      ) : (
        <div className="card divide-y divide-border overflow-hidden animate-slide-up">
          {filtered.map((item) => (
            <Link
              key={item.run_id}
              to={`/report/${encodeURIComponent(item.run_id)}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-all duration-200 group"
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  item.status === 'completed' && 'bg-success/10',
                  (item.status === 'failed' || item.status === 'error') && 'bg-danger/10',
                  item.status !== 'completed' && item.status !== 'failed' && item.status !== 'error' && 'bg-muted',
                )}
              >
                {item.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : item.status === 'failed' || item.status === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-danger" />
                ) : (
                  <Clock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {item.request || item.summary || item.run_id}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground font-mono">{item.run_id}</span>
                  <span className="text-muted-foreground/30">•</span>
                  <span className="text-xs text-muted-foreground">
                    {formatAppDateTime(normalizeTimestamp(item.timestamp))}
                  </span>
                  {item.source && <span className="badge badge-neutral">{item.source}</span>}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={item.status} />
                <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
