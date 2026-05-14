import { useEffect, useState } from 'react';
import { sessionApi } from '../services/sessionApi';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await sessionApi.getHistory();
        setHistory(data || []);
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
                  <div className="text-sm text-gray-500">{h.status}</div>
                </div>
                <div className="text-sm text-gray-600">{new Date(h.timestamp || Date.now()).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
