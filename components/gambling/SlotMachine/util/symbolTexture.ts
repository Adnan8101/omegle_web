import * as THREE from 'three';

export interface SymbolLike {
  label: string;
  icon: string | null;
}

// Mirrors lib/gambling/renderEmoji.tsx detection so slot faces match the rest of the UI.
const DISCORD_RE = /<a?:([\w_]+):(\d+)>/;

function drawTileBackground(ctx: CanvasRenderingContext2D, size: number) {
  ctx.clearRect(0, 0, size, size);
  // Soft ivory reel-strip tile with a faint vertical sheen and a hairline divider frame.
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, '#fdfdfb');
  g.addColorStop(0.5, '#f1f0ea');
  g.addColorStop(1, '#e2e0d6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const sheen = ctx.createLinearGradient(0, 0, size, 0);
  sheen.addColorStop(0, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = Math.max(2, size * 0.015);
  ctx.strokeRect(0, 0, size, size);
}

function drawGlyph(ctx: CanvasRenderingContext2D, size: number, text: string, isLabel: boolean) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1b1b1f';
  if (isLabel) {
    ctx.font = `700 ${Math.floor(size * 0.24)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    // wrap long labels to two lines
    const words = text.split(/\s+/);
    if (words.length > 1) {
      const mid = Math.ceil(words.length / 2);
      ctx.fillText(words.slice(0, mid).join(' '), size / 2, size * 0.4);
      ctx.fillText(words.slice(mid).join(' '), size / 2, size * 0.62);
    } else {
      ctx.fillText(text, size / 2, size / 2);
    }
  } else {
    ctx.font = `${Math.floor(size * 0.62)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif`;
    ctx.fillText(text, size / 2, size * 0.54);
  }
  ctx.restore();
}

/**
 * Builds a CanvasTexture for one reel symbol. Discord custom-emoji markup loads the CDN image
 * (async → texture updates on load, with a text fallback if the load taints/fails); a raw string
 * is drawn as a unicode emoji glyph; empty icon falls back to the symbol label.
 */
export function createSymbolTexture(sym: SymbolLike, size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  drawTileBackground(ctx, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const icon = sym.icon ?? '';
  const match = icon.match(DISCORD_RE);

  if (match) {
    const [, , id] = match;
    const isAnimated = icon.startsWith('<a:');
    const ext = isAnimated ? 'gif' : 'png';
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        drawTileBackground(ctx, size);
        const pad = size * 0.16;
        ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
        texture.needsUpdate = true;
      } catch {
        drawTileBackground(ctx, size);
        drawGlyph(ctx, size, sym.label, true);
        texture.needsUpdate = true;
      }
    };
    img.onerror = () => {
      drawTileBackground(ctx, size);
      drawGlyph(ctx, size, sym.label, true);
      texture.needsUpdate = true;
    };
    img.src = `https://cdn.discordapp.com/emojis/${id}.${ext}?size=96&quality=lossless`;
  } else if (icon.trim()) {
    drawGlyph(ctx, size, icon.trim(), false);
    texture.needsUpdate = true;
  } else {
    drawGlyph(ctx, size, sym.label || '?', true);
    texture.needsUpdate = true;
  }

  return texture;
}

/** Build a texture per symbol; returns textures plus a disposer. */
export function buildSymbolTextures(symbols: SymbolLike[]): {
  textures: THREE.CanvasTexture[];
  dispose: () => void;
} {
  const textures = symbols.map((s) => createSymbolTexture(s));
  return {
    textures,
    dispose: () => textures.forEach((t) => t.dispose()),
  };
}
