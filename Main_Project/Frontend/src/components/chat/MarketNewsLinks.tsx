import { dedupeNewsItems, type MarketNewsItem } from '../../lib/marketNews';
import { LinkPreview } from './LinkPreview';

export function MarketNewsLinks({ items }: { items: MarketNewsItem[] }) {
  const uniqueItems = dedupeNewsItems(items);

  if (uniqueItems.length === 0) return null;

  return (
    <div className="not-prose my-2 space-y-1.5">
      {uniqueItems.map((item) => (
        <div key={item.url} className="text-xs leading-relaxed">
          <LinkPreview href={item.url} newsData={[item]}>
            {item.url}
          </LinkPreview>
        </div>
      ))}
    </div>
  );
}
