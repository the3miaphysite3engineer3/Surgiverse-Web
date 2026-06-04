import React from 'react';
import MarketingNavbar from '../components/MarketingNavbar';
import MarketingFooter from '../components/MarketingFooter';
import './AboutStyles.css';

const About = () => {
  const team = [
    { name: "George Tawadrous", role: "Lead Engineer, AI Engineer & Cloud Architect", bio: "MLOps, VR Architecture, Gemini AI, Firebase, RAG Pipeline", image: "/team/george.jpg" },
    { name: "Youssef Hatem", role: "System Haptics Engineer", bio: "Dexmo Glove Integration, XR Physics, Embedded Systems" },
    { name: "Michael Shohda", role: "3D Modeling & Unity Dev", bio: "CT Reconstruction, Unity Interactions" },
    { name: "Yousif Hazim", role: "3D Modeling & Unity Dev", bio: "3D Modeling, Unity XR Toolkit" },
    { name: "Youssef Habil", role: "Backend Architect", bio: "Firebase Auth, Firestore, Cloud Functions" },
    { name: "Mazen Saeed", role: "VR Interaction Developer", bio: "Unity XR Toolkit, Collider Systems", image: "/team/mazen.png" },
    { name: "Kirolos Sedra", role: "Senior Software Mentor", bio: "Guiding software architecture, mentoring team members, code review excellence", image: "/team/sedra.png" }
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
            To become the global standard for surgical simulation — replacing cadaveric labs, democratizing training access, and feeding the next generation of autonomous surgical AI. Every simulation run on our platform translates directly into safer real-world procedures.
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

      <MarketingFooter />
    </div>
  );
};

export default About;
