import React from 'react';
import { useNavigate } from 'react-router-dom';
import MarketingNavbar from '../components/MarketingNavbar';
import MarketingFooter from '../components/MarketingFooter';
import { META_QUEST_URL, MetaLogo, MetaQuestLogo } from '../components/MetaLogos';
import './LandingStyles.css';
import './LandingStyles.css';

export const META_STORE_URL = META_QUEST_URL;

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
          <a
            className="meta-store-hero-link"
            href={META_QUEST_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get SurgiVerse on the Meta Quest Store"
          >
            <span className="meta-store-badge">
              <MetaQuestLogo size={28} color="#fff" />
              <span className="meta-store-badge-text">
                <span className="meta-store-badge-eyebrow">Available on</span>
                <span className="meta-store-badge-name">Meta Quest</span>
              </span>
              <span className="meta-store-badge-divider" />
              <MetaLogo size={24} color="#0082FB" />
            </span>
          </a>
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

      {/* Meta Quest Store Spotlight */}
      <section className="meta-section">
        <div className="meta-panel">
          <div className="meta-logos-row">
            <span className="meta-logo-pill" title="Meta">
              <MetaLogo size={30} color="#0082FB" />
              <span>Meta</span>
            </span>
            <span className="meta-logo-x">×</span>
            <span className="meta-logo-pill" title="Meta Quest">
              <MetaQuestLogo size={30} color="#fff" />
              <span>Meta Quest</span>
            </span>
          </div>
          <span className="rag-eyebrow">Now Live · Meta Horizon Store</span>
          <h2 className="meta-title">Step Inside SurgiVerse on Meta Quest</h2>
          <p className="meta-subtitle">
            The full immersive operative experience — real CT anatomy, haptics-ready
            interaction and AI scoring — now available as a native Quest app.
          </p>
          <div className="meta-actions">
            <a
              className="primary-btn glow meta-cta"
              href={META_QUEST_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MetaQuestLogo size={22} color="#000" />
              &nbsp;Get it on Meta Quest
            </a>
            <span className="meta-store-note">Free listing · Meta Horizon OS · Quest 2 / 3 / 3S / Pro</span>
          </div>
        </div>
      </section>

      {/* SurgiVideoRAG Spotlight */}
      <section className="rag-section">
        <div className="rag-panel">
          <span className="rag-eyebrow">New · AI Video Intelligence</span>
          <h2 className="rag-title">SurgiVideoRAG</h2>
          <p className="rag-subtitle">
            Ask questions about real surgical videos and get answers grounded in
            operative footage — visually-aligned retrieval over Cholec80,
            CholecT45&nbsp;/&nbsp;SSG-QA, workflow and ENT corpora.
          </p>
          <div className="rag-stats">
            <div className="rag-stat"><strong>179</strong><span>surgical videos</span></div>
            <div className="rag-stat"><strong>~5K</strong><span>indexed clips</span></div>
            <div className="rag-stat"><strong>Q&amp;A</strong><span>grounded in video</span></div>
          </div>
          <a
            className="primary-btn glow rag-cta"
            href="https://surgvideorag-web.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Launch SurgiVideoRAG
          </a>
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
