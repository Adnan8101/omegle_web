'use client';

import { useEffect, useRef, useState } from 'react';
import { FiAlertCircle, FiCheck, FiCopy, FiMessageCircle, FiPackage, FiVolume2, FiVolumeX } from 'react-icons/fi';

// Procedural sound synth utilizing Web Audio API
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
      // Low frequency rumble
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
      
      // Beautiful gold-rarity triumphant major chord chime
      const freqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C major extended
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

      // Ambient sweep whoosh
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
  const [audioEnabled, setAudioEnabled] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioSynthRef = useRef<AudioSynth | null>(null);

  // Initialize audio synth on mount
  useEffect(() => {
    audioSynthRef.current = new AudioSynth();
  }, []);

  // Control animation timing
  useEffect(() => {
    // 1. Shake phase triggers sound effects periodically
    let shakeAudioInterval: NodeJS.Timeout;
    if (stage === 'shake' && audioEnabled) {
      shakeAudioInterval = setInterval(() => {
        audioSynthRef.current?.playVibration();
      }, 180);
    }

    // 2. Transits to Open phase after 2.5s
    const openTimer = setTimeout(() => {
      clearInterval(shakeAudioInterval);
      setStage('open');
      if (audioEnabled) {
        audioSynthRef.current?.playOpenChime();
      }
    }, 2500);

    // 3. Transits to final Reveal phase after 1.2s of open/flare burst
    const revealTimer = setTimeout(() => {
      setStage('reveal');
    }, 3700);

    return () => {
      clearInterval(shakeAudioInterval);
      clearTimeout(openTimer);
      clearTimeout(revealTimer);
    };
  }, [stage, audioEnabled]);

  // Particle explosion canvas logic
  useEffect(() => {
    if (stage !== 'open') return;

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

    // Build particle pool
    for (let i = 0; i < 180; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 9 + 4;
      particles.push({
        x: centerX,
        y: centerY - 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 4), // upwards bias
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.012 + 0.008,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        shape: Math.random() > 0.65 ? 'star' : Math.random() > 0.4 ? 'square' : 'circle',
      });
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
        p.vy += 0.15; // gravity
        p.vx *= 0.97; // friction
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

      // Add soft lingering sparkles
      if (particles.length < 70) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 0.6;
        particles.push({
          x: centerX + (Math.random() - 0.5) * 80,
          y: centerY + (Math.random() - 0.5) * 80 - 30,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          size: Math.random() * 4 + 2,
          color: '#fbbf24',
          alpha: 1,
          decay: Math.random() * 0.015 + 0.005,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.08,
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
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md overflow-hidden select-none p-4">
      {/* Sound toggle */}
      <button
        onClick={() => setAudioEnabled(!audioEnabled)}
        className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all duration-300"
        title={audioEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
      >
        {audioEnabled ? <FiVolume2 className="w-6 h-6" /> : <FiVolumeX className="w-6 h-6" />}
      </button>

      {/* Burst Canvas */}
      {stage !== 'reveal' && (
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-20" />
      )}

      {/* Light Flare Flare Burst */}
      {stage === 'open' && (
        <div className="absolute w-64 h-64 rounded-full bg-radial-gradient from-white via-amber-300/40 to-transparent pointer-events-none z-30 blur-sm flare-animation" />
      )}

      {/* Ambient beams background */}
      {stage !== 'reveal' && (
        <div className="absolute w-[800px] h-[800px] pointer-events-none opacity-40 z-0">
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
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      )}

      {/* 3D Chest Stage */}
      {stage !== 'reveal' && (
        <div className="crate-perspective flex items-center justify-center w-80 h-80 z-10">
          <div className="crate-wrapper">
            <div
              className={`crate-3d ${stage === 'shake' ? 'crate-shaking' : ''}`}
            >
              {/* Back */}
              <div className="crate-face crate-face-back" />
              {/* Left */}
              <div className="crate-face crate-face-left" />
              {/* Right */}
              <div className="crate-face crate-face-right" />
              {/* Bottom */}
              <div className="crate-face crate-face-bottom" />
              {/* Top (Lid) */}
              <div className={`crate-face crate-face-top ${stage === 'open' ? 'crate-lid-open' : ''}`} />
              {/* Front with Lock Details */}
              <div className="crate-face crate-face-front flex items-center justify-center">
                <div className="w-12 h-12 bg-slate-900 border-2 border-yellow-500 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/20">
                  <FiPackage className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cinematic Revealed Card Screen */}
      {stage === 'reveal' && (
        <div className="max-w-md w-full animate-scale-in text-center z-10 flex flex-col items-center">
          {/* Confetti canvas */}
          <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

          {/* Success Title */}
          <div className="mb-6 animate-slide-down">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/5">
              <FiCheck className="w-3.5 h-3.5" />
              Successfully Obtained
            </div>
          </div>

          {/* Majestic Glow Reveal Card */}
          <div className="relative w-full bg-slate-900/60 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl hover:border-yellow-500/20 transition-all duration-500 group overflow-hidden mb-6 z-10">
            {/* Ambient card back light */}
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/15 transition-colors duration-500" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/15 transition-colors duration-500" />

            {/* Inner Content */}
            <div className="relative flex flex-col items-center">
              {/* Item Thumbnail */}
              <div className="relative w-28 h-28 mb-5 flex items-center justify-center bg-gradient-to-b from-slate-800 to-slate-950 border border-white/10 rounded-2xl p-1 shadow-2xl">
                {itemThumbnail ? (
                  <img src={itemThumbnail} alt={itemName} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800/40 rounded-xl">
                    <FiPackage className="w-12 h-12 text-slate-500" />
                  </div>
                )}
                {/* Glow ring */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-blue-500/20 via-transparent to-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              </div>

              {/* Item Name */}
              <h2 className="text-2xl font-black text-white mb-2 tracking-tight group-hover:text-yellow-400 transition-colors">
                {itemName}
              </h2>

              {/* Price Paid */}
              <div className="flex items-center gap-1.5 mb-6 text-sm text-slate-400 font-semibold bg-white/5 px-3 py-1 rounded-full border border-white/5">
                <span>Cost:</span>
                {getEmojiDisplay(currencyEmoji, 'w-4 h-4')}
                <span className="text-yellow-500">{pricePaid.toLocaleString()}</span>
              </div>

              {/* Spoiler redeem code */}
              <div className="w-full p-4 bg-slate-950/80 border border-white/5 rounded-2xl mb-6">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Redeem Code</p>
                <div className="relative flex items-center justify-center min-h-[50px] bg-slate-900 border border-white/5 rounded-xl px-4 py-2 overflow-hidden">
                  
                  {/* Blurred Code Text */}
                  <code
                    className={`text-xl font-mono font-black text-yellow-500 tracking-widest transition-all duration-500 select-all ${
                      !showCode ? 'blur-md select-none opacity-40' : 'blur-none opacity-100'
                    }`}
                  >
                    {redeemCode}
                  </code>

                  {/* Spoiler Reveal Overlay */}
                  {!showCode && (
                    <button
                      onClick={() => setShowCode(true)}
                      className="absolute inset-0 w-full h-full bg-slate-950/20 hover:bg-slate-950/40 transition-colors flex items-center justify-center text-xs font-bold text-slate-300 tracking-wider hover:text-white"
                    >
                      SHOW CODE
                    </button>
                  )}

                  {/* Copy Button */}
                  {showCode && (
                    <button
                      onClick={handleCopy}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                      title="Copy Code"
                    >
                      {copied ? (
                        <FiCheck className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <FiCopy className="w-5 h-5 text-slate-400 hover:text-white" />
                      )}
                    </button>
                  )}
                </div>

                {/* Expiry Details */}
                {expiresAt && (
                  <p className="mt-3 text-[11px] text-slate-500 font-light">
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

              {/* Bot response or DM status info */}
              {replyMessage && (
                <p className="text-sm text-slate-300 mb-5 p-3 bg-white/5 border border-white/5 rounded-xl text-left w-full font-light leading-relaxed">
                  {replyMessage.replace(/<@\d+>/g, '')}
                </p>
              )}

              {dmSent ? (
                <div className="w-full p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-6 flex items-center gap-2 justify-center">
                  <FiCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">Receipt sent to your Discord DMs!</span>
                </div>
              ) : (
                <div className="w-full p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl mb-6 flex items-center gap-2 justify-center">
                  <FiAlertCircle className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-semibold text-rose-400">Could not DM you. Please open your DMs!</span>
                </div>
              )}

              {/* Discord Redeem Guide */}
              <div className="w-full p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-left">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <FiMessageCircle className="w-4 h-4 text-[#5865F2]" />
                  How to Redeem
                </p>
                <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside font-light">
                  <li>Open Discord & DM <span className="text-[#5865F2] font-semibold">Omeglee Bot</span></li>
                  <li>Send your code: <code className="bg-slate-950 px-1.5 py-0.5 rounded text-yellow-500 font-mono text-[11px]">{redeemCode}</code></li>
                </ol>
              </div>

            </div>
          </div>

          {/* User info & Close button */}
          <div className="flex flex-col items-center gap-4 w-full animate-slide-up z-10">
            <div className="flex items-center gap-2.5">
              <img
                src={userAvatar || `https://cdn.discordapp.com/embed/avatars/0.png`}
                alt="User Avatar"
                className="w-7 h-7 rounded-full border border-white/20 shadow-md"
              />
              <span className="text-xs text-slate-500 font-light">Connected Account</span>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all duration-300 font-bold tracking-wide text-sm shadow-xl shadow-blue-600/10 hover:shadow-blue-600/20 active:scale-[0.98]"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
