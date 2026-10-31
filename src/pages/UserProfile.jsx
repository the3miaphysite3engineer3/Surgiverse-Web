import React, { useState, useEffect } from 'react';
import { fetchUserProfile, updateUserNames } from '../lib/db';
import { useAuth } from '../hooks/useAuth';
import MarketingNavbar from '../components/MarketingNavbar';
import MarketingFooter from '../components/MarketingFooter';
import { Box, Container, Paper, Typography, TextField, Button, CircularProgress } from '@mui/material';

const UserProfile = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    document.title = 'SurgiVerse - User Profile';
    const fetchUserProfileData = async () => {
      try {
        const profile = await fetchUserProfile(user.uid);
        if (profile) {
          setUserProfile(profile);
          setFirstName(profile.firstName);
          setLastName(profile.lastName);
        } else {
          setError('User profile not found');
        }
      } catch (err) {
        setError(err?.message || 'Failed to fetch user profile.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserProfileData();
    }
  }, [user]);

  const handleUpdate = async () => {
    try {
      await updateUserNames(user.uid, { firstName, lastName });
      setUserProfile({ ...userProfile, firstName, lastName });
      setIsEditing(false);
    } catch (err) {
      setError(err?.message || 'Failed to update profile.');
      console.error(err);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Typography color="error">{error}</Typography></Box>;
  }

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: 'background.default', minHeight: '100vh', width: "100%", pt: '80px' }}>
      <MarketingNavbar />
      <Container className="page-container">
          <Paper className="page-paper">
            <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
              User Profile
            </Typography>
            {userProfile && (
              <Box>
                {isEditing ? (
                  <Box>
                    <TextField
                      label="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      label="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <Button onClick={handleUpdate} variant="contained" color="primary" sx={{ mr: 1 }}>Save</Button>
                    <Button onClick={() => setIsEditing(false)} variant="outlined">Cancel</Button>
                  </Box>
                ) : (
                  <Box>
                    <Typography><strong>First Name:</strong> {userProfile.firstName}</Typography>
                    <Typography><strong>Last Name:</strong> {userProfile.lastName}</Typography>
                    <Typography><strong>Email:</strong> {userProfile.email}</Typography>
                    <Button onClick={() => setIsEditing(true)} variant="contained" sx={{ mt: 2 }}>Edit Profile</Button>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Container>
        <MarketingFooter />
      </Box>
  );
};

export default UserProfile;
