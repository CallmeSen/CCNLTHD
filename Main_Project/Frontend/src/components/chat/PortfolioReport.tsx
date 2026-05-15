/**
 * PortfolioReport Component
 * Render financial portfolio report với styling đẹp
 */

import React from 'react';
import { TrendingDown, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface MetricItem {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface PortfolioReportProps {
  content: string;
}

export const PortfolioReport: React.FC<PortfolioReportProps> = ({ content }) => {
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

  const MetricCard: React.FC<{ label: string; value: string | number; unit?: string; trend?: 'up' | 'down' }> = ({
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

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-4xl">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <h2 className="text-2xl font-bold mb-2">📊 Báo Cáo Phân Tích Portfolio</h2>
        <p className="text-blue-100 text-sm">Phân tích chi tiết từ AI Financial Advisor</p>
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
                      <div key={idx} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
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

        {/* Key Insights */}
        {sections['LLM Commentary & Reasoning'] && (
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4">💡 Nhận Định Chính</h3>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
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
        <section className="bg-gray-100 rounded-lg p-4 border border-gray-300">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">⚠️ Lưu Ý Pháp Lý</p>
              <p className="text-xs text-gray-600">
                Báo cáo này chỉ mang tính chất thông tin. Không phải lời khuyên tài chính. Vui lòng tham khảo ý kiến chuyên gia
                tài chính trước khi quyết định đầu tư.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">🤖 Generated by AI Financial Advisor</p>
      </div>
    </div>
  );
};

export default PortfolioReport;
