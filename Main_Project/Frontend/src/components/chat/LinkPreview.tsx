import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { MarketNewsItem } from '../../lib/marketNews';

interface LinkPreviewProps {
  href: string;
  newsData: MarketNewsItem[];
  children: ReactNode;
}

export function LinkPreview({ href, newsData, children }: LinkPreviewProps) {
  const matched = newsData.find((item) => item.url === href || href.includes(item.url) || item.url.includes(href));

  return (
    <span className="relative inline group/cursor">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline-offset-2 break-all hover:text-primary hover:underline"
      >
        {children}
      </a>
      {matched && (
        <span
          role="tooltip"
          className={cn(
            'absolute bottom-full left-0 mb-1.5 z-50 w-64 max-w-[calc(100vw-2rem)] rounded-md border border-border',
            'bg-popover text-popover-foreground shadow-md p-2',
            'opacity-0 pointer-events-none group-hover/cursor:opacity-100 group-focus-within/cursor:opacity-100',
            'transition-opacity duration-150',
          )}
        >
          <span className="block text-xs font-semibold leading-snug line-clamp-2 mb-1">
            {matched.title}
          </span>
          <span className="block text-[11px] leading-relaxed text-muted-foreground line-clamp-3">
            {matched.content}
          </span>
        </span>
      )}
    </span>
  );
}
