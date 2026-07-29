const CUSTOM_EMOJI = /<(a?):(\w+):(\d+)>/;

interface CurrencyMarkProps {
  /** Either a unicode emoji or Discord's `<:name:id>` / `<a:name:id>` form. */
  emoji: string;
  size?: number;
  className?: string;
}

/**
 * Renders the guild's configured currency mark. Discord custom emoji arrive as
 * a token that has to be resolved to a CDN URL; plain unicode renders as text.
 */
export default function CurrencyMark({ emoji, size = 20, className = '' }: CurrencyMarkProps) {
  const match = emoji.match(CUSTOM_EMOJI);

  if (match) {
    const [, animatedFlag, name, id] = match;
    const extension = animatedFlag === 'a' ? 'gif' : 'png';
    // Request the next power-of-two up so the mark stays crisp on retina.
    const requested = size <= 16 ? 32 : size <= 32 ? 64 : 128;

    return (
      <img
        src={`https://cdn.discordapp.com/emojis/${id}.${extension}?size=${requested}&quality=lossless`}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={`inline-block flex-shrink-0 object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`inline-flex flex-shrink-0 items-center justify-center leading-none ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.92 }}
    >
      {emoji}
    </span>
  );
}
