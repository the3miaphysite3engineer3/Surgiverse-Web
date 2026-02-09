import React, { useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Paper, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { GoogleGenerativeAI } from '@google/generative-ai';

// IMPORTANT: Replace with your actual API key
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const AIAssistant = ({ attempt, onClose }) => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const genAI = new GoogleGenerativeAI(API_KEY);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = { role: 'user', content: message };
    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);
    setError(null);

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const chat = model.startChat({
        history: [
          {
            role: "user",
            content: `You are an expert surgical instructor. A student has just completed a simulated surgery and has some questions. Here is the data for their attempt. Please analyze it and prepare to answer their questions.\n\n**Procedure:** ${attempt.procedureName}\n**Successful:** ${attempt.isSuccessful ? 'Yes' : 'No'}\n**Score:** ${attempt.score}\n**Completion Time:** ${attempt.completionTimeSeconds.toFixed(2)} seconds\n\n**Attempt Logs:**\n${attempt.logs.join('\n')}`,
          },
          {
            role: "model",
            content: "I have reviewed the data for this attempt. I am ready to help the student.",
          },
        ],
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();
      
      const modelMessage = { role: 'model', content: text };
      setChatHistory(prev => [...prev, modelMessage]);

    } catch (err) {
      console.error("Gemini API error:", err);
      setError('Sorry, I am having trouble connecting to the AI assistant right now. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '70vh', width: '500px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">AI Assistant</Typography>
        <IconButton onClick={onClose} size="small">
            <CloseIcon />
        </IconButton>
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
        {chatHistory.map((chat, index) => (
          <Box key={index} sx={{ mb: 1.5, textAlign: chat.role === 'user' ? 'right' : 'left' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{chat.role === 'user' ? 'You' : 'AI'}</Typography>
            <Paper elevation={1} sx={{ p: 1.5, display: 'inline-block', backgroundColor: chat.role === 'user' ? 'primary.light' : 'grey.200' }}>
              <Typography variant="body2">{chat.content}</Typography>
            </Paper>
          </Box>
        ))}
        {loading && <CircularProgress size={24} sx={{ display: 'block', margin: 'auto' }}/>}
        {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
      </Box>
      <Box sx={{ display: 'flex' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Ask about your attempt..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          disabled={loading}
        />
        <Button variant="contained" color="primary" onClick={handleSendMessage} disabled={loading} sx={{ ml: 1 }}>
          Send
        </Button>
      </Box>
    </Paper>
  );
};

export default AIAssistant;
