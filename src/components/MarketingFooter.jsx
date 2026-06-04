import React from 'react';
import './MarketingFooter.css';

const MarketingFooter = () => {
  return (
    <footer className="marketing-footer">
      <div className="footer-content">
        <div className="footer-logo">SURGIVERSE</div>
        <div className="footer-social">
          <a href="https://www.instagram.com/surgi__verse/" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href="https://www.facebook.com/profile.php?id=61590697887074" target="_blank" rel="noopener noreferrer">Facebook</a>
          <a href="https://www.linkedin.com/company/surgiverse28" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </div>
        <p>&copy; {new Date().getFullYear()} SurgiVerse Technologies. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default MarketingFooter;
