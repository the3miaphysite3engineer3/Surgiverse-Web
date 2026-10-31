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
import { supabase } from '../supabase';
import { fetchChatMessages, sendChatMessage, subscribeChatMessages } from '../lib/db';
import { getAttemptLogs, getAttemptProcedureName } from '../utils/attemptFormat';
import { fetchActiveModels, defaultModel, formatPriceEGP } from '../utils/aiModels';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';
// Optional server proxy (recommended): POST { attemptId, messages } → { content }.
// The proxy holds the real keys (OpenRouter and/or SovereignEG) server-side,
// so no AI key ships in the browser bundle. See next-migration/app/api/ai-chat.
const AI_PROXY_URL = import.meta.env.VITE_AI_PROXY_URL;

const AIAssistant = ({ attempt, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [modelId, setModelId] = useState('');
  const chatEndRef = useRef(null);

  // Model catalog from the `ai_models` catalog table (seeded from SovereignEG).
  useEffect(() => {
    fetchActiveModels().then((list) => {
      setModels(list);
      setModelId((prev) => prev || defaultModel(list)?.modelId || '');
    });
  }, []);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load chat history + subscribe to new messages (realtime).
  useEffect(() => {
    if (!attempt) return;

    let cancelled = false;
    fetchChatMessages(attempt.id)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch((err) => {
        console.warn('Failed to load chat history:', err?.message || err);
      });

    const unsubscribe = subscribeChatMessages(attempt.id, (row) => {
      // Realtime INSERTs fire for our own writes too — dedupe by id.
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt?.id]);

  // Initial AI analysis (only once)
  useEffect(() => {
    if (!attempt || messages.length > 0) return;

    const procedure = getAttemptProcedureName(attempt) || 'Unknown procedure';
    const metricsJson = attempt.metrics ? JSON.stringify(attempt.metrics, null, 2) : 'No metrics recorded.';
    const allLogs = getAttemptLogs(attempt);
    const logsText = allLogs.length > 0
      ? allLogs.slice(0, 30).join('\n')
      : 'No logs recorded.';
    const screenshotCount = Array.isArray(attempt.screenshots) ? attempt.screenshots.length : 0;
    const initialPrompt = `
Analyze the following surgery attempt.
Use clear markdown formatting with sections: Summary, Strengths, Areas for Improvement, Concrete Next Steps.

- **Surgeon:** ${attempt.surgeon || attempt.uid || 'Unknown'}
- **Procedure:** ${procedure}
- **Outcome:** ${attempt.isSuccessful ? 'Successful' : 'Failed'}
- **Score:** ${attempt.score ?? 'Not graded'}
- **Completion time (s):** ${attempt.completionTimeSeconds ?? 'N/A'}
- **Screenshots captured:** ${screenshotCount}
- **Metrics:** \`\`\`json
${metricsJson}
\`\`\`
- **Logs (first ${Math.min(allLogs.length, 30)}):**
\`\`\`
${logsText}
\`\`\`
    `;

    sendToAI(initialPrompt);
  }, [attempt, messages]);

  const saveMessage = async (role, content, reasoning_details = null) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      await sendChatMessage(attempt.id, user.id, {
        role,
        content,
        reasoning_details,
      });
    } catch (err) {
      // Offline writes/rejected policies — log instead of throwing an
      // unhandled rejection that would break the chat UI.
      console.warn('Failed to save chat message:', err?.message || err);
    }
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

    // Server-proxy path: keys (OpenRouter / SovereignEG) stay server-side.
    // The proxy verifies the Firebase ID token, calls the provider, and
    // persists the reply — the onSnapshot listener above renders it.
    if (AI_PROXY_URL) {
      try {
        const { data } = await supabase.auth.getSession();
        const idToken = data?.session?.access_token ?? null;
        const response = await fetch(AI_PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({
            attemptId: attempt?.id,
            messages: buildOpenRouterMessages(messages, prompt),
            model: modelId || undefined,
          }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(result?.error || `AI proxy failed: ${response.status}`);
        }
      } catch (err) {
        console.error(err);
        await saveMessage('ai', `⚠️ Error generating response: ${err.message || err}`);
      } finally {
        setLoading(false);
      }
      return;
    }

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
          model: modelId || OPENROUTER_MODEL,
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
      backgroundColor: 'action.hover',
      color: 'text.primary',
      borderRadius: '16px 16px 16px 4px',
      padding: '10px 14px',
      maxWidth: '75%'
    }
  };

  return (
    <Paper sx={{ p: 2, height: '70vh', width: { xs: '94vw', sm: 500 }, maxWidth: '94vw', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">AI Assistant</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Model picker (Firestore `ai_models` catalog with EGP pricing) */}
      <TextField
        select
        fullWidth
        size="small"
        label="Model"
        value={modelId}
        onChange={(e) => setModelId(e.target.value)}
        sx={{ mt: 1, mb: 1 }}
        SelectProps={{ native: true }}
        helperText={
          models.find((m) => m.modelId === modelId)
            ? `In: ${formatPriceEGP(models.find((m) => m.modelId === modelId).inputPerMTokensEGP)} · Out: ${formatPriceEGP(models.find((m) => m.modelId === modelId).outputPerMTokensEGP)}`
            : 'Loading model catalog…'
        }
      >
        {models.map((m) => (
          <option key={m.modelId} value={m.modelId}>
            {m.name}
          </option>
        ))}
      </TextField>

      {/* Chat */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          backgroundColor: 'action.hover',
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
