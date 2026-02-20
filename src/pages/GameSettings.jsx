import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import { Box, Typography, Slider, Switch, FormControlLabel, Button, Container, Paper, CircularProgress, Grid, TextField } from '@mui/material';

const GameSettings = () => {
  const [settings, setSettings] = useState({
    AmbientMusicVolume: '0.1',
    AntiAliasing: 'False',
    GraphicsLevel: '3',
    MasterVolume: '0.2160846',
    SFXMusicVolume: '0.2160846',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const settingsDoc = doc(db, 'config', 'global');
        const settingsSnapshot = await getDoc(settingsDoc);
        if (settingsSnapshot.exists()) {
          setSettings(settingsSnapshot.data());
        }
      } catch (err) {
        setError('Failed to fetch settings.');
        console.error(err);
      }
      setLoading(false);
    };

    fetchSettings();
  }, []);

  const handleChange = (name, value) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    try {
      const settingsDoc = doc(db, 'config', 'global');
      await setDoc(settingsDoc, settings, { merge: true });
      setSuccess(true);
    } catch (err) {
      setError('Failed to save settings. Please try again.');
      console.error(err);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Navbar />
      <Container className="page-container">
        <Paper className="page-paper">
          <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
            Global Game Settings
          </Typography>
          {success && <Typography color="success" sx={{mb: 2}}>Settings saved successfully!</Typography>}
          {error && <Typography color="error" sx={{mb: 2}}>{error}</Typography>}
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <Typography gutterBottom>Master Volume</Typography>
              <Slider
                value={parseFloat(settings.MasterVolume) || 0}
                onChange={(e, newValue) => handleChange('MasterVolume', newValue.toString())}
                aria-labelledby="master-volume-slider"
                valueLabelDisplay="auto"
                step={0.1}
                marks
                min={0}
                max={1}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>SFX Volume</Typography>
              <Slider
                value={parseFloat(settings.SFXMusicVolume) || 0}
                onChange={(e, newValue) => handleChange('SFXMusicVolume', newValue.toString())}
                aria-labelledby="sfx-volume-slider"
                valueLabelDisplay="auto"
                step={0.1}
                marks
                min={0}
                max={1}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>Ambient Music Volume</Typography>
              <Slider
                value={parseFloat(settings.AmbientMusicVolume) || 0}
                onChange={(e, newValue) => handleChange('AmbientMusicVolume', newValue.toString())}
                aria-labelledby="ambient-volume-slider"
                valueLabelDisplay="auto"
                step={0.1}
                marks
                min={0}
                max={1}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>Graphics Level (1-5)</Typography>
                <Slider
                    value={parseInt(settings.GraphicsLevel) || 3}
                    onChange={(e, newValue) => handleChange('GraphicsLevel', newValue.toString())}
                    aria-labelledby="graphics-level-slider"
                    valueLabelDisplay="auto"
                    step={1}
                    marks
                    min={1}
                    max={5}
                />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={settings.AntiAliasing === 'True'} onChange={(e) => handleChange('AntiAliasing', e.target.checked ? 'True' : 'False')} name="AntiAliasing" />}
                label="Anti-Aliasing"
              />
            </Grid>
          </Grid>
          <Button variant="contained" onClick={handleSave} sx={{ mt: 4 }}>
            Save Global Settings
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default GameSettings;
