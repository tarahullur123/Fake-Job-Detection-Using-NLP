'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { HiClipboardDocument, HiCpuChip, HiCheckBadge } from 'react-icons/hi2';
import HeroSection from '@/components/HeroSection';
import Features from '@/components/Features';
import Footer from '@/components/Footer';

/* ── Reusable fade-in wrapper ── */
function FadeIn({ children, delay = 0, className = '', ...props }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.25, 0.1, 0.25, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

const steps = [
  {
    num: '01',
    icon: HiClipboardDocument,
    title: 'Paste',
    desc: 'Copy any job posting text and paste it into the analysis box.',
  },
  {
    num: '02',
    icon: HiCpuChip,
    title: 'Analyze',
    desc: 'Our NLP pipeline processes the text through TF-IDF vectorization and classifiers.',
  },
  {
    num: '03',
    icon: HiCheckBadge,
    title: 'Verdict',
    desc: 'Receive a clear LEGITIMATE or SCAM verdict with a confidence score, instantly.',
  },
];

export default function HomePage() {
  return (
    <main style={{ paddingTop: 64 }}>
      <HeroSection />
      <div className="home-dark-flow">
        <Features />

        {/* ═══ HOW IT WORKS ═══ */}
        <section className="home-dark-section" style={{
          padding: 'clamp(36px, 5vw, 56px) clamp(16px, 4vw, 40px)',
          background: 'var(--home-section-bg-alt)',
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 'clamp(24px, 3vw, 36px)' }}>
              <span style={{
                fontFamily: 'var(--font-body)', fontWeight: 600,
                fontSize: '0.85rem', color: 'var(--primary-light)',
                marginBottom: 8, display: 'block',
              }}>How it works</span>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                color: 'var(--text-primary)', lineHeight: 1.2,
              }}>Three simple steps to verify any job posting</h2>
            </div>

            <div style={{
              display: 'flex', flexWrap: 'wrap',
              gap: 'clamp(16px, 2vw, 24px)',
              justifyContent: 'center',
            }}>
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <FadeIn key={step.num} delay={i * 0.1}
                    className="home-feature-card"
                    style={{
                      flex: '1 1 280px', maxWidth: 360,
                      textAlign: 'center',
                      position: 'relative',
                    }}
                  >
                    <div className="card-icon-wrap" style={{
                      borderRadius: '50%',
                      margin: '0 auto 14px',
                    }}>
                      <Icon />
                    </div>
                    <div className="step-label">STEP {step.num}</div>
                    <h3>{step.title}</h3>
                    <p>{step.desc}</p>
                  </FadeIn>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══ CTA SECTION ═══ */}
        <section className="home-dark-section" style={{
          padding: 'clamp(40px, 5vw, 64px) clamp(16px, 4vw, 40px)',
          background: 'transparent',
          textAlign: 'center',
          borderTop: '1px solid rgba(59, 130, 246, 0.18)',
        }}>
          <FadeIn>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
              color: 'var(--text-primary)', lineHeight: 1.2,
              marginBottom: 12,
            }}>Ready to check a job posting?</h2>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '1rem',
              color: 'var(--text-secondary)',
              marginBottom: 24,
            }}>
              It&apos;s free, instant, and no account required.
            </p>
            <Link href="/analyze" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.95rem',
              padding: '14px 36px', background: 'linear-gradient(135deg, #2563EB, #3B82F6)', color: 'white',
              borderRadius: 'var(--radius-md)', textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}>
              Run Analysis
              <span style={{ fontSize: '1.1rem' }}>→</span>
            </Link>
          </FadeIn>
        </section>
      </div>

      <Footer />
    </main>
  );
}
