import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import MarketingNavbar from '../components/MarketingNavbar';
import MarketingFooter from '../components/MarketingFooter';
import { Box, Container, Paper, Typography, TextField, Button } from '@mui/material';

const AddSurgery = () => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [sceneName, setSceneName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    document.title = 'SurgiVerse - Add New Surgery';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    try {
      const trimmedTitle = title.trim();
      const trimmedCategory = category.trim();
      const trimmedDescription = description.trim();
      const trimmedSceneName = sceneName.trim();

      const surgeriesSnapshot = await getDocs(collection(db, 'surgeries'));
      const normalizedTitle = trimmedTitle.toLowerCase();
      const surgeryAlreadyExists = surgeriesSnapshot.docs.some((docSnapshot) => {
        const existingTitle = docSnapshot.data()?.title;
        return typeof existingTitle === 'string' && existingTitle.trim().toLowerCase() === normalizedTitle;
      });

      if (surgeryAlreadyExists) {
        setError('A surgery with this name already exists.');
        return;
      }

      await addDoc(collection(db, 'surgeries'), {
        title: trimmedTitle,
        category: trimmedCategory,
        description: trimmedDescription,
        sceneName: trimmedSceneName
      });
      setSuccess(true);
      setTitle('');
      setCategory('');
      setDescription('');
      setSceneName('');
    } catch (err) {
      setError('Failed to add surgery. Please try again.');
      console.error(err);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: 'background.default', minHeight: '100vh', width: "100%", pt: '80px' }}>
      <MarketingNavbar />
      <Container className="page-container">
        <Paper className="page-paper">
          <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
            Add New Surgery
          </Typography>
          {success && <Typography color="success">Surgery added successfully!</Typography>}
          {error && <Typography color="error">{error}</Typography>}
          <form onSubmit={handleSubmit}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              required
              multiline
              rows={4}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Unity Scene Name"
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <Button type="submit" variant="contained" color="primary">
              Add Surgery
            </Button>
          </form>
        </Paper>
      </Container>
      <MarketingFooter />
    </Box>
  );
};

export default AddSurgery;
