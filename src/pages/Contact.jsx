import React, { useState } from 'react';
import MarketingNavbar from '../components/MarketingNavbar';
import MarketingFooter from '../components/MarketingFooter';
import './ContactStyles.css';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate form submission
    setTimeout(() => setSubmitted(true), 1000);
  };

  return (
    <div className="contact-container">
      <MarketingNavbar />
      
      <div className="contact-wrapper">
        <div className="contact-info parallax-bg">
          <div className="info-content glass-card">
            <h2>Establish Connection</h2>
            <p>Initiate a secure channel with the SurgiVerse deployment team. Whether you're an institution looking to onboard, or a surgeon interested in beta testing, we're ready to interface.</p>
            
            <div className="contact-details">
               <div className="detail-item">
                 <span className="icon">📡</span>
                 <span>contact@surgiverse.tech</span>
               </div>
             </div>
          </div>
        </div>

        <div className="contact-form-section">
          {submitted ? (
            <div className="success-message glass-card">
              <h3>Transmission Successful</h3>
              <p>Your message has been securely routed to our team. We will respond shortly.</p>
              <button className="primary-btn mt-4" onClick={() => setSubmitted(false)}>Send Another Message</button>
            </div>
          ) : (
            <form className="contact-form glass-card" onSubmit={handleSubmit}>
              <h3>Send a Message</h3>
              <div className="form-group">
                <input 
                  type="text" 
                  placeholder="Identification (Name)" 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <input 
                  type="email" 
                  placeholder="Return Signal (Email)" 
                  required 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <input 
                  type="text" 
                  placeholder="Subject" 
                  required 
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                />
              </div>
              <div className="form-group">
                <textarea 
                  placeholder="Data Payload (Message)" 
                  rows="5" 
                  required
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                ></textarea>
              </div>
              <button type="submit" className="primary-btn submit-btn">Transmit Data</button>
            </form>
          )}
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
};

export default Contact;
