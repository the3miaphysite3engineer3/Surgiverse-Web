import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import MarketingNavbar from '../components/MarketingNavbar';
import MarketingFooter from '../components/MarketingFooter';
import { formatCompletionTime, formatAttemptDate, firestoreErrorMessage, getAttemptSurgeryId, getAttemptProcedureName } from '../utils/attemptFormat';
import { Box, Container, Grid, Typography, Paper, CircularProgress, Button } from '@mui/material';

const Dashboard = () => {
  const [surgeriesWithAttempts, setSurgeriesWithAttempts] = useState([]);
  const [unmatchedAttempts, setUnmatchedAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    document.title = 'SurgiVerse - Dashboard';
    const fetchData = async () => {
      try {
        // Fetch surgeries
        const surgeriesCollection = collection(db, 'surgeries');
        const surgerySnapshot = await getDocs(surgeriesCollection);
        const surgeryList = surgerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch attempts if user is logged in
        let attemptsList = [];
        if (user) {
          const attemptsCollection = collection(db, 'attempts');
          const q = query(attemptsCollection, where('uid', '==', user.uid));
          const attemptsSnapshot = await getDocs(q);
          attemptsList = attemptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        // Merge surgeries with their corresponding attempts.
        // Supports both legacy `surgery_id` and new Unity `surgeryID`.
        const surgeryIds = new Set(surgeryList.map(s => s.id));
        const mergedData = surgeryList.map(surgery => ({
          ...surgery,
          attempts: attemptsList.filter(attempt => getAttemptSurgeryId(attempt) === surgery.id)
        }));
        // Attempts whose surgeryID matches no known surgery (e.g. new Unity
        // procedure names) would otherwise disappear — surface them separately.
        const orphaned = attemptsList.filter(attempt => {
          const sid = getAttemptSurgeryId(attempt);
          return !sid || !surgeryIds.has(sid);
        });

        setSurgeriesWithAttempts(mergedData);
        setUnmatchedAttempts(orphaned);
      } catch (err) {
        setError(firestoreErrorMessage(err));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Typography color="error">{error}</Typography></Box>;
  }

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: 'background.default', minHeight: '100vh', width: "100%", pt: '80px' }}>
      <MarketingNavbar />
      <Container maxWidth={false} sx={{ py: 4, width: '100vw' }}>
        <Typography variant="h4" component="h1" sx={{ mb: 4, textAlign: 'center' }}>
          SurgiVerse Dashboard
        </Typography>
        <Grid container spacing={4}>
          {surgeriesWithAttempts.map((surgery) => (
            <Grid item xs={12} md={6} key={surgery.id}>
              <Paper elevation={3} sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h5" component="h2">
                  {surgery.title}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
                  {surgery.category}
                </Typography>
                <Typography variant="body2" sx={{ flexGrow: 1, mb: 2 }}>
                  {surgery.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6">Your Attempts</Typography>
                  {user ? (
                    surgery.attempts.length > 0 ? (
                      <ul style={{ paddingLeft: '20px', listStyle: 'decimal' }}>
                        {surgery.attempts.map((attempt) => (
                          <li key={attempt.id}>
                            Score: {attempt.score ?? 'N/A'}, Time: {formatCompletionTime(attempt.completionTimeSeconds)}
                            {attempt.isSuccessful !== undefined ? (attempt.isSuccessful ? ' ✓' : ' ✗') : ''}
                            {getAttemptProcedureName(attempt) ? ` — ${getAttemptProcedureName(attempt)}` : ''}
                            {Array.isArray(attempt.screenshots) && attempt.screenshots.length > 0 ? ` (${attempt.screenshots.length} 📷)` : ''}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Typography>You have not attempted this surgery yet.</Typography>
                    )
                  ) : (
                    <Typography>Please log in to see your attempts.</Typography>
                  )}
                </Box>

                <Box sx={{ mt: 'auto', textAlign: 'right' }}>
                  <Button component={Link} to={`/surgery/${surgery.id}`} variant="contained" color="primary">
                    View Details
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
          {user && unmatchedAttempts.length > 0 && (
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h5" component="h2">
                  Other Recorded Attempts ({unmatchedAttempts.length})
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  These attempts reference a surgery ID with no matching surgery record — typically new Unity procedures.
                </Typography>
                <ul style={{ paddingLeft: '20px', listStyle: 'decimal' }}>
                  {unmatchedAttempts.map((attempt) => (
                    <li key={attempt.id}>
                      {getAttemptProcedureName(attempt) || getAttemptSurgeryId(attempt) || attempt.id}
                      {' '}— Score: {attempt.score ?? 'N/A'}, Time: {formatCompletionTime(attempt.completionTimeSeconds)}, Date: {formatAttemptDate(attempt.timestamp)}
                    </li>
                  ))}
                </ul>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Container>
      <MarketingFooter />
    </Box>
  );
};

export default Dashboard;
