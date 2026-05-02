import React from 'react';
import { useNavigate } from 'react-router-dom';
import MarketingNavbar from '../components/MarketingNavbar';
import MarketingFooter from '../components/MarketingFooter';
import './LandingStyles.css';
import './LandingStyles.css';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "VR Simulation",
      desc: "Immersive surgical environments that mirror real operating rooms, allowing risk-free practice.",
      icon: "🥽"
    },
    {
      title: "Real CT Anatomy",
      desc: "Train on accurate, patient-specific 3D anatomical models reconstructed from real CT scans.",
      icon: "🧠"
    },
    {
      title: "Haptic Feedback",
      desc: "Experience realistic tissue resistance and force feedback with advanced haptic glove integration.",
      icon: "🧤"
    },
    {
      title: "AI Scoring",
      desc: "Receive real-time, objective performance metrics and personalized feedback powered by AI.",
      icon: "🤖"
    },
    {
      title: "Omniverse Robotics",
      desc: "Pioneering the next generation of robotic surgical training using NVIDIA Omniverse digital twins.",
      icon: "🦾"
    },
    {
      title: "Accessible Pricing",
      desc: "A cost-effective platform designed to democratize surgical education across the MENA region and beyond.",
      icon: "🌍"
    }
  ];

  return (
    <div className="landing-container">
      <MarketingNavbar />

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            The Global Standard for <span className="highlight">Surgical Simulation</span>
          </h1>
          <p className="hero-subtitle">
            Replacing cadaveric labs, democratizing training access, and feeding the next generation of autonomous surgical AI.
          </p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={() => navigate('/login')}>
              Begin Operation
            </button>
            <button className="secondary-btn" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
              Explore Features
            </button>
          </div>
        </div>
      </header>

      {/* Moat / Advantage Section */}
      <section className="advantage-section">
        <div className="advantage-card">
          <h2>The SurgiVerse Advantage</h2>
          <p>
            No existing competitor combines <strong>VR Simulation, Real CT Anatomy, Haptic Feedback, AI Scoring, Omniverse Robotics,</strong> and <strong>Accessible Pricing</strong> simultaneously. 
            <br/><br/>
            <span className="highlight-text">Our deep integration is our moat.</span>
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="features-section">
        <h2 className="section-title">Six Dimensions of Mastery</h2>
        <div className="features-grid">
          {features.map((feature, idx) => (
            <div key={idx} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to transform surgical education?</h2>
          <p>Every minute of simulation trains a surgeon without risking a patient.</p>
          <button className="primary-btn glow" onClick={() => navigate('/login')}>
            Launch Simulation Platform
          </button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default Landing;
