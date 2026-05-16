import { BarChart3, Bot, Shield, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

const SAMPLE_PROMPTS = [
  'Phân tích danh mục hiện tại của tôi với mức rủi ro vừa phải',
  'Tôi có 100 triệu VNĐ nên phân bổ vào các nhóm tài sản nào?',
  'Nghiên cứu xu hướng NVDA và rủi ro trong quý tới',
  'Chạy thử chiến lược momentum kết hợp value cho nhóm cổ phiếu lớn',
];

interface WelcomeScreenProps {
  onPromptSelect?: (prompt: string) => void;
  onSelectPrompt?: (prompt: string) => void;
}

export function WelcomeScreen({ onPromptSelect, onSelectPrompt }: WelcomeScreenProps) {
  const handleSelect = (prompt: string) => {
    onPromptSelect?.(prompt);
    onSelectPrompt?.(prompt);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[58vh] max-w-2xl mx-auto text-center px-4">
      <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-6 glow-primary">
        <Bot className="w-8 h-8 text-white" />
      </div>

      <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
        Trợ lý đầu tư AI
      </h1>
      <p className="text-muted-foreground text-sm mb-8 max-w-md">
        Mô tả mục tiêu đầu tư, danh mục hoặc mã cổ phiếu bạn quan tâm. Hệ thống multi-agent sẽ phân tích và tạo báo cáo theo thời gian thực.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mb-8">
        {[
          {
            icon: Zap,
            title: 'Nghiên cứu sâu',
            desc: 'Kết hợp dữ liệu thị trường, tin tức và ngữ cảnh danh mục',
            color: 'bg-primary/10 text-primary',
          },
          {
            icon: BarChart3,
            title: 'Phân tích realtime',
            desc: 'Theo dõi từng bước tool execution ngay trong chat',
            color: 'bg-info/10 text-info',
          },
          {
            icon: Shield,
            title: 'Kiểm soát rủi ro',
            desc: 'Tóm tắt điểm mạnh, điểm yếu và cảnh báo quan trọng',
            color: 'bg-success/10 text-success',
          },
          {
            icon: Bot,
            title: 'Multi-agent',
            desc: 'Luồng phân tích nhiều tác nhân cho báo cáo có cấu trúc',
            color: 'bg-warning/10 text-warning',
          },
        ].map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="card p-4 text-left card-hover">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', color)}>
              <Icon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-0.5">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <div className="w-full text-left">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">
          Gợi ý nhanh
        </p>
        <div className="space-y-2">
          {SAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSelect(prompt)}
              className="w-full text-left px-4 py-3 rounded-xl bg-muted/50 hover:bg-muted border border-border hover:border-muted-foreground/30 transition-all duration-200 text-sm text-muted-foreground hover:text-foreground"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
