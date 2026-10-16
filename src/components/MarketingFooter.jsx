import React from 'react';
import { Link } from 'react-router-dom';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import { META_QUEST_URL, MetaLogo, MetaQuestLogo } from './MetaLogos';
import './MarketingFooter.css';

const MarketingFooter = () => {
  return (
    <footer className="marketing-footer">
      <div className="footer-content">
        <div className="footer-logo">SURGIVERSE</div>
        <div className="footer-links">
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
        <div className="footer-social">
          <a href="https://www.instagram.com/surgi__verse/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <InstagramIcon fontSize="large" />
          </a>
          <a href="https://www.facebook.com/profile.php?id=61590697887074" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <FacebookIcon fontSize="large" />
          </a>
          <a href="https://www.linkedin.com/company/surgiverse28" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <LinkedInIcon fontSize="large" />
          </a>
          <a href={META_QUEST_URL} target="_blank" rel="noopener noreferrer" aria-label="Get SurgiVerse on Meta Quest" title="Get SurgiVerse on Meta Quest">
            <MetaQuestLogo size={20} />
          </a>
          <a href={META_QUEST_URL} target="_blank" rel="noopener noreferrer" aria-label="Meta" title="Meta" style={{ color: '#0082FB' }}>
            <MetaLogo size={20} color="#0082FB" />
          </a>
        </div>
        <a
          className="footer-meta-badge"
          href={META_QUEST_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MetaQuestLogo size={20} color="#fff" />
          <span>Available on Meta Quest</span>
          <MetaLogo size={18} color="#0082FB" />
        </a>
        <p>&copy; {new Date().getFullYear()} SurgiVerse Technologies. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default MarketingFooter;
