import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Container } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const Navbar = ({ showBackButton = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/auth'); // Redirect to login page after logout
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleBack = () => {
    navigate(-1); // Go back to the previous page
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: 'primary.main' }}>
        <Container maxWidth={false}>
            <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {showBackButton && (
                    <IconButton edge="start" color="inherit" aria-label="back" onClick={handleBack} sx={{ mr: 2 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    )}
                    <Typography variant="h6" component="div">
                        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                            SurgiVerse
                        </Link>
                    </Typography>
                </Box>
        
                {user && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Button color="inherit" component={Link} to="/profile">
                    Profile
                    </Button>
                    <Button color="inherit" onClick={handleLogout}>
                    Logout
                    </Button>
                </Box>
                )}
            </Toolbar>
        </Container>
    </AppBar>
  );
};

export default Navbar;
