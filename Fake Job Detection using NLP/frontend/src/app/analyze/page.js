'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FileText, Link2, Table, Image, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

/* ─── Utility: format ISO date ─── */
function formatLocalTime(isoString) {
    if (!isoString) return '—';
    try {
        const dateStr = isoString.endsWith('Z') || isoString.includes('+')
            ? isoString : isoString + 'Z';
        const d = new Date(dateStr);
        return d.toLocaleString('en-IN', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
    } catch { return isoString; }
}

const SAMPLE_TEXTS = [
    { label: 'SUSPICIOUS POST', text: 'EARN $5000 WEEKLY from home! No experience needed! Send your bank details and SSN to get started. Pay $200 processing fee to secure your position. Limited spots - act now before it\'s too late! Contact us on WhatsApp immediately.' },
    { label: 'LEGITIMATE POST', text: 'We are looking for a Senior Software Engineer with 5+ years of experience in Python and React. You will work with a team of 12 engineers building our cloud infrastructure platform. Requirements: BS in Computer Science, experience with AWS, strong communication skills. Benefits include health insurance, 401k matching, and 20 days PTO. Apply through our careers page with your resume.' },
];

const RISK_COLORS = {
    'Financial Red Flag': { bg: 'rgba(239,68,68,0.12)', border: 'var(--danger)', icon: '💰' },
    'Urgency Pressure': { bg: 'rgba(249,115,22,0.12)', border: 'var(--warning)', icon: '⚡' },
    'Identity Harvesting': { bg: 'rgba(239,68,68,0.10)', border: 'var(--danger)', icon: '🎣' },
    'Vague Description': { bg: 'rgba(29,78,216,0.10)', border: 'var(--primary)', icon: '🔍' },
    'Suspicious Pattern': { bg: 'rgba(148,163,184,0.15)', border: 'var(--text-muted)', icon: '⚠' },
};

export default function AnalyzePage() {
    const { user, token, authFetch } = useAuth();
    // ─── Single analysis state ───
    const [inputMode, setInputMode] = useState('text'); // text | url | csv | image
    const [jobText, setJobText] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [phase, setPhase] = useState('input'); // input | scanning | verdict | bulk-results
    const [result, setResult] = useState(null);
    const [scanProgress, setScanProgress] = useState(0);
    const [myHistory, setMyHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [feedbackGiven, setFeedbackGiven] = useState(null);
    const [companyVerify, setCompanyVerify] = useState(null);
    const [companyLoading, setCompanyLoading] = useState(false);
    const textareaRef = useRef(null);

    // ─── Bulk CSV state ───
    const [csvFile, setCsvFile] = useState(null);
    const [bulkResults, setBulkResults] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    // ─── Image upload state ───
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => { if (token) fetchMyHistory(); }, [token]);

    const fetchMyHistory = async () => {
        try {
            const res = await authFetch('/api/my-predictions');
            if (res.ok) { const data = await res.json(); setMyHistory(data.predictions || []); }
        } catch (err) { console.error('Failed to fetch history:', err); }
    };

    /* ─── Single analysis (text or URL) ─── */
    const analyze = async () => {
        const isUrl = inputMode === 'url';
        const input = isUrl ? urlInput.trim() : jobText.trim();
        if (!input) return;

        setLoading(true); setPhase('scanning'); setScanProgress(0);
        setResult(null); setFeedbackGiven(null); setCompanyVerify(null);

        const scanInterval = setInterval(() => {
            setScanProgress(p => { if (p >= 95) { clearInterval(scanInterval); return 95; } return p + Math.random() * 12; });
        }, 150);

        try {
            const endpoint = isUrl ? '/api/predict-url' : '/api/predict';
            const body = isUrl ? { url: input } : { job_text: input };
            const req = { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } };
            const res = token ? await authFetch(endpoint, req) : await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, req);
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Analysis failed');

            clearInterval(scanInterval); setScanProgress(100);

            setTimeout(() => {
                setResult(data); setPhase('verdict'); setLoading(false);
                if (token) fetchMyHistory();
                if (data.scraped_company) verifyCompany(data.scraped_company);
            }, 600);
        } catch (err) {
            clearInterval(scanInterval); setLoading(false); setPhase('input');
            toast.error(err.message || 'Analysis failed');
        }
    };

    /* ─── Bulk CSV analysis ─── */
    const analyzeBulk = async () => {
        if (!csvFile || !token) return;
        setLoading(true); setPhase('scanning'); setScanProgress(0);
        setBulkResults(null);

        const scanInterval = setInterval(() => {
            setScanProgress(p => { if (p >= 95) { clearInterval(scanInterval); return 95; } return p + Math.random() * 8; });
        }, 200);

        try {
            const formData = new FormData();
            formData.append('file', csvFile);

            const res = await authFetch('/api/predict-bulk', {
                method: 'POST',
                headers: {},
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Bulk analysis failed');

            clearInterval(scanInterval); setScanProgress(100);

            setTimeout(() => {
                setBulkResults(data); setPhase('bulk-results'); setLoading(false);
            }, 400);
        } catch (err) {
            clearInterval(scanInterval); setLoading(false); setPhase('input');
            toast.error(err.message || 'Bulk analysis failed');
        }
    };

    /* ─── Image OCR analysis ─── */
    const analyzeImage = async () => {
        if (!imageFile) return;
        setLoading(true); setPhase('scanning'); setScanProgress(0);
        setResult(null); setFeedbackGiven(null); setCompanyVerify(null);

        const scanInterval = setInterval(() => {
            setScanProgress(p => { if (p >= 95) { clearInterval(scanInterval); return 95; } return p + Math.random() * 10; });
        }, 180);

        try {
            const formData = new FormData();
            formData.append('file', imageFile);
            const req = { method: 'POST', body: formData, headers: {} };
            const res = token ? await authFetch('/api/predict-image', req) : await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/predict-image`, req);
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Image analysis failed');

            clearInterval(scanInterval); setScanProgress(100);
            setTimeout(() => {
                setResult(data); setPhase('verdict'); setLoading(false);
                if (token) fetchMyHistory();
            }, 600);
        } catch (err) {
            clearInterval(scanInterval); setLoading(false); setPhase('input');
            toast.error(err.message || 'Image analysis failed');
        }
    };

    const downloadBulkCsv = async () => {
        if (!csvFile || !token) return;
        try {
            const formData = new FormData();
            formData.append('file', csvFile);
            const res = await authFetch('/api/predict-bulk/download', {
                method: 'POST',
                headers: {},
                body: formData,
            });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'bulk_results.csv'; a.click();
            URL.revokeObjectURL(url);
        } catch { toast.error('Download failed'); }
    };

    /* ─── Company verification ─── */
    const verifyCompany = async (name) => {
        if (!name) return;
        setCompanyLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/verify-company`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company_name: name }),
            });
            if (res.ok) setCompanyVerify(await res.json());
        } catch (err) { console.error('Company verification failed:', err); }
        finally { setCompanyLoading(false); }
    };

    /* ─── Feedback ─── */
    const submitFeedback = async (feedback) => {
        if (!result?.prediction_id || !token) return;
        try {
            const res = await authFetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prediction_id: result.prediction_id, feedback }),
            });
            if (res.ok) setFeedbackGiven(feedback);
        } catch (err) { console.error('Feedback failed:', err); }
    };

    const reset = () => {
        setPhase('input'); setResult(null); setBulkResults(null);
        setJobText(''); setUrlInput(''); setCsvFile(null); setImageFile(null); setImagePreview(null);
        setScanProgress(0); setFeedbackGiven(null); setCompanyVerify(null);
    };

    return (
        <div className="analyze-page" style={{ minHeight: '100vh', paddingTop: 80 }}>
            {/* ═══════════════ INPUT PHASE ═══════════════ */}
            {phase === 'input' && (
                <div className="analyze-surface" style={{ maxWidth: 800, margin: '0 auto', padding: '60px 40px' }}>

                    {/* ─── Hero Section ─── */}
                    <div className="analyze-chip" style={{ marginBottom: 20 }}>
                        <span className="pulse-dot" />
                        ANALYSIS MODULE — ENGINE ACTIVE
                    </div>
                    <h1 style={{
                        fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                        color: 'var(--text-primary)', lineHeight: 0.95, marginBottom: 16,
                    }}>
                        SCAN ANY<br />JOB POST<span style={{ color: 'var(--primary)' }}>.</span>
                    </h1>
                    <p style={{
                        fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '0.95rem',
                        color: 'var(--text-muted)', marginBottom: 36, maxWidth: 520, lineHeight: 1.6,
                    }}>
                        Paste text, enter a URL, or upload a CSV for batch analysis. Our NLP engine scans for scam patterns, deceptive language, and structural red flags.
                        {!user && (
                            <span style={{ display: 'block', marginTop: 10, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                <a href="/login" style={{ color: 'var(--success)', textDecoration: 'none', borderBottom: '1px solid var(--success)' }}>Sign in</a> to save history and use bulk analysis.
                            </span>
                        )}
                    </p>

                    {/* ─── Input Mode Tabs ─── */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
                        {[
                            { key: 'text', label: 'TEXT', Icon: FileText },
                            { key: 'url', label: 'URL', Icon: Link2 },
                            { key: 'csv', label: 'CSV', Icon: Table },
                            { key: 'image', label: 'IMAGE', Icon: Image },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setInputMode(tab.key)}
                                className={`analyze-tab${inputMode === tab.key ? ' active' : ''}`}
                            >
                                <tab.Icon size={14} strokeWidth={2} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ─── TEXT INPUT ─── */}
                    {inputMode === 'text' && (
                        <>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                                {SAMPLE_TEXTS.map(({ label, text }) => {
                                    const isSuspicious = label.includes('SUSPICIOUS');
                                    return (
                                        <button
                                            key={label}
                                            onClick={() => setJobText(text)}
                                            className={`analyze-sample-btn ${isSuspicious ? 'suspicious' : 'legit'}`}
                                        >
                                            {isSuspicious
                                                ? <AlertTriangle size={13} strokeWidth={2.5} />
                                                : <CheckCircle2 size={13} strokeWidth={2.5} />
                                            }
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className={`analyze-textarea-wrap${jobText ? ' has-text' : ''}`}>
                                <textarea
                                    ref={textareaRef} value={jobText} onChange={e => setJobText(e.target.value)}
                                    placeholder="Paste job description here..."
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                                <span className="mono" style={{ fontSize: '0.65rem' }}>{jobText.length} CHARACTERS</span>
                                <button onClick={analyze} className="btn-primary" disabled={!jobText.trim() || loading} style={{ minWidth: 220, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    ANALYZE POST <ArrowRight size={15} strokeWidth={2.5} />
                                </button>
                            </div>
                        </>
                    )}

                    {/* ─── URL INPUT ─── */}
                    {inputMode === 'url' && (
                        <div>
                            <p className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.06em' }}>
                                PASTE A JOB POSTING URL FROM LINKEDIN, INDEED, NAUKRI, ETC.
                            </p>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <input
                                    value={urlInput} onChange={e => setUrlInput(e.target.value)}
                                    placeholder="https://www.linkedin.com/jobs/view/..."
                                    style={{
                                        flex: 1, padding: '16px 20px', background: 'var(--bg-white)',
                                        border: '1.5px solid var(--border)', borderRadius: '12px',
                                        color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                                        fontSize: '0.85rem', outline: 'none',
                                    }}
                                    onKeyDown={e => e.key === 'Enter' && analyze()}
                                />
                                <button onClick={analyze} className="btn-primary" disabled={!urlInput.trim() || loading} style={{ minWidth: 160, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    SCAN URL <ArrowRight size={15} strokeWidth={2.5} />
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                                {['LinkedIn', 'Indeed', 'Naukri', 'Glassdoor'].map(site => (
                                    <span key={site} className="mono" style={{ fontSize: '0.55rem', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: '100px', color: 'var(--text-muted)' }}>
                                        {site.toUpperCase()}
                                    </span>
                                ))}
                                <span className="mono" style={{ fontSize: '0.55rem', padding: '4px 10px', color: 'var(--text-muted)' }}>+ ANY JOB SITE</span>
                            </div>
                        </div>
                    )}

                    {/* ─── CSV BULK INPUT ─── */}
                    {inputMode === 'csv' && (
                        <div>
                            {!token && (
                                <div style={{ padding: '14px 20px', border: '1px solid var(--danger)', background: 'var(--danger-light)', borderRadius: 10, marginBottom: 20 }}>
                                    <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--danger)' }}>
                                        ⚠ You must <a href="/login" style={{ color: 'var(--success)', textDecoration: 'underline' }}>sign in</a> to use bulk analysis.
                                    </span>
                                </div>
                            )}
                            <div
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.csv')) setCsvFile(f); }}
                                onClick={() => document.getElementById('csvInput')?.click()}
                                className="analyze-dropzone"
                                style={{
                                    border: `2px dashed ${dragOver ? 'var(--success)' : 'var(--border)'}`,
                                    background: dragOver ? 'var(--success-light)' : 'var(--bg-white)',
                                    padding: '60px 40px', textAlign: 'center', cursor: 'pointer',
                                }}
                            >
                                <input id="csvInput" type="file" accept=".csv" style={{ display: 'none' }}
                                    onChange={e => { if (e.target.files[0]) setCsvFile(e.target.files[0]); }} />
                                {csvFile ? (
                                    <>
                                        <div style={{ fontSize: '2rem', marginBottom: 12 }}>📄</div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 4 }}>{csvFile.name}</div>
                                        <div className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{(csvFile.size / 1024).toFixed(1)} KB — CLICK TO CHANGE</div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ fontSize: '2.5rem', marginBottom: 16, opacity: 0.4 }}>⬆</div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                                            DROP CSV FILE HERE OR CLICK TO BROWSE
                                        </div>
                                        <div className="mono" style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                                            COLUMNS: job_text / description / text — MAX 500 ROWS
                                        </div>
                                    </>
                                )}
                            </div>
                            {csvFile && (
                                <button onClick={analyzeBulk} className="btn-primary" disabled={loading || !token}
                                    style={{ width: '100%', padding: '16px', fontSize: '0.85rem', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    {loading ? '● ANALYZING...' : <>{`ANALYZE ${csvFile.name.toUpperCase()}`} <ArrowRight size={15} /></>}
                                </button>
                            )}
                        </div>
                    )}

                    {/* ─── IMAGE UPLOAD ─── */}
                    {inputMode === 'image' && (
                        <div>
                            <p className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.06em' }}>
                                UPLOAD A SCREENSHOT OF A JOB POSTING — OCR WILL EXTRACT THE TEXT
                            </p>
                            <div
                                onClick={() => document.getElementById('imageInput')?.click()}
                                className="analyze-dropzone"
                                style={{
                                    border: '2px dashed var(--border)', background: 'var(--bg-white)',
                                    padding: imagePreview ? '20px' : '60px 40px',
                                    textAlign: 'center', cursor: 'pointer',
                                }}
                            >
                                <input id="imageInput" type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={e => {
                                        const f = e.target.files[0];
                                        if (f) {
                                            setImageFile(f);
                                            const reader = new FileReader();
                                            reader.onload = (ev) => setImagePreview(ev.target.result);
                                            reader.readAsDataURL(f);
                                        }
                                    }} />
                                {imagePreview ? (
                                    <div>
                                        <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain', marginBottom: 12, opacity: 0.9 }} />
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)', marginBottom: 4 }}>{imageFile?.name}</div>
                                        <div className="mono" style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>CLICK TO CHANGE</div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ fontSize: '2.5rem', marginBottom: 16, opacity: 0.4 }}>📷</div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                                            CLICK TO UPLOAD A SCREENSHOT
                                        </div>
                                        <div className="mono" style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                                            PNG, JPEG, WEBP, BMP, TIFF — MAX 10 MB
                                        </div>
                                    </>
                                )}
                            </div>
                            {imageFile && (
                                <button onClick={analyzeImage} className="btn-primary" disabled={loading}
                                    style={{ width: '100%', padding: '16px', fontSize: '0.85rem', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    {loading ? '● EXTRACTING TEXT...' : <>ANALYZE SCREENSHOT <ArrowRight size={15} /></>}
                                </button>
                            )}
                        </div>
                    )}

                    {/* ═══ USER HISTORY ═══ */}
                    {user && myHistory.length > 0 && (
                        <div style={{ marginTop: 56 }}>
                            <div onClick={() => setShowHistory(!showHistory)}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: 16 }}>
                                <div className="mono" style={{ fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--success)' }}>
                                    ■ YOUR RECENT ANALYSES ({myHistory.length})
                                </div>
                                <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                    {showHistory ? '▲ HIDE' : '▼ SHOW'}
                                </span>
                            </div>
                            {showHistory && (
                                <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px 120px', borderBottom: '1px solid var(--border)', padding: '10px 16px' }}>
                                        {['JOB TEXT', 'VERDICT', 'CONF.', 'TIME'].map(h => (
                                            <div key={h} className="mono" style={{ fontSize: '0.5rem', letterSpacing: '0.1em' }}>{h}</div>
                                        ))}
                                    </div>
                                    {myHistory.map((p, i) => (
                                        <div key={p.id} style={{
                                            display: 'grid', gridTemplateColumns: '1fr 90px 70px 120px',
                                            padding: '12px 16px', borderBottom: i < myHistory.length - 1 ? '1px solid var(--border)' : 'none',
                                            transition: 'background 0.1s',
                                        }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{p.job_text}</div>
                                            <div><span className={p.prediction === 'Fake' ? 'tag-red' : 'tag-teal'} style={{ fontSize: '0.6rem', padding: '2px 8px' }}>{p.prediction === 'Fake' ? 'FRAUD' : 'LEGIT'}</span></div>
                                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: p.prediction === 'Fake' ? 'var(--danger)' : 'var(--success)' }}>{p.confidence}%</div>
                                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>{formatLocalTime(p.created_at)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════ SCANNING PHASE ═══════════════ */}
            {phase === 'scanning' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)', padding: '40px' }}>
                    <div className="mono" style={{ color: 'var(--danger)', marginBottom: 32, fontSize: '0.72rem', animation: 'blink 1s infinite' }}>
                        ■ {inputMode === 'csv' ? 'BULK PROCESSING' : inputMode === 'url' ? 'SCRAPING & SCANNING' : inputMode === 'image' ? 'EXTRACTING TEXT (OCR)' : 'SCANNING IN PROGRESS'}
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: 'var(--text-primary)', textAlign: 'center', marginBottom: 48 }}>
                        {inputMode === 'csv' ? <>PROCESSING<br />BATCH</> : <>ANALYZING<br />SIGNALS</>}
                    </h2>
                    <div style={{ width: '100%', maxWidth: 400, height: 2, background: 'var(--border)', marginBottom: 16, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(scanProgress, 100)}%`, background: 'var(--danger)', transition: 'width 0.1s linear' }} />
                    </div>
                    <span className="mono" style={{ fontSize: '0.65rem' }}>
                        {Math.min(Math.round(scanProgress), 100)}% — {inputMode === 'csv' ? 'ANALYZING ROWS' : inputMode === 'url' ? 'SCRAPING PAGE' : inputMode === 'image' ? 'RUNNING OCR' : 'CHECKING FRAUD VECTORS'}
                    </span>
                    <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.5 }}>
                        {(inputMode === 'csv'
                            ? ['Reading CSV rows', 'Preprocessing text', 'Running ML pipeline', 'Aggregating results', 'Building report']
                            : [inputMode === 'url' ? 'Fetching page content' : 'Language patterns', 'Financial red flags', 'Identity harvesting signals', 'Structural anomalies', 'Urgency indicators']
                        ).map((item, i) => (
                            <div key={item} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: scanProgress > i * 20 ? 'var(--text-secondary)' : 'var(--border)', letterSpacing: '0.04em', transition: 'color 0.3s' }}>
                                {scanProgress > i * 20 ? '✓' : '○'} {item.toUpperCase()}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══════════════ SINGLE VERDICT PHASE ═══════════════ */}
            {phase === 'verdict' && result && (
                <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 40px 60px', flex: 1 }}>
                        {/* URL scraped info */}
                        {result.scraped_title && (
                            <div style={{ marginBottom: 24, padding: '12px 20px', border: '1px solid var(--border)', background: 'var(--bg-white)', maxWidth: 500, width: '100%', textAlign: 'center' }}>
                                <div className="mono" style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: 4 }}>SCRAPED FROM URL</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{result.scraped_title}</div>
                                {result.scraped_company && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        {result.scraped_company}
                                        {companyVerify && (
                                            <span style={{
                                                fontSize: '0.6rem', padding: '2px 8px', borderRadius: 2, fontFamily: 'var(--font-mono)',
                                                background: companyVerify.verified ? 'var(--success-light)' : 'var(--danger-light)',
                                                color: companyVerify.verified ? 'var(--success)' : 'var(--danger)',
                                                border: `1px solid ${companyVerify.verified ? 'var(--success)' : 'var(--danger)'}`,
                                            }}>
                                                {companyVerify.verified ? '✓ VERIFIED' : '✗ UNVERIFIED'}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Stamp */}
                        <div className={`verdict-stamp ${result.prediction === 'Fake' ? 'verdict-fraud' : 'verdict-legit'}`}
                            style={{ animation: 'stamp-in 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) forwards', marginBottom: 40 }}>
                            {result.prediction === 'Fake' ? 'LIKELY FRAUD' : 'LIKELY LEGIT'}
                        </div>

                        {/* Confidence */}
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 24 }}>
                            CONFIDENCE: <span style={{ color: result.prediction === 'Fake' ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>{result.confidence}%</span>
                        </div>

                        {/* Explanation */}
                        <div style={{ maxWidth: 500, padding: '20px 24px', borderLeft: `3px solid ${result.prediction === 'Fake' ? 'var(--danger)' : 'var(--success)'}`, background: result.prediction === 'Fake' ? 'var(--red-glow)' : 'var(--teal-glow)', marginBottom: 32 }}>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 400, lineHeight: 1.6, color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
                                {result.prediction === 'Fake'
                                    ? `This job posting shows patterns commonly associated with recruitment fraud. Our AI detected signals with ${result.confidence}% confidence that this is not a legitimate opportunity.`
                                    : `This job posting appears to be a legitimate opportunity. Standard job requirements, professional language, and structural integrity all check out.`}
                            </p>
                        </div>

                        {/* ═══ MULTI-LANGUAGE & A/B TEST INFO ═══ */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32, width: '100%', maxWidth: 550 }}>
                            {/* Feature 7: Language Badge */}
                            {result.detected_language && result.detected_language !== 'en' && (
                                <div style={{ padding: '10px 16px', background: 'var(--bg-subtle)', borderLeft: '3px solid var(--text-muted)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: '1.2rem' }}>🌐</span>
                                    <div>
                                        <div className="mono" style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>DETECTED LANGUAGE</div>
                                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                            Translated from <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{result.detected_language}</span> to English for analysis
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Feature 10: A/B Test Result */}
                            {result.model_b_result && (
                                <div style={{ padding: '10px 16px', background: '#e0f2fe10', border: '1px solid #e0f2fe30' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <span className="mono" style={{ fontSize: '0.55rem', color: 'var(--primary-light)' }}>🔍 MODEL A/B TEST ACTIVE</span>
                                        <span className="mono" style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Comparison</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            Secondary Model ({result.model_b_result.model})
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{
                                                fontSize: '0.65rem', fontWeight: 600, padding: '2px 6px', borderRadius: 2,
                                                background: result.model_b_result.prediction === 'Fake' ? 'var(--danger-light)' : 'var(--success-light)',
                                                color: result.model_b_result.prediction === 'Fake' ? 'var(--danger)' : 'var(--success)'
                                            }}>
                                                {result.model_b_result.prediction.toUpperCase()}
                                            </span>
                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                                                {result.model_b_result.confidence}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ═══ RISK BREAKDOWN ═══ */}
                        {result.risk_factors?.length > 0 && (
                            <div style={{ width: '100%', maxWidth: 550, marginBottom: 36 }}>
                                <div className="mono" style={{ fontSize: '0.6rem', letterSpacing: '0.1em', color: result.prediction === 'Fake' ? 'var(--danger)' : 'var(--success)', marginBottom: 14 }}>
                                    ■ RISK BREAKDOWN — TOP SIGNALS
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {result.risk_factors.map((rf, i) => {
                                        const rs = RISK_COLORS[rf.category] || RISK_COLORS['Suspicious Pattern'];
                                        const maxW = result.risk_factors[0]?.weight || 1;
                                        const barW = Math.max(10, (rf.weight / maxW) * 100);
                                        return (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: rs.bg, borderLeft: `3px solid ${rs.border}` }}>
                                                <span style={{ fontSize: '0.9rem', width: 20 }}>{rs.icon}</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-primary)', fontWeight: 600 }}>"{rf.phrase}"</span>
                                                        <span className="mono" style={{ fontSize: '0.5rem', color: rs.border, padding: '1px 6px', border: `1px solid ${rs.border}40` }}>{rf.category.toUpperCase()}</span>
                                                    </div>
                                                    <div style={{ height: 3, background: 'var(--border)', width: '100%' }}>
                                                        <div style={{ height: '100%', width: `${barW}%`, background: rs.border, transition: 'width 0.6s ease' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Company input (text mode) */}
                        {!result.scraped_company && (
                            <div style={{ width: '100%', maxWidth: 550, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <input placeholder="Enter company name to verify..." id="companyInput" style={{
                                    flex: 1, padding: '10px 14px', background: 'var(--bg-white)', border: '1.5px solid var(--border)',
                                    borderRadius: '10px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                                    fontSize: '0.75rem', outline: 'none', transition: 'all 0.2s',
                                }} onFocus={e => { e.target.style.borderColor = 'var(--success)'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.15)'; }}
                                   onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                                   onKeyDown={e => { if (e.key === 'Enter') verifyCompany(e.target.value); }} />
                                <button className="btn-outline" style={{ fontSize: '0.6rem', padding: '10px 16px' }} disabled={companyLoading}
                                    onClick={() => { const inp = document.getElementById('companyInput'); if (inp?.value) verifyCompany(inp.value); }}>
                                    {companyLoading ? '...' : '✓ VERIFY'}
                                </button>
                                {companyVerify && (
                                    <span style={{
                                        fontSize: '0.6rem', padding: '4px 10px', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
                                        background: companyVerify.verified ? 'var(--success-light)' : 'var(--danger-light)',
                                        color: companyVerify.verified ? 'var(--success)' : 'var(--danger)',
                                        border: `1px solid ${companyVerify.verified ? 'var(--success)' : 'var(--danger)'}`,
                                    }}>
                                        {companyVerify.verified ? `✓ ${companyVerify.match_type.toUpperCase()} MATCH (${companyVerify.confidence}%)` : '✗ NOT FOUND'}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Confidence meter */}
                        <div style={{ width: '100%', maxWidth: 500, marginBottom: 40 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--success)' }}>LEGIT</span>
                                <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--danger)' }}>FRAUD</span>
                            </div>
                            <div style={{ width: '100%', height: 4, background: 'var(--border)', position: 'relative' }}>
                                <div style={{
                                    position: 'absolute', left: result.prediction === 'Fake' ? `${50 + (result.confidence / 2)}%` : `${50 - (result.confidence / 2)}%`,
                                    top: -4, width: 12, height: 12, background: result.prediction === 'Fake' ? 'var(--danger)' : 'var(--success)',
                                    transform: 'rotate(45deg)', transition: 'left 1s ease',
                                }} />
                                <div style={{ position: 'absolute', left: '50%', top: -2, width: 1, height: 8, background: 'var(--text-muted)' }} />
                            </div>
                        </div>

                        {/* Feedback */}
                        {token && (
                            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>IS THIS VERDICT ACCURATE?</span>
                                {feedbackGiven ? (
                                    <span className="mono" style={{
                                        fontSize: '0.6rem', padding: '4px 12px',
                                        background: feedbackGiven === 'agree' ? 'var(--success-light)' : 'var(--danger-light)',
                                        color: feedbackGiven === 'agree' ? 'var(--success)' : 'var(--danger)',
                                        border: `1px solid ${feedbackGiven === 'agree' ? 'var(--success)' : 'var(--danger)'}`,
                                    }}>
                                        {feedbackGiven === 'agree' ? '✓ AGREED' : '✗ DISAGREED'} — THANKS!
                                    </span>
                                ) : (
                                    <>
                                        <button onClick={() => submitFeedback('agree')} style={{
                                            padding: '6px 16px', fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
                                            background: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success)',
                                            cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.2s',
                                        }} onMouseEnter={e => e.target.style.background = 'rgba(16,185,129,0.2)'} onMouseLeave={e => e.target.style.background = 'var(--success-light)'}>✓ AGREE</button>
                                        <button onClick={() => submitFeedback('disagree')} style={{
                                            padding: '6px 16px', fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
                                            background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)',
                                            cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.2s',
                                        }} onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.2)'} onMouseLeave={e => e.target.style.background = 'var(--danger-light)'}>✗ DISAGREE</button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={reset} className="btn-primary">ANALYZE ANOTHER</button>
                            {result.prediction === 'Fake' && token && (
                                <button className="btn-outline" onClick={async () => {
                                    try {
                                        await authFetch('/api/flag', {
                                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ prediction_id: result.prediction_id, reason: 'Flagged by user review' })
                                        });
                                        toast.success('Post flagged for review.');
                                    } catch { toast.error('Failed to flag.'); }
                                }}>⚑ FLAG FOR REVIEW</button>
                            )}
                        </div>

                        {!user && (
                            <div style={{ marginTop: 24, padding: '12px 20px', border: '1px solid var(--border)', background: 'var(--bg-white)' }}>
                                <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                                    <a href="/login" style={{ color: 'var(--success)', textDecoration: 'none', borderBottom: '1px solid var(--success)' }}>Sign in</a> to save this result, give feedback, and access your analysis history
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Case File */}
                    <div style={{ borderTop: '1px solid var(--border)', padding: '40px', background: 'var(--bg-white)' }}>
                        <div style={{ maxWidth: 700, margin: '0 auto' }}>
                            <div className="mono" style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.68rem' }}>■ CASE FILE #{result.prediction_id || '—'}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--border)' }}>
                                {[
                                    { label: 'CLASSIFICATION', value: result.prediction?.toUpperCase(), color: result.prediction === 'Fake' ? 'var(--danger)' : 'var(--success)' },
                                    { label: 'CONFIDENCE', value: `${result.confidence}%`, color: 'var(--text-primary)' },
                                    { label: 'ANALYZED', value: formatLocalTime(result.analyzed_at), color: 'var(--text-secondary)' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} style={{ background: 'var(--bg-white)', padding: '20px 24px' }}>
                                        <div className="mono" style={{ fontSize: '0.6rem', marginBottom: 8 }}>{label}</div>
                                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color }}>{value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════ BULK RESULTS PHASE ═══════════════ */}
            {phase === 'bulk-results' && bulkResults && (
                <div className="analyze-surface" style={{ maxWidth: 900, margin: '0 auto', padding: '60px 40px' }}>
                    <div className="mono" style={{ color: 'var(--danger)', marginBottom: 16 }}>■ BULK ANALYSIS REPORT</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'var(--text-primary)', lineHeight: 0.95, marginBottom: 32 }}>
                        BATCH COMPLETE.
                    </h2>

                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--border)', marginBottom: 32 }}>
                        {[
                            { label: 'TOTAL', value: bulkResults.total_analyzed, color: 'var(--text-primary)' },
                            { label: 'LEGITIMATE', value: bulkResults.total_real, color: 'var(--success)' },
                            { label: 'FRAUDULENT', value: bulkResults.total_fake, color: 'var(--danger)' },
                            { label: 'FRAUD RATE', value: `${bulkResults.fraud_rate}%`, color: bulkResults.fraud_rate > 30 ? 'var(--danger)' : 'var(--success)' },
                        ].map(({ label, value, color }) => (
                            <div key={label} style={{ background: 'var(--bg-white)', padding: '24px 20px', textAlign: 'center' }}>
                                <div className="mono" style={{ fontSize: '0.55rem', marginBottom: 10, color: 'var(--text-muted)' }}>{label}</div>
                                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color }}>{value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Distribution Bar */}
                    <div style={{ marginBottom: 32 }}>
                        <div className="mono" style={{ fontSize: '0.55rem', marginBottom: 8, color: 'var(--text-muted)' }}>FRAUD VS LEGIT DISTRIBUTION</div>
                        <div style={{ display: 'flex', height: 8, background: 'var(--border)', overflow: 'hidden' }}>
                            <div style={{ width: `${100 - bulkResults.fraud_rate}%`, background: 'var(--success)', transition: 'width 1s ease' }} />
                            <div style={{ width: `${bulkResults.fraud_rate}%`, background: 'var(--danger)', transition: 'width 1s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                            <span className="mono" style={{ fontSize: '0.55rem', color: 'var(--success)' }}>LEGIT {(100 - bulkResults.fraud_rate).toFixed(1)}%</span>
                            <span className="mono" style={{ fontSize: '0.55rem', color: 'var(--danger)' }}>FRAUD {bulkResults.fraud_rate}%</span>
                        </div>
                    </div>

                    {/* Results Table */}
                    <div className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 12 }}>■ INDIVIDUAL RESULTS ({bulkResults.results.length} ROWS)</div>
                    <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', overflow: 'hidden', maxHeight: 500, overflowY: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 90px 80px', padding: '10px 16px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-white)', zIndex: 1 }}>
                            {['ROW', 'PREVIEW', 'VERDICT', 'CONF.'].map(h => (
                                <div key={h} className="mono" style={{ fontSize: '0.5rem', letterSpacing: '0.1em' }}>{h}</div>
                            ))}
                        </div>
                        {bulkResults.results.map((row, i) => (
                            <div key={i} style={{
                                display: 'grid', gridTemplateColumns: '50px 1fr 90px 80px', padding: '10px 16px',
                                borderBottom: i < bulkResults.results.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s',
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{row.row}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{row.preview}</div>
                                <div>
                                    <span className={row.prediction === 'Fake' ? 'tag-red' : row.prediction === 'Real' ? 'tag-teal' : ''} style={{
                                        fontSize: '0.55rem', padding: '2px 8px',
                                        ...(row.prediction === 'Skipped' ? { background: 'rgba(148,163,184,0.15)', color: 'var(--text-muted)', border: '1px solid var(--border)' } : {}),
                                    }}>
                                        {row.prediction === 'Fake' ? 'FRAUD' : row.prediction === 'Real' ? 'LEGIT' : 'SKIP'}
                                    </span>
                                </div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: row.prediction === 'Fake' ? 'var(--danger)' : row.prediction === 'Real' ? 'var(--success)' : 'var(--text-muted)' }}>{row.confidence}%</div>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                        <button onClick={downloadBulkCsv} className="btn-primary">↓ DOWNLOAD CSV RESULTS</button>
                        <button onClick={reset} className="btn-outline">ANALYZE MORE</button>
                    </div>
                </div>
            )}
        </div>
    );
}
