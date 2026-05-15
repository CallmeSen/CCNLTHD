import { useState, useEffect } from "react";

export function ChatSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(true);

  useEffect(() => {
    const a = localStorage.getItem("chat:autoScroll");
    const t = localStorage.getItem("chat:showTimestamps");
    if (a != null) setAutoScroll(a === "1");
    if (t != null) setShowTimestamps(t === "1");
  }, []);

  useEffect(() => localStorage.setItem("chat:autoScroll", autoScroll ? "1" : "0"), [autoScroll]);
  useEffect(() => localStorage.setItem("chat:showTimestamps", showTimestamps ? "1" : "0"), [showTimestamps]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md p-4 bg-card border border-border rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Chat Settings</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">Auto-scroll to bottom</span>
            <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Show timestamps</span>
            <input type="checkbox" checked={showTimestamps} onChange={(e) => setShowTimestamps(e.target.checked)} />
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="px-3 py-1 rounded-lg border" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default ChatSettings;
