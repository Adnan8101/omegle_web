import React from 'react';

/**
 * Renders a currency emoji string. If the string is a Discord emoji markup
 * (e.g. `<a:Omeglee_Ozy_coin:1525594143135633539>`), it parses the ID and
 * renders the high-quality animated GIF / PNG image from Discord CDN.
 * Otherwise, it renders the raw emoji / unicode string.
 */
export function renderEmoji(
  emoji: string | undefined | null,
  className: string = 'w-5 h-5 inline-block align-middle',
): React.ReactNode {
  if (!emoji) return null;
  const match = emoji.match(/<a?:([\w_]+):(\d+)>/);
  if (match) {
    const [, name, id] = match;
    const isAnimated = emoji.startsWith('<a:');
    const ext = isAnimated ? 'gif' : 'png';
    return (
      <img
        src={`https://cdn.discordapp.com/emojis/${id}.${ext}?size=48&quality=lossless`}
        alt={name}
        className={className}
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
      />
    );
  }
  return <span className="inline-block align-middle">{emoji}</span>;
}
