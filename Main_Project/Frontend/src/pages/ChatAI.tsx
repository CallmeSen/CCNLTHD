/**
 * ChatAI Page
 * Giao diện chatbot chính với realtime streaming, tool timeline, và message history
 */

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Square, Download } from 'lucide-react';
import { useAgentStore } from '../store/useAgentStore';
import { useSSE } from '../hooks/useSSE';
import { sessionApi } from '../services/sessionApi';
import { WelcomeScreen } from '../components/chat/WelcomeScreen';
import { MessageBubble } from '../components/chat/MessageBubble';
import { ThinkingTimeline } from '../components/chat/ThinkingTimeline';
import { ConversationTimeline } from '../components/chat/ConversationTimeline';
import ChatHeader from '../components/chat/ChatHeader';
import ChatFooter from '../components/chat/ChatFooter';
import ChatSettings from '../components/chat/ChatSettings';
import AgentSidebar from '../components/chat/AgentSidebar';
import type { AgentMessage } from '../types/agent';

export default function ChatAI() {
  const [showSettings, setShowSettings] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const ticker = searchParams.get('ticker');
  const action = searchParams.get('action');

  // Store
  const {
    sessionId,
    messages,
    isStreaming,
    streamingText,
    toolCalls,
    status,
    error,
    sseStatus,
    setSessionId,
    addMessage,
    setStatus,
    setError,
    clearStreaming,
    clearMessages,
  } = useAgentStore();

  // Local state
  const [inputValue, setInputValue] = useState('');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // SSE hook
  useSSE({ sessionId, enabled: !!sessionId });

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  // Handle scroll visibility
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollBtn(!isNearBottom && scrollHeight > clientHeight);
    }
  };

  // Always create a new session on mount (unless URL has ?session= param for sharing)
  useEffect(() => {
    const initSession = async () => {
      try {
        // Always create a fresh new session on load so a stale URL session
        // does not break when the backend service restarts.
        const prompt = ticker
          ? `Phân tích cổ phiếu ${ticker}`
          : 'New chat session';
        const response = await sessionApi.create(prompt);
        if (response.session_id) {
          localStorage.removeItem('agent-store');
          clearMessages();
          clearStreaming();
          setError(null);
          setStatus('idle');
          setSessionId(response.session_id);
          setSearchParams({ session: response.session_id }, { replace: true });
        }
      } catch (err) {
        console.error('Failed to create session:', err);
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Không thể tạo phiên chat: ${msg}`);
        setStatus('error');
      }
    };

    initSession();
  }, []);

  // Handle send message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !sessionId || isStreaming) {
      return;
    }

    try {
      setStatus('streaming');
      setError(null);

      // Add user message to store
      const userMsg: AgentMessage = {
        id: `msg-${Date.now()}`,
        type: 'user',
        content: inputValue,
        timestamp: Date.now(),
      };
      addMessage(userMsg);

      // Clear input
      setInputValue('');

      // Send to backend
      await sessionApi.send(sessionId, inputValue);

      // SSE connection will handle the streaming
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Không thể gửi tin nhắn');
      setStatus('error');
      clearStreaming();
    }
  };

  // Handle stop/cancel
  const handleCancel = async () => {
    try {
      if (sessionId) {
        await sessionApi.cancel(sessionId);
      }
      clearStreaming();
      setStatus('idle');
    } catch (err) {
      console.error('Failed to cancel:', err);
    }
  };

  // Handle export to markdown
  const handleExport = () => {
    if (messages.length === 0) {
      alert('Không có tin nhắn để xuất');
      return;
    }

    let markdown = '# Chat Export\n\n';
    markdown += `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}\n\n`;

    messages.forEach((msg) => {
      if (msg.type === 'user') {
        markdown += `## User\n${msg.content}\n\n`;
      } else if (msg.type === 'answer' || msg.type === 'run_complete') {
        markdown += `## Assistant\n${msg.content}\n\n`;
      } else if (msg.type === 'error') {
        markdown += `## ❌ Error\n${msg.content}\n\n`;
      } else if (msg.type === 'tool_call' && msg.toolCalls) {
        markdown += `### 🔧 Tool Calls\n`;
        msg.toolCalls.forEach((tool) => {
          markdown += `- **${tool.tool}** (${tool.status})\n`;
          if (tool.preview) markdown += `  - Preview: ${tool.preview}\n`;
          if (tool.elapsed_ms) markdown += `  - Time: ${tool.elapsed_ms}ms\n`;
        });
        markdown += '\n';
      }
    });

    // Download
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${Date.now()}.md`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Handle prompt selection from welcome screen
  const handlePromptSelect = async (prompt: string) => {
    setInputValue(prompt);
  };

  const handleRestoreSession = async () => {
    try {
      setRestoreLoading(true);
      const response = await sessionApi.create('New chat session');
      if (response.session_id) {
        localStorage.removeItem('agent-store');
        setInputValue('');
        setError(null);
        clearStreaming();
        setStatus('idle');
        setSessionId(response.session_id);
        setSearchParams({ session: response.session_id }, { replace: true });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Không thể tạo phiên chat mới: ${msg}`);
      setStatus('error');
    } finally {
      setRestoreLoading(false);
    }
  };

  // Show welcome screen header if no messages, but keep input visible
  const showWelcome = messages.length === 0;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white">
        <ChatHeader
          onExport={handleExport}
          onRestoreSession={handleRestoreSession}
          onOpenSettings={() => setShowSettings(true)}
          restoreLoading={restoreLoading}
        />
      </div>

      {/* Conversation Timeline */}
      {messages.filter((m) => m.type === 'user').length > 1 && (
        <div className="border-b border-gray-200 bg-white px-4 md:px-6 py-3">
          <div className="max-w-4xl mx-auto">
            <ConversationTimeline
              messages={messages}
              onJump={(msgId) => {
                const el = document.getElementById(`msg-${msgId}`);
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>
        </div>
      )}

      {/* Messages container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-6"
      >
        <div className="max-w-7xl mx-auto flex gap-4 items-start">
          <div className="flex-1 min-w-0 space-y-4">
          {/* Welcome screen when no messages */}
          {showWelcome && (
            <div className="py-8">
              <WelcomeScreen onPromptSelect={handlePromptSelect} />
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div key={msg.id} id={`msg-${msg.id}`}>
              <MessageBubble message={msg} />
            </div>
          ))}

          {/* Streaming text */}
          {streamingText && (
            <div className="flex justify-start">
              <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 bg-white border border-gray-200 rounded-lg shadow">
                <p className="text-sm md:text-base text-gray-800 break-all">
                  {streamingText}
                </p>
              </div>
            </div>
          )}

          {/* Thinking timeline */}
          {toolCalls.length > 0 && (
            <ThinkingTimeline toolCalls={toolCalls} isStreaming={isStreaming} />
          )}

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="mx-auto mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              ⬇ Cuộn xuống
            </button>
          )}

          <div ref={messagesEndRef} />
          </div>

          {toolCalls.length > 0 && (
            <aside className="hidden xl:block w-80 shrink-0 sticky top-24 max-h-[calc(100vh-10rem)] overflow-y-auto border border-gray-200 bg-white rounded-lg shadow-sm">
              <AgentSidebar />
            </aside>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white px-4 md:px-6 py-4 shadow-md">
        <div className="max-w-4xl mx-auto">
          {/* Error display */}
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Input form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={!sessionId || isStreaming}
              placeholder={
                isStreaming
                  ? 'Đang xử lý...'
                  : 'Hỏi AI về cổ phiếu, portfolio...'
              }
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                <span className="hidden md:inline">Dừng</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputValue.trim() || !sessionId}
                className="px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span className="hidden md:inline">Gửi</span>
              </button>
            )}
          </form>

          {/* Status info */}
          {(isStreaming || status !== 'idle') && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              {isStreaming && '🔄 Đang xử lý...'}
              {status === 'error' && '❌ Có lỗi xảy ra'}
              {status === 'idle' && '✓ Sẵn sàng'}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <ChatFooter onSelectPrompt={handlePromptSelect} />
        </div>
      </div>

      <ChatSettings open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
