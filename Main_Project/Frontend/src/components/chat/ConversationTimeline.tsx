import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import type { AgentMessage } from '../../types/agent';

interface ConversationTimelineProps {
  messages: AgentMessage[];
  containerRef?: React.RefObject<HTMLElement | null>;
  onJump?: (messageId: string) => void;
}

export const ConversationTimeline = memo(function ConversationTimeline({
  messages,
  containerRef,
  onJump,
}: ConversationTimelineProps) {
  const [activeIdx, setActiveIdx] = useState(-1);

  const userIndices = useMemo(
    () => messages.map((message, index) => (message.type === 'user' ? index : -1)).filter((index) => index >= 0),
    [messages],
  );

  useEffect(() => {
    const container = containerRef?.current;
    if (!container || userIndices.length === 0) return;

    const onScroll = () => {
      const rect = container.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      let closest = userIndices[0];
      let minDistance = Infinity;

      for (const index of userIndices) {
        const element = container.querySelector(`[data-msg-idx="${index}"]`);
        if (!element) continue;
        const elementRect = element.getBoundingClientRect();
        const distance = Math.abs(elementRect.top - mid);
        if (distance < minDistance) {
          minDistance = distance;
          closest = index;
        }
      }

      setActiveIdx(closest);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener('scroll', onScroll);
  }, [containerRef, userIndices]);

  const scrollTo = useCallback(
    (index: number) => {
      const message = messages[index];
      if (!message) return;

      if (onJump) {
        onJump(message.id);
        return;
      }

      const container = containerRef?.current;
      const element = container?.querySelector(`[data-msg-idx="${index}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    [containerRef, messages, onJump],
  );

  if (userIndices.length < 2) return null;

  return (
    <div className="flex items-center gap-1.5 px-1 py-2 overflow-x-auto">
      {userIndices.map((index, order) => (
        <button
          key={index}
          type="button"
          onClick={() => scrollTo(index)}
          className={cn(
            'rounded-full transition-all shrink-0',
            index === activeIdx || (!containerRef && order === userIndices.length - 1)
              ? 'w-3 h-3 bg-primary shadow-sm shadow-primary/30'
              : 'w-2 h-2 bg-muted-foreground/25 hover:bg-muted-foreground/50',
          )}
          title={messages[index].content.slice(0, 60)}
        />
      ))}
    </div>
  );
});
