import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import { Box, Typography, TextField, Button, Container, Paper } from '@mui/material';

const AddSurgery = () => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [maxBleeding, setMaxBleeding] = useState('');
  const [suctionPower, setSuctionPower] = useState('');
  const [safeZone, setSafeZone] = useState('');
  const [steps, setSteps] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      await addDoc(collection(db, 'surgeries'), {
        title,
        category,
        description,
        defaultMetrics: {
          targetTimeSeconds: parseInt(targetTime, 10),
          maxBleedingLevel: parseInt(maxBleeding, 10),
          requiredSuctionPower: parseInt(suctionPower, 10),
          safeZone,
        },
        requiredSteps: steps.split('\n').map(step => step.trim()),
      });
      setSuccess(true);
      setTitle('');
      setCategory('');
      setDescription('');
      setTargetTime('');
      setMaxBleeding('');
      setSuctionPower('');
      setSafeZone('');
      setSteps('');
    } catch (err) {
      setError('Failed to add surgery. Please try again.');
      console.error(err);
    }
  };

  return (
    <Box>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
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
            <Typography variant="h6" sx={{ mt: 2 }}>Default Metrics</Typography>
            <TextField
              label="Target Time (seconds)"
              type="number"
              value={targetTime}
              onChange={(e) => setTargetTime(e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
              label="Max Bleeding Level"
              type="number"
              value={maxBleeding}
              onChange={(e) => setMaxBleeding(e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
              label="Required Suction Power"
              type="number"
              value={suctionPower}
              onChange={(e) => setSuctionPower(e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
              label="Safe Zone"
              value={safeZone}
              onChange={(e) => setSafeZone(e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <Typography variant="h6" sx={{ mt: 2 }}>Required Steps</Typography>
            <TextField
              label="Steps (one per line)"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              fullWidth
              required
              multiline
              rows={6}
              sx={{ mb: 2 }}
            />
            <Button type="submit" variant="contained" sx={{ mt: 2 }}>
              Add Surgery
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default AddSurgery;
