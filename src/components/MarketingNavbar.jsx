import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { useThemeMode } from '../context/ThemeContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { META_QUEST_URL, MetaQuestLogo } from './MetaLogos';
import './MarketingNavbar.css';

const SunIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const MarketingNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const [userRole, setUserRole] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Keep the desktop bar roomy: a professor has ~10 links and only fits
  // comfortably from 1536px up; lighter link sets fit from 1024px.
  const isDesktopNav = useMediaQuery(
    user && userRole === 'professor'
      ? '(min-width: 1536px)'
      : user
        ? '(min-width: 1200px)'
        : '(min-width: 1024px)'
  );
  // Narrow professor desktop band: reclaim space by hiding the Meta Quest label.
  const isCompactDesktop = useMediaQuery('(min-width: 1536px) and (max-width: 1780px)');

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
    if (isDesktopNav) setMenuOpen(false);
  }, [isDesktopNav]);

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
  if (user && userRole === 'professor') navClass += " nav-prof";
  if (isCompactDesktop) navClass += " nav-compact";

  const ThemeToggle = () => (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );

  const getNavLinks = () => {
    if (!user) {
        return (
            <>
                <Link className={location.pathname === '/' ? "nav-link active" : "nav-link"} to="/" onClick={closeMenu}>Home</Link>
                <Link className={location.pathname === '/about' ? "nav-link active" : "nav-link"} to="/about" onClick={closeMenu}>About</Link>
                <Link className={location.pathname === '/contact' ? "nav-link active" : "nav-link"} to="/contact" onClick={closeMenu}>Contact</Link>
                <Link className={location.pathname === '/privacy' ? "nav-link active" : "nav-link"} to="/privacy" onClick={closeMenu}>Privacy</Link>
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
        <Link
            key={link.to}
            to={link.to}
            className={location.pathname === link.to ? "nav-link active" : "nav-link"}
            onClick={closeMenu}
        >
            {link.text}
        </Link>
    ));
  };

  return (
    <nav className={navClass}>
      <div className="nav-logo" onClick={() => { navigate(user ? '/dashboard' : '/'); closeMenu(); }} style={{cursor: 'pointer'}}>
        SURGIVERSE
      </div>

      {/* Desktop Links */}
      {isDesktopNav && (
        <div className="nav-links desktop-only">
          {getNavLinks()}
        </div>
      )}

      <div className="nav-actions">
        <ThemeToggle />
        {isDesktopNav && (
          <>
            <a
              className="nav-quest-btn"
              href={META_QUEST_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MetaQuestLogo size={18} />
              <span>Meta Quest</span>
            </a>
            {user ? (
              <button className="nav-login-btn logout" onClick={handleLogout}>
                Logout
              </button>
            ) : (
              <button className="nav-login-btn" onClick={() => navigate('/login')}>
                Sign In / Register
              </button>
            )}
          </>
        )}
      </div>

      {/* Hamburger Button */}
      {!isDesktopNav && (
        <div className={`nav-hamburger ${menuOpen ? 'active' : ''}`} onClick={toggleMenu} role="button" aria-label="Toggle navigation menu" aria-expanded={menuOpen}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      )}

      {/* Mobile Side Menu */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-links">
          {getNavLinks()}
          <div className="mobile-menu-actions">
            <button type="button" className="theme-toggle theme-toggle-row" onClick={toggleTheme}>
              <span>{mode === 'dark' ? 'Light theme' : 'Dark theme'}</span>
              {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <a
              className="nav-quest-btn"
              href={META_QUEST_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              style={{ justifyContent: 'center', textDecoration: 'none' }}
            >
              <MetaQuestLogo size={18} />
              <span>Get it on Meta Quest</span>
            </a>
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
