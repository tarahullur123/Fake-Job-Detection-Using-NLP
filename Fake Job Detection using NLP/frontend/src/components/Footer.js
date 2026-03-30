'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--footer-bg)',
      color: 'var(--footer-text)',
      padding: 'clamp(32px, 4vw, 48px) clamp(16px, 4vw, 40px) clamp(20px, 2vw, 28px)',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        display: 'flex', flexWrap: 'wrap', gap: 32,
        justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        {/* Brand */}
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 7,
              background: 'rgba(59,130,246,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <circle cx="12" cy="11" r="3" />
              </svg>
            </div>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '1.1rem', color: 'white',
            }}>JobCheck</span>
          </div>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '0.85rem',
            lineHeight: 1.6, maxWidth: 280,
          }}>Your AI partner in job safety. Detect fraudulent postings before they reach your team.</p>
        </div>

        {/* Links */}
        <div style={{
          display: 'flex', gap: 'clamp(24px, 4vw, 48px)', flexWrap: 'wrap',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-body)', fontWeight: 600,
              fontSize: '0.78rem', color: 'var(--footer-heading)',
              marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>Product</div>
            {[
              { href: '/analyze', label: 'Analyze' },
              { href: '/dashboard', label: 'Dashboard' },
              { href: 'http://localhost:8000/docs', label: 'API Docs', external: true },
            ].map(link => (
              link.external ? (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                  style={footerLinkStyle}>{link.label}</a>
              ) : (
                <Link key={link.label} href={link.href} style={footerLinkStyle}>{link.label}</Link>
              )
            ))}
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-body)', fontWeight: 600,
              fontSize: '0.78rem', color: 'var(--footer-heading)',
              marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>Company</div>
            {[
              { href: '#', label: 'Privacy' },
              { href: '#', label: 'Terms' },
              { href: '#', label: 'Contact' },
              { href: 'https://github.com/Kumaran18v/Fake-Job-Detection', label: 'View Source Code', external: true },
            ].map(link => (
              link.external ? (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                  style={footerLinkStyle}>{link.label}</a>
              ) : (
                <a key={link.label} href={link.href} style={footerLinkStyle}>{link.label}</a>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        borderTop: '1px solid var(--footer-divider)',
        marginTop: 'clamp(20px, 2vw, 32px)',
        paddingTop: 'clamp(16px, 2vw, 20px)',
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between',
        gap: 12,
      }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem' }}>
          Built for educational and demonstration purposes.
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
          color: 'rgba(255,255,255,0.4)',
        }}>
          Next.js · FastAPI · scikit-learn
        </span>
      </div>
    </footer>
  );
}

const footerLinkStyle = {
  display: 'block',
  fontFamily: 'var(--font-body)',
  fontSize: '0.85rem',
  color: 'rgba(255,255,255,0.7)',
  textDecoration: 'none',
  marginBottom: 8,
  transition: 'color 0.15s ease',
};
