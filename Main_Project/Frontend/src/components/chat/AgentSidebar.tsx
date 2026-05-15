import { useAgentStore } from "../../store/useAgentStore";
import { ToolCallCard } from "./ToolCallCard";

export function AgentSidebar() {
  const toolCalls = useAgentStore((s) => s.toolCalls);

  if (toolCalls.length === 0) return null;

  return (
    <div className="p-3 space-y-2">
      <h4 className="text-sm font-semibold">Agent Pipeline</h4>
      <div className="space-y-2">
        {toolCalls.map((tc) => (
          <ToolCallCard key={tc.id} toolCall={tc} />
        ))}
      </div>
    </div>
  );
}

export default AgentSidebar;
