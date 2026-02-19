import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import './Landing.css';

const Landing = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const headRef = useRef(null);
    const beamRef = useRef(null);
    const cardRef = useRef(null);
    const cableCanvasRef = useRef(null);
    const ecgCanvasRef = useRef(null);
    const authBtnRef = useRef(null);

    const handleAuth = async () => {
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                navigate('/dashboard');
            } else {
                if (!firstName || !lastName) {
                    setError('Please enter your first and last name.');
                    return;
                }
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await setDoc(doc(db, 'users', user.uid), {
                    uid: user.uid,
                    firstName,
                    lastName,
                    email,
                    role: 'student',
                });
                navigate('/dashboard');
            }
        } catch (error) {
            setError(error.message.replace("Firebase: ", ""));
        }
    };

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
            // Position the head element. The visual center of the head is at (headX, headY)
            head.style.transform = `translate(${headX - 47.5}px, ${headY - 16}px)`; // 47.5 = 95/2
            // Position the light beam to emanate from the optic lens on the head
            beam.style.transform = `translate(${headX - 47.5}px, ${headY - 250}px)`;

            const rect = card.getBoundingClientRect();
            const dist = Math.hypot(headX - (rect.left + rect.width/2), headY - (rect.top + rect.height/2));
            if (dist < 350) card.classList.add('active');
            else card.classList.remove('active');

            // Draw the cable
            c_ctx.clearRect(0, 0, cableCanvas.width, cableCanvas.height);
            c_ctx.beginPath();
            c_ctx.lineWidth = 12;
            c_ctx.strokeStyle = '#2c3e50';
            c_ctx.moveTo(0, cableCanvas.height);
            // Draw a curve from the bottom of the screen to the back of the endoscope head
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

    return (
        <div className="scope-container">
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

                <div className="auth-tabs">
                    <button 
                        type="button" 
                        onClick={() => {setIsLogin(true); setError('');}} 
                        className={`tab-button ${isLogin ? 'active' : ''}`}>
                        Login
                    </button>
                    <button 
                        type="button" 
                        onClick={() => {setIsLogin(false); setError('');}} 
                        className={`tab-button ${!isLogin ? 'active' : ''}`}>
                        Register
                    </button>
                </div>

                {error && <p style={{ color: 'red', textAlign: 'center', fontSize: '14px', marginBottom: '15px' }}>{error}</p>}

                {!isLogin && (
                    <div style={{display: 'flex', gap: '10px', flexDirection: 'column'}}>
                        <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                        <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>
                )}
                <input type="email" placeholder="Email Address (SURGEON_ID)" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <input type="password" placeholder="Password (BIOMETRIC_PASS)" value={password} onChange={(e) => setPassword(e.target.value)} required />
                
                <button id="authBtn" ref={authBtnRef} onClick={handleAuth}>
                    {isLogin ? 'Begin Operation' : 'Create Account'}
                </button>
            </div>
        </div>
    );
};

export default Landing;
