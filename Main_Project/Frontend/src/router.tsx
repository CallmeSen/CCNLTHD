import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";

const Layout = lazy(() => import("@/components/layout/Layout"));

const Home = lazy(() => import("@/pages/Home"));
const Dashboard = lazy(() => import("@/pages/DashboardPage"));
const Agent = lazy(() => import("@/pages/Agent"));
const Analysis = lazy(() => import("@/pages/Analysis"));
const Report = lazy(() => import("@/pages/Report"));
const History = lazy(() => import("@/pages/History"));
const Settings = lazy(() => import("@/pages/Settings"));
const RunDetail = lazy(() => import("@/pages/RunDetail"));
const Compare = lazy(() => import("@/pages/Compare"));
const Correlation = lazy(() => import("@/pages/Correlation"));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <Layout />
      </Suspense>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Home />
          </Suspense>
        ),
      },
      {
        path: "dashboard",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: "agent",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Agent />
          </Suspense>
        ),
      },
      {
        path: "analysis",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Analysis />
          </Suspense>
        ),
      },
      {
        path: "history",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <History />
          </Suspense>
        ),
      },
      {
        path: "report/:runId",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Report />
          </Suspense>
        ),
      },
      {
        path: "settings",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Settings />
          </Suspense>
        ),
      },
      {
        path: "runs/:runId",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <RunDetail />
          </Suspense>
        ),
      },
      {
        path: "compare",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Compare />
          </Suspense>
        ),
      },
      {
        path: "correlation",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Correlation />
          </Suspense>
        ),
      },
    ],
  },
]);
