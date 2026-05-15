import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { sessionApi } from '../services/sessionApi';
import PortfolioReport from '../components/chat/PortfolioReport';

export default function Analysis() {
  const [request, setRequest] = useState('');
  const [lang, setLang] = useState('vi');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!request.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await sessionApi.analyze({ request, lang });
      setResult(res);
    } catch (err) {
      setError('Phân tích thất bại');
    } finally {
      setLoading(false);
    }
  };

  // If a runId is provided in the query params, fetch the report
  useEffect(() => {
    const runId = searchParams.get('runId');
    if (!runId) return;

    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        // If runId looks like a local fallback, try to read from localStorage first
        if (runId.startsWith('local-')) {
          const stored = localStorage.getItem(`agent-report-${runId}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (mounted) setResult(parsed);
            return;
          }
        }

        const res = await sessionApi.getReport(runId);
        if (mounted) setResult(res);
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to load report:', err);
        setError('Không thể tải báo cáo.');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Phân tích Portfolio</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="Mô tả yêu cầu phân tích..."
          className="w-full p-3 border rounded h-32"
        />
        <div className="flex items-center gap-3">
          <label className="text-sm">Ngôn ngữ:</label>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="p-2 border rounded">
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
          <button type="submit" className="ml-auto px-4 py-2 bg-blue-500 text-white rounded">{loading ? 'Đang...' : 'Phân tích'}</button>
        </div>
      </form>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {result && (
        <div className="mt-6 p-4 border rounded bg-white">
          <h3 className="font-semibold">Kết quả</h3>
          {/* If report content exists, render PortfolioReport nicely */}
          {result.report || result.final_report ? (
            <div className="mt-3">
              <PortfolioReport content={result.report || result.final_report} />
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-gray-800 mt-2">{JSON.stringify(result, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}
