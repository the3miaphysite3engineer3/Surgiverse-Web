import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import './MarketingNavbar.css';

const MarketingNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);

    const fetchUserRole = async () => {
        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserRole(userDocSnap.data().role);
          }
        }
    };
    fetchUserRole();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [user]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [menuOpen]);

  const handleLogout = async () => {
    await signOut(auth);
    closeMenu();
    navigate('/');
  };

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  let navClass = scrolled ? "marketing-nav scrolled" : "marketing-nav";
  if (menuOpen) navClass += " menu-open";

  const getNavLinks = () => {
    if (!user) {
        return (
            <>
                <span className={location.pathname === '/' ? "nav-link active" : "nav-link"} onClick={() => { navigate('/'); closeMenu(); }}>Home</span>
                <span className={location.pathname === '/about' ? "nav-link active" : "nav-link"} onClick={() => { navigate('/about'); closeMenu(); }}>About</span>
                <span className={location.pathname === '/contact' ? "nav-link active" : "nav-link"} onClick={() => { navigate('/contact'); closeMenu(); }}>Contact</span>
            </>
        );
    }

    const links = [{ to: "/dashboard", text: "Dashboard" }];

    if (userRole === 'professor') {
        links.push(
            { to: "/add-surgery", text: "Add Surgery" },
            { to: "/grade-students", text: "Grade Students" },
            { to: "/add-resources", text: "Add Resources" },
            { to: "/visual-resources", text: "Visual Resources" },
            { to: "/analytics", text: "Analytics" },
            { to: "/manage-users", text: "Manage Users" },
            { to: "/game-settings", text: "Game Settings" }
        );
    } else if (userRole === 'TA') {
        links.push(
            { to: "/grade-students", text: "Grade Students" },
            { to: "/analytics", text: "Analytics" }
        );
    }
    links.push({ to: "/profile", text: "Profile" });

    return links.map(link => (
        <span 
            key={link.to} 
            className={location.pathname === link.to ? "nav-link active" : "nav-link"} 
            onClick={() => { navigate(link.to); closeMenu(); }}
        >
            {link.text}
        </span>
    ));
  };

  return (
    <nav className={navClass}>
      <div className="nav-logo" onClick={() => { navigate(user ? '/dashboard' : '/'); closeMenu(); }} style={{cursor: 'pointer'}}>
        SURGIVERSE
      </div>
      
      {/* Desktop Links */}
      <div className="nav-links desktop-only">
        {getNavLinks()}
      </div>

      <div className="nav-actions desktop-only">
        {user ? (
          <button className="nav-login-btn logout" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <button className="nav-login-btn" onClick={() => navigate('/login')}>
            Sign In / Register
          </button>
        )}
      </div>

      {/* Hamburger Button */}
      <div className={`nav-hamburger ${menuOpen ? 'active' : ''}`} onClick={toggleMenu}>
        <span></span>
        <span></span>
        <span></span>
      </div>

      {/* Mobile Side Menu */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-links">
          {getNavLinks()}
          <div className="mobile-menu-actions">
            {user ? (
              <button className="nav-login-btn logout" onClick={handleLogout}>
                Logout
              </button>
            ) : (
              <button className="nav-login-btn" onClick={() => navigate('/login')}>
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Overlay */}
      {menuOpen && <div className="menu-overlay" onClick={closeMenu}></div>}
    </nav>
  );
};

export default MarketingNavbar;
