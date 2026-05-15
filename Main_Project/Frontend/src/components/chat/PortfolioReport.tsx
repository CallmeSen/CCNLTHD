/**
 * PortfolioReport Component
 * Render financial portfolio report với styling đẹp
 */

import React from 'react';
import { TrendingDown, TrendingUp, AlertCircle, CheckCircle, PieChart, BarChart3 } from 'lucide-react';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface MetricItem {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface PortfolioReportProps {
  content: string;
  compact?: boolean;
}

export const PortfolioReport: React.FC<PortfolioReportProps> = ({ content, compact = false }) => {
  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#10b981', '#34d399', '#f59e0b', '#f97316'];

  // Parse report sections
  const parseReport = () => {
    const sections: Record<string, string> = {};
    const parts = content.split('##');

    parts.forEach((part) => {
      const lines = part.trim().split('\n');
      if (lines.length > 0) {
        const title = lines[0].trim();
        const body = lines.slice(1).join('\n').trim();
        sections[title] = body;
      }
    });

    return sections;
  };

  const sections = parseReport();

  const MetricCard: React.FC<{ label: string; value: string | number; unit?: string; trend?: 'up' | 'down' | 'neutral' }> = ({
    label,
    value,
    unit,
    trend,
  }) => (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <p className="text-xs text-gray-500 font-medium uppercase mb-2">{label}</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-gray-800">
          {value}
          {unit && <span className="text-sm text-gray-600 ml-1">{unit}</span>}
        </span>
        {trend === 'up' && <TrendingUp className="w-5 h-5 text-green-500" />}
        {trend === 'down' && <TrendingDown className="w-5 h-5 text-red-500" />}
      </div>
    </div>
  );

  const extractMetrics = (text: string): MetricItem[] => {
    const metrics: MetricItem[] = [];
    const lines = text.split('\n');

    lines.forEach((line) => {
      // Extract | metric | value | format
      if (line.includes('|') && !line.includes('---')) {
        const parts = line.split('|').filter((p) => p.trim());
        if (parts.length >= 2) {
          const label = parts[0].trim().replace(/\*\*/g, '');
          const value = parts[1].trim();

          // Determine trend
          let trend: 'up' | 'down' | 'neutral' = 'neutral';
          if (value.includes('-') && !value.includes('$')) {
            trend = 'down';
          } else if (!value.includes('-')) {
            trend = 'up';
          }

          if (label && value) {
            metrics.push({ label, value, trend });
          }
        }
      }
    });

    return metrics;
  };

  const metrics = extractMetrics(sections['Portfolio Performance Metrics'] || '');

  const allocationData = sections['Proposed Portfolio Allocation']
    ? sections['Proposed Portfolio Allocation']
        .split('\n')
        .filter((line) => line.includes('|') && !line.includes('---') && !line.includes('Asset'))
        .map((line) => {
          const parts = line.split('|').filter((p) => p.trim());
          if (parts.length < 2) return null;

          const label = parts[0].trim();
          const rawValue = parts[1].trim();
          const numericValue = Number.parseFloat(rawValue.replace('%', ''));

          return {
            name: label,
            value: Number.isFinite(numericValue) ? numericValue : 0,
          };
        })
        .filter((item): item is { name: string; value: number } => Boolean(item))
    : [];

  const chartMetrics = metrics
    .map((metric) => {
      const numericValue = Number.parseFloat(String(metric.value).replace('%', ''));
      return {
        name: metric.label,
        value: Number.isFinite(numericValue) ? numericValue : 0,
      };
    })
    .filter((item) => Number.isFinite(item.value));

  const chartMetricsVisible = chartMetrics.slice(0, 6);

  const renderPercent = (value: unknown) => {
    if (typeof value === 'number') return `${value.toFixed(2)}%`;
    const parsed = Number.parseFloat(String(value).replace('%', ''));
    return Number.isFinite(parsed) ? `${parsed.toFixed(2)}%` : String(value);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-4xl">
      {/* Header Section */}
      <div className="bg-linear-to-r from-blue-500 to-blue-700 text-white p-6">
        <h2 className="text-2xl font-bold mb-2">Phân tích chi tiết từ AI Financial Advisor</h2>
      </div>

      {/* Content */}
      <div className="p-6 space-y-8">
        {/* User Profile */}
        {sections['User Profile Summary'] && (
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4">👤 Thông Tin Hồ Sơ</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {sections['User Profile Summary']
                .split('\n')
                .filter((line) => line.startsWith('-'))
                .map((line, idx) => (
                  <p key={idx} className="text-sm text-gray-700">
                    {line.replace(/^-\s*/, '• ').replace(/\*\*/g, '')}
                  </p>
                ))}
            </div>
          </section>
        )}

        {/* Portfolio Allocation */}
        {sections['Proposed Portfolio Allocation'] && (
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4">💼 Phân Bổ Portfolio</h3>
            <div className="space-y-3">
              {sections['Proposed Portfolio Allocation']
                .split('\n')
                .filter((line) => line.includes('|') && !line.includes('---') && !line.includes('Asset'))
                .map((line, idx) => {
                  const parts = line.split('|').filter((p) => p.trim());
                  if (parts.length >= 2) {
                    return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-linear-to-r from-blue-50 to-blue-100 rounded-lg">
                        <span className="font-medium text-gray-800">{parts[0].trim()}</span>
                        <span className="text-lg font-bold text-blue-600">{parts[1].trim()}</span>
                      </div>
                    );
                  }
                  return null;
                })}
            </div>
          </section>
        )}

        {/* Allocation Chart - hidden when compact */}
        {!compact && allocationData.length > 0 && (
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              Biểu Đồ Phân Bổ
            </h3>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(1)}%`}
                    labelLine={false}
                  >
                    {allocationData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Weight']} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Performance Metrics */}
        {metrics.length > 0 && (
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Chỉ Số Hiệu Năng</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {metrics.slice(0, 9).map((metric, idx) => (
                <MetricCard
                  key={idx}
                  label={metric.label}
                  value={metric.value}
                  trend={metric.trend}
                />
              ))}
            </div>
          </section>
        )}

        {/* Performance Chart - hidden when compact */}
        {!compact && chartMetricsVisible.length > 0 && (
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Biểu Đồ Hiệu Năng
            </h3>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartMetricsVisible} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" height={50} interval={0} />
                  <YAxis />
                  <Tooltip formatter={(value) => [renderPercent(value), 'Value']} />
                  <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Key Insights */}
        {sections['LLM Commentary & Reasoning'] && (
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4"> Nhận Định Chính</h3>
            <div className="bg-amber-50 border-l-4 border-amber-100 p-4 rounded">
              {sections['LLM Commentary & Reasoning']
                .split('\n')
                .filter((line) => line.trim() && !line.includes('**'))
                .slice(0, 5)
                .map((line, idx) => (
                  <p key={idx} className="text-sm text-gray-700 mb-2">
                    {line.replace(/\*\*/g, '').trim()}
                  </p>
                ))}
            </div>
          </section>
        )}

        {/* Validation Status */}
        {sections['Validation Status'] && (
          <section>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">✓ Validation Passed</p>
                <p className="text-sm text-green-700">Portfolio allocation hợp lệ và đáp ứng các tiêu chí</p>
              </div>
            </div>
          </section>
        )}

        {/* Disclaimer */}
        
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">🤖 Generated by AI Financial Advisor</p>
      </div>
    </div>
  );
};

export default PortfolioReport;
