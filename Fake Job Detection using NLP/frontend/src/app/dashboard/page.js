'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const TREND_PLACEHOLDER_DATA = [
    { week: 'W1', fraud: 1, legit: 3 },
    { week: 'W2', fraud: 2, legit: 4 },
    { week: 'W3', fraud: 1, legit: 5 },
    { week: 'W4', fraud: 3, legit: 4 },
];

function normalizeStats(rawStats) {
    const normalizedWeekly = Array.isArray(rawStats?.weekly_trend) ? rawStats.weekly_trend.map((row) => ({
        week: row?.week || 'Unknown',
        fraud: Number(row?.fake ?? row?.fraud ?? 0),
        legit: Number(row?.real ?? row?.legit ?? 0),
    })) : [];

    const normalizedRecent = Array.isArray(rawStats?.recent_predictions) ? rawStats.recent_predictions.map((row) => ({
        id: row?.id,
        created_at: row?.created_at || null,
        text_snippet: row?.preview || '',
        prediction: row?.prediction || 'Unknown',
        confidence: typeof row?.confidence === 'number'
            ? (row.confidence <= 1 ? Math.round(row.confidence * 100) : Math.round(row.confidence))
            : null,
    })) : [];

    const total = Number(rawStats?.total_analyses ?? rawStats?.total ?? 0);
    const fraud = Number(rawStats?.total_fake ?? rawStats?.fraud ?? 0);
    const legit = Number(rawStats?.total_real ?? rawStats?.legit ?? 0);

    return {
        total,
        fraud,
        legit,
        fraud_rate: Number(rawStats?.fraud_rate ?? 0),
        avg_confidence: Number(rawStats?.avg_confidence ?? 0),
        feedback_count: Number(rawStats?.feedback_given ?? rawStats?.feedback_count ?? 0),
        agreement_rate: Number(
            Number(rawStats?.feedback_given ?? 0) > 0
                ? ((Number(rawStats?.feedback_agree ?? 0) / Number(rawStats?.feedback_given ?? 1)) * 100)
                : (rawStats?.agreement_rate ?? 0)
        ),
        weekly_trend: normalizedWeekly,
        recent: normalizedRecent,
    };
}

function StatCard({ icon, value, label, iconBg, iconStroke, iconPath }) {
    return (
        <div style={{
            background: 'var(--card-bg)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: 'var(--card-shadow)',
            transition: 'transform 0.25s ease, box-shadow 0.25s ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 24px 56px rgba(0,0,0,0.12)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--card-shadow)'; }}>
            <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
            }}>
                {icon || (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {iconPath}
                    </svg>
                )}
            </div>
            <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '2rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '4px'
            }}>
                {value}
            </div>
            <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 500
            }}>
                {label}
            </div>
        </div>
    );
}

function StatCardSkeleton() {
    return (
        <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: 'var(--card-shadow)',
        }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-subtle)', marginBottom: 16 }} />
            <div style={{ width: '50%', height: 32, borderRadius: 8, background: 'var(--bg-subtle)', marginBottom: 10 }} />
            <div style={{ width: '60%', height: 12, borderRadius: 6, background: 'var(--bg-subtle)' }} />
        </div>
    );
}


export default function DashboardPage() {
    const { user, authFetch } = useAuth();
    const [stats, setStats] = useState(null);
    const [trending, setTrending] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
            return;
        }
        loadData();
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        setStatsLoading(true);
        setChartLoading(true);
        setError(null);
        try {
            const [statsRes, trendRes] = await Promise.all([
                authFetch('/api/my-stats'),
                authFetch('/api/trending')
            ]);

            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(normalizeStats(data));
            } else {
                throw new Error('Failed to load statistics');
            }
            setStatsLoading(false);
            setChartLoading(false);

            if (trendRes.ok) {
                const data = await trendRes.json();
                setTrending(data);
            }
        } catch (err) {
            console.error('Dashboard load failed:', err);
            setError(err.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return null;
    }

    if (error) {
        return (
            <div style={{
                minHeight: '100vh',
                paddingTop: '80px',
                padding: '80px 20px 40px'
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: '24px',
                    background: 'var(--danger-light)',
                    border: '1px solid var(--danger)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center'
                }}>
                    <p style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '1rem',
                        color: 'var(--danger)',
                        marginBottom: '16px'
                    }}>
                        {error}
                    </p>
                    <button
                        onClick={loadData}
                        style={{
                            padding: '10px 20px',
                            background: 'var(--primary)',
                            color: 'var(--text-inverse)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'all 0.2s'
                        }}
                        onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px var(--primary-lighter)'}
                        onBlur={(e) => e.target.style.boxShadow = 'none'}
                        onMouseEnter={(e) => e.target.style.background = 'var(--primary-light)'}
                        onMouseLeave={(e) => e.target.style.background = 'var(--primary)'}
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const fraudRate = Number(stats?.fraud_rate ?? 0);
    const avgConfidence = Number(stats?.avg_confidence ?? 0);
    const feedbackCount = Number(stats?.feedback_count ?? 0);
    const agreementRate = Number(stats?.agreement_rate ?? 0);
    const hasWeeklyTrend = Array.isArray(stats?.weekly_trend) && stats.weekly_trend.length > 0;
    const chartData = hasWeeklyTrend ? stats.weekly_trend : TREND_PLACEHOLDER_DATA;
    const hasActualRecords = Number(stats?.total ?? 0) > 0;

    return (
        <div className="premium-page" style={{
            fontFamily: 'var(--font-body)'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '40px 20px'
            }}>
                {/* Page Header */}
                <div style={{ marginBottom: '40px' }}>
                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(2rem, 5vw, 2.5rem)',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginBottom: '8px',
                        lineHeight: 1.2
                    }}>
                        Your Dashboard
                    </h1>
                    <p style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '1rem',
                        color: 'var(--text-secondary)',
                        marginBottom: 0
                    }}>
                        Track your analysis history and insights
                    </p>
                </div>

                {/* Stat Cards Row */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '20px',
                    marginBottom: '32px'
                }}>
                    {statsLoading ? (
                        <>
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                        </>
                    ) : (
                        <>
                            <StatCard
                                value={stats?.total ?? 0}
                                label="Total Analyses"
                                iconBg="var(--primary-lighter)"
                                iconStroke="var(--primary)"
                                iconPath={(
                                    <>
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="12" y1="18" x2="12" y2="12"></line>
                                        <line x1="9" y1="15" x2="15" y2="15"></line>
                                    </>
                                )}
                            />
                            <StatCard
                                value={stats?.fraud ?? 0}
                                label="Fraudulent"
                                iconBg="var(--danger-light)"
                                iconStroke="var(--danger)"
                                iconPath={(
                                    <>
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="15" y1="9" x2="9" y2="15"></line>
                                        <line x1="9" y1="9" x2="15" y2="15"></line>
                                    </>
                                )}
                            />
                            <StatCard
                                value={stats?.legit ?? 0}
                                label="Legitimate"
                                iconBg="var(--success-light)"
                                iconStroke="var(--success)"
                                iconPath={(
                                    <>
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                    </>
                                )}
                            />
                            <StatCard
                                value={`${fraudRate.toFixed(1)}%`}
                                label="Fraud Rate"
                                iconBg="var(--warning-light)"
                                iconStroke="var(--warning)"
                                iconPath={(
                                    <>
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                        <line x1="12" y1="9" x2="12" y2="13"></line>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </>
                                )}
                            />
                        </>
                    )}
                </div>

                {/* Secondary Stats Row */}
                <div style={{
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap',
                    marginBottom: '32px'
                }}>
                    <div style={{
                        flex: '1 1 200px',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)'
                        }}>
                            {statsLoading ? '—' : `${avgConfidence.toFixed(1)}%`}
                        </div>
                        <div style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.82rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 500
                        }}>
                            Avg Confidence
                        </div>
                    </div>

                    <div style={{
                        flex: '1 1 200px',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)'
                        }}>
                            {statsLoading ? '—' : feedbackCount}
                        </div>
                        <div style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.82rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 500
                        }}>
                            Feedback Given
                        </div>
                    </div>

                    <div style={{
                        flex: '1 1 200px',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)'
                        }}>
                            {statsLoading ? '—' : `${agreementRate.toFixed(1)}%`}
                        </div>
                        <div style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.82rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 500
                        }}>
                            Agreement Rate
                        </div>
                    </div>
                </div>

                {/* Weekly Trend Chart */}
                <div style={{
                    background: 'var(--card-bg)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    boxShadow: 'var(--card-shadow)',
                    marginBottom: '32px'
                }}>
                    <h2 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: '24px'
                    }}>
                        Weekly Trend
                    </h2>
                    <div style={{ width: '100%', minHeight: 300, height: 300 }}>
                        {chartLoading ? (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--bg-subtle)',
                                border: '1px solid var(--border)',
                            }} />
                        ) : (!hasActualRecords ? (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: 'var(--radius-md)',
                                border: '1px dashed var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column',
                                gap: 8,
                                color: 'var(--text-secondary)',
                                fontFamily: 'var(--font-body)',
                                textAlign: 'center',
                                padding: 16,
                            }}>
                                <span style={{ fontSize: '1.8rem', opacity: 0.7 }}>📈</span>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No data yet</span>
                                <span style={{ fontSize: '0.85rem' }}>Run analyses to populate your weekly trend.</span>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid-line)" />
                                    <XAxis
                                        dataKey="week"
                                        tick={{ fill: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 12 }}
                                        tickFormatter={(value) => {
                                            const parts = String(value).split('-W');
                                            return parts[1] ? `W${parts[1]}` : String(value);
                                        }}
                                        axisLine={{ stroke: 'var(--border)' }}
                                        tickLine={{ stroke: 'var(--border)' }}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fill: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 12 }}
                                        axisLine={{ stroke: 'var(--border)' }}
                                        tickLine={{ stroke: 'var(--border)' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--bg-white)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-md)',
                                            fontFamily: 'var(--font-body)',
                                            fontSize: '0.875rem',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem' }} />
                                    <Line type="monotone" dataKey="fraud" stroke="var(--danger)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Fraudulent" />
                                    <Line type="monotone" dataKey="legit" stroke="var(--success)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Legitimate" />
                                </LineChart>
                            </ResponsiveContainer>
                        ))}
                    </div>
                </div>

                {/* Recent Predictions Table */}
                {stats?.recent && stats.recent.length > 0 && (
                    <div style={{
                        background: 'var(--card-bg)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid var(--card-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '24px',
                        boxShadow: 'var(--card-shadow)',
                        marginBottom: '32px'
                    }}>
                        <h2 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginBottom: '20px'
                        }}>
                            Recent Analyses
                        </h2>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontFamily: 'var(--font-body)',
                                fontSize: '0.875rem'
                            }}>
                                <thead>
                                    <tr style={{
                                        borderBottom: '2px solid var(--border)'
                                    }}>
                                        <th style={{
                                            padding: '12px 16px',
                                            textAlign: 'left',
                                            fontWeight: 600,
                                            color: 'var(--text-secondary)',
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            Date
                                        </th>
                                        <th style={{
                                            padding: '12px 16px',
                                            textAlign: 'left',
                                            fontWeight: 600,
                                            color: 'var(--text-secondary)',
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            Text Snippet
                                        </th>
                                        <th style={{
                                            padding: '12px 16px',
                                            textAlign: 'left',
                                            fontWeight: 600,
                                            color: 'var(--text-secondary)',
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            Verdict
                                        </th>
                                        <th style={{
                                            padding: '12px 16px',
                                            textAlign: 'right',
                                            fontWeight: 600,
                                            color: 'var(--text-secondary)',
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            Confidence
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recent.map((item, index) => (
                                        <tr key={item.id || index} style={{
                                            borderBottom: '1px solid var(--border)',
                                            transition: 'background-color 0.15s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                            <td style={{
                                                padding: '12px 16px',
                                                color: 'var(--text-secondary)',
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: '0.8rem',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { 
                                                    month: 'short', 
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                }) : '—'}
                                            </td>
                                            <td style={{
                                                padding: '12px 16px',
                                                color: 'var(--text-primary)',
                                                maxWidth: '400px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {item.text_snippet || '—'}
                                            </td>
                                            <td style={{
                                                padding: '12px 16px'
                                            }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '4px 12px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                    background: item.prediction === 'Fake' ? 'var(--danger-light)' : 'var(--success-light)',
                                                    color: item.prediction === 'Fake' ? 'var(--danger)' : 'var(--success)'
                                                }}>
                                                    {item.prediction === 'Fake' ? 'Fraud' : 'Legit'}
                                                </span>
                                            </td>
                                            <td style={{
                                                padding: '12px 16px',
                                                textAlign: 'right',
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: '0.875rem',
                                                fontWeight: 600,
                                                color: item.prediction === 'Fake' ? 'var(--danger)' : 'var(--success)'
                                            }}>
                                                {item.confidence ? `${item.confidence}%` : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Trending Patterns */}
                {trending?.patterns && trending.patterns.length > 0 && (
                    <div style={{
                        background: 'var(--card-bg)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid var(--card-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '24px',
                        boxShadow: 'var(--card-shadow)'
                    }}>
                        <h2 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginBottom: '20px'
                        }}>
                            Trending Fraud Patterns
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {trending.patterns.map((pattern, index) => (
                                <div key={index} style={{
                                    padding: '16px',
                                    background: 'var(--bg-subtle)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '12px',
                                        flexWrap: 'wrap',
                                        gap: '8px'
                                    }}>
                                        <div style={{
                                            fontFamily: 'var(--font-body)',
                                            fontSize: '0.95rem',
                                            fontWeight: 500,
                                            color: 'var(--text-primary)'
                                        }}>
                                            {pattern.pattern}
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                fontFamily: 'var(--font-mono)',
                                                background: pattern.severity === 'high' ? 'var(--danger-light)' : 
                                                           pattern.severity === 'medium' ? 'var(--warning-light)' : 'var(--bg-muted)',
                                                color: pattern.severity === 'high' ? 'var(--danger)' : 
                                                       pattern.severity === 'medium' ? 'var(--warning)' : 'var(--text-muted)',
                                                border: `1px solid ${pattern.severity === 'high' ? 'var(--danger)' : 
                                                                     pattern.severity === 'medium' ? 'var(--warning)' : 'var(--border)'}`
                                            }}>
                                                {pattern.severity}
                                            </span>
                                            <span style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: '0.875rem',
                                                color: 'var(--text-secondary)'
                                            }}>
                                                {pattern.count} occurrences
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{
                                        width: '100%',
                                        height: '8px',
                                        background: 'var(--bg-muted)',
                                        borderRadius: 'var(--radius-sm)',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${Math.min(pattern.count / (trending.patterns[0]?.count || 1) * 100, 100)}%`,
                                            background: pattern.severity === 'high' ? 'var(--danger)' : 
                                                       pattern.severity === 'medium' ? 'var(--warning)' : 'var(--text-muted)',
                                            transition: 'width 0.6s ease-out'
                                        }} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Top Keywords */}
                        {trending.top_keywords && trending.top_keywords.length > 0 && (
                            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                                <h3 style={{
                                    fontFamily: 'var(--font-body)',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    color: 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginBottom: '12px'
                                }}>
                                    Top Flagged Keywords
                                </h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {trending.top_keywords.map((keyword, index) => (
                                        <span key={index} style={{
                                            padding: '6px 12px',
                                            background: 'var(--bg-white)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-md)',
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '0.8rem',
                                            color: 'var(--text-primary)'
                                        }}>
                                            {typeof keyword === 'string'
                                                ? keyword
                                                : `${keyword.keyword}${keyword.count ? ` (${keyword.count})` : ''}`}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* No Data State */}
                {!loading && stats && (stats.total || 0) === 0 && (
                    <div style={{
                        background: 'var(--bg-white)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '60px 24px',
                        textAlign: 'center',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <div style={{
                            fontSize: '3rem',
                            marginBottom: '16px',
                            opacity: 0.3
                        }}>
                            📊
                        </div>
                        <h3 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginBottom: '8px'
                        }}>
                            No Data Yet
                        </h3>
                        <p style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.95rem',
                            color: 'var(--text-secondary)',
                            marginBottom: '20px'
                        }}>
                            Start analyzing job posts to see your statistics here.
                        </p>
                        <a
                            href="/analyze"
                            style={{
                                display: 'inline-block',
                                padding: '12px 24px',
                                background: 'var(--primary)',
                                color: 'var(--text-inverse)',
                                textDecoration: 'none',
                                borderRadius: 'var(--radius-md)',
                                fontFamily: 'var(--font-body)',
                                fontSize: '0.95rem',
                                fontWeight: 500,
                                transition: 'all 0.2s',
                                outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px var(--primary-lighter)'}
                            onBlur={(e) => e.target.style.boxShadow = 'none'}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'var(--primary-light)';
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = 'var(--shadow-md)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'var(--primary)';
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            Analyze Your First Job Post
                        </a>
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
