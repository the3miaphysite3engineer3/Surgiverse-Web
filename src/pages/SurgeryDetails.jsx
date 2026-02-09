import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { 
    Box, Container, Typography, Paper, CircularProgress, List, ListItem, 
    ListItemText, Divider, Grid, Button, Modal, Accordion, AccordionSummary, 
    AccordionDetails 
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Navbar from '../components/Navbar';
import AIAssistant from '../components/AIAssistant';

const SurgeryDetails = () => {
  const { id } = useParams();
  const [surgery, setSurgery] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const { user } = useAuth();

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

        if (user) {
          const attemptsCollection = collection(db, 'attempts');
          const q = query(attemptsCollection, where('surgery_id', '==', id), where('uid', '==', user.uid));
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
  }, [id, user]);

  const handleOpenAIAssistant = (attempt) => {
    setSelectedAttempt(attempt);
    setIsAIAssistantOpen(true);
  };

  const handleCloseAIAssistant = () => {
    setSelectedAttempt(null);
    setIsAIAssistantOpen(false);
  };

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
            {surgery.defaultMetrics && (
                <Grid item xs={12} md={6}>
                    <Typography variant="h6">Default Metrics</Typography>
                    <List dense>
                        <ListItem>
                            <ListItemText primary="Target Time" secondary={`${surgery.defaultMetrics.targetTimeSeconds} seconds`} />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="Max Bleeding Level" secondary={surgery.defaultMetrics.maxBleedingLevel} />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="Required Suction Power" secondary={surgery.defaultMetrics.requiredSuctionPower} />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="Safe Zone" secondary={surgery.defaultMetrics.safeZone} />
                        </ListItem>
                    </List>
              </Grid>
            )}
            {surgery.requiredSteps && (
              <Grid item xs={12} md={6}>
                <Typography variant="h6">Required Steps</Typography>
                <List dense>
                  {surgery.requiredSteps.map((step, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={`${index + 1}. ${step}`} />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            )}
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box>
            <Typography variant="h5" sx={{ mb: 2 }}>Your Attempts</Typography>
            {user ? (
              attempts.length > 0 ? (
                <Box>
                  {attempts.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds).map((attempt, index) => (
                    <Accordion key={attempt.id} sx={{ mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <ListItemText 
                                primary={`Attempt #${attempts.length - index}`}
                                secondary={`Date: ${new Date(attempt.timestamp.seconds * 1000).toLocaleString()} | Score: ${attempt.score} | Time: ${attempt.completionTimeSeconds ? attempt.completionTimeSeconds.toFixed(2) : 'N/A'}s | Successful: ${attempt.isSuccessful ? 'Yes' : 'No'}`}
                            />
                            <Button variant="outlined" size="small" onClick={(e) => {e.stopPropagation(); handleOpenAIAssistant(attempt);}} sx={{ ml: 2 }}>
                                Discuss with AI
                            </Button>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="h6" sx={{ mb: 1 }}>Attempt Logs</Typography>
                            <List dense>
                                {attempt.logs && attempt.logs.length > 0 ? (
                                    attempt.logs.map((log, logIndex) => (
                                        <ListItem key={logIndex}>
                                            <ListItemText primary={log} />
                                        </ListItem>
                                    ))
                                ) : (
                                    <Typography>No logs available for this attempt.</Typography>
                                )}
                            </List>
                        </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              ) : (
                <Typography>You have not attempted this surgery yet.</Typography>
              )
            ) : (
              <Typography>Please log in to see your attempts.</Typography>
            )}
          </Box>
        </Paper>
      </Container>
      <Modal
        open={isAIAssistantOpen}
        onClose={handleCloseAIAssistant}
        aria-labelledby="ai-assistant-modal-title"
        aria-describedby="ai-assistant-modal-description"
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      >
          {selectedAttempt && <AIAssistant attempt={selectedAttempt} onClose={handleCloseAIAssistant} />}
      </Modal>
    </Box>
  );
};

export default SurgeryDetails;
