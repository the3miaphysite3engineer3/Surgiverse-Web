import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { Box, Typography, Container, Paper, TextField, Button, CircularProgress } from '@mui/material';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const AddResources = () => {
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    if (!markdown.trim()) {
      setError('Markdown content cannot be empty.');
      setLoading(false);
      return;
    }

    try {
      await addDoc(collection(db, 'ai_resources'), {
        markdown: markdown,
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      setMarkdown(''); // Clear the textarea after successful submission
    } catch (err) {
      setError('Failed to add resource. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
            Add AI Training Resources
          </Typography>
          <Typography sx={{ mb: 2 }}>
            Add markdown content below. This will be stored in Firestore and can be used to provide context to the AI assistant.
          </Typography>
          {success && <Typography color="success.main" sx={{ mb: 2 }}>Resource added successfully!</Typography>}
          {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
          <form onSubmit={handleSubmit}>
            <TextField
              label="Markdown Content"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              fullWidth
              required
              multiline
              rows={20} // Make it a large textarea
              sx={{ mb: 2 }}
              variant="outlined"
            />
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Add Resource'}
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default AddResources;
