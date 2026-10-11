import React from 'react';
import MarketingNavbar from '../components/MarketingNavbar';
import MarketingFooter from '../components/MarketingFooter';
import './PrivacyStyles.css';

const Privacy = () => {
  const lastUpdated = 'October 11, 2026';

  const sections = [
    {
      title: '1. Information We Collect',
      body: 'SurgiVerse collects account information you provide directly (name, email address, institutional affiliation, and role), learning and simulation data generated through your use of the platform (performance metrics, scores, progress, and feedback), and limited technical data (device type, browser type, and anonymized usage analytics) necessary to operate and improve the service.',
    },
    {
      title: '2. How We Use Your Information',
      body: 'We use your information to provide and maintain the SurgiVerse simulation platform, authenticate users and manage roles (student, TA, professor), generate AI-powered performance feedback and analytics, improve surgical training content, communicate important updates, and ensure platform security and integrity.',
    },
    {
      title: '3. AI Processing & Training Data',
      body: 'Anonymized simulation performance data may be used to improve our scoring models and AI feedback systems. We do not sell personal data. Any data used for research or model improvement is aggregated and de-identified so it cannot reasonably be linked back to an individual.',
    },
    {
      title: '4. Data Storage & Security',
      body: 'Data is stored securely using Firebase (Google Cloud) authentication and Firestore databases with role-based access controls. Professors and teaching assistants can only access student data within their own institution or course scope. We apply industry-standard safeguards including encryption in transit, access logging, and least-privilege access.',
    },
    {
      title: '5. Sharing & Disclosure',
      body: 'We share data only as needed to operate the service: with your educational institution (for grading and progress tracking), with infrastructure providers (e.g., Firebase/Google Cloud, Vercel hosting), and when required by law. We never sell your personal information to third parties or advertisers.',
    },
    {
      title: '6. Cookies & Analytics',
      body: 'SurgiVerse uses essential cookies and local storage for authentication sessions and user preferences. We may use privacy-respecting analytics to understand aggregate usage patterns. You can clear site data in your browser at any time, though this may sign you out.',
    },
    {
      title: '7. Your Rights',
      body: 'You may request access to, correction of, or deletion of your personal data at any time by contacting contact@surgiverse.tech. Students of partner institutions may also exercise these rights through their institution. We will respond within a reasonable timeframe, subject to applicable educational-record regulations.',
    },
    {
      title: '8. Children & Educational Use',
      body: 'SurgiVerse is designed for medical students, educators, and institutions. Accounts for minors, where applicable, must be created and managed under the supervision of an educational institution or legal guardian in compliance with applicable laws.',
    },
    {
      title: '9. Data Retention',
      body: 'We retain account and learning data for as long as your account is active or as required by your institution for academic records. When an account is deleted, personal identifiers are removed or anonymized, except where retention is required by law or legitimate academic purposes.',
    },
    {
      title: '10. Contact Us',
      body: 'For privacy questions, data requests, or concerns, contact us at contact@surgiverse.tech. Please include "Privacy Request" in the subject line so we can route your message promptly.',
    },
  ];

  return (
    <div className="privacy-container">
      <MarketingNavbar />

      <div className="privacy-wrapper">
        <div className="privacy-card glass-card">
          <p className="privacy-eyebrow">SurgiVerse Technologies</p>
          <h1>Privacy Policy</h1>
          <p className="privacy-updated">Last updated: {lastUpdated}</p>
          <p className="privacy-intro">
            SurgiVerse (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) provides an immersive VR and AI-powered
            surgical training platform. This Privacy Policy explains what data we collect,
            how we use it, and the choices you have. By using SurgiVerse, you agree to the
            practices described below.
          </p>

          <div className="privacy-sections">
            {sections.map((section, idx) => (
              <section key={idx} className="privacy-section">
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
};

export default Privacy;
