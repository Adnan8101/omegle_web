import { Fragment, ReactNode } from 'react';

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const lower = part.toLowerCase();
      let badgeStyle = 'font-semibold text-white';
      
      if (lower.includes('action') || lower.includes('initial stage')) {
        badgeStyle = 'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wide mr-1.5';
      } else if (lower.includes('leniency')) {
        badgeStyle = 'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide mr-1.5';
      } else if (lower.includes('special case') || lower.includes('extreme')) {
        badgeStyle = 'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-wide mr-1.5';
      } else if (lower.includes('note') || lower.includes('revoke')) {
        badgeStyle = 'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 uppercase tracking-wide mr-1.5';
      }

      return (
        <strong key={`${keyPrefix}-b-${i}`} className={badgeStyle}>
          {part}
        </strong>
      );
    }
    return <Fragment key={`${keyPrefix}-t-${i}`}>{part}</Fragment>;
  });
}

/**
 * Renders plain text produced by local rules or LLM into styled React nodes.
 * Supports "**bold**" callout badges, "- " bullet lines, and paragraph breaks.
 */
export function FormattedText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        const lines = block.split('\n').filter((l) => l.length > 0);
        const isList = lines.length > 0 && lines.every((l) => l.trim().startsWith('- '));
        if (isList) {
          return (
            <ul key={blockIndex} className="space-y-2 pl-1">
              {lines.map((line, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                  <span className="flex-1 leading-relaxed">{renderInline(line.trim().slice(2), `${blockIndex}-${i}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={blockIndex} className="leading-relaxed text-[14.5px] text-slate-300 whitespace-pre-line">
            {lines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {renderInline(line, `${blockIndex}-${i}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
