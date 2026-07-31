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

/** Four figures read straight off the feed — no extra request, nothing invented. */
export default function FeedStats({ count, spent, buyers, biggest, currencyEmoji, currencyName }: FeedStatsProps) {
  const cells = [
    { label: 'Purchases', value: count, coin: false },
    { label: `${currencyName} spent`, value: spent, coin: true },
    { label: 'Buyers', value: buyers, coin: false },
    { label: 'Biggest buy', value: biggest, coin: true },
  ];

  return (
    <RevealGroup
      stagger={0.07}
      className="grid grid-cols-2 overflow-hidden rounded-[20px] border border-white/8 bg-white/[0.02] lg:grid-cols-4"
    >
      {cells.map((cell, index) => (
        <Item
          key={cell.label}
          distance={14}
          className={[
            'relative p-4 sm:p-5',
            index >= 2 ? 'border-t border-white/8 lg:border-t-0' : '',
            index % 2 === 1 ? 'border-l border-white/8' : '',
            index > 0 ? 'lg:border-l lg:border-white/8' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="text-[11px] font-semibold text-white/40">{cell.label}</span>
          <span className="mt-2 flex items-center gap-1.5 text-[20px] font-extrabold leading-none text-white tabular-nums">
            {cell.coin && <CurrencyMark emoji={currencyEmoji} size={15} />}
            <CountUp value={cell.value} duration={1.1} />
          </span>
        </Item>
      ))}
    </RevealGroup>
  );
}
