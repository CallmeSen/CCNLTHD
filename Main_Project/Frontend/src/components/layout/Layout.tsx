import { Outlet, NavLink, useLocation } from "react-router-dom";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  LayoutDashboard,
  Bot,
  Search,
  History,
  Settings,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Shield,
  FileText,
  Network,
  GitCompare,
  Grid3x3,
} from "lucide-react";
import { useState } from "react";
import { useDarkMode } from "@/hooks/useDarkMode";

function cn(...classes: (string | undefined)[]) {
  return twMerge(clsx(classes));
}

const navItems = [
  { path: "/", label: "Home", icon: LayoutDashboard, exact: true },
  { path: "/agent", label: "Agent", icon: Bot },
  { path: "/analysis", label: "Analysis", icon: Search },
  { path: "/history", label: "History", icon: History },
  { path: "/runs/test", label: "Runs", icon: BarChart3 },
  { path: "/compare", label: "Compare", icon: GitCompare },
  { path: "/correlation", label: "Correlation", icon: Grid3x3 },
  { path: "/settings", label: "Settings", icon: Settings },
];

const capabilities = [
  { icon: Bot, label: "Multi-Agent", desc: "LangGraph workflow" },
  { icon: TrendingUp, label: "Portfolio", desc: "Optimization engine" },
  { icon: Shield, label: "Compliance", desc: "Regulatory guard" },
  { icon: FileText, label: "Reports", desc: "AI-generated insights" },
  { icon: Network, label: "Swarm", desc: "Agent teams" },
  { icon: BarChart3, label: "Backtest", desc: "Cross-market engine" },
];

interface LayoutProps {
  children?: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isDark, toggle } = useDarkMode();
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full z-40 flex flex-col bg-card border-r border-border transition-all duration-300",
          sidebarOpen ? "w-64" : "w-[72px]"
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-border gap-3 flex-shrink-0">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-foreground tracking-tight">
                FinAgents
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                Advisory Platform
              </span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon, exact }) => {
            const isActive = exact
              ? location.pathname === path
              : location.pathname.startsWith(path);
            return (
              <NavLink
                key={path}
                to={path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "flex-shrink-0",
                    isActive ? "w-5 h-5" : "w-[18px] h-[18px]"
                  )}
                />
                {sidebarOpen && <span>{label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Capabilities */}
        {sidebarOpen && (
          <div className="px-3 pb-4 space-y-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Capabilities
            </p>
            {capabilities.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom */}
        <div className="px-3 pb-4 flex flex-col gap-2 flex-shrink-0">
          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="text-sm font-medium">Light mode</span>
                )}
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="text-sm font-medium">Dark mode</span>
                )}
              </>
            )}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="text-sm font-medium">Collapse</span>
                )}
              </>
            ) : (
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? "256px" : "72px" }}
      >
        <div className="min-h-full p-6 lg:p-8">
          {children}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
