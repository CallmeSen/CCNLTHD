import { useState } from 'react';
import { sessionApi } from '../services/sessionApi';

export default function Analysis() {
  const [request, setRequest] = useState('');
  const [lang, setLang] = useState('vi');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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
          <pre className="whitespace-pre-wrap text-sm text-gray-800 mt-2">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
