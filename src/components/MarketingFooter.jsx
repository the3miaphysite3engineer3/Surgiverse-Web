import React from 'react';
import './MarketingFooter.css';

const MarketingFooter = () => {
  return (
    <footer className="marketing-footer">
      <div className="footer-content">
        <div className="footer-logo">SURGIVERSE</div>
        <p>&copy; {new Date().getFullYear()} SurgiVerse Technologies. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default MarketingFooter;
