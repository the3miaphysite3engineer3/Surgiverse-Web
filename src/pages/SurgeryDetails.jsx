import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { getAuth } from 'firebase/auth';
import { Box, Container, Typography, Paper, CircularProgress, List, ListItem, ListItemText, Divider, Grid } from '@mui/material';
import Navbar from '../components/Navbar';

const SurgeryDetails = () => {
  const { id } = useParams();
  const [surgery, setSurgery] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchSurgeryDetails = async () => {
      try {
        setLoading(true);
        const surgeryDoc = doc(db, 'surgeries', id);
        const surgerySnapshot = await getDoc(surgeryDoc);

        if (surgerySnapshot.exists()) {
          setSurgery({ id: surgerySnapshot.id, ...surgerySnapshot.data() });
        } else {
          setError('Surgery not found.');
        }

        if (currentUser) {
          const attemptsCollection = collection(db, 'attempts');
          const q = query(attemptsCollection, where('surgeryId', '==', id), where('userId', '==', currentUser.uid));
          const attemptsSnapshot = await getDocs(q);
          const attemptsList = attemptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAttempts(attemptsList);
        }
      } catch (err) {
        setError('Failed to fetch surgery details. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSurgeryDetails();
  }, [id, currentUser]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!surgery) {
    return null;
  }

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: 'background.default', minHeight: '100vh' }}>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h4" component="h1" sx={{ mb: 2, color: 'primary.main' }}>
            {surgery.title}
          </Typography>
          <Typography variant="subtitle1" sx={{ mb: 2, color: 'text.secondary' }}>
            {surgery.category}
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {surgery.description}
          </Typography>
          
          <Grid container spacing={3}>
            {surgery.patientInfo && (
              <Grid item xs={12} md={6}>
                <Typography variant="h6">Patient Information</Typography>
                <Typography><strong>Name:</strong> {surgery.patientInfo.name}</Typography>
                <Typography><strong>Age:</strong> {surgery.patientInfo.age}</Typography>
                <Typography><strong>Gender:</strong> {surgery.patientInfo.gender}</Typography>
              </Grid>
            )}
            {surgery.date && (
              <Grid item xs={12} md={6}>
                <Typography variant="h6">Procedure Details</Typography>
                <Typography><strong>Date:</strong> {surgery.date}</Typography>
                <Typography><strong>Duration:</strong> {surgery.duration}</Typography>
                <Typography><strong>Surgeons:</strong> {surgery.surgeons?.join(', ')}</Typography>
              </Grid>
            )}
          </Grid>

          {surgery.metrics && (
            <Box sx={{ my: 3 }}>
              <Typography variant="h6">Metrics</Typography>
              <Typography>- <strong>Blood Loss:</strong> {surgery.metrics.bloodLoss}</Typography>
              <Typography>- <strong>Complications:</strong> {surgery.metrics.complications}</Typography>
              <Typography>- <strong>Outcome:</strong> {surgery.metrics.outcome}</Typography>
            </Box>
          )}

          {surgery.requiredSteps && (
            <Box sx={{ my: 3 }}>
              <Typography variant="h6">Required Steps</Typography>
              <List>
                {surgery.requiredSteps.map((step, index) => (
                  <ListItem key={index} disablePadding>
                    <ListItemText primary={`${index + 1}. ${step}`} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <Box>
            <Typography variant="h5" sx={{ mb: 2 }}>Your Attempts</Typography>
            {currentUser ? (
              attempts.length > 0 ? (
                <List>
                  {attempts.map((attempt, index) => (
                    <ListItem key={attempt.id} disablePadding>
                      <ListItemText 
                        primary={`Attempt #${index + 1}`}
                        secondary={`Score: ${attempt.score}, Time Taken: ${attempt.timeTaken}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography>You have not attempted this surgery yet.</Typography>
              )
            ) : (
              <Typography>Please log in to see your attempts.</Typography>
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default SurgeryDetails;
