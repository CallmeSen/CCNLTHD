import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { sessionApi } from '../services/sessionApi';
import PortfolioReport from '../components/chat/PortfolioReport';
import { getStoredReport } from '../services/reportHistory';

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
        const stored = getStoredReport(runId);
        if (stored) {
          if (mounted) {
            setResult(stored);
          }
          return;
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
      <h1 className="text-black!">Phân tích chi tiết </h1>

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
