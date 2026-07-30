'use client';

import { CountUp, Item, RevealGroup } from '@/components/motion';
import CurrencyMark from '@/components/ui/CurrencyMark';

interface FeedStatsProps {
  count: number;
  spent: number;
  buyers: number;
  biggest: number;
  currencyEmoji: string;
  currencyName: string;
}

/**
 * Four figures read straight off the feed on screen — no extra request, and
 * nothing here that the rows below don't already prove.
 */
export default function FeedStats({
  count,
  spent,
  buyers,
  biggest,
  currencyEmoji,
  currencyName,
}: FeedStatsProps) {
  const cells = [
    { label: 'Purchases shown', value: count, tint: 'var(--sx-ink)', coin: false },
    { label: `${currencyName} spent`, value: spent, tint: '#ffd77a', coin: true },
    { label: 'Members buying', value: buyers, tint: '#a99bff', coin: false },
    { label: 'Biggest single buy', value: biggest, tint: '#8fbcff', coin: true },
  ];

  return (
    <RevealGroup
      stagger={0.07}
      className="grid grid-cols-2 overflow-hidden border lg:grid-cols-4"
      style={{ borderRadius: 'var(--sx-r-lg)', borderColor: 'var(--sx-hair)', background: 'rgba(255,255,255,0.022)' }}
    >
      {cells.map((cell, index) => (
        <Item
          key={cell.label}
          distance={14}
          // Hairlines follow the wrap: two columns on phones, four on desktop.
          className={[
            'relative p-4 sm:p-5',
            index >= 2 ? 'border-t lg:border-t-0' : '',
            index % 2 === 1 ? 'border-l' : '',
            index > 0 ? 'lg:border-l' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ borderColor: 'var(--sx-hair)' }}
        >
          <span className="sx-eyebrow text-[9.5px]">{cell.label}</span>
          <span
            className="sx-num mt-2 flex items-center gap-1.5 text-[21px] font-extrabold leading-none"
            style={{ color: cell.tint }}
          >
            {cell.coin && <CurrencyMark emoji={currencyEmoji} size={15} />}
            <CountUp value={cell.value} duration={1.3} />
          </span>
        </Item>
      ))}
    </RevealGroup>
  );
}
