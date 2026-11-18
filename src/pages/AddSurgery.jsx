import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addSurgery, fetchSurgery, updateSurgery } from '../lib/db';
import MarketingNavbar from '../components/MarketingNavbar';
import MarketingFooter from '../components/MarketingFooter';
import { Box, Container, Paper, Typography, TextField, Button, CircularProgress } from '@mui/material';

const AddSurgery = () => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [sceneName, setSceneName] = useState('');
  const [viewSceneName, setViewSceneName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  useEffect(() => {
    document.title = isEditing ? 'SurgiVerse - Edit Surgery' : 'SurgiVerse - Add New Surgery';
    if (!isEditing) return;

    const loadSurgery = async () => {
      setLoading(true);
      setError('');
      try {
        const surgery = await fetchSurgery(id);
        if (!surgery) {
          setError('Surgery not found.');
          return;
        }
        setTitle(surgery.title);
        setCategory(surgery.category);
        setDescription(surgery.description);
        setSceneName(surgery.sceneName);
        setViewSceneName(surgery.viewSceneName || '');
      } catch (err) {
        setError(err?.message || 'Failed to load surgery.');
      } finally {
        setLoading(false);
      }
    };

    loadSurgery();
  }, [id, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    try {
      if (isEditing) {
        await updateSurgery(id, { title, category, description, sceneName, viewSceneName });
        setSuccess(true);
      } else {
        await addSurgery({ title, category, description, sceneName, viewSceneName });
        setSuccess(true);
        setTitle('');
        setCategory('');
        setDescription('');
        setSceneName('');
        setViewSceneName('');
      }
    } catch (err) {
      setError(err?.message || `Failed to ${isEditing ? 'update' : 'add'} surgery. Please try again.`);
      console.error(err);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: 'background.default', minHeight: '100vh', width: "100%", pt: '80px' }}>
      <MarketingNavbar />
      <Container className="page-container">
        <Paper className="page-paper">
          <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
            {isEditing ? 'Edit Surgery' : 'Add New Surgery'}
          </Typography>
          {success && <Typography color="success">Surgery {isEditing ? 'updated' : 'added'} successfully!</Typography>}
          {error && <Typography color="error">{error}</Typography>}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
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
              label="Surgery Simulation Scene Name"
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
              label="Organ Viewing Scene Name"
              value={viewSceneName}
              onChange={(e) => setViewSceneName(e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button type="submit" variant="contained" color="primary">
                {isEditing ? 'Save Changes' : 'Add Surgery'}
              </Button>
              {isEditing && (
                <Button variant="outlined" onClick={() => navigate(`/surgery/${id}`)}>
                  Cancel
                </Button>
              )}
            </Box>
          </form>
          )}
        </Paper>
      </Container>
      <MarketingFooter />
    </Box>
  );
};

export default AddSurgery;
