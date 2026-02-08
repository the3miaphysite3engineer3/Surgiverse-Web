import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Switch } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const Navbar = ({ vrMode, onVrModeChange }) => {
  const { currentUser } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AppBar position="static" className="navbar">
      <Toolbar>
        <Typography variant="h6" component="div" className="navbar-brand">
          SurgiVerse
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {currentUser && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body1" sx={{ mr: 2 }}>
              {currentUser.email}
            </Typography>
            <div className="vr-mode-toggle">
              <Typography>VR Mode</Typography>
              <Switch checked={vrMode} onChange={onVrModeChange} />
            </div>
            <Button color="inherit" onClick={handleLogout} sx={{ ml: 2 }}>
              Logout
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
