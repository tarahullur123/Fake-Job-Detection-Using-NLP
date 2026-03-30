'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { HiEye, HiEyeSlash } from 'react-icons/hi2';

export default function RegisterPage() {
    const [form, setForm] = useState({ 
        username: '', 
        email: '', 
        password: '', 
        confirmPassword: '' 
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { register } = useAuth();
    const router = useRouter();

    const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!form.username || !form.email || !form.password || !form.confirmPassword) { 
            setError('All fields are required'); 
            return; 
        }
        if (form.password.length < 6) { 
            setError('Password must be at least 6 characters'); 
            return; 
        }
        if (form.password !== form.confirmPassword) { 
            setError('Passwords do not match'); 
            return; 
        }
        
        setLoading(true);
        try {
            await register(form.username, form.email, form.password);
            router.push('/analyze');
        } catch (err) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-blob-blue" />
            <div className="login-blob-teal" />
            <div className="login-blob-red" />
            <div className="login-dot-grid" />
            <div className="login-scanline" />
            <div className="login-vignette" />

            <div className="login-card">
                <div className="login-corner login-corner--tl" />
                <div className="login-corner login-corner--tr" />
                <div className="login-corner login-corner--bl" />
                <div className="login-corner login-corner--br" />

                <div style={{ textAlign: 'center' }}>
                    <span style={{
                        display: 'inline-block',
                        fontSize: '10px',
                        letterSpacing: '0.2em',
                        color: '#2DD4BF',
                        textTransform: 'uppercase',
                        border: '1px solid rgba(45,212,191,0.3)',
                        borderRadius: '9999px',
                        padding: '4px 12px',
                        marginBottom: '16px',
                    }}>
                        ● Secure Signup
                    </span>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '32px',
                }}>
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 2C13.2 2 11 4.2 11 7v4H9c-1.1 0-2 .9-2 2v13c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V13c0-1.1-.9-2-2-2h-2V7c0-2.8-2.2-5-5-5zm0 2c1.7 0 3 1.3 3 3v4h-6V7c0-1.7 1.3-3 3-3z" fill="#1D4ED8"/>
                        <circle cx="21" cy="21" r="8" fill="#3B82F6"/>
                        <path d="M21 17v5m0 2h.01" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '24px',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                    }}>
                        JobCheck
                    </span>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '28px',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        marginBottom: '8px',
                    }}>
                        Create your account
                    </h1>
                    <p style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '15px',
                        color: 'var(--text-muted)',
                    }}>
                        Start detecting fraudulent job postings
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: '12px 16px',
                        background: 'var(--danger-light)',
                        color: 'var(--danger)',
                        borderRadius: '10px',
                        fontSize: '14px',
                        marginBottom: '24px',
                        fontFamily: 'var(--font-body)',
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{
                            display: 'block',
                            fontFamily: 'var(--font-body)',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: 'var(--text-secondary)',
                            marginBottom: '8px',
                        }}>
                            Username
                        </label>
                        <input
                            type="text"
                            value={form.username}
                            onChange={update('username')}
                            placeholder="Choose a username"
                            className="input-field"
                            autoComplete="username"
                        />
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            fontFamily: 'var(--font-body)',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: 'var(--text-secondary)',
                            marginBottom: '8px',
                        }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={update('email')}
                            placeholder="your@email.com"
                            className="input-field"
                            autoComplete="email"
                        />
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            fontFamily: 'var(--font-body)',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: 'var(--text-secondary)',
                            marginBottom: '8px',
                        }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={form.password}
                                onChange={update('password')}
                                placeholder="Minimum 6 characters"
                                className="input-field"
                                autoComplete="new-password"
                                style={{ paddingRight: '44px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    outline: 'none',
                                }}
                            >
                                {showPassword ? <HiEyeSlash size={20} /> : <HiEye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            fontFamily: 'var(--font-body)',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: 'var(--text-secondary)',
                            marginBottom: '8px',
                        }}>
                            Confirm Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={form.confirmPassword}
                                onChange={update('confirmPassword')}
                                placeholder="Re-enter your password"
                                className="input-field"
                                autoComplete="new-password"
                                style={{ paddingRight: '44px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    outline: 'none',
                                }}
                            >
                                {showConfirmPassword ? <HiEyeSlash size={20} /> : <HiEye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="login-btn"
                        disabled={loading}
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div style={{
                    marginTop: '32px',
                    textAlign: 'center',
                }}>
                    <p style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '14px',
                        color: 'var(--text-secondary)',
                    }}>
                        Already have an account?{' '}
                        <Link
                            href="/login"
                            style={{
                                color: 'var(--primary)',
                                textDecoration: 'none',
                                fontWeight: '600',
                            }}
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
