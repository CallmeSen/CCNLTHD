import { Navigate, useSearchParams } from 'react-router-dom'

export default function AnalysisRedirect() {
  const [searchParams] = useSearchParams()
  const runId = searchParams.get('runId')

  if (runId) {
    return <Navigate to={`/report/${encodeURIComponent(runId)}`} replace />
  }

  return <Navigate to="/agent" replace />
}
