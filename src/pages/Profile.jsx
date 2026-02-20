import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import { Box, Typography, Paper, CircularProgress, Grid, TextField, Button, Switch, FormControlLabel, Slider, Container } from '@mui/material';

const Profile = () => {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserData(userDocSnap.data());
        } else {
          console.log("No such user document!");
        }

        const settingsQuery = query(collection(db, 'config'), where('uid', '==', user.uid));
        const settingsSnapshot = await getDocs(settingsQuery);
        
        if (!settingsSnapshot.empty) {
            const settingsData = settingsSnapshot.docs[0].data();
            setUserSettings({
              ...settingsData,
              id: settingsSnapshot.docs[0].id
            });
            setFormData({
              ...settingsData,
              AntiAliasing: settingsData.AntiAliasing === 'True'
            });
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

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSliderChange = (name, value) => {
    setFormData(prev => ({...prev, [name]: value}));
  }

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (!userSettings?.id) {
        setError("Cannot update settings: user settings ID not found.");
        return;
    }

    try {
        const settingsDocRef = doc(db, 'config', userSettings.id);
        const updatedData = {
          ...formData,
          AntiAliasing: formData.AntiAliasing ? 'True' : 'False',
          MasterVolume: formData.MasterVolume.toString(),
          SFXMusicVolume: formData.SFXMusicVolume.toString(),
          AmbientMusicVolume: formData.AmbientMusicVolume.toString(),
        }
        await updateDoc(settingsDocRef, updatedData);
        setUserSettings(prev => ({...prev, ...formData, AntiAliasing: formData.AntiAliasing ? 'True' : 'False' }));
        setIsEditing(false);
    } catch (err) {
        setError("Failed to update settings.");
        console.error(err);
    }
  }

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Typography color="error">{error}</Typography></Box>;
  }

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: 'background.default', minHeight: '100vh', width: "100%" }}>
      <Navbar />
      <Container className="page-container">
        <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
          Your Profile
        </Typography>

        {!user ? (
          <Typography>Please log in to view your profile.</Typography>
        ) : (
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} className="page-paper">
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
              <Paper elevation={3} className="page-paper">
                <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
                  In-Game Settings
                </Typography>
                {userSettings ? (
                  isEditing ? (
                    <form onSubmit={handleFormSubmit}>
                        <TextField
                            label="Display Name"
                            name="Name"
                            value={formData.Name || ''}
                            onChange={handleInputChange}
                            fullWidth
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            label="Age"
                            name="Age"
                            type="number"
                            value={formData.Age || ''}
                            onChange={handleInputChange}
                            fullWidth
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            label="Graphics Level"
                            name="GraphicsLevel"
                            type="number"
                            value={formData.GraphicsLevel || ''}
                            onChange={handleInputChange}
                            fullWidth
                            sx={{ mb: 2 }}
                        />
                        <FormControlLabel
                            control={<Switch checked={formData.AntiAliasing || false} onChange={handleInputChange} name="AntiAliasing" />}
                            label="Anti-Aliasing"
                            sx={{ mb: 2 }}
                        />
                        <Typography gutterBottom>Master Volume</Typography>
                        <Slider
                          value={parseFloat(formData.MasterVolume) || 0}
                          onChange={(e, value) => handleSliderChange('MasterVolume', value)}
                          step={0.1}
                          min={0}
                          max={1}
                          valueLabelDisplay="auto"
                        />
                        <Typography gutterBottom>SFX Volume</Typography>
                        <Slider
                          value={parseFloat(formData.SFXMusicVolume) || 0}
                          onChange={(e, value) => handleSliderChange('SFXMusicVolume', value)}
                          step={0.1}
                          min={0}
                          max={1}
                          valueLabelDisplay="auto"
                        />
                        <Typography gutterBottom>Music Volume</Typography>
                        <Slider
                          value={parseFloat(formData.AmbientMusicVolume) || 0}
                          onChange={(e, value) => handleSliderChange('AmbientMusicVolume', value)}
                          step={0.1}
                          min={0}
                          max={1}
                          valueLabelDisplay="auto"
                        />
                        <Box sx={{ mt: 3 }}>
                            <Button type="submit" variant="contained">Save Changes</Button>
                            <Button onClick={() => setIsEditing(false)} sx={{ ml: 2 }}>Cancel</Button>
                        </Box>
                    </form>
                  ) : (
                  <Box>
                    <Typography><strong>Age:</strong> {userSettings.Age || 'N/A'}</Typography>
                    <Typography><strong>Display Name:</strong> {userSettings.Name || 'N/A'}</Typography>
                    <Typography sx={{ mt: 2 }}><strong>Graphics Level:</strong> {userSettings.GraphicsLevel || 'N/A'}</Typography>
                    <Typography><strong>Anti-Aliasing:</strong> {userSettings.AntiAliasing === 'True' ? 'Enabled' : 'Disabled'}</Typography>
                    <Typography sx={{ mt: 2 }}><strong>Master Volume:</strong> {userSettings.MasterVolume ? parseFloat(userSettings.MasterVolume).toFixed(2) : 'N/A'}</Typography>
                    <Typography><strong>SFX Volume:</strong> {userSettings.SFXMusicVolume ? parseFloat(userSettings.SFXMusicVolume).toFixed(2) : 'N/A'}</Typography>
                    <Typography><strong>Music Volume:</strong> {userSettings.AmbientMusicVolume ? parseFloat(userSettings.AmbientMusicVolume).toFixed(2) : 'N/A'}</Typography>
                    <Button onClick={() => setIsEditing(true)} variant="outlined" sx={{ mt: 3 }}>Edit Settings</Button>
                  </Box>
                  )
                ) : (
                  <Typography>No user settings found.</Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default Profile;
