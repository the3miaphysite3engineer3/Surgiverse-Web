import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import { Box, Container, Paper, Typography, CircularProgress } from '@mui/material';

const Surgery = () => {
  const [surgery, setSurgery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();

  useEffect(() => {
    document.title = 'SurgiVerse - Surgery Details';
    const fetchSurgery = async () => {
      try {
        const surgeryDoc = await getDoc(doc(db, 'surgeries', id));
        if (surgeryDoc.exists()) {
          const surgeryData = { id: surgeryDoc.id, ...surgeryDoc.data() };
          setSurgery(surgeryData);
          document.title = `SurgiVerse - ${surgeryData.title}`;
        } else {
          setError('Surgery not found');
        }
      } catch (err) {
        setError('Failed to fetch surgery details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSurgery();
  }, [id]);

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
          <Paper className="page-paper">
            <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
              {surgery.title}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
              {surgery.category}
            </Typography>
            <Typography variant="body1">
              {surgery.description}
            </Typography>
          </Paper>
        </Container>
      </Box>
  );
};

export default Surgery;
