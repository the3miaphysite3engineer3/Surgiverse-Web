import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import { Box, Typography, Container, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Button, CircularProgress, Modal, Grid, Tabs, Tab, AppBar } from '@mui/material';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  maxWidth: 900,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  maxHeight: '90vh',
  overflowY: 'auto'
};

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}


const GradeStudents = () => {
  const [attempts, setAttempts] = useState([]);
  const [users, setUsers] = useState({});
  const [surgeries, setSurgeries] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [grades, setGrades] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [open, setOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const usersCollection = await getDocs(collection(db, 'users'));
        const usersData = {};
        usersCollection.forEach(doc => {
          usersData[doc.id] = doc.data();
        });
        setUsers(usersData);

        const surgeriesCollection = await getDocs(collection(db, 'surgeries'));
        const surgeriesData = {};
        surgeriesCollection.forEach(doc => {
            surgeriesData[doc.id] = doc.data();
        });
        setSurgeries(surgeriesData);

        const attemptsCollection = await getDocs(collection(db, 'attempts'));
        const attemptsData = attemptsCollection.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAttempts(attemptsData);

        const initialGrades = {};
        attemptsData.forEach(attempt => {
            initialGrades[attempt.id] = attempt.score || '';
        });
        setGrades(initialGrades);

      } catch (err) {
        setError('Failed to fetch data.');
        console.error(err);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleGradeChange = (attemptId, value) => {
    setGrades(prev => ({ ...prev, [attemptId]: value }));
  };

  const handleGradeSubmit = async (attemptId) => {
    try {
      const attemptRef = doc(db, 'attempts', attemptId);
      await updateDoc(attemptRef, {
        score: parseInt(grades[attemptId], 10)
      });
      // Refresh the data to show the updated score
      const attemptsCollection = await getDocs(collection(db, 'attempts'));
      const attemptsData = attemptsCollection.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttempts(attemptsData);
    } catch (err) {
      console.error("Failed to update grade:", err);
    }
  };

  const handleOpen = (attempt) => {
    setSelectedAttempt(attempt);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedAttempt(null);
    setTabValue(0);
  }

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const filteredAttempts = attempts.filter(attempt => {
    const studentName = `${users[attempt.uid]?.firstName || ''} ${users[attempt.uid]?.lastName || ''}`.toLowerCase();
    const surgeryTitle = surgeries[attempt.surgery_id]?.title.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return studentName.includes(query) || surgeryTitle.includes(query);
  })


  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Typography color="error">{error}</Typography></Box>;
  }


  return (
    <Box>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
            Grade Students
          </Typography>
          <TextField
            label="Search by Student or Surgery"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            sx={{ mb: 4 }}
          />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Surgery</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAttempts.map(attempt => (
                  <TableRow key={attempt.id} hover onClick={() => handleOpen(attempt)} style={{cursor: 'pointer'}}>
                    <TableCell>{users[attempt.uid]?.firstName || 'N/A'} {users[attempt.uid]?.lastName || ''}</TableCell>
                    <TableCell>{surgeries[attempt.surgery_id]?.title || 'N/A'}</TableCell>
                    <TableCell>{new Date(attempt.timestamp.seconds * 1000).toLocaleString()}</TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={grades[attempt.id] || ''}
                        onChange={(e) => handleGradeChange(attempt.id, e.target.value)}
                        size="small"
                        onClick={(e) => e.stopPropagation()} // Prevent modal from opening when clicking the text field
                      />
                    </TableCell>
                    <TableCell>
                        <Button variant="contained" onClick={(e) => { e.stopPropagation(); handleGradeSubmit(attempt.id); }}>Save</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        {selectedAttempt && (
            <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="attempt-details-title"
            >
                <Box sx={modalStyle}>
                    <Typography id="attempt-details-title" variant="h6" component="h2" sx={{mb: 2}}>
                        Attempt Details
                    </Typography>
                    <AppBar position="static">
                         <Tabs
                            value={tabValue}
                            onChange={handleTabChange}
                            aria-label="attempt details tabs"
                            textColor="inherit"
                            sx={{
                                '& .MuiTabs-indicator': {
                                    backgroundColor: 'red',
                                },
                                '& .MuiTab-root.Mui-selected': {
                                    color: 'red',
                                },
                            }}
                        >
                            <Tab label="Details" />
                            <Tab label="Metrics" />
                            <Tab label="Logs" />
                        </Tabs>
                    </AppBar>
                    <TabPanel value={tabValue} index={0}>
                      <Grid container spacing={2} sx={{mt: 2}}>
                          <Grid item xs={6}><Typography><strong>Student:</strong></Typography></Grid>
                          <Grid item xs={6}><Typography>{users[selectedAttempt.uid]?.firstName || 'N/A'} {users[selectedAttempt.uid]?.lastName || ''}</Typography></Grid>
                          
                          <Grid item xs={6}><Typography><strong>Surgery:</strong></Typography></Grid>
                          <Grid item xs={6}><Typography>{surgeries[selectedAttempt.surgery_id]?.title || 'N/A'}</Typography></Grid>

                          <Grid item xs={6}><Typography><strong>Date:</strong></Typography></Grid>
                          <Grid item xs={6}><Typography>{new Date(selectedAttempt.timestamp.seconds * 1000).toLocaleString()}</Typography></Grid>

                          <Grid item xs={6}><Typography><strong>Score:</strong></Typography></Grid>
                          <Grid item xs={6}><Typography>{selectedAttempt.score ?? 'Not Graded'}</Typography></Grid>

                          <Grid item xs={6}><Typography><strong>Completion Time:</strong></Typography></Grid>
                          <Grid item xs={6}><Typography>{selectedAttempt.completionTimeSeconds ? `${selectedAttempt.completionTimeSeconds} seconds` : 'N/A'}</Typography></Grid>

                          <Grid item xs={6}><Typography><strong>Errors:</strong></Typography></Grid>
                          <Grid item xs={6}><Typography>{selectedAttempt.errors?.join(', ') || 'None'}</Typography></Grid>
                      </Grid>
                    </TabPanel>
                    <TabPanel value={tabValue} index={1}>
                        {selectedAttempt.metrics ? (
                            <TableContainer component={Paper} sx={{mt: 2}}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Metric</TableCell>
                                            <TableCell>Value</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.entries(selectedAttempt.metrics).map(([key, value]) => (
                                            <TableRow key={key}>
                                                <TableCell>{key}</TableCell>
                                                <TableCell>{JSON.stringify(value)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : <Typography sx={{mt: 2}}>No metrics available for this attempt.</Typography>}
                    </TabPanel>
                    <TabPanel value={tabValue} index={2}>
                        {selectedAttempt.logs && selectedAttempt.logs.length > 0 ? (
                            <Paper sx={{mt: 2, p: 2, maxHeight: 400, overflow: 'auto', backgroundColor: '#f5f5f5'}}>
                                {selectedAttempt.logs.map((log, index) => (
                                    <Typography key={index} component="pre" sx={{whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>
                                        {log}
                                    </Typography>
                                ))}
                            </Paper>
                        ) : <Typography sx={{mt: 2}}>No logs available for this attempt.</Typography>}
                    </TabPanel>
                </Box>
            </Modal>
        )}
      </Container>
    </Box>
  );
};

export default GradeStudents;
