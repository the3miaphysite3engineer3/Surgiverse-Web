import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import { Box, Container, Grid, Typography, Paper, CircularProgress, Button } from '@mui/material';

const Dashboard = () => {
  const [surgeriesWithAttempts, setSurgeriesWithAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vrMode, setVrMode] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch surgeries
        const surgeriesCollection = collection(db, 'surgeries');
        const surgerySnapshot = await getDocs(surgeriesCollection);
        const surgeryList = surgerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch attempts if user is logged in
        let attemptsList = [];
        if (currentUser) {
          const attemptsCollection = collection(db, 'attempts');
          const q = query(attemptsCollection, where('userId', '==', currentUser.uid));
          const attemptsSnapshot = await getDocs(q);
          attemptsList = attemptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        // Merge surgeries with their corresponding attempts
        const mergedData = surgeryList.map(surgery => ({
          ...surgery,
          attempts: attemptsList.filter(attempt => attempt.surgeryId === surgery.id)
        }));

        setSurgeriesWithAttempts(mergedData);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const handleVrModeChange = (event) => {
    setVrMode(event.target.checked);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Typography color="error">{error}</Typography></Box>;
  }

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: 'background.default', minHeight: '100vh' }}>
      <Navbar vrMode={vrMode} onVrModeChange={handleVrModeChange} />
      <Container maxWidth="lg" className="dashboard-container">
        <Typography variant="h4" component="h1" className="dashboard-title">
          SurgiVerse Dashboard
        </Typography>
        <Grid container spacing={4}>
          {surgeriesWithAttempts.map((surgery) => (
            <Grid item xs={12} md={6} key={surgery.id}>
              <Paper elevation={3} className="surgery-card">
                <Typography variant="h5" component="h2" className="surgery-card-title">
                  {surgery.title}
                </Typography>
                <Typography variant="subtitle1" className="surgery-card-category">
                  {surgery.category}
                </Typography>
                <Typography variant="body2" className="surgery-card-description">
                  {surgery.description}
                </Typography>

                <Box className="attempts-section">
                  <Typography variant="h6" className="attempts-title">Your Attempts</Typography>
                  {currentUser ? (
                    surgery.attempts.length > 0 ? (
                      <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
                        {surgery.attempts.map((attempt, index) => (
                          <li key={index} className="attempt-item">
                            <strong>Attempt #{index + 1}:</strong> Score - {attempt.score}, Time - {attempt.timeTaken}s
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Typography className="no-attempts">You have not attempted this surgery yet.</Typography>
                    )
                  ) : (
                    <Typography>Please log in to see your attempts.</Typography>
                  )}
                </Box>

                <Box sx={{ mt: 2, textAlign: 'right' }}>
                  {vrMode ? (
                    <Button 
                      variant="contained" 
                      className="launch-button"
                      onClick={() => console.log(`Launching VR scene: ${surgery.sceneName}`)}
                    >
                      Launch in VR
                    </Button>
                  ) : (
                    <Button component={Link} to={`/surgery/${surgery.id}`} variant="contained" color="primary">
                      View Details
                    </Button>
                  )}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
