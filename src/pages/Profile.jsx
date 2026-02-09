import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import { Box, Typography, Paper, CircularProgress, Grid } from '@mui/material';

const Profile = () => {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch user data from 'users' collection
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserData(userDocSnap.data());
        } else {
          console.log("No such user document!");
        }

        // Fetch user settings from 'userSettings' collection by UID field
        const settingsQuery = query(collection(db, 'userSettings'), where('uid', '==', user.uid));
        const settingsSnapshot = await getDocs(settingsQuery);
        
        if (!settingsSnapshot.empty) {
            // Assuming one settings document per user
            setUserSettings(settingsSnapshot.docs[0].data());
        } else {
            console.log("No userSettings document found for this user!");
        }

      } catch (err) {
        setError('Failed to fetch profile data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Typography color="error">{error}</Typography></Box>;
  }

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: 'background.default', minHeight: '100vh' }}>
      <Navbar />
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
          Your Profile
        </Typography>

        {!user ? (
          <Typography>Please log in to view your profile.</Typography>
        ) : (
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ p: 4, height: '100%' }}>
                <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
                  Account Information
                </Typography>
                {userData ? (
                  <Box>
                    <Typography variant="h6">Name:</Typography>
                    <Typography variant="body1">{`${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'N/A'}</Typography>
                    
                    <Typography variant="h6" sx={{ mt: 2 }}>Email:</Typography>
                    <Typography variant="body1">{user.email}</Typography>

                    <Typography variant="h6" sx={{ mt: 2 }}>Role:</Typography>
                    <Typography variant="body1">{userData.role || 'N/A'}</Typography>
                    
                    <Typography variant="h6" sx={{ mt: 2 }}>User ID:</Typography>
                    <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>{user.uid}</Typography>

                    <Typography variant="h6" sx={{ mt: 2 }}>Last Login:</Typography>
                    <Typography variant="body1">
                      {userData.lastLogin?.seconds ? new Date(userData.lastLogin.seconds * 1000).toLocaleString() : 'N/A'}
                    </Typography>
                  </Box>
                ) : (
                  <Typography>Could not load user information.</Typography>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ p: 4, height: '100%' }}>
                <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
                  In-Game Settings
                </Typography>
                {userSettings ? (
                  <Box>
                    <Typography><strong>Age:</strong> {userSettings.Age || 'N/A'}</Typography>
                    <Typography><strong>Display Name:</strong> {userSettings.Name || 'N/A'}</Typography>
                    <Typography sx={{ mt: 2 }}><strong>Graphics Level:</strong> {userSettings.GraphicsLevel || 'N/A'}</Typography>
                    <Typography><strong>Anti-Aliasing:</strong> {userSettings.AntiAliasing === 'True' ? 'Enabled' : 'Disabled'}</Typography>
                    <Typography sx={{ mt: 2 }}><strong>Master Volume:</strong> {userSettings.MasterVolume ? parseFloat(userSettings.MasterVolume).toFixed(2) : 'N/A'}</Typography>
                    <Typography><strong>SFX Volume:</strong> {userSettings.SFXMusicVolume ? parseFloat(userSettings.SFXMusicVolume).toFixed(2) : 'N/A'}</Typography>
                    <Typography><strong>Music Volume:</strong> {userSettings.AmbientMusicVolume ? parseFloat(userSettings.AmbientMusicVolume).toFixed(2) : 'N/A'}</Typography>
                  </Box>
                ) : (
                  <Typography>No user settings found.</Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default Profile;