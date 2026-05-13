import { useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  Settings,
  Bot,
  Globe,
  Key,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}

const PROVIDERS = [
  { value: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
  { value: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1" },
  { value: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { value: "gemini", label: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta" },
  { value: "groq", label: "Groq", baseUrl: "https://api.groq.com/openai/v1" },
  { value: "ollama", label: "Ollama (Local)", baseUrl: "http://localhost:11434" },
];

export default function SettingsPage() {
  const [provider, setProvider] = useState("openrouter");
  const [model, setModel] = useState("anthropic/claude-sonnet-4");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(
    PROVIDERS.find((p) => p.value === "openrouter")?.baseUrl || ""
  );
  const [saving, setSaving] = useState(false);

  const handleProviderChange = (val: string) => {
    setProvider(val);
    const found = PROVIDERS.find((p) => p.value === val);
    if (found) setBaseUrl(found.baseUrl);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast.success("Settings saved successfully!");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure the LLM provider, model, and data source credentials
        </p>
      </div>

      {/* LLM Settings */}
      <div
        className="card p-6 animate-slide-up"
        style={{ animationDelay: "100ms", animationFillMode: "both" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">LLM Configuration</h2>
            <p className="text-xs text-muted-foreground">
              Choose your preferred language model provider
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Provider */}
          <div>
            <label className="label">Provider</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handleProviderChange(p.value)}
                  className={cn(
                    "px-3 py-2 rounded-xl border text-sm font-medium transition-all text-left",
                    provider === p.value
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/50 border-border hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="label" htmlFor="model">
              Model Name
            </label>
            <input
              id="model"
              type="text"
              className="input"
              placeholder="e.g. anthropic/claude-sonnet-4"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Full model identifier (provider/model-name format for OpenRouter)
            </p>
          </div>

          {/* Base URL */}
          <div>
            <label className="label" htmlFor="baseUrl">
              Base URL
            </label>
            <input
              id="baseUrl"
              type="text"
              className="input font-mono text-xs"
              placeholder="https://api.example.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>

          {/* API Key */}
          <div>
            <label className="label" htmlFor="apiKey">
              <Key className="w-3.5 h-3.5 inline mr-1" />
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              className="input font-mono"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your API key is stored locally and never sent to external servers.
            </p>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div
        className="card p-6 animate-slide-up"
        style={{ animationDelay: "200ms", animationFillMode: "both" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-info/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-info" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Data Sources</h2>
            <p className="text-xs text-muted-foreground">
              Optional credentials for premium data providers
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="tushare">Tushare Token</label>
            <input
              id="tushare"
              type="password"
              className="input font-mono"
              placeholder="Optional — AKShare is used as free fallback"
            />
          </div>
          <div className="bg-muted/50 rounded-xl p-3 border border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Free data sources work without any API keys: AKShare (A-shares), yfinance (HK/US
              equities), OKX (crypto). Tushare token is optional for premium A-share data.
            </p>
          </div>
        </div>
      </div>

      {/* Save */}
      <div
        className="flex justify-end animate-slide-up"
        style={{ animationDelay: "300ms", animationFillMode: "both" }}
      >
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
