'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
    AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';



function formatLocalTime(isoString) {
    if (!isoString) return '—';
    try {
        const dateStr = isoString.endsWith('Z') || isoString.includes('+')
            ? isoString
            : isoString + 'Z';
        const d = new Date(dateStr);
        return d.toLocaleString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
    } catch {
        return isoString;
    }
}

function StatCard({ icon, label, value, subtitle }) {
    return (
        <div style={{
            background: 'var(--card-bg)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            boxShadow: 'var(--card-shadow)',
            transition: 'transform 0.25s ease, box-shadow 0.25s ease',
            cursor: 'default',
        }}
        onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 24px 56px rgba(0,0,0,0.12)';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--card-shadow)';
        }}>
            <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                fontSize: '24px',
            }}>
                {icon}
            </div>
            <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '2rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                lineHeight: '1',
                marginBottom: '8px',
            }}>
                {value}
            </div>
            <div style={{
                fontSize: '0.875rem',
                color: 'var(--text-muted)',
                fontWeight: '500',
                marginBottom: '4px',
            }}>
                {label}
            </div>
            {subtitle && (
                <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                }}>
                    {subtitle}
                </div>
            )}
        </div>
    );
}

const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            boxShadow: 'var(--shadow-lg)',
        }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
                {label}
            </div>
            {payload.map((p, i) => (
                <div key={i} style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.813rem',
                    color: p.color || p.fill,
                    marginTop: '4px',
                }}>
                    {p.name}: {p.value}
                </div>
            ))}
        </div>
    );
};

const axisStyle = { fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--text-muted)' };
const gridStyle = { stroke: 'var(--border)', strokeDasharray: '3 3' };
const toPercent = (value, digits = 1) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const pct = n <= 1 ? n * 100 : n;
    return pct.toFixed(digits);
};

export default function AdminPage() {
    const { user, authFetch } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState(null);
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retraining, setRetraining] = useState(false);
    const [exportingPDF, setExportingPDF] = useState(false);
    const reportRef = useRef(null);

    useEffect(() => {
        if (!user) {
            router.push('/');
            return;
        }
        if (user.role !== 'admin') {
            router.push('/');
            return;
        }
        fetchData();
    }, [user, router]);

    const fetchData = async () => {
        try {
            const [statsRes, predRes] = await Promise.all([
                authFetch('/api/stats'),
                authFetch('/api/predictions'),
            ]);
            const statsData = await statsRes.json();
            const predData = await predRes.json();
            setStats(statsData);
            setPredictions(predData.predictions || []);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleRetrain = async () => {
        if (!confirm('Retrain the model? This may take a few minutes.')) return;
        setRetraining(true);
        try {
            await authFetch('/api/retrain', { method: 'POST' });
            toast.success('Model retrained successfully.');
            fetchData();
        } catch (err) {
            toast.error('Retrain failed: ' + err.message);
        } finally {
            setRetraining(false);
        }
    };

    const exportCSV = () => {
        const rows = [['ID', 'Date', 'Text Snippet', 'Prediction', 'Confidence', 'Model', 'Flagged']];
        predictions.forEach(p => {
            rows.push([
                p.id,
                formatLocalTime(p.created_at),
                (p.text_snippet || '').replace(/,/g, ';'),
                p.prediction,
                p.confidence,
                p.model_used || '—',
                p.flagged ? 'Yes' : 'No'
            ]);
        });
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin_predictions_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportPDF = async () => {
        if (!reportRef.current) return;
        setExportingPDF(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');
            await import('jspdf-autotable');

            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // Add header
            pdf.setFontSize(20);
            pdf.setTextColor(17, 24, 39);
            pdf.text('Admin Dashboard Report', 15, 20);
            
            pdf.setFontSize(10);
            pdf.setTextColor(107, 114, 128);
            pdf.text(`Generated: ${new Date().toLocaleString()}`, 15, 28);
            
            let yPos = 40;

            // Stats summary
            if (stats) {
                pdf.setFontSize(14);
                pdf.setTextColor(17, 24, 39);
                pdf.text('System Statistics', 15, yPos);
                yPos += 10;

                const summaryData = [
                    ['Total Predictions', stats.total_predictions || 0],
                    ['Fraud Detected', stats.fraud_count || stats.total_fake || 0],
                    ['Verified Legit', stats.legit_count || stats.total_real || 0],
                    ['Fraud Rate', `${stats.fraud_rate || 0}%`],
                    ['Model Accuracy', modelAccuracyPct !== null ? `${modelAccuracyPct}%` : '—'],
                ];

                pdf.autoTable({
                    startY: yPos,
                    head: [['Metric', 'Value']],
                    body: summaryData,
                    theme: 'grid',
                    headStyles: { fillColor: [29, 78, 216], textColor: 255 },
                    styles: { fontSize: 9 },
                    margin: { left: 15, right: 15 },
                });

                yPos = pdf.lastAutoTable.finalY + 15;
            }

            // Predictions table
            pdf.setFontSize(14);
            pdf.setTextColor(17, 24, 39);
            pdf.text('Recent Predictions', 15, yPos);
            yPos += 10;

            const tableData = predictions.slice(0, 50).map(p => [
                p.id,
                formatLocalTime(p.created_at),
                (p.text_snippet || '').substring(0, 50) + '...',
                p.prediction,
                p.confidence + '%',
                p.model_used || '—',
                p.flagged ? 'Yes' : 'No'
            ]);

            pdf.autoTable({
                startY: yPos,
                head: [['ID', 'Date', 'Text', 'Verdict', 'Conf.', 'Model', 'Flag']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [29, 78, 216], textColor: 255 },
                styles: { fontSize: 7 },
                columnStyles: {
                    0: { cellWidth: 15 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 60 },
                    3: { cellWidth: 20 },
                    4: { cellWidth: 15 },
                    5: { cellWidth: 25 },
                    6: { cellWidth: 15 },
                },
                margin: { left: 15, right: 15 },
            });

            pdf.save(`admin_dashboard_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (err) {
            console.error('PDF export failed:', err);
            toast.error('PDF export failed. Check console.');
        } finally {
            setExportingPDF(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: '80px',
            }}>
                <div style={{
                    textAlign: 'center',
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid var(--bg-muted)',
                        borderTopColor: 'var(--primary)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px',
                    }} />
                    <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                    }}>
                        Loading Dashboard...
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: '80px',
            }}>
                <div style={{
                    backgroundColor: 'var(--danger-light)',
                    border: '1px solid var(--danger)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    maxWidth: '400px',
                    textAlign: 'center',
                }}>
                    <div style={{
                        fontSize: '2rem',
                        marginBottom: '12px',
                    }}>⚠️</div>
                    <div style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: 'var(--danger)',
                        marginBottom: '8px',
                    }}>
                        Error Loading Dashboard
                    </div>
                    <div style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                    }}>
                        {error}
                    </div>
                </div>
            </div>
        );
    }

    // Derived data
    const modelInfo = stats?.model_info || {};
    const modelAccuracyPct = toPercent(
        stats?.accuracy ?? stats?.model_accuracy ?? modelInfo?.accuracy ?? modelInfo?.test_accuracy
    );
    const avgConfidencePct = toPercent(
        stats?.avg_confidence ?? modelInfo?.avg_confidence
    );

    const pieData = stats ? [
        { name: 'Fraud', value: stats.fraud_count || stats.total_fake || 0 },
        { name: 'Legit', value: stats.legit_count || stats.total_real || 0 },
    ] : [];

    const trendData = (stats?.daily_trend || []).map((entry) => ({
        ...entry,
        fraud: entry.fraud ?? entry.fake ?? 0,
        legit: entry.legit ?? entry.real ?? 0,
    }));

    const modelCompData = Array.isArray(stats?.model_comparison) && stats.model_comparison.length > 0
        ? stats.model_comparison.map(r => ({
            name: r.model?.replace('Regression', 'Reg.').replace('Gradient Boosting', 'GB').substring(0, 12),
            Accuracy: Number(toPercent(r.accuracy, 0) || 0),
            Precision: Number(toPercent(r.precision, 0) || 0),
            Recall: Number(toPercent(r.recall, 0) || 0),
            F1: Number(toPercent(r.f1, 0) || 0),
        }))
        : (Number.isFinite(Number(modelInfo?.accuracy)) ||
            Number.isFinite(Number(modelInfo?.precision)) ||
            Number.isFinite(Number(modelInfo?.recall)))
            ? [{
                name: (modelInfo?.model_name || 'Current Model')
                    .replace('Regression', 'Reg.')
                    .replace('Gradient Boosting', 'GB')
                    .substring(0, 12),
                Accuracy: Number(toPercent(modelInfo?.accuracy, 0) || 0),
                Precision: Number(toPercent(modelInfo?.precision, 0) || 0),
                Recall: Number(toPercent(modelInfo?.recall, 0) || 0),
                F1: Number(toPercent(modelInfo?.f1_score ?? modelInfo?.f1, 0) || 0),
            }]
            : [];

    const confBuckets = { '0-20%': 0, '20-40%': 0, '40-60%': 0, '60-80%': 0, '80-100%': 0 };
    predictions.forEach(p => {
        const c = p.confidence;
        if (c <= 20) confBuckets['0-20%']++;
        else if (c <= 40) confBuckets['20-40%']++;
        else if (c <= 60) confBuckets['40-60%']++;
        else if (c <= 80) confBuckets['60-80%']++;
        else confBuckets['80-100%']++;
    });
    const confDistData = Object.entries(confBuckets).map(([range, count]) => ({ range, count }));

    const fraudRate = stats?.total_predictions > 0
        ? ((((stats.fraud_count || stats.total_fake) / stats.total_predictions) * 100).toFixed(1))
        : '0';

    return (
        <>
            <style jsx global>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
            <div className="premium-page" style={{
                minHeight: '100vh',
                paddingTop: '80px',
                fontFamily: 'var(--font-body)',
            }}>
                <div ref={reportRef} style={{
                    maxWidth: '1280px',
                    margin: '0 auto',
                    padding: '40px 24px',
                }}>
                    {/* HEADER */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '40px',
                        flexWrap: 'wrap',
                        gap: '20px',
                    }}>
                        <div>
                            <h1 style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: 'clamp(2rem, 5vw, 2.5rem)',
                                fontWeight: '700',
                                color: 'var(--text-primary)',
                                marginBottom: '8px',
                                lineHeight: '1.2',
                            }}>
                                Admin Dashboard
                            </h1>
                            <p style={{
                                fontSize: '1rem',
                                color: 'var(--text-secondary)',
                                margin: '0',
                            }}>
                                System Analytics & Management
                            </p>
                        </div>
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            flexWrap: 'wrap',
                        }}>
                            <button
                                onClick={exportCSV}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--card-bg)',
                                    color: 'var(--primary)',
                                    border: '1px solid var(--primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontFamily: 'var(--font-body)',
                                    boxShadow: 'var(--card-shadow)',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.backgroundColor = 'var(--primary-lighter)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 24px 56px rgba(0,0,0,0.12)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.backgroundColor = 'var(--card-bg)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'var(--card-shadow)';
                                }}
                                onFocus={e => e.currentTarget.style.outline = '2px solid var(--primary)'}
                                onBlur={e => e.currentTarget.style.outline = 'none'}
                            >
                                📥 Export CSV
                            </button>
                            <button
                                onClick={exportPDF}
                                disabled={exportingPDF}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--card-bg)',
                                    color: 'var(--primary)',
                                    border: '1px solid var(--primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    cursor: exportingPDF ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    fontFamily: 'var(--font-body)',
                                    opacity: exportingPDF ? 0.6 : 1,
                                    boxShadow: 'var(--card-shadow)',
                                }}
                                onMouseEnter={e => {
                                    if (!exportingPDF) {
                                        e.currentTarget.style.backgroundColor = 'var(--primary-lighter)';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 24px 56px rgba(0,0,0,0.12)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!exportingPDF) {
                                        e.currentTarget.style.backgroundColor = 'var(--card-bg)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'var(--card-shadow)';
                                    }
                                }}
                                onFocus={e => e.currentTarget.style.outline = '2px solid var(--primary)'}
                                onBlur={e => e.currentTarget.style.outline = 'none'}
                            >
                                {exportingPDF ? '⏳ Exporting...' : '📄 Export PDF'}
                            </button>
                            <button
                                onClick={handleRetrain}
                                disabled={retraining}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--warning)',
                                    color: 'var(--text-inverse)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    cursor: retraining ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    fontFamily: 'var(--font-body)',
                                    opacity: retraining ? 0.6 : 1,
                                    boxShadow: 'var(--card-shadow)',
                                }}
                                onMouseEnter={e => {
                                    if (!retraining) {
                                        e.currentTarget.style.backgroundColor = '#ea580c';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 24px 56px rgba(0,0,0,0.12)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!retraining) {
                                        e.currentTarget.style.backgroundColor = 'var(--warning)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'var(--card-shadow)';
                                    }
                                }}
                                onFocus={e => e.currentTarget.style.outline = '2px solid var(--warning)'}
                                onBlur={e => e.currentTarget.style.outline = 'none'}
                            >
                                {retraining ? '⏳ Training...' : '🔄 Retrain Model'}
                            </button>
                        </div>
                    </div>

                    {/* STAT CARDS */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '20px',
                        marginBottom: '40px',
                    }}>
                        <StatCard
                            icon="📊"
                            label="Total Scans"
                            value={stats?.total_predictions || 0}
                        />
                        <StatCard
                            icon="🚨"
                            label="Fraud Detected"
                            value={stats?.fraud_count || stats?.total_fake || 0}
                            subtitle={`${fraudRate}% of total`}
                        />
                        <StatCard
                            icon="✅"
                            label="Verified Legit"
                            value={stats?.legit_count || stats?.total_real || 0}
                        />
                        <StatCard
                            icon="🎯"
                            label="Model Accuracy"
                            value={modelAccuracyPct !== null ? `${Number(modelAccuracyPct).toFixed(0)}%` : '—'}
                            subtitle={avgConfidencePct !== null ? `${avgConfidencePct}% avg conf.` : ''}
                        />
                    </div>

                    {/* CHARTS ROW 1 */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '20px',
                        marginBottom: '20px',
                    }}>
                        {/* Daily Trend Chart */}
                        <div style={{
                            background: 'var(--card-bg)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            border: '1px solid var(--card-border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '24px',
                            boxShadow: 'var(--card-shadow)',
                        }}>
                            <h3 style={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                color: 'var(--text-primary)',
                                marginBottom: '20px',
                                marginTop: '0',
                            }}>
                                Daily Scan Volume
                            </h3>
                            {trendData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={240}>
                                    <AreaChart data={trendData}>
                                        <CartesianGrid {...gridStyle} />
                                        <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                                        <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                                        <Tooltip content={customTooltip} />
                                        <Area
                                            type="monotone"
                                            dataKey="fraud"
                                            stroke="var(--danger)"
                                            fill="var(--danger-light)"
                                            strokeWidth={2}
                                            name="Fraud"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="legit"
                                            stroke="var(--success)"
                                            fill="var(--success-light)"
                                            strokeWidth={2}
                                            name="Legit"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        No trend data available
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Classification Split Pie Chart */}
                        <div style={{
                            background: 'var(--card-bg)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            border: '1px solid var(--card-border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '24px',
                            boxShadow: 'var(--card-shadow)',
                        }}>
                            <h3 style={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                color: 'var(--text-primary)',
                                marginBottom: '20px',
                                marginTop: '0',
                            }}>
                                Classification Split
                            </h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        <Cell fill="var(--danger)" />
                                        <Cell fill="var(--success)" />
                                    </Pie>
                                    <Tooltip content={customTooltip} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
                                {[
                                    { color: 'var(--danger)', label: 'Fraud', value: pieData[0]?.value || 0 },
                                    { color: 'var(--success)', label: 'Legit', value: pieData[1]?.value || 0 },
                                ].map(({ color, label, value }) => (
                                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '2px' }} />
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.813rem', color: 'var(--text-secondary)' }}>
                                            {label}: {value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* CHARTS ROW 2 */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '20px',
                        marginBottom: '40px',
                    }}>
                        {/* Model Comparison Chart */}
                        <div style={{
                            background: 'var(--card-bg)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            border: '1px solid var(--card-border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '24px',
                            boxShadow: 'var(--card-shadow)',
                        }}>
                            <h3 style={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                color: 'var(--text-primary)',
                                marginBottom: '20px',
                                marginTop: '0',
                            }}>
                                Model Comparison
                            </h3>
                            {modelCompData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={modelCompData} barCategoryGap="15%">
                                        <CartesianGrid {...gridStyle} />
                                        <XAxis dataKey="name" tick={{ ...axisStyle, fontSize: 9 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} angle={-45} textAnchor="end" height={80} />
                                        <YAxis domain={[0, 100]} tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                                        <Tooltip content={customTooltip} />
                                        <Bar dataKey="Accuracy" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Precision" fill="var(--success)" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Recall" fill="var(--warning)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        No model comparison data
                                    </span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
                                {[
                                    { color: 'var(--primary)', label: 'Accuracy' },
                                    { color: 'var(--success)', label: 'Precision' },
                                    { color: 'var(--warning)', label: 'Recall' },
                                ].map(({ color, label }) => (
                                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '10px', height: '10px', backgroundColor: color, borderRadius: '2px' }} />
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Confidence Distribution Chart */}
                        <div style={{
                            background: 'var(--card-bg)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            border: '1px solid var(--card-border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '24px',
                            boxShadow: 'var(--card-shadow)',
                        }}>
                            <h3 style={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                color: 'var(--text-primary)',
                                marginBottom: '20px',
                                marginTop: '0',
                            }}>
                                Confidence Distribution
                            </h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={confDistData} barCategoryGap="10%">
                                    <CartesianGrid {...gridStyle} />
                                    <XAxis dataKey="range" tick={{ ...axisStyle, fontSize: 9 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                                    <Tooltip content={customTooltip} />
                                    <Bar dataKey="count" name="Predictions" radius={[4, 4, 0, 0]}>
                                        {confDistData.map((entry, i) => (
                                            <Cell
                                                key={i}
                                                fill={
                                                    i < 2 ? 'var(--danger-light)' :
                                                    i < 4 ? 'var(--warning-light)' :
                                                    'var(--success-light)'
                                                }
                                                stroke={
                                                    i < 2 ? 'var(--danger)' :
                                                    i < 4 ? 'var(--warning)' :
                                                    'var(--success)'
                                                }
                                                strokeWidth={2}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            <div style={{
                                textAlign: 'center',
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                marginTop: '12px',
                                fontFamily: 'var(--font-mono)',
                            }}>
                                Lower = Uncertain · Higher = Confident
                            </div>
                        </div>
                    </div>

                    {/* RECENT PREDICTIONS TABLE */}
                    <div style={{
                        background: 'var(--card-bg)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid var(--card-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '24px',
                        boxShadow: 'var(--card-shadow)',
                    }}>
                        <h3 style={{
                            fontSize: '1rem',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            marginBottom: '20px',
                            marginTop: '0',
                        }}>
                            Recent Predictions ({predictions.length})
                        </h3>
                        <div style={{
                            overflowX: 'auto',
                        }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                            }}>
                                <thead>
                                    <tr style={{
                                        borderBottom: '2px solid var(--border)',
                                    }}>
                                        {['Date', 'Text', 'Verdict', 'Confidence', 'Model', 'Flagged'].map(header => (
                                            <th key={header} style={{
                                                textAlign: 'left',
                                                padding: '12px 16px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                color: 'var(--text-muted)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            }}>
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {predictions.slice(0, 20).length > 0 ? (
                                        predictions.slice(0, 20).map((p, i) => (
                                            <tr
                                                key={p.id}
                                                style={{
                                                    borderBottom: i < Math.min(predictions.length, 20) - 1 ? '1px solid var(--border)' : 'none',
                                                    transition: 'background-color 0.15s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <td style={{
                                                    padding: '16px',
                                                    fontSize: '0.813rem',
                                                    color: 'var(--text-secondary)',
                                                    fontFamily: 'var(--font-mono)',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {formatLocalTime(p.created_at)}
                                                </td>
                                                <td style={{
                                                    padding: '16px',
                                                    fontSize: '0.875rem',
                                                    color: 'var(--text-primary)',
                                                    maxWidth: '300px',
                                                }}>
                                                    <div style={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        {p.text_snippet || '—'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        padding: '4px 12px',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        backgroundColor: p.prediction === 'fake' || p.prediction === 'fraud' 
                                                            ? 'var(--danger-light)' 
                                                            : 'var(--success-light)',
                                                        color: p.prediction === 'fake' || p.prediction === 'fraud'
                                                            ? 'var(--danger)'
                                                            : 'var(--success)',
                                                        textTransform: 'uppercase',
                                                    }}>
                                                        {p.prediction === 'fake' || p.prediction === 'fraud' ? '🚨 Fraud' : '✅ Legit'}
                                                    </span>
                                                </td>
                                                <td style={{
                                                    padding: '16px',
                                                    fontSize: '0.813rem',
                                                    color: 'var(--text-primary)',
                                                    fontFamily: 'var(--font-mono)',
                                                    fontWeight: '600',
                                                }}>
                                                    {p.confidence}%
                                                </td>
                                                <td style={{
                                                    padding: '16px',
                                                    fontSize: '0.75rem',
                                                    color: 'var(--text-secondary)',
                                                    fontFamily: 'var(--font-mono)',
                                                }}>
                                                    {p.model_used || '—'}
                                                </td>
                                                <td style={{
                                                    padding: '16px',
                                                    textAlign: 'center',
                                                }}>
                                                    {p.flagged && (
                                                        <span style={{
                                                            fontSize: '1.25rem',
                                                        }}>
                                                            🚩
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} style={{
                                                padding: '40px',
                                                textAlign: 'center',
                                                fontSize: '0.875rem',
                                                color: 'var(--text-muted)',
                                                fontFamily: 'var(--font-mono)',
                                            }}>
                                                No predictions available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
