import React, { useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import { Box, Typography, TextField, Button, Container, Paper, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const AddSurgery = () => {
  const [title, setTitle] = useState('Grommet insertion (myringotomy)');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [sceneName, setSceneName] = useState('MainScene');
  const [viewSceneName, setViewSceneName] = useState('EarNavigation');
  const [defaultMetrics, setDefaultMetrics] = useState([{ key: '', value: '' }]);
  const [steps, setSteps] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleMetricChange = (index, event) => {
    const values = [...defaultMetrics];
    values[index][event.target.name] = event.target.value;
    setDefaultMetrics(values);
  };

  const handleAddMetricField = () => {
    setDefaultMetrics([...defaultMetrics, { key: '', value: '' }]);
  };

  const handleRemoveMetricField = (index) => {
    const values = [...defaultMetrics];
    values.splice(index, 1);
    setDefaultMetrics(values);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const metricsObject = defaultMetrics.reduce((acc, metric) => {
      if (metric.key) {
        const parsedValue = parseFloat(metric.value);
        acc[metric.key] = isNaN(parsedValue) ? metric.value : parsedValue;
      }
      return acc;
    }, {});

    try {
      const newSurgeryRef = doc(collection(db, 'surgeries'));
      const newId = newSurgeryRef.id;

      await setDoc(newSurgeryRef, {
        id: newId,
        title,
        category,
        description,
        sceneName,
        viewSceneName,
        defaultMetrics: metricsObject,
        requiredSteps: steps.split('\n').map(step => step.trim()),
      });
      setSuccess(true);
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
            
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Default Metrics</Typography>
            {defaultMetrics.map((metric, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                <TextField
                  name="key"
                  label="Metric Name"
                  value={metric.key}
                  onChange={(event) => handleMetricChange(index, event)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  name="value"
                  label="Metric Value"
                  value={metric.value}
                  onChange={(event) => handleMetricChange(index, event)}
                  sx={{ flex: 1 }}
                />
                <IconButton onClick={() => handleRemoveMetricField(index)} disabled={defaultMetrics.length === 1 && index === 0}>
                  <RemoveIcon />
                </IconButton>
              </Box>
            ))}
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddMetricField}
              sx={{mb: 2}}
            >
              Add Metric
            </Button>

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
