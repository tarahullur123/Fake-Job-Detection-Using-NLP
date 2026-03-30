'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { HiShieldCheck } from 'react-icons/hi2';

/* ── Animated circular confidence meter ── */
function ConfidenceMeter({ value = 94, size = 80 }) {
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!inView || !mounted) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) { setProgress(value); return; }
    let raf;
    let start = null;
    const duration = 1400;
    const animate = (ts) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const pct = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - pct, 3);
      setProgress(Math.round(eased * value));
      if (pct < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, mounted]);

  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;

  return (
    <div ref={ref} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r}
          stroke="var(--bg-muted)" strokeWidth="6" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r}
          stroke="var(--success)" strokeWidth="6" fill="none"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontWeight: 600,
          fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1,
        }}>{progress}%</span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
          color: 'var(--text-muted)', lineHeight: 1, marginTop: 2,
        }}>CONF.</span>
      </div>
    </div>
  );
}

/* ── SVG hero doodle — shield / magnifier / document ── */
function HeroDoodle() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.svg
      viewBox="0 0 400 360" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 380, height: 'auto' }}
      initial={false}
    >
      {/* Background blobs */}
      <motion.circle cx="200" cy="180" r="140" fill="var(--primary-lighter)" opacity="0.35"
        animate={prefersReducedMotion ? {} : { scale: [1, 1.04, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.circle cx="280" cy="120" r="60" fill="var(--success-light)" opacity="0.4"
        animate={prefersReducedMotion ? {} : { scale: [1, 1.06, 1], y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} />

      {/* Document */}
      <motion.g
        animate={prefersReducedMotion ? {} : { y: [0, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="100" y="80" width="130" height="170" rx="10" fill="var(--bg-white)" stroke="var(--border)" strokeWidth="2" />
        <rect x="118" y="108" width="80" height="6" rx="3" fill="var(--bg-muted)" />
        <rect x="118" y="124" width="60" height="6" rx="3" fill="var(--bg-muted)" />
        <rect x="118" y="140" width="90" height="6" rx="3" fill="var(--bg-muted)" />
        <rect x="118" y="156" width="50" height="6" rx="3" fill="var(--bg-muted)" />
        <rect x="118" y="176" width="70" height="6" rx="3" fill="var(--bg-muted)" />
        <rect x="118" y="196" width="55" height="6" rx="3" fill="var(--bg-muted)" />
      </motion.g>

      {/* Shield */}
      <motion.g
        animate={prefersReducedMotion ? {} : { y: [0, -5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <path d="M290 140l-36-16v24c0 22 36 36 36 36s36-14 36-36v-24l-36 16z"
          fill="var(--primary)" opacity="0.15" />
        <path d="M290 140l-36-16v24c0 22 36 36 36 36s36-14 36-36v-24l-36 16z"
          stroke="var(--primary)" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
        <polyline points="278,160 286,168 302,152" stroke="var(--success)" strokeWidth="3"
          fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>

      {/* Magnifying glass */}
      <motion.g
        animate={prefersReducedMotion ? {} : { y: [0, -3, 0], rotate: [0, 2, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        style={{ transformOrigin: '310px 260px' }}
      >
        <circle cx="295" cy="258" r="28" stroke="var(--primary-light)" strokeWidth="3" fill="white" fillOpacity="0.8" />
        <line x1="316" y1="279" x2="340" y2="303" stroke="var(--primary-light)" strokeWidth="4" strokeLinecap="round" />
      </motion.g>
    </motion.svg>
  );
}

const trustItems = [
  { icon: '🔒', text: 'Privacy focused' },
  { icon: '⚡', text: 'Instant results' },
  { icon: '🆓', text: 'Free to use' },
  { icon: '🛡️', text: 'No data stored for guests' },
];

const heroPhrases = [
  'Verify before you hire',
  'Check before you select',
  'Screen before you proceed',
  "Validate, don't complicate",
  'Spot the fake, raise the stake',
];

function RotatingHeadline() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % heroPhrases.length);
    }, 2500);

    return () => clearInterval(timer);
  }, []);

  return (
    <span style={{ display: 'inline-block', minHeight: '1.25em' }}>
      <motion.span
        key={heroPhrases[index]}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        style={{ display: 'inline-block' }}
      >
        {heroPhrases[index]}
      </motion.span>
    </span>
  );
}

export default function HeroSection() {
  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: 'clamp(24px, 4vw, 48px) clamp(16px, 4vw, 40px)',
        backgroundImage: "url('https://assets.mixkit.co/videos/4809/4809-thumb-720-0.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overflow: 'hidden',
      }}
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="https://assets.mixkit.co/videos/4809/4809-thumb-720-0.jpg"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      >
        <source src="https://assets.mixkit.co/videos/4809/4809-1080.mp4" type="video/mp4" />
      </video>

      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        zIndex: 1,
      }} />

      <div style={{
        maxWidth: 1200, margin: '0 auto', width: '100%',
        display: 'flex', alignItems: 'center', gap: 'clamp(32px, 4vw, 64px)',
        flexWrap: 'wrap',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Left column */}
        <div style={{ flex: '1 1 480px', minWidth: 0 }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 'var(--radius-xl)',
              background: 'rgba(255, 255, 255, 0.14)', marginBottom: 20,
              border: '1px solid rgba(255, 255, 255, 0.26)',
            }}>
              <HiShieldCheck style={{ color: '#93C5FD', fontSize: '1rem' }} />
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '0.82rem',
                fontWeight: 600, color: '#DBEAFE',
              }}>AI-Powered Job Verification</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: '-0.025em',
              color: '#F8FAFC',
              marginBottom: 16,
              maxWidth: 540,
              textShadow: '0 3px 12px rgba(0,0,0,0.35)',
            }}
          >
            <RotatingHeadline />
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(1rem, 1.5vw, 1.12rem)',
              lineHeight: 1.6,
              color: 'rgba(241, 245, 249, 0.92)',
              maxWidth: 480,
              marginBottom: 28,
            }}
          >
            Instantly analyze job listings and get a clear, explainable verdict with confidence scores.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}
          >
            <Link href="/analyze" className="btn-primary" style={{
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 32px', fontSize: '0.95rem',
            }}>
              Run Analysis
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>→</span>
            </Link>
            <a href="#features" className="btn-outline" style={{
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '13px 28px', fontSize: '0.95rem',
              color: '#F8FAFC',
              borderColor: 'rgba(255, 255, 255, 0.55)',
              background: 'rgba(15, 23, 42, 0.25)',
            }}>
              See Demo
            </a>
          </motion.div>

          {/* Trust row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}
          >
            {trustItems.map((item) => (
              <div key={item.text} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--font-body)', fontSize: '0.82rem',
                color: 'rgba(226, 232, 240, 0.9)',
              }}>
                <span style={{ fontSize: '0.9rem' }}>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right column */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          style={{
            flex: '1 1 380px', minWidth: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
          }}
        >
          <HeroDoodle />

          {/* Verdict card mockup with confidence meter */}
          <div style={{
            background: 'var(--bg-white)', borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)', padding: '16px 24px',
            display: 'flex', alignItems: 'center', gap: 16,
            border: '1px solid var(--border-light)',
            width: '100%', maxWidth: 340, minWidth: 220,
          }}>
            <ConfidenceMeter value={94} size={64} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{
                display: 'inline-block', padding: '4px 10px',
                background: 'var(--success-light)', borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                fontWeight: 600, color: 'var(--success)',
              }}>LEGITIMATE</div>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: '0.82rem',
                color: 'var(--text-muted)', lineHeight: 1.4,
              }}>Job posting verified as safe</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
