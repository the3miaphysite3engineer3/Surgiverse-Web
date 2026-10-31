import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import MarketingNavbar from '../components/MarketingNavbar';
import MarketingFooter from '../components/MarketingFooter';
import './Login.css';

const Login = () => {
    // mode: 'login' | 'register' | 'forgot' | 'reset'
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const navigate = useNavigate();

    const headRef = useRef(null);
    const beamRef = useRef(null);
    const cardRef = useRef(null);
    const cableCanvasRef = useRef(null);
    const ecgCanvasRef = useRef(null);
    const authBtnRef = useRef(null);

    const resetFeedback = () => {
        setError('');
        setNotice('');
    };

    const handleSignIn = async () => {
        setBusy(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            navigate('/dashboard');
        } catch (err) {
            setError(err.message.replace('AuthApiError: ', ''));
        } finally {
            setBusy(false);
        }
    };

    const handleRegister = async () => {
        if (!firstName || !lastName) {
            setError('Please enter your first and last name.');
            return;
        }
        setBusy(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { firstName, lastName } },
            });
            if (error) throw error;
            if (data.session) {
                navigate('/dashboard');
            } else {
                setNotice('Account created. Check your email to confirm your address, then sign in.');
                setMode('login');
            }
        } catch (err) {
            setError(err.message.replace('AuthApiError: ', ''));
        } finally {
            setBusy(false);
        }
    };

    const handleForgot = async () => {
        setBusy(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/login`,
            });
            if (error) throw error;
            setNotice('Password reset link sent — check your email inbox.');
        } catch (err) {
            setError(err.message.replace('AuthApiError: ', ''));
        } finally {
            setBusy(false);
        }
    };

    const handleReset = async () => {
        if (!password || password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setBusy(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            navigate('/dashboard');
        } catch (err) {
            setError(err.message.replace('AuthApiError: ', ''));
        } finally {
            setBusy(false);
        }
    };

    const handleAuth = () => {
        resetFeedback();
        if (mode === 'login') return handleSignIn();
        if (mode === 'register') return handleRegister();
        if (mode === 'forgot') return handleForgot();
        if (mode === 'reset') return handleReset();
    };

    useEffect(() => {
        document.title = 'SurgiVerse - Login & Register';

        // A password-reset email link lands back here with a recovery token;
        // supabase-js detects it and switches the form to "set new password".
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setMode('reset');
                resetFeedback();
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        // Only run animations on non-mobile devices
        if (window.innerWidth < 769) return;

        const head = headRef.current;
        const beam = beamRef.current;
        const card = cardRef.current;
        const cableCanvas = cableCanvasRef.current;
        const ecgCanvas = ecgCanvasRef.current;
        const authBtn = authBtnRef.current;

        const c_ctx = cableCanvas.getContext('2d');
        const e_ctx = ecgCanvas.getContext('2d');

        let mouseX = 0, mouseY = 0, headX = 0, headY = 0;
        let ecgOffset = 0;
        let heartRate = 2;

        const handleResize = () => {
            [cableCanvas, ecgCanvas].forEach(c => {
                c.width = window.innerWidth;
                c.height = window.innerHeight;
            });
        };
        window.addEventListener('resize', handleResize);
        handleResize();

        const handleMouseMove = e => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        };
        document.body.style.cursor = 'none'; // Hide cursor only for desktop
        window.addEventListener('mousemove', handleMouseMove);

        const handleBtnMouseEnter = () => heartRate = 8;
        const handleBtnMouseLeave = () => heartRate = 2;
        if (authBtn) {
            authBtn.addEventListener('mouseenter', handleBtnMouseEnter);
            authBtn.addEventListener('mouseleave', handleBtnMouseLeave);
        }

        function drawECG() {
            e_ctx.clearRect(0, 0, ecgCanvas.width, ecgCanvas.height);
            e_ctx.beginPath();
            e_ctx.strokeStyle = '#00aaff';
            e_ctx.lineWidth = 1.5;
            for (let i = 0; i < ecgCanvas.width; i++) {
                let x = i, y = ecgCanvas.height / 2;
                let pulse = (x + ecgOffset) % 150;
                if (pulse > 60 && pulse < 65) y -= 10;
                else if (pulse >= 65 && pulse < 72) y -= 50;
                else if (pulse >= 72 && pulse < 80) y += 25;
                else if (pulse >= 80 && pulse < 90) y -= 5;
                if (i === 0) e_ctx.moveTo(x, y); else e_ctx.lineTo(x, y);
            }
            e_ctx.stroke();
            ecgOffset += heartRate;
        }

        let animationFrameId;
        function animate() {
            headX += (mouseX - headX) * 0.12;
            headY += (mouseY - headY) * 0.12;

            head.style.transform = `translate(${headX - 47.5}px, ${headY - 16}px)`;
            beam.style.transform = `translate(${headX - 47.5 + 95}px, ${headY - 250}px)`;

            const rect = card.getBoundingClientRect();
            const dist = Math.hypot(headX - (rect.left + rect.width/2), headY - (rect.top + rect.height/2));
            if (dist < 350) card.classList.add('active');
            else card.classList.remove('active');

            c_ctx.clearRect(0, 0, cableCanvas.width, cableCanvas.height);
            c_ctx.beginPath();
            c_ctx.lineWidth = 12;
            c_ctx.strokeStyle = '#2c3e50';
            c_ctx.moveTo(0, cableCanvas.height);
            c_ctx.bezierCurveTo(cableCanvas.width / 4, cableCanvas.height, headX - 150, headY + 120, headX - 47.5, headY);
            c_ctx.stroke();
            c_ctx.setLineDash([6, 10]);
            c_ctx.strokeStyle = '#34495e';
            c_ctx.stroke();
            c_ctx.setLineDash([]);
            drawECG();
            animationFrameId = requestAnimationFrame(animate);
        }
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            document.body.style.cursor = 'auto'; // Restore cursor
            if (authBtn) {
                authBtn.removeEventListener('mouseenter', handleBtnMouseEnter);
                authBtn.removeEventListener('mouseleave', handleBtnMouseLeave);
            }
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    const emailInput = (
        <input type="email" placeholder="Email Address (SURGEON_ID)" value={email} onChange={(e) => setEmail(e.target.value)} required />
    );

    return (
        <div className="scope-container">
            <MarketingNavbar />
            <canvas id="ecgCanvas" ref={ecgCanvasRef}></canvas>
            <canvas id="cableCanvas" ref={cableCanvasRef}></canvas>

            <div id="scope-head" ref={headRef}><div className="optic-lens"></div></div>
            <div id="beam" className="light-cone" ref={beamRef}></div>

            <div className="login-card" id="loginCard" ref={cardRef}>
                <h1 className="brand">SURGIVERSE</h1>
                <div className="status-bar">
                    <span>TERMINAL: B-012</span>
                    <span>STATUS: ONLINE</span>
                </div>

                {mode !== 'forgot' && mode !== 'reset' && (
                    <div className="auth-tabs">
                        <button
                            type="button"
                            onClick={() => { setMode('login'); resetFeedback(); }}
                            className={`tab-button ${mode === 'login' ? 'active' : ''}`}>
                            Login
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('register'); resetFeedback(); }}
                            className={`tab-button ${mode === 'register' ? 'active' : ''}`}>
                            Register
                        </button>
                    </div>
                )}

                {mode === 'forgot' && <h2 style={{ textAlign: 'center', margin: '0 0 16px', fontSize: '18px' }}>Reset password</h2>}
                {mode === 'reset' && <h2 style={{ textAlign: 'center', margin: '0 0 16px', fontSize: '18px' }}>Set a new password</h2>}

                {error && <p style={{ color: 'red', textAlign: 'center', fontSize: '14px', marginBottom: '15px' }}>{error}</p>}
                {notice && <p style={{ color: '#0a8f6f', textAlign: 'center', fontSize: '14px', marginBottom: '15px' }}>{notice}</p>}

                {mode === 'register' && (
                    <div style={{display: 'flex', gap: '10px', flexDirection: 'column'}}>
                        <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                        <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>
                )}
                {mode !== 'reset' && emailInput}
                {(mode === 'login' || mode === 'register') && (
                    <input type="password" placeholder="Password (BIOMETRIC_PASS)" value={password} onChange={(e) => setPassword(e.target.value)} required />
                )}
                {mode === 'reset' && (
                    <>
                        <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    </>
                )}

                <button id="authBtn" ref={authBtnRef} onClick={handleAuth} disabled={busy}>
                    {busy
                        ? 'Working…'
                        : mode === 'login'
                            ? 'Begin Operation'
                            : mode === 'register'
                                ? 'Create Account'
                                : mode === 'forgot'
                                    ? 'Send Reset Link'
                                    : 'Save New Password'}
                </button>

                {(mode === 'login' || mode === 'forgot') && (
                    <button
                        type="button"
                        className="auth-secondary-link"
                        onClick={() => { setMode(mode === 'forgot' ? 'login' : 'forgot'); resetFeedback(); setPassword(''); }}
                    >
                        {mode === 'login' ? 'Forgot password?' : '← Back to sign in'}
                    </button>
                )}
            </div>
            <div className="login-footer-wrapper">
                <MarketingFooter />
            </div>
        </div>
    );
};

export default Login;
