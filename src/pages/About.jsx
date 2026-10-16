import React from 'react';
import MarketingNavbar from '../components/MarketingNavbar';
import MarketingFooter from '../components/MarketingFooter';
import { META_QUEST_URL, MetaLogo, MetaQuestLogo } from '../components/MetaLogos';
import './AboutStyles.css';

const About = () => {
  const team = [
    { name: "George Tawadrous", role: "Lead Engineer, AI Engineer & Cloud Architect", bio: "MLOps, VR Architecture, Gemini AI, Firebase, RAG Pipeline", image: "/team/george.jpg" },
    { name: "Youssef Hatem", role: "System Haptics Engineer", bio: "Dexmo Glove Integration, XR Physics, Embedded Systems" },
    { name: "Michael Shohda", role: "3D Modeling & Unity Dev", bio: "CT Reconstruction, Unity Interactions" },
    { name: "Yousif Hazim", role: "3D Modeling & Unity Dev", bio: "3D Modeling, Unity XR Toolkit" },
    { name: "Youssef Habil", role: "Backend Architect", bio: "Firebase Auth, Firestore, Cloud Functions" },
    { name: "Mazen Saeed", role: "VR Interaction Developer", bio: "Unity XR Toolkit, Collider Systems", image: "/team/mazen.png" },
    { name: "Kirolos Sedra", role: "Software Architect", bio: "Guiding software architecture, mentoring team members, code review excellence", image: "/team/sedra.png" }
  ];

  const advisors = [
    {
      name: "Dr. Tamer El Nady",
      role: "Principal Investigator, DSDC · Professor of Acoustics, Ain Shams University",
      bio: "Leads the Dynamic & Digitization Systems Cluster — grown from the Acoustics & Vibrations Lab (2005) into labs spanning Sound/Vibration/Smart Structures, Product Design, Virtual Reality, Digital Learning, and Energy & Climate Change. Oversees the VR Lab behind SurgiVerse.",
      image: "/team/tamer.jpg",
    },
    {
      name: "Dr. Nesma Rezk",
      role: "Assistant Professor, Computer & Systems Engineering, Ain Shams University",
      bio: "PhD, Computer Science & Engineering, Halmstad University, Sweden (2022) — “Deep Learning on the Edge.” Research: embedded systems, deep learning, domain-specific architectures, multi-objective optimization.",
      image: "/team/nesma.jpg",
    },
    {
      name: "Dr. Anas Askoura",
      role: "Professor of Otorhinolaryngology, Head & Neck Surgery, Ain Shams University",
      bio: "MS, MRCS, MD ENT. Clinical advisor for ENT domain validation, including the ENT knowledge graph.",
      image: "/team/anas.jpg",
    },
  ];

  const partners = [
    {
      name: "DSDC · Virtual Reality Lab",
      logo: "/partners/dsdc.png",
      url: "https://dsdc.eng.asu.edu.eg/research-labs/3",
      desc: "With the aid of VR Lab of the Dynamic Systems & Digitalisation Cluster, Faculty of Engineering, Ain Shams University.",
    },
    {
      name: "iHub · Ain Shams University",
      logo: "/partners/ihub.png",
      url: "https://www.asu.edu.eg/ihub/",
      desc: "iHub — the university's innovation hub — helped SurgiVerse become SurgiVerse.",
    },
  ];

  return (
    <div className="about-container">
      <MarketingNavbar />

      {/* Hero Section */}
      <header className="about-hero parallax-bg">
        <div className="about-hero-content">
          <h1 className="about-title">The Innovators Behind <span className="highlight">SurgiVerse</span></h1>
          <p className="about-subtitle">Pioneering the future of surgical education through immersive VR and artificial intelligence.</p>
        </div>
      </header>

      {/* Mission Section */}
      <section className="mission-section">
        <div className="mission-content glass-card">
          <h2>Our Mission</h2>
          <p>
            To become the future standard for surgical simulation — replacing cadaveric labs, democratizing training access, and feeding the next generation of autonomous surgical AI. Every simulation run on our platform translates directly into safer real-world procedures.
          </p>
        </div>
      </section>

      {/* Team Section */}
      <section className="team-section">
        <h2>Meet the Team</h2>
        <div className="team-grid">
          {team.map((member, idx) => (
            <div key={idx} className="team-card glass-card">
              <div className="team-avatar">
                {member.image ? (
                  <img src={member.image} alt={member.name} className="team-avatar-img" />
                ) : (
                  <span>{member.name.split(' ').map(n => n[0]).join('')}</span>
                )}
              </div>
              <h3>{member.name}</h3>
              <p className="team-role">{member.role}</p>
              <p className="team-bio">{member.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Advisors Section */}
      <section className="team-section">
        <h2>Advisors & Principal Investigators</h2>
        <div className="team-grid advisors-grid">
          {advisors.map((member, idx) => (
            <div key={idx} className="team-card glass-card">
              <div className="team-avatar advisor-avatar">
                {member.image ? (
                  <img src={member.image} alt={member.name} className="team-avatar-img" />
                ) : (
                  <span>{member.name.split(' ').map(n => n[0]).join('')}</span>
                )}
              </div>
              <h3>{member.name}</h3>
              <p className="team-role">{member.role}</p>
              <p className="team-bio">{member.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Partners Section */}
      <section className="partners-section">
        <h2>Our Main Sponsors</h2>
        <div className="partners-grid">
          {partners.map((partner, idx) => (
            <a
              key={idx}
              className="partner-card glass-card"
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="partner-logo">
                <img src={partner.logo} alt={partner.name} />
              </div>
              <h3>{partner.name}</h3>
              <p>{partner.desc}</p>
              <span className="partner-link">Visit →</span>
            </a>
          ))}
        </div>
      </section>

      {/* Platform Availability — Meta Quest */}
      <section className="partners-section" style={{ background: 'transparent' }}>
        <h2>Available on Meta Quest</h2>
        <div className="partners-grid" style={{ maxWidth: '640px' }}>
          <a
            className="partner-card glass-card"
            href={META_QUEST_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ borderColor: 'rgba(0,130,251,0.4)' }}
          >
            <div className="partner-logo" style={{ gap: '14px', background: '#0b1220', border: '1px solid rgba(255,255,255,0.12)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 800 }}>
                <MetaQuestLogo size={32} color="#fff" /> Meta Quest
              </span>
              <span style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.2)' }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 800 }}>
                <MetaLogo size={28} color="#0082FB" /> Meta
              </span>
            </div>
            <h3>SurgiVerse · Meta Horizon Store</h3>
            <p>Get the native VR experience on Quest 2 / 3 / 3S / Pro via the official Meta store listing. Pilot procedure: Myringotomy — live now on the SurgiVerse Meta Horizon app.</p>
            <span className="partner-link">Get it on Meta Quest →</span>
          </a>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default About;
