'use client';
import { useEffect, useRef, useState } from 'react';
import { FiAlertCircle, FiCheck, FiCopy, FiMessageCircle, FiPackage, FiVolume2, FiVolumeX, FiExternalLink, FiArrowRight, FiX } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
class AudioSynth {
  private ctx: AudioContext | null = null;
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }
  playVibration() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(45, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(75, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (err) {
      console.warn('Web Audio error:', err);
    }
  }
  playOpenChime() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const freqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; 
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.04);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.6);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + idx * 0.04 + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t);
        osc.stop(t + 1.8);
      });
      const bufferSize = this.ctx.sampleRate * 1.2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(150, t);
      filter.frequency.exponentialRampToValueAtTime(4500, t + 0.4);
      const sweepGain = this.ctx.createGain();
      sweepGain.gain.setValueAtTime(0.18, t);
      sweepGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      source.connect(filter);
      filter.connect(sweepGain);
      sweepGain.connect(this.ctx.destination);
      source.start(t);
      source.stop(t + 1.2);
    } catch (err) {
      console.warn('Web Audio error:', err);
    }
  }
}
interface CrateRevealProps {
  itemName: string;
  itemThumbnail: string | null;
  pricePaid: number;
  currencyEmoji: string;
  redeemCode: string;
  expiresAt: string | null;
  replyMessage: string | null;
  dmSent: boolean;
  userAvatar: string | null;
  onClose: () => void;
}
export default function CrateReveal({
  itemName,
  itemThumbnail,
  pricePaid,
  currencyEmoji,
  redeemCode,
  expiresAt,
  replyMessage,
  dmSent,
  userAvatar,
  onClose,
}: CrateRevealProps) {
  const [stage, setStage] = useState<'shake' | 'open' | 'reveal'>('shake');
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioSynthRef = useRef<AudioSynth | null>(null);
  const router = useRouter();
  useEffect(() => {
    audioSynthRef.current = new AudioSynth();
  }, []);
  useEffect(() => {
    if (stage !== 'shake' || !audioEnabled) return;
    const shakeInterval = setInterval(() => {
      audioSynthRef.current?.playVibration();
    }, 180);
    return () => clearInterval(shakeInterval);
  }, [stage, audioEnabled]);
  useEffect(() => {
    if (stage === 'shake') {
      const timer = setTimeout(() => {
        setStage('open');
        if (audioEnabled) {
          audioSynthRef.current?.playOpenChime();
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
    if (stage === 'open') {
      const timer = setTimeout(() => {
        setStage('reveal');
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [stage, audioEnabled]);
  useEffect(() => {
    if (stage !== 'open' && stage !== 'reveal') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let animFrame: number;
    const particles: any[] = [];
    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#f43f5e'];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    if (stage === 'open') {
      for (let i = 0; i < 180; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 9 + 4;
        particles.push({
          x: centerX,
          y: centerY - 30,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (Math.random() * 4), 
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          decay: Math.random() * 0.012 + 0.008,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.15,
          shape: Math.random() > 0.65 ? 'star' : Math.random() > 0.4 ? 'square' : 'circle',
        });
      }
    }
    const drawStar = (c: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outer: number, inner: number) => {
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;
      c.beginPath();
      c.moveTo(cx, cy - outer);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outer;
        y = cy + Math.sin(rot) * outer;
        c.lineTo(x, y);
        rot += step;
        x = cx + Math.cos(rot) * inner;
        y = cy + Math.sin(rot) * inner;
        c.lineTo(x, y);
        rot += step;
      }
      c.lineTo(cx, cy - outer);
      c.closePath();
      c.fill();
    };
    const run = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; 
        p.vx *= 0.97; 
        p.alpha -= p.decay;
        p.rotation += p.rotationSpeed;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        if (p.shape === 'star') {
          drawStar(ctx, 0, 0, 5, p.size, p.size / 2);
        } else if (p.shape === 'square') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (particles.length < 50) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1.5 + 0.4;
        particles.push({
          x: centerX + (Math.random() - 0.5) * 120,
          y: centerY + (Math.random() - 0.5) * 120 - 30,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.8,
          size: Math.random() * 3 + 1.5,
          color: '#fbbf24',
          alpha: 1,
          decay: Math.random() * 0.01 + 0.004,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.06,
          shape: 'circle',
        });
      }
      animFrame = requestAnimationFrame(run);
    };
    run();
    return () => cancelAnimationFrame(animFrame);
  }, [stage]);
  const handleCopy = () => {
    navigator.clipboard.writeText(redeemCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const getEmojiDisplay = (emoji: string, size: string = 'w-5 h-5') => {
    const match = emoji.match(/<a?:(\w+):(\d+)>/);
    if (match) {
      const [, name, id] = match;
      const isAnimated = emoji.startsWith('<a:');
      const ext = isAnimated ? 'gif' : 'png';
      return (
        <img
          src={`https://cdn.discordapp.com/emojis/${id}.${ext}?size=48&quality=lossless`}
          alt={name}
          className={`inline-block ${size}`}
          style={{ verticalAlign: 'middle' }}
        />
      );
    }
    return <span className="inline-block">{emoji}</span>;
  };
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-start md:justify-center bg-[rgb(var(--color-bg-primary))]/95 backdrop-blur-md overflow-y-auto select-none p-4 py-8 md:py-12">
      {}
      {stage !== 'reveal' && (
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-20" />
      )}
      {}
      {stage === 'open' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
          <div className="w-72 h-72 rounded-full bg-radial-gradient from-white via-amber-300/40 to-transparent blur-sm flare-animation" />
        </div>
      )}
      {}
      {stage !== 'reveal' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40 z-0">
          <div className="w-[800px] h-[800px] flex-shrink-0">
            <svg className="w-full h-full animate-rays-spin" viewBox="0 0 100 100">
              <g transform="translate(50, 50)">
                {Array.from({ length: 12 }).map((_, i) => (
                  <path
                    key={i}
                    d="M 0 0 L -10 -50 L 10 -50 Z"
                    fill="url(#ray-gradient)"
                    transform={`rotate(${i * 30})`}
                  />
                ))}
              </g>
              <defs>
                <radialGradient id="ray-gradient" cx="50%" cy="100%" r="100%">
                  <stop offset="0%" stopColor="rgb(var(--color-accent))" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="rgb(var(--color-accent))" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
          </div>
        </div>
      )}
      {}
      {stage !== 'reveal' && (
        <div className="crate-perspective flex items-center justify-center w-80 h-80 z-10 relative">
          {}
          {stage === 'open' && (
            <div className="absolute z-40 animate-item-rise flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-to-b from-[rgba(var(--color-bg-secondary),0.9)] to-[rgba(var(--color-bg-primary),0.9)] border-2 border-yellow-500 rounded-2xl p-1 shadow-[0_0_40px_rgba(234,179,8,0.7)] flex items-center justify-center">
                {itemThumbnail ? (
                  <img src={itemThumbnail} alt={itemName} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[rgb(var(--color-bg-tertiary))] rounded-xl">
                    <FiPackage className="w-10 h-10 text-[rgb(var(--color-text-tertiary))]" />
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="crate-wrapper">
            <div
              className={`crate-3d ${stage === 'shake' ? 'crate-shaking' : ''}`}
            >
              {}
              <div className="crate-face crate-face-back" />
              {}
              <div className="crate-face crate-face-left" />
              {}
              <div className="crate-face crate-face-right" />
              {}
              <div className="crate-face crate-face-bottom" />
              {}
              <div className={`crate-face crate-face-top ${stage === 'open' ? 'crate-lid-open' : ''}`} />
              {}
              <div className="crate-face crate-face-front flex items-center justify-center">
                <div className="w-12 h-12 bg-[rgb(var(--color-bg-primary))] border-2 border-yellow-500 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/20">
                  <FiPackage className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {}
      {stage === 'reveal' && (
        <div className="max-w-md w-full animate-scale-in text-center z-10 flex flex-col items-center">
          {}
          <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />
          {}
          <div className="mb-6 animate-slide-down">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/5">
              <FiCheck className="w-3.5 h-3.5" />
              Successfully Obtained
            </div>
          </div>
          {}
          <div className="relative w-full glass-blue rounded-3xl p-6 md:p-8 shadow-apple-lg hover:border-yellow-500/20 transition-all duration-500 group overflow-hidden mb-6 z-10">
            {}
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/15 transition-colors duration-500" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/15 transition-colors duration-500" />
            {}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-[rgb(var(--color-bg-secondary))]/50 hover:bg-[rgb(var(--color-bg-secondary))] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] transition-all border border-[rgb(var(--color-border))] cursor-pointer"
              title="Close"
            >
              <FiX className="w-4 h-4" />
            </button>
            <div className="relative flex flex-col items-center">
              {}
              <div className="relative w-28 h-28 mb-5 flex items-center justify-center bg-gradient-to-b from-[rgb(var(--color-bg-secondary))] to-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-2xl p-1 shadow-2xl">
                {itemThumbnail ? (
                  <img src={itemThumbnail} alt={itemName} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[rgb(var(--color-bg-tertiary))] rounded-xl">
                    <FiPackage className="w-12 h-12 text-[rgb(var(--color-text-tertiary))]" />
                  </div>
                )}
                {}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-blue-500/10 via-transparent to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              </div>
              {}
              <h2 className="text-2xl font-black text-[rgb(var(--color-text-primary))] mb-2 tracking-tight group-hover:text-yellow-500 transition-colors">
                {itemName}
              </h2>
              {}
              <div className="flex items-center gap-1.5 mb-6 text-sm text-[rgb(var(--color-text-secondary))] font-semibold bg-[rgb(var(--color-bg-tertiary))]/60 px-3 py-1 rounded-full border border-[rgb(var(--color-border))]">
                <span>Cost:</span>
                {getEmojiDisplay(currencyEmoji, 'w-4 h-4')}
                <span className="text-yellow-500">{pricePaid.toLocaleString()}</span>
              </div>
              {}
              <div className="w-full p-4 bg-[rgb(var(--color-bg-tertiary))]/70 border border-[rgb(var(--color-border))] rounded-2xl mb-6">
                <p className="text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-widest mb-3">Redeem Code</p>
                <div className="relative flex items-center justify-center min-h-[52px] bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-xl px-4 py-2 overflow-hidden">
                  {}
                  <code
                    className={`text-xl font-mono font-black text-yellow-500 tracking-widest transition-all duration-500 select-all ${
                      !showCode ? 'blur-md select-none opacity-40' : 'blur-none opacity-100'
                    }`}
                  >
                    {redeemCode}
                  </code>
                  {}
                  {!showCode && (
                    <button
                      onClick={() => setShowCode(true)}
                      className="absolute inset-0 w-full h-full bg-[rgb(var(--color-bg-secondary))]/30 hover:bg-[rgb(var(--color-bg-secondary))]/60 transition-colors flex items-center justify-center text-xs font-bold text-[rgb(var(--color-text-secondary))] tracking-wider hover:text-[rgb(var(--color-text-primary))]"
                    >
                      SHOW CODE
                    </button>
                  )}
                  {}
                  {showCode && (
                    <button
                      onClick={handleCopy}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-[rgb(var(--color-hover))] transition-colors border border-transparent hover:border-[rgb(var(--color-border))]"
                      title="Copy Code"
                    >
                      {copied ? (
                        <FiCheck className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <FiCopy className="w-5 h-5 text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-primary))]" />
                      )}
                    </button>
                  )}
                </div>
                {}
                {expiresAt && (
                  <p className="mt-3 text-[11px] text-[rgb(var(--color-text-tertiary))] font-light">
                    Expires on {new Date(expiresAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
              {}
              {replyMessage && (
                <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-5 p-3 bg-[rgb(var(--color-bg-tertiary))]/40 border border-[rgb(var(--color-border))] rounded-xl text-left w-full font-light leading-relaxed">
                  {replyMessage.replace(/<@\d+>/g, '')}
                </p>
              )}
              {dmSent ? (
                <div className="w-full p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-6 flex items-center gap-2 justify-center">
                  <FiCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-500">Receipt sent to your Discord DMs!</span>
                </div>
              ) : (
                <div className="w-full p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl mb-6 flex items-center gap-2 justify-center">
                  <FiAlertCircle className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-semibold text-rose-500">Could not DM you. Please open your DMs!</span>
                </div>
              )}
              {}
              <div className="w-full p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-left">
                <p className="text-xs font-semibold text-[rgb(var(--color-text-secondary))] uppercase tracking-widest mb-2 flex items-center gap-2">
                  <FiMessageCircle className="w-4 h-4 text-[#5865F2]" />
                  How to Redeem
                </p>
                <ol className="text-xs text-[rgb(var(--color-text-tertiary))] space-y-1.5 list-decimal list-inside font-light">
                  <li>Open Discord & DM <span className="text-[#5865F2] font-semibold">Omeglee Bot</span></li>
                  <li>Send your code: <code className="bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] px-1.5 py-0.5 rounded text-yellow-500 font-mono text-[11px]">{redeemCode}</code></li>
                </ol>
              </div>
            </div>
          </div>
          {}
          <div className="flex items-center gap-2.5 mb-6 animate-slide-up">
            <img
              src={userAvatar || `https://cdn.discordapp.com/embed/avatars/0.png`}
              alt="User Avatar"
              className="w-7 h-7 rounded-full border border-[rgb(var(--color-border))] shadow-md"
            />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))] font-light">Connected Account</span>
          </div>
          {}
          <div className="flex flex-col gap-3 w-full animate-slide-up z-10">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={onClose}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all duration-300 font-bold tracking-wide text-sm active:scale-[0.98] shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20"
              >
                Keep Shopping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}