import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Container, Drawer, List, ListItem, useMediaQuery } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../hooks/useAuth';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const Navbar = ({ showBackButton = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery(theme => theme.breakpoints.down('md'));

  useEffect(() => {
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
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleBack = () => navigate(-1);

  const getNavLinks = (isDrawer) => {
    const linkStyle = {
      textDecoration: 'none',
      color: 'inherit',
      display: 'block',
      width: '100%',
      padding: isDrawer ? '10px 20px' : '0'
    };

    const professorLinks = [
        { to: "/add-surgery", text: "Add Surgery" },
        { to: "/grade-students", text: "Grade Students" },
        { to: "/add-resources", text: "Add Resources" },
        { to: "/visual-resources", text: "Visual Resources" },
        { to: "/analytics", text: "Analytics" },
        { to: "/manage-users", text: "Manage Users" },
        { to: "/game-settings", text: "Game Settings" },
    ];

    const taLinks = [
      { to: "/grade-students", text: "Grade Students" },
      { to: "/analytics", text: "Analytics" },
    ];

    const commonLinks = [
      { to: "/profile", text: "Profile" }
    ];

    let links = [];
    if (userRole === 'professor') {
      links = [...links, ...professorLinks];
    }
    if (userRole === 'TA') {
      links = [...links, ...taLinks];
    }
    links = [...links, ...commonLinks];

    return (
      <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center' }}>
        {links.map((link) => (
          <Button key={link.to} color="inherit" component={Link} to={link.to} sx={linkStyle}>
            {link.text}
          </Button>
        ))}
        <Button color="inherit" onClick={handleLogout} sx={linkStyle}>
          Logout
        </Button>
      </Box>
    );
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: 'primary.main' }}>
      <Container maxWidth={false}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {showBackButton && <IconButton edge="start" color="inherit" onClick={handleBack} sx={{ mr: 2 }}><ArrowBackIcon /></IconButton>}
            <Typography variant="h6" component={Link} to="/dashboard" sx={{ textDecoration: 'none', color: 'inherit' }}>
              SurgiVerse
            </Typography>
          </Box>

          {user && (
            isMobile ? (
              <IconButton color="inherit" edge="end" onClick={handleDrawerToggle}>
                <MenuIcon />
              </IconButton>
            ) : (
              getNavLinks(false)
            )
          )}
        </Toolbar>
      </Container>
      <Drawer anchor="right" open={drawerOpen} onClose={handleDrawerToggle}>
        <Box sx={{ width: 250, p: 2 }}>
          <List>
            {getNavLinks(true)}
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
};

export default Navbar;
