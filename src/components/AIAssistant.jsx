import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  IconButton,
  TextField
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ReactMarkdown from 'react-markdown';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

const AIAssistant = ({ attempt, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const messagesRef = attempt
    ? collection(db, 'attemptChats', attempt.id, 'messages')
    : null;

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load chat history
  useEffect(() => {
    if (!messagesRef) return;

    const q = query(messagesRef, orderBy('createdAt'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => doc.data()));
    });

    return () => unsubscribe();
  }, [attempt]);

  // Initial AI analysis (only once)
  useEffect(() => {
    if (!attempt || messages.length > 0) return;

    const initialPrompt = `
Analyze the following surgery attempt.
Use clear markdown formatting.

- **Surgeon:** ${attempt.surgeon}
- **Procedure:** ${attempt.procedureName}
- **Outcome:** ${attempt.isSuccessful ? 'Successful' : 'Failed'}
    `;

    sendToAI(initialPrompt);
  }, [attempt, messages]);

  const saveMessage = async (role, content, reasoning_details = null) => {
    const messageDoc = {
      role,
      content,
      createdAt: serverTimestamp()
    };

    if (reasoning_details !== null) {
      messageDoc.reasoning_details = reasoning_details;
    }

    await addDoc(messagesRef, messageDoc);
  };

  const buildOpenRouterMessages = (historyMessages, prompt) => {
    const apiMessages = historyMessages.map((msg) => {
      const messageEntry = {
        role: msg.role,
        content: msg.content || ''
      };

      if (msg.role === 'assistant' && msg.reasoning_details) {
        messageEntry.reasoning_details = msg.reasoning_details;
      }

      return messageEntry;
    });

    apiMessages.push({
      role: 'user',
      content: prompt
    });

    return apiMessages;
  };

  const sendToAI = async (prompt) => {
    setLoading(true);

    if (!OPENROUTER_API_KEY) {
      console.error('Missing VITE_OPENROUTER API key.');
      await saveMessage('ai', '⚠️ OpenRouter API key is missing.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          reasoning: { enabled: true },
          messages: buildOpenRouterMessages(messages, prompt)
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || `OpenRouter request failed: ${response.status}`);
      }

      const aiMessage = result?.choices?.[0]?.message;
      const assistantContent = aiMessage?.content ?? '⚠️ No response from OpenRouter.';
      const reasoningDetails = aiMessage?.reasoning_details ?? null;

      await saveMessage('ai', assistantContent, reasoningDetails);
    } catch (err) {
      console.error(err);
      await saveMessage('ai', `⚠️ Error generating response: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');

    await saveMessage('user', userMessage);
    sendToAI(userMessage);
  };

  const bubbleStyles = {
    user: {
      alignSelf: 'flex-end',
      backgroundColor: '#1976d2',
      color: '#fff',
      borderRadius: '16px 16px 4px 16px',
      padding: '10px 14px',
      maxWidth: '75%'
    },
    ai: {
      alignSelf: 'flex-start',
      backgroundColor: '#e0e0e0',
      color: '#000',
      borderRadius: '16px 16px 16px 4px',
      padding: '10px 14px',
      maxWidth: '75%'
    }
  };

  return (
    <Paper sx={{ p: 2, height: '70vh', width: '500px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">AI Assistant</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Chat */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          backgroundColor: '#f5f5f5',
          borderRadius: 2
        }}
      >
        {messages.map((msg, i) => (
          <Box key={i} sx={bubbleStyles[msg.role]}>
            {msg.role === 'ai'
              ? <ReactMarkdown>{msg.content}</ReactMarkdown>
              : <Typography>{msg.content}</Typography>
            }
          </Box>
        ))}

        {loading && (
          <Box sx={bubbleStyles.ai}>
            <CircularProgress size={18} />
          </Box>
        )}

        <div ref={chatEndRef} />
      </Box>

      {/* Input */}
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={3}
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button variant="contained" onClick={handleSend} disabled={loading}>
          Send
        </Button>
      </Box>
    </Paper>
  );
};

export default AIAssistant;
