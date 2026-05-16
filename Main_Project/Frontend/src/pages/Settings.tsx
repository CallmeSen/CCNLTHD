import { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Globe, Key, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useDarkMode } from '../hooks/useDarkMode';
import { cn } from '../lib/utils';

const PROVIDERS = [
  { value: 'openrouter', label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  { value: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  { value: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { value: 'gemini', label: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  { value: 'groq', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' },
  { value: 'ollama', label: 'Ollama local', baseUrl: 'http://localhost:11434' },
];

const SETTINGS_KEY = 'agent-settings';

interface LocalSettings {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  tushareToken: string;
}

const defaultSettings: LocalSettings = {
  provider: 'openrouter',
  model: 'anthropic/claude-sonnet-4',
  apiKey: '',
  baseUrl: PROVIDERS[0].baseUrl,
  tushareToken: '',
};

function readSettings(): LocalSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<LocalSettings>(readSettings);
  const [saving, setSaving] = useState(false);
  const { isDark, setTheme } = useDarkMode();

  useEffect(() => {
    const provider = PROVIDERS.find((item) => item.value === settings.provider);
    if (provider && settings.baseUrl === '') {
      setSettings((current) => ({ ...current, baseUrl: provider.baseUrl }));
    }
  }, [settings.baseUrl, settings.provider]);

  const update = <K extends keyof LocalSettings>(key: K, value: LocalSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const handleProviderChange = (value: string) => {
    const provider = PROVIDERS.find((item) => item.value === value);
    setSettings((current) => ({
      ...current,
      provider: value,
      baseUrl: provider?.baseUrl || current.baseUrl,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    await new Promise((resolve) => setTimeout(resolve, 300));
    setSaving(false);
    toast.success('Đã lưu cài đặt local');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-6">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6" />
          Cài đặt
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Các tùy chọn này được lưu local trong trình duyệt, không gửi lên backend.
        </p>
      </div>

      <div className="card p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Cấu hình LLM local</h2>
            <p className="text-xs text-muted-foreground">Dùng để ghi nhớ lựa chọn giao diện, chưa gọi backend.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Provider</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider.value}
                  type="button"
                  onClick={() => handleProviderChange(provider.value)}
                  className={cn(
                    'px-3 py-2 rounded-xl border text-sm font-medium transition-all text-left',
                    settings.provider === provider.value
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-muted/50 border-border hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground',
                  )}
                >
                  {provider.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="model">Tên model</label>
            <input
              id="model"
              type="text"
              className="input"
              placeholder="VD: anthropic/claude-sonnet-4"
              value={settings.model}
              onChange={(event) => update('model', event.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="baseUrl">Base URL</label>
            <input
              id="baseUrl"
              type="text"
              className="input font-mono text-xs"
              placeholder="https://api.example.com/v1"
              value={settings.baseUrl}
              onChange={(event) => update('baseUrl', event.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="apiKey">
              <Key className="w-3.5 h-3.5 inline mr-1" />
              API key
            </label>
            <input
              id="apiKey"
              type="password"
              className="input font-mono"
              placeholder="sk-..."
              value={settings.apiKey}
              onChange={(event) => update('apiKey', event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-info/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-info" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Nguồn dữ liệu và giao diện</h2>
            <p className="text-xs text-muted-foreground">Token tùy chọn và theme được lưu trên máy bạn.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="tushare">Tushare token</label>
            <input
              id="tushare"
              type="password"
              className="input font-mono"
              placeholder="Tùy chọn"
              value={settings.tushareToken}
              onChange={(event) => update('tushareToken', event.target.value)}
            />
          </div>

          <div>
            <label className="label">Theme</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme(false)}
                className={cn('btn-secondary justify-center', !isDark && 'border-primary text-primary bg-primary/10')}
              >
                Light mode
              </button>
              <button
                type="button"
                onClick={() => setTheme(true)}
                className={cn('btn-secondary justify-center', isDark && 'border-primary text-primary bg-primary/10')}
              >
                Dark mode
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end animate-slide-up">
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang lưu...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Lưu cài đặt
            </>
          )}
        </button>
      </div>
    </div>
  );
}
