import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sessionApi } from '../services/sessionApi';
import { listStoredReports } from '../services/reportHistory';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [remoteHistory, localHistory] = await Promise.all([
          sessionApi.getHistory().catch(() => []),
          Promise.resolve(listStoredReports()),
        ]);

        const merged = [...remoteHistory, ...localHistory]
          .filter((item) => item && item.run_id)
          .map((item) => ({
            ...item,
            timestamp: item.timestamp || Date.now(),
          }))
          .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));

        const unique = merged.filter((item, index, array) => array.findIndex((candidate) => candidate.run_id === item.run_id) === index);

        setHistory(unique);
      } catch (err) {
        setError('Không thể tải lịch sử');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Lịch sử phân tích</h2>
      {loading && <p>Đang tải...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && (
        <div className="space-y-3">
          {history.length === 0 && <p>Chưa có lịch sử nào.</p>}
          {history.map((h, idx) => (
            <div key={h.run_id || idx} className="p-3 border rounded bg-white">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">Run: {h.run_id || '—'}</div>
                  <div className="text-sm text-gray-500">{h.status || 'completed'}</div>
                  {h.summary && <div className="text-sm text-gray-600 mt-1 line-clamp-2">{h.summary}</div>}
                </div>
                <div className="text-sm text-gray-600">{new Date(h.timestamp || Date.now()).toLocaleString()}</div>
              </div>
              <div className="mt-3 flex gap-2">
                <Link to={`/analysis?runId=${encodeURIComponent(h.run_id)}`} className="text-sm text-blue-600 hover:underline">
                  Mở báo cáo
                </Link>
                {h.request && <span className="text-sm text-gray-400">• {h.request}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
