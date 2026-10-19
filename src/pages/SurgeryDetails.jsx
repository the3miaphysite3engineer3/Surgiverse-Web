import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { 
    Box, Container, Typography, Paper, CircularProgress, List, ListItem, 
    ListItemText, Divider, Grid, Button, Modal, Accordion, AccordionSummary, 
    AccordionDetails 
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MarketingNavbar from '../components/MarketingNavbar';
import MarketingFooter from '../components/MarketingFooter';
import { formatCompletionTime, formatAttemptDate, compareAttemptsNewestFirst, firestoreErrorMessage, getAttemptSurgeryId, getAttemptScreenshots, getAttemptLogs, screenshotSrc, formatMetricValue, getAttemptProcedureName } from '../utils/attemptFormat';
import AttemptScreenshots from '../components/AttemptScreenshots';
import AIAssistant from '../components/AIAssistant';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { normalizeValue } from '../utils/normalizeValue';

const FIRESTORE_IN_QUERY_LIMIT = 30;

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

        let surgeryData = null;
        if (surgerySnapshot.exists()) {
          surgeryData = { id: surgerySnapshot.id, ...surgerySnapshot.data() };
          setSurgery(surgeryData);
        } else {
          setError('Surgery not found.');
        }

        if (user && surgeryData) {
          const attemptsCollection = collection(db, 'attempts');
          // Legacy docs use `surgery_id`, newer clients may use `surgeryID`/`surgeryId`.
          const attemptsByLegacyIdQuery = query(
            attemptsCollection,
            where('uid', '==', user.uid),
            where('surgery_id', '==', id)
          );
          const attemptsByNewIdQuery = query(
            attemptsCollection,
            where('uid', '==', user.uid),
            where('surgeryID', '==', id)
          );
          const [attemptsByLegacyIdSnapshot, attemptsByNewIdSnapshot] = await Promise.all([
            getDocs(attemptsByLegacyIdQuery),
            getDocs(attemptsByNewIdQuery)
          ]);

          const surgeryNames = [surgeryData.title, surgeryData.procedureName]
            .filter((name) => typeof name === 'string')
            .map((name) => name.trim())
            .filter(Boolean);
          const surgeryNamesSet = new Set(surgeryNames);
          const normalizedSurgeryNamesSet = new Set(Array.from(surgeryNamesSet).map(normalizeValue).filter(Boolean));

          let attemptsByProcedureNameDocs = [];
          if (surgeryNamesSet.size > 0) {
            const surgeryNameBatches = [];
            const surgeryNamesList = Array.from(surgeryNamesSet);
            for (let i = 0; i < surgeryNamesList.length; i += FIRESTORE_IN_QUERY_LIMIT) {
              surgeryNameBatches.push(surgeryNamesList.slice(i, i + FIRESTORE_IN_QUERY_LIMIT));
            }

            const procedureNameSnapshots = await Promise.all(
              surgeryNameBatches.map((batch) =>
                getDocs(
                  query(
                    attemptsCollection,
                    where('uid', '==', user.uid),
                    where('procedureName', 'in', batch)
                  )
                )
              )
            );

            attemptsByProcedureNameDocs = procedureNameSnapshots.flatMap((snapshot) => snapshot.docs);
          }

          const relevantAttemptDocsById = new Map();
          const addIfRelevant = (d) => {
            const attemptData = d.data();
            const attemptSurgeryId = attemptData.surgery_id || attemptData.surgeryID || attemptData.surgeryId;
            const normalizedProcedureName = normalizeValue(attemptData.procedureName);

            if (attemptSurgeryId === id || (normalizedProcedureName && normalizedSurgeryNamesSet.has(normalizedProcedureName))) {
              relevantAttemptDocsById.set(d.id, d);
            }
          };

          attemptsByLegacyIdSnapshot.docs.forEach(addIfRelevant);
          attemptsByNewIdSnapshot.docs.forEach(addIfRelevant);
          attemptsByProcedureNameDocs.forEach(addIfRelevant);

          const attemptsList = await Promise.all(Array.from(relevantAttemptDocsById.values()).map(async d => {
            const attemptData = { id: d.id, ...d.data() };
            let chatMessages = [];
            try {
              const messagesRef = collection(db, 'attemptChats', d.id, 'messages');
              const msgQuery = query(messagesRef, orderBy('createdAt'));
              const msgSnapshot = await getDocs(msgQuery);
              chatMessages = msgSnapshot.docs.map(m => m.data());
            } catch (e) {
              console.error("Failed to fetch chat logs", e);
            }
            return {
              ...attemptData,
              chatMessages
            };
          }));
          setAttempts(attemptsList);
        }
      } catch (err) {
        setError(firestoreErrorMessage(err));
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

  const handleDownloadReport = (attempt) => {
    const input = document.getElementById(`pdf-report-${attempt.id}`);
    html2canvas(input, { scale: 2 })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        const width = pdfWidth;
        const height = width / ratio;

        let heightLeft = height;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, width, height);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
          position = heightLeft - height;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, width, height);
          heightLeft -= pdfHeight;
        }

        pdf.save(`surgery-attempt-${attempt.id}.pdf`);
      });
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
    <Box sx={{ flexGrow: 1, backgroundColor: 'background.default', minHeight: '100vh', width: "100%", pt: '80px' }}>
      <MarketingNavbar />
      <Container className="page-container">
        <Paper elevation={3} className="page-paper">
          <Typography variant="h4" component="h1" sx={{ mb: 2, color: 'primary.main', textAlign: 'center' }}>
            {surgery.title}
          </Typography>
          <Typography variant="subtitle1" sx={{ mb: 2, color: 'text.secondary', textAlign: 'center' }}>
            {surgery.category}
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
            {surgery.description}
          </Typography>

          <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
            <b>Surgery Simulation Scene Name:</b> {surgery.sceneName}
          </Typography>

          <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
            <b>Organ Viewing Scene Name:</b> {surgery.viewSceneName}
          </Typography>
          
          <Grid container spacing={3} sx={{ justifyContent: 'center' }}>
          {surgery.defaultMetrics && (
            <Grid item xs={12} md={6}>
              <Typography variant="h6" align="center">Default Metrics</Typography>
              <List dense>
                {Object.entries(surgery.defaultMetrics).map(([key, value]) => (
                  <ListItem key={key}>
                    <ListItemText primary={key} secondary={value} sx={{ textAlign: 'center' }} />
                  </ListItem>
                ))}
              </List>
            </Grid>
          )}
            {surgery.requiredSteps && (
              <Grid item xs={12} md={6}>
                <Typography variant="h6" align="center">Required Steps</Typography>
                <List dense>
                  {surgery.requiredSteps.map((step, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={`${index + 1}. ${step}`} sx={{ textAlign: 'center' }}/>
                    </ListItem>
                  ))}
                </List>
              </Grid>
            )}
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box>
            <Typography variant="h5" sx={{ mb: 2, textAlign: 'center' }}>Your Attempts</Typography>
            {user ? (
              attempts.length > 0 ? (
                <Box>
                  {[...attempts].sort(compareAttemptsNewestFirst).map((attempt, index) => (
                    <React.Fragment key={attempt.id}>
                      <Accordion sx={{ mb: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <ListItemText 
                                  primary={`Attempt #${attempts.length - index}`}
                                  secondary={`Date: ${formatAttemptDate(attempt.timestamp)} | Score: ${attempt.score ?? 'N/A'} | Time: ${formatCompletionTime(attempt.completionTimeSeconds)} | Successful: ${attempt.isSuccessful ? 'Yes' : 'No'}`}
                              />
                              <Button variant="outlined" size="small" onClick={(e) => {e.stopPropagation(); handleOpenAIAssistant(attempt);}} sx={{ ml: 2 }}>
                                  Discuss with AI
                              </Button>
                              <Button variant="outlined" size="small" onClick={(e) => {e.stopPropagation(); handleDownloadReport(attempt);}} sx={{ ml: 2 }}>
                                  Download Report
                              </Button>
                          </AccordionSummary>
                          <AccordionDetails>
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                  Procedure: {getAttemptProcedureName(attempt) || surgery.title} | SurgeryID: {getAttemptSurgeryId(attempt) || 'N/A'}
                                </Typography>
                                {attempt.metrics && (
                                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {Object.entries(attempt.metrics).map(([k, v]) => (
                                      <Typography key={k} variant="caption" sx={{ bgcolor: 'action.hover', px: 1, py: 0.5, borderRadius: 1 }}>
                                        <strong>{k}:</strong> {formatMetricValue(v)}
                                      </Typography>
                                    ))}
                                  </Box>
                                )}
                              </Box>
                              <Typography variant="h6" sx={{ mb: 1 }}>Attempt Logs</Typography>
                              <List dense>
                                  {getAttemptLogs(attempt).length > 0 ? (
                                      getAttemptLogs(attempt).map((log, logIndex) => (
                                          <ListItem key={logIndex}>
                                              <ListItemText primary={log} />
                                          </ListItem>
                                      ))
                                  ) : (
                                      <Typography>No logs available for this attempt.</Typography>
                                  )}
                              </List>
                              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                                Screenshots ({getAttemptScreenshots(attempt).length})
                              </Typography>
                              <AttemptScreenshots screenshots={attempt.screenshots} />
                          </AccordionDetails>
                      </Accordion>
                      <div id={`pdf-report-${attempt.id}`} style={{ position: 'absolute', top: '-10000px', left: '-10000px', zIndex: -1, background: '#fff', color: '#000', width: '210mm', minHeight: '297mm', padding: 20 }}>
                          <h1 style={{ color: '#3f51b5', borderBottom: '2px solid #3f51b5', paddingBottom: 10 }}>Surgery Report: {surgery.title}</h1>
                          
                          <div style={{ marginBottom: 20 }}>
                              <h2 style={{ color: '#555', margin: '10px 0 5px 0' }}>Student details:</h2>
                              <p style={{ margin: 0 }}><strong>Name:</strong> {user?.displayName || 'N/A'}</p>
                              <p style={{ margin: 0 }}><strong>User ID:</strong> {user?.uid || 'N/A'}</p>
                              <p style={{ margin: 0 }}><strong>Email:</strong> {user?.email || 'N/A'}</p>
                              
                              <h2 style={{ color: '#555', margin: '15px 0 5px 0' }}>Professor details:</h2>
                              <p style={{ margin: 0 }}><strong>Name:</strong> {surgery.professorName || 'N/A'}</p>
                          </div>

                          <h2 style={{ color: '#555', borderTop: '1px solid #eee', paddingTop: 10 }}>Attempt on {formatAttemptDate(attempt.timestamp)}</h2>
                          <p style={{ margin: 0 }}><strong>Procedure:</strong> {getAttemptProcedureName(attempt) || surgery.title}</p>
                          <p style={{ margin: 0 }}><strong>SurgeryID:</strong> {getAttemptSurgeryId(attempt) || attempt.id}</p>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, margin: '20px 0' }}>
                              <div>
                                  <p><strong>Score:</strong> {attempt.score ?? 'N/A'}</p>
                                  <p><strong>Completion Time:</strong> {formatCompletionTime(attempt.completionTimeSeconds)}</p>
                              </div>
                              <div>
                                  <p><strong>Successful:</strong> {attempt.isSuccessful ? 'Yes' : 'No'}</p>
                                  <p><strong>Bleeding Events:</strong> {attempt.bleedingEventsCount || 0}</p>
                              </div>
                          </div>

                          {attempt.metrics && (
                            <div style={{ margin: '10px 0' }}>
                              <h3>Metrics</h3>
                              {Object.entries(attempt.metrics).map(([k, v]) => (
                                <p key={k} style={{ margin: 0, fontSize: '11px' }}><strong>{k}:</strong> {formatMetricValue(v)}</p>
                              ))}
                            </div>
                          )}

                          <h3>Evaluation:</h3>
                          <p>{attempt.evaluation || "No specific evaluation feedback was provided for this attempt."}</p>

                          {getAttemptScreenshots(attempt).length > 0 && (
                            <div style={{ marginTop: 20, borderTop: '1px solid #ccc', paddingTop: 10 }}>
                              <h3>Screenshots ({getAttemptScreenshots(attempt).length})</h3>
                              {getAttemptScreenshots(attempt).map((shot, sIdx) => (
                                <div key={sIdx} style={{ marginBottom: 10 }}>
                                  <img src={screenshotSrc(shot)} alt={`screenshot ${sIdx + 1}`} style={{ width: '100%' }} />
                                  <p style={{ margin: 0, fontSize: '10px' }}>{shot.source || 'REFERENCE'} — {formatAttemptDate(shot.timestamp)}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          <h3 style={{ marginTop: 20, borderTop: '1px solid #ccc', paddingTop: 10 }}>Detailed Logs</h3>
                          <div style={{ height: 'auto', border: '1px solid #eee', padding: 10, borderRadius: 5, background: '#f9f9f9' }}>
                              {getAttemptLogs(attempt).length > 0 ? (
                                  getAttemptLogs(attempt).map((log, logIndex) => (
                                      <p key={logIndex} style={{ margin: 0, padding: 2, fontSize: '10px' }}>{log}</p>
                                  ))
                              ) : (
                                  <p>No logs available for this attempt.</p>
                              )}
                          </div>
                          
                          <h3 style={{ marginTop: 20, borderTop: '1px solid #ccc', paddingTop: 10 }}>AI Chat History</h3>
                          <div style={{ height: 'auto', border: '1px solid #eee', padding: 10, borderRadius: 5, background: '#f9f9f9', marginBottom: 30 }}>
                              {attempt.chatMessages && attempt.chatMessages.length > 0 ? (
                                  attempt.chatMessages.map((msg, msgIndex) => (
                                      <div key={msgIndex} style={{ marginBottom: 10 }}>
                                          <strong>{msg.role === 'ai' ? 'AI' : 'You'}:</strong>
                                          <p style={{ margin: 0, padding: 2, fontSize: '10px', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                                      </div>
                                  ))
                              ) : (
                                  <p>No chat history available for this attempt.</p>
                              )}
                          </div>
                          <div style={{ position: 'absolute', bottom: 10, fontSize: '10px', color: '#777', width: '100%' }}>
                              Report generated on {new Date().toLocaleDateString()}
                          </div>
                      </div>
                    </React.Fragment>
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
        <Box>
          {selectedAttempt && <AIAssistant attempt={selectedAttempt} onClose={handleCloseAIAssistant} />}
        </Box>
      </Modal>
      <MarketingFooter />
    </Box>
  );
};

export default SurgeryDetails;
