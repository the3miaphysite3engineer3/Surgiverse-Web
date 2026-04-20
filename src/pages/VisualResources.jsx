import React, { useEffect, useRef, useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import {
  Box,
  Typography,
  Container,
  Paper,
  Button,
  Grid,
  Alert,
  CircularProgress,
  TextField,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
} from '@mui/material';
import { GoogleGenAI, Modality } from '@google/genai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const SEND_SAMPLE_RATE = 16000;
const RECEIVE_SAMPLE_RATE = 24000;
const CAMERA_FPS = 1;
const CAMERA_FRAME_WIDTH = 640;
const CAMERA_FRAME_QUALITY = 0.7;
const LIVE_MODEL = 'gemini-3.1-flash-live-preview';

// ─── Helpers ───────────────────────────────────────────────────────
const fileToBase64 = async (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const base64ToUint8Array = (base64) => {
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
};

const float32ToPcm16 = (f32) => {
  const buf = new ArrayBuffer(f32.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < f32.length; i++) {
    let s = Math.max(-1, Math.min(1, f32[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(i * 2, s, true);
  }
  return new Uint8Array(buf);
};

const uint8ArrayToBase64 = (u8) => {
  let bin = '';
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin);
};

const createVideoPart = async (file) => ({
  inlineData: { data: await fileToBase64(file), mimeType: file.type },
  videoMetadata: { startOffset: '0s' },
});

const buildMediaContents = async (refFile, refYt, cmpFile, cmpYt) => {
  const parts = [];
  if (refFile) parts.push(await createVideoPart(refFile));
  else if (refYt?.trim()) parts.push(`Reference video URL: ${refYt.trim()}`);
  if (cmpFile) parts.push(await createVideoPart(cmpFile));
  else if (cmpYt?.trim()) parts.push(`Comparison video URL: ${cmpYt.trim()}`);
  return parts;
};

// ─── AudioStreamer ──────────────────────────────────────────────────
class AudioStreamer {
  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
    this.queue = [];
    this.isPlaying = false;
    this.nextStartTime = 0;
    this.currentSource = null;
  }
  addPCM16(chunk) {
    const i16 = new Int16Array(chunk.buffer, chunk.byteOffset, Math.floor(chunk.byteLength / 2));
    const f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768;
    this.queue.push(f32);
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.nextStartTime = this.audioContext.currentTime;
      this._next();
    }
  }
  _next() {
    if (!this.queue.length) { this.isPlaying = false; this.currentSource = null; return; }
    const samples = this.queue.shift();
    const buf = this.audioContext.createBuffer(1, samples.length, this.sampleRate);
    buf.getChannelData(0).set(samples);
    const src = this.audioContext.createBufferSource();
    src.buffer = buf;
    src.connect(this.audioContext.destination);
    if (this.nextStartTime < this.audioContext.currentTime) this.nextStartTime = this.audioContext.currentTime;
    src.start(this.nextStartTime);
    this.nextStartTime += buf.duration;
    this.currentSource = src;
    src.onended = () => this._next();
  }
  clearQueue() {
    this.queue = [];
    if (this.currentSource) { try { this.currentSource.stop(); } catch { /* */ } this.currentSource = null; }
    this.isPlaying = false;
    this.nextStartTime = 0;
  }
  stop() { this.clearQueue(); }
  async resume() { if (this.audioContext.state === 'suspended') await this.audioContext.resume(); }
  destroy() { this.stop(); if (this.audioContext?.state !== 'closed') this.audioContext.close(); }
}

// ─── WAV builder ───────────────────────────────────────────────────
const pcmToWav = (pcm, sr = 24000, ch = 1, bits = 16) => {
  const br = sr * ch * (bits / 8), ba = ch * (bits / 8), ds = pcm.length;
  const buf = new ArrayBuffer(44 + ds), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + ds, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
  v.setUint32(24, sr, true); v.setUint32(28, br, true); v.setUint16(32, ba, true);
  v.setUint16(34, bits, true); w(36, 'data'); v.setUint32(40, ds, true);
  new Uint8Array(buf, 44).set(pcm);
  return new Blob([buf], { type: 'audio/wav' });
};

// ─── PCM Recorder ──────────────────────────────────────────────────
class PCMRecorder {
  constructor(onChunk, rate = 16000) {
    this.onChunk = onChunk; this.rate = rate;
    this.ctx = null; this.src = null; this.proc = null; this.stream = null;
  }
  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: this.rate, channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: this.rate });
    this.src = this.ctx.createMediaStreamSource(this.stream);
    this.proc = this.ctx.createScriptProcessor(4096, 1, 1);
    this.proc.onaudioprocess = (e) => {
      const inp = e.inputBuffer.getChannelData(0);
      const ar = this.ctx.sampleRate;
      const f = ar !== this.rate ? this._resample(inp, ar, this.rate) : new Float32Array(inp);
      this.onChunk(float32ToPcm16(f));
    };
    this.src.connect(this.proc);
    this.proc.connect(this.ctx.destination);
  }
  _resample(d, fr, tr) {
    const r = fr / tr, n = Math.round(d.length / r), o = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const idx = i * r, lo = Math.floor(idx), hi = Math.min(lo + 1, d.length - 1), f = idx - lo;
      o[i] = d[lo] * (1 - f) + d[hi] * f;
    }
    return o;
  }
  stop() {
    this.proc?.disconnect(); this.src?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.ctx?.state !== 'closed') this.ctx?.close();
    this.proc = this.src = this.stream = this.ctx = null;
  }
}

// ─── Camera Streamer ───────────────────────────────────────────────
class CameraStreamer {
  constructor(onFrame, fps = 1, fw = 640, q = 0.7) {
    this.onFrame = onFrame; this.fps = fps; this.fw = fw; this.q = q;
    this.stream = null; this.vid = null; this.cvs = null; this.ctx2d = null; this.iv = null;
  }
  async start(videoEl, facing = 'user') {
    this.vid = videoEl;
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facing, width: { ideal: this.fw }, height: { ideal: Math.round(this.fw * 0.75) } },
    });
    this.vid.srcObject = this.stream;
    await this.vid.play();
    this.cvs = document.createElement('canvas');
    this.ctx2d = this.cvs.getContext('2d');
    await new Promise((r) => setTimeout(r, 300));
    const vw = this.vid.videoWidth || this.fw, vh = this.vid.videoHeight || this.fw * 0.75;
    const sc = this.fw / vw;
    this.cvs.width = Math.round(vw * sc); this.cvs.height = Math.round(vh * sc);
    this.iv = setInterval(() => this._cap(), 1000 / this.fps);
  }
  _cap() {
    if (!this.vid || !this.ctx2d || this.vid.readyState < 2) return;
    this.ctx2d.drawImage(this.vid, 0, 0, this.cvs.width, this.cvs.height);
    const b64 = this.cvs.toDataURL('image/jpeg', this.q).split(',')[1];
    if (b64) this.onFrame(b64);
  }
  stop() {
    if (this.iv) { clearInterval(this.iv); this.iv = null; }
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.vid) this.vid.srcObject = null;
    this.stream = this.cvs = this.ctx2d = null;
  }
}

// ─── Video Frame Extractor ─────────────────────────────────────────
// Extracts JPEG frames from a video file at a given interval
class VideoFrameExtractor {
  constructor(fps = 0.5, frameWidth = 512, quality = 0.6) {
    this.fps = fps;
    this.frameWidth = frameWidth;
    this.quality = quality;
  }

  async extractFrames(file, maxFrames = 30, onProgress = null) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'auto';

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const frames = [];

      video.onloadedmetadata = () => {
        const duration = video.duration;
        const interval = 1 / this.fps;
        const totalPossible = Math.floor(duration / interval);
        const totalFrames = Math.min(totalPossible, maxFrames);

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const scale = this.frameWidth / vw;
        canvas.width = Math.round(vw * scale);
        canvas.height = Math.round(vh * scale);

        let frameIndex = 0;

        const captureNext = () => {
          if (frameIndex >= totalFrames) {
            URL.revokeObjectURL(video.src);
            resolve(frames);
            return;
          }

          const time = frameIndex * interval;
          video.currentTime = Math.min(time, duration - 0.1);
        };

        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', this.quality);
          const base64 = dataUrl.split(',')[1];
          if (base64) {
            frames.push({
              data: base64,
              mimeType: 'image/jpeg',
              timestamp: video.currentTime,
            });
          }
          frameIndex++;
          if (onProgress) onProgress(frameIndex, Math.min(totalPossible, maxFrames));
          captureNext();
        };

        captureNext();
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video for frame extraction.'));
      };

      video.src = URL.createObjectURL(file);
    });
  }
}

// ════════════════════════════════════════════════════════════════════
const VisualResources = () => {
  const [referenceFile, setReferenceFile] = useState(null);
  const [comparisonFile, setComparisonFile] = useState(null);
  const [referencePreview, setReferencePreview] = useState('');
  const [comparisonPreview, setComparisonPreview] = useState('');
  const [resultTitle, setResultTitle] = useState('');
  const [resultText, setResultText] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [referenceYoutube, setReferenceYoutube] = useState('');
  const [comparisonYoutube, setComparisonYoutube] = useState('');
  const [conversationPrompt, setConversationPrompt] = useState(
    'Describe the content of the reference and comparison videos, and highlight any notable similarities or differences.'
  );
  const [liveStatus, setLiveStatus] = useState('inactive');
  const [liveLog, setLiveLog] = useState([]);
  const [liveTextInput, setLiveTextInput] = useState('Describe what you see in the reference and comparison videos.');
  const [systemInstruction, setSystemInstruction] = useState(
    'You are a helpful AI video analysis assistant. The user will send you frames from reference and comparison videos. Help them analyze, compare, and discuss the video content. You can also see their live camera feed and hear their microphone.'
  );
  const [recording, setRecording] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [receivedAudioUrl, setReceivedAudioUrl] = useState('');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [framesSent, setFramesSent] = useState(0);
  const [videosSentToLive, setVideosSentToLive] = useState(false);
  const [sendingVideos, setSendingVideos] = useState(false);
  const [videoProgress, setVideoProgress] = useState('');

  const sessionRef = useRef(null);
  const pcmRecorderRef = useRef(null);
  const cameraStreamerRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const audioRef = useRef(null);
  const lastAudioUrlRef = useRef('');
  const audioStreamerRef = useRef(null);
  const allPcmChunksRef = useRef([]);
  const flushTimerRef = useRef(null);
  const responseQueueRef = useRef([]);
  const messageLoopRunningRef = useRef(false);
  const setupCompleteRef = useRef(false);

  const addLiveLog = useCallback((msg) => {
    setLiveLog((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  const buildReplayAudio = useCallback(() => {
    const chunks = allPcmChunksRef.current;
    if (!chunks.length) return;
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const merged = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { merged.set(c, off); off += c.length; }
    const blob = pcmToWav(merged, RECEIVE_SAMPLE_RATE);
    const url = URL.createObjectURL(blob);
    if (lastAudioUrlRef.current) URL.revokeObjectURL(lastAudioUrlRef.current);
    lastAudioUrlRef.current = url;
    setReceivedAudioUrl(url);
    setIsAudioPlaying(false);
    addLiveLog(`Replay ready (${(total / (RECEIVE_SAMPLE_RATE * 2)).toFixed(1)}s).`);
  }, [addLiveLog]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => { buildReplayAudio(); flushTimerRef.current = null; }, 1500);
  }, [buildReplayAudio]);

  // ─── Send video frames to live session via sendClientContent ─────
  const sendVideosToLiveSession = useCallback(async () => {
    if (!sessionRef.current || videosSentToLive) return;

    const hasRef = Boolean(referenceFile || referenceYoutube.trim());
    const hasCmp = Boolean(comparisonFile || comparisonYoutube.trim());
    if (!hasRef && !hasCmp) {
      addLiveLog('ℹ️ No videos to send.');
      return;
    }

    setSendingVideos(true);
    setVideoProgress('');
    addLiveLog('📦 Extracting frames from videos...');

    const extractor = new VideoFrameExtractor(0.5, 512, 0.6); // 1 frame every 2 seconds
    const allParts = [];
    const descriptions = [];

    try {
      // Extract reference video frames
      if (referenceFile) {
        addLiveLog(`🎬 Extracting frames from reference: ${referenceFile.name}...`);
        const refFrames = await extractor.extractFrames(referenceFile, 500, (done, total) => {
          setVideoProgress(`Reference: ${done}/${total} frames`);
        });
        addLiveLog(`✅ Extracted ${refFrames.length} frames from reference video.`);

        // Add label
        allParts.push({ text: `\n--- REFERENCE VIDEO: "${referenceFile.name}" (${refFrames.length} frames) ---\n` });

        // Add each frame as an inline image
        for (const frame of refFrames) {
          allParts.push({
            inlineData: {
              data: frame.data,
              mimeType: frame.mimeType,
            },
          });
        }
        descriptions.push(`Reference: "${referenceFile.name}" — ${refFrames.length} frames sent.`);
      } else if (referenceYoutube.trim()) {
        allParts.push({ text: `Reference video YouTube URL: ${referenceYoutube.trim()} (cannot extract frames from URL, please analyze based on the URL)` });
        descriptions.push(`Reference: YouTube URL provided.`);
      }

      // Extract comparison video frames
      if (comparisonFile) {
        addLiveLog(`🎬 Extracting frames from comparison: ${comparisonFile.name}...`);
        const cmpFrames = await extractor.extractFrames(comparisonFile, 500, (done, total) => {
          setVideoProgress(`Comparison: ${done}/${total} frames`);
        });
        addLiveLog(`✅ Extracted ${cmpFrames.length} frames from comparison video.`);

        allParts.push({ text: `\n--- COMPARISON VIDEO: "${comparisonFile.name}" (${cmpFrames.length} frames) ---\n` });

        for (const frame of cmpFrames) {
          allParts.push({
            inlineData: {
              data: frame.data,
              mimeType: frame.mimeType,
            },
          });
        }
        descriptions.push(`Comparison: "${comparisonFile.name}" — ${cmpFrames.length} frames sent.`);
      } else if (comparisonYoutube.trim()) {
        allParts.push({ text: `Comparison video YouTube URL: ${comparisonYoutube.trim()} (cannot extract frames from URL, please analyze based on the URL)` });
        descriptions.push(`Comparison: YouTube URL provided.`);
      }

      // Seed the session with visual context for later realtime questions.
      allParts.push({
        text: '\nThese frames are the visual context for our upcoming live discussion. Use them when answering my later realtime text, audio, and camera questions about the reference and comparison videos.',
      });

      addLiveLog(`📤 Sending ${allParts.length} parts (frames + text) to session...`);
      setVideoProgress('Sending to model...');

      sessionRef.current.sendClientContent({
        turns: [{ role: 'user', parts: allParts }],
        turnComplete: true,
      });

      setVideosSentToLive(true);
      setVideoProgress('');
      addLiveLog(`✅ Video frames sent! ${descriptions.join(' | ')}`);
    } catch (error) {
      console.error('Error sending videos:', error);
      addLiveLog(`❌ Failed: ${error?.message}`);
    } finally {
      setSendingVideos(false);
      setVideoProgress('');
    }
  }, [referenceFile, comparisonFile, referenceYoutube, comparisonYoutube, videosSentToLive, addLiveLog]);

  // ─── Message queue ───────────────────────────────────────────────
  const processMessageQueue = useCallback(() => {
    if (messageLoopRunningRef.current) return;
    messageLoopRunningRef.current = true;

    const next = () => {
      if (!responseQueueRef.current.length) { messageLoopRunningRef.current = false; return; }
      const msg = responseQueueRef.current.shift();
      const sc = msg?.serverContent;

      if (sc) {
        if (sc.interrupted) {
          addLiveLog('⚡ Interrupted.');
          audioStreamerRef.current?.clearQueue();
          allPcmChunksRef.current = [];
          setIsAudioPlaying(false);
          requestAnimationFrame(next);
          return;
        }
        if (sc.modelTurn?.parts?.length) {
          sc.modelTurn.parts.forEach((p) => {
            if (p.inlineData?.data) {
              const bytes = base64ToUint8Array(p.inlineData.data);
              allPcmChunksRef.current.push(bytes);
              if (audioStreamerRef.current) {
                audioStreamerRef.current.addPCM16(bytes);
                setIsAudioPlaying(true);
              }
              scheduleFlush();
              return;
            }
            if (p.text) addLiveLog(`💬 ${p.text}`);
          });
        }
        if (sc.turnComplete) addLiveLog('✅ Turn complete.');
      }
      if (msg?.toolCall) addLiveLog(`🔧 Tool: ${JSON.stringify(msg.toolCall)}`);
      if (msg?.setupComplete) {
        setupCompleteRef.current = true;
        addLiveLog('⚙️ Setup complete — sending video frames...');
        sendVideosToLiveSession();
      }
      requestAnimationFrame(next);
    };
    next();
  }, [addLiveLog, scheduleFlush, sendVideosToLiveSession]);

  // ─── Start Live Session ──────────────────────────────────────────
  const startLiveSession = async () => {
    if (!GEMINI_API_KEY) {
      setStatusMessage({ severity: 'error', text: 'Missing Gemini API key.' });
      return;
    }
    if (sessionRef.current) { addLiveLog('Already active.'); return; }

    allPcmChunksRef.current = [];
    responseQueueRef.current = [];
    messageLoopRunningRef.current = false;
    setupCompleteRef.current = false;
    setVideosSentToLive(false);
    setSendingVideos(false);
    setVideoProgress('');

    if (audioStreamerRef.current) audioStreamerRef.current.destroy();
    audioStreamerRef.current = new AudioStreamer(RECEIVE_SAMPLE_RATE);
    setReceivedAudioUrl('');
    setIsAudioPlaying(false);
    setFramesSent(0);
    setLiveStatus('connecting');
    addLiveLog(`Connecting to ${LIVE_MODEL}...`);

    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const cfg = {
        responseModalities: [Modality.AUDIO],
        historyConfig: { initialHistoryInClientContent: true },
      };
      if (systemInstruction.trim()) cfg.systemInstruction = systemInstruction.trim();

      const session = await ai.live.connect({
        model: LIVE_MODEL,
        config: cfg,
        callbacks: {
          onopen: () => { setLiveStatus('connected'); addLiveLog('✅ Connected.'); },
          onmessage: (m) => { responseQueueRef.current.push(m); processMessageQueue(); },
          onerror: (e) => addLiveLog(`❌ ${e?.message || JSON.stringify(e)}`),
          onclose: (e) => {
            buildReplayAudio();
            addLiveLog(`🔌 Closed (${e ? `${e.code}: ${e.reason}` : 'unknown'}).`);
            setLiveStatus('closed');
            sessionRef.current = null;
          },
        },
      });

      sessionRef.current = session;
      await audioStreamerRef.current.resume();
      addLiveLog('Waiting for setup complete...');
    } catch (err) {
      console.error(err);
      addLiveLog(`❌ Failed: ${err?.message}`);
      setLiveStatus('error');
    }
  };

  const stopLiveSession = () => {
    if (!sessionRef.current) return;
    pcmRecorderRef.current?.stop(); pcmRecorderRef.current = null; setRecording(false);
    stopCamera();
    audioStreamerRef.current?.stop();
    const ws = sessionRef.current.conn?.readyState;
    if (ws === WebSocket.OPEN || ws === WebSocket.CONNECTING) sessionRef.current.close();
    sessionRef.current = null;
    responseQueueRef.current = [];
    messageLoopRunningRef.current = false;
    setupCompleteRef.current = false;
    setLiveStatus('stopped');
    setVideosSentToLive(false);
    addLiveLog('Stopped.');
    buildReplayAudio();
  };

  const resendVideos = async () => {
    setVideosSentToLive(false);
    await sendVideosToLiveSession();
  };

  // ─── Send text ───────────────────────────────────────────────────
  const sendLiveText = () => {
    if (!sessionRef.current) { addLiveLog('Start session first.'); return; }
    const prompt = liveTextInput.trim();
    if (!prompt) return;
    allPcmChunksRef.current = [];
    audioStreamerRef.current?.stop();
    setIsAudioPlaying(false);
    audioStreamerRef.current?.resume();

    try {
      sessionRef.current.sendRealtimeInput({
        text: prompt,
      });
      addLiveLog(`📤 ${prompt}`);
    } catch (err) {
      addLiveLog(`❌ Send failed: ${err?.message}`);
    }
  };

  // ─── Microphone ──────────────────────────────────────────────────
  const startRecording = async () => {
    if (!sessionRef.current || recording) return;
    allPcmChunksRef.current = [];
    audioStreamerRef.current?.stop();
    setIsAudioPlaying(false);
    await audioStreamerRef.current?.resume();

    try {
      const rec = new PCMRecorder((chunk) => {
        if (!sessionRef.current) return;
        try {
          sessionRef.current.sendRealtimeInput({
            audio: { data: uint8ArrayToBase64(chunk), mimeType: `audio/pcm;rate=${SEND_SAMPLE_RATE}` },
          });
        } catch (e) { console.error(e); }
      }, SEND_SAMPLE_RATE);
      await rec.start();
      pcmRecorderRef.current = rec;
      setRecording(true);
      addLiveLog(`🎙️ Recording (${SEND_SAMPLE_RATE}Hz).`);
    } catch (err) {
      addLiveLog(`❌ Mic: ${err?.message}`);
    }
  };

  const stopRecording = () => {
    pcmRecorderRef.current?.stop();
    pcmRecorderRef.current = null;
    setRecording(false);
    if (sessionRef.current) {
      try {
        sessionRef.current.sendRealtimeInput({ audioStreamEnd: true });
      } catch (e) {
        console.error(e);
      }
    }
    addLiveLog('⏹️ Recording stopped.');
  };

  // ─── Camera ──────────────────────────────────────────────────────
  const createCameraHandler = useCallback(
    () => (b64) => {
      if (!sessionRef.current) return;
      try {
        sessionRef.current.sendRealtimeInput({
          video: { data: b64, mimeType: 'image/jpeg' },
        });
        setFramesSent((p) => p + 1);
      } catch (e) { console.error(e); }
    },
    []
  );

  const startCamera = async () => {
    if (!sessionRef.current || cameraActive) return;
    try {
      const cs = new CameraStreamer(createCameraHandler(), CAMERA_FPS, CAMERA_FRAME_WIDTH, CAMERA_FRAME_QUALITY);
      await cs.start(cameraVideoRef.current, facingMode);
      cameraStreamerRef.current = cs;
      setCameraActive(true);
      addLiveLog(`📷 Camera (${facingMode}, ${CAMERA_FPS}fps).`);
    } catch (err) { addLiveLog(`❌ Camera: ${err?.message}`); }
  };

  const stopCamera = () => {
    cameraStreamerRef.current?.stop();
    cameraStreamerRef.current = null;
    setCameraActive(false);
    setFramesSent(0);
  };

  const switchCamera = async () => {
    const nm = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nm);
    if (cameraActive) {
      stopCamera();
      setTimeout(async () => {
        try {
          const cs = new CameraStreamer(createCameraHandler(), CAMERA_FPS, CAMERA_FRAME_WIDTH, CAMERA_FRAME_QUALITY);
          await cs.start(cameraVideoRef.current, nm);
          cameraStreamerRef.current = cs;
          setCameraActive(true);
          addLiveLog(`📷 Switched to ${nm}.`);
        } catch (e) { addLiveLog(`❌ ${e?.message}`); }
      }, 500);
    }
  };

  // ── Previews ──
  useEffect(() => {
    if (!referenceFile) { setReferencePreview(''); return; }
    const u = URL.createObjectURL(referenceFile);
    setReferencePreview(u);
    return () => { URL.revokeObjectURL(u); setReferencePreview(''); };
  }, [referenceFile]);

  useEffect(() => {
    if (!comparisonFile) { setComparisonPreview(''); return; }
    const u = URL.createObjectURL(comparisonFile);
    setComparisonPreview(u);
    return () => { URL.revokeObjectURL(u); setComparisonPreview(''); };
  }, [comparisonFile]);

  useEffect(() => () => {
    audioStreamerRef.current?.destroy();
    pcmRecorderRef.current?.stop();
    cameraStreamerRef.current?.stop();
    if (lastAudioUrlRef.current) URL.revokeObjectURL(lastAudioUrlRef.current);
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
  }, []);

  // ── Non-live API ──
  const runMediaRequest = async ({ prompt, title }) => {
    setStatusMessage(null); setResultTitle(''); setResultText('');
    if (!(referenceFile || referenceYoutube.trim()) || !(comparisonFile || comparisonYoutube.trim())) {
      setStatusMessage({ severity: 'error', text: 'Provide both videos.' }); return;
    }
    if (!GEMINI_API_KEY) { setStatusMessage({ severity: 'error', text: 'Missing API key.' }); return; }
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const contents = [prompt, ...(await buildMediaContents(referenceFile, referenceYoutube, comparisonFile, comparisonYoutube))];
      const res = await ai.models.generateContent({ model: 'gemini-3.1-flash-lite-preview', contents });
      setResultTitle(title); setResultText(res.text || 'Empty.');
      setStatusMessage({ severity: 'success', text: `${title} done.` });
    } catch (e) {
      setStatusMessage({ severity: 'error', text: e?.message || 'Error.' });
    } finally { setLoading(false); }
  };

  return (
    <Box>
      <Navbar />
      <Container className="page-container">
        <Paper className="page-paper">
          <Typography variant="h4" component="h1" sx={{ mb: 3 }}>Visual Resources</Typography>
          <Typography sx={{ mb: 3 }}>
            Upload or link reference &amp; comparison videos. Compare via text API, or start a
            <strong> live session</strong> — video frames are extracted and sent to the model so you can discuss them
            with voice, camera, and text.
          </Typography>

          <Box component="form" noValidate>
            <Grid container spacing={3}>
              {/* Reference */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 1 }}>Reference Video</Typography>
                <Button variant="outlined" component="label" fullWidth>
                  Select Reference Video
                  <input type="file" hidden accept="video/*" onChange={(e) => { setReferenceFile(e.target.files?.[0] ?? null); setVideosSentToLive(false); }} />
                </Button>
                {referenceFile && <Typography sx={{ mt: 1 }}>{referenceFile.name} ({(referenceFile.size / 1024 / 1024).toFixed(1)}MB)</Typography>}
                {referencePreview && <Box component="video" src={referencePreview} controls sx={{ width: '100%', mt: 2, borderRadius: 1 }} />}
                <TextField label="Reference YouTube URL" value={referenceYoutube}
                  onChange={(e) => { setReferenceYoutube(e.target.value); setVideosSentToLive(false); }}
                  fullWidth sx={{ mt: 2 }} placeholder="https://www.youtube.com/watch?v=..." />
              </Grid>

              {/* Comparison */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 1 }}>Comparison Video</Typography>
                <Button variant="outlined" component="label" fullWidth>
                  Select Comparison Video
                  <input type="file" hidden accept="video/*" onChange={(e) => { setComparisonFile(e.target.files?.[0] ?? null); setVideosSentToLive(false); }} />
                </Button>
                {comparisonFile && <Typography sx={{ mt: 1 }}>{comparisonFile.name} ({(comparisonFile.size / 1024 / 1024).toFixed(1)}MB)</Typography>}
                {comparisonPreview && <Box component="video" src={comparisonPreview} controls sx={{ width: '100%', mt: 2, borderRadius: 1 }} />}
                <TextField label="Comparison YouTube URL" value={comparisonYoutube}
                  onChange={(e) => { setComparisonYoutube(e.target.value); setVideosSentToLive(false); }}
                  fullWidth sx={{ mt: 2 }} placeholder="https://www.youtube.com/watch?v=..." />
              </Grid>

              {/* Prompt */}
              <Grid item xs={12}>
                <TextField label="Conversation prompt (non-live)" multiline minRows={4} fullWidth
                  value={conversationPrompt} onChange={(e) => setConversationPrompt(e.target.value)}
                  helperText="For the non-live Compare/Discuss buttons below." />
              </Grid>

              {/* Non-live buttons */}
              <Grid item xs={12}>
                {statusMessage && <Alert severity={statusMessage.severity} sx={{ mb: 2 }}>{statusMessage.text}</Alert>}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button variant="contained" disabled={loading} onClick={(e) => { e.preventDefault(); runMediaRequest({ prompt: 'Compare the reference video with the comparison video and describe the main similarities and differences.', title: 'Comparison Result' }); }}>
                    {loading ? <CircularProgress size={24} /> : 'Compare Videos'}
                  </Button>
                  <Button variant="outlined" color="secondary" disabled={loading} onClick={(e) => { e.preventDefault(); runMediaRequest({ prompt: conversationPrompt, title: 'Media Conversation Result' }); }}>
                    {loading ? <CircularProgress size={24} /> : 'Discuss Media'}
                  </Button>
                </Box>
              </Grid>

              {/* ═══════ LIVE SESSION ═══════ */}
              <Grid item xs={12}>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h5" sx={{ mb: 1 }}>Live Audio, Camera &amp; Video Session</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Video frames are extracted from your uploaded files and sent as images to the live model.
                  Then use mic, camera, and text to discuss them in real time with audio responses.
                </Typography>

                {/* System Instruction */}
                <TextField label="System Instruction" multiline minRows={2} fullWidth
                  value={systemInstruction} onChange={(e) => setSystemInstruction(e.target.value)}
                  sx={{ mb: 2 }} helperText="Set before starting."
                  disabled={liveStatus === 'connected' || liveStatus === 'connecting'} />

                {/* Status */}
                <Paper sx={{
                  p: 2, mb: 2,
                  backgroundColor: liveStatus === 'connected' ? '#e8f5e9' : liveStatus === 'connecting' ? '#fff3e0' : liveStatus === 'error' ? '#ffebee' : '#f5f5f5',
                  border: 1, borderColor: liveStatus === 'connected' ? 'success.main' : liveStatus === 'error' ? 'error.main' : 'divider', borderRadius: 1,
                }}>
                  <Typography variant="subtitle1">
                    Status: <strong>{liveStatus.toUpperCase()}</strong>
                    {isAudioPlaying && ' 🔊'}
                    {recording && ' 🎙️'}
                    {cameraActive && ` 📷(${framesSent})`}
                    {videosSentToLive && ' 🎬 Videos loaded'}
                    {sendingVideos && ' ⏳ Extracting frames...'}
                  </Typography>
                  {(sendingVideos || videoProgress) && (
                    <>
                      {videoProgress && <Typography variant="body2" sx={{ mt: 0.5 }}>{videoProgress}</Typography>}
                      <LinearProgress sx={{ mt: 1 }} />
                    </>
                  )}
                </Paper>

                {/* Session Controls */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                  <Button variant="contained" size="large" onClick={startLiveSession}
                    disabled={liveStatus === 'connecting' || liveStatus === 'connected'}>
                    🚀 Start Live Session
                  </Button>
                  <Button variant="outlined" color="error" size="large" onClick={stopLiveSession}
                    disabled={!sessionRef.current}>
                    ⏹️ Stop Session
                  </Button>
                  <Button variant="outlined" onClick={resendVideos}
                    disabled={!sessionRef.current || sendingVideos}>
                    🔄 Resend Videos
                  </Button>
                </Box>

                {/* Video status */}
                {liveStatus === 'connected' && (
                  <Paper sx={{ p: 1.5, mb: 2, backgroundColor: videosSentToLive ? '#e3f2fd' : '#fff8e1', borderRadius: 1 }}>
                    <Typography variant="body2">
                      {videosSentToLive
                        ? `🎬 Video frames loaded. Ref: ${referenceFile?.name || referenceYoutube || 'none'} | Cmp: ${comparisonFile?.name || comparisonYoutube || 'none'}`
                        : sendingVideos
                        ? '⏳ Extracting and sending video frames...'
                        : '⚠️ No video frames sent yet. Click "Resend Videos" or ensure videos are selected before starting.'}
                    </Typography>
                  </Paper>
                )}

                {/* Mic */}
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Microphone</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                  <Button variant="contained" color="success" onClick={startRecording}
                    disabled={!sessionRef.current || recording}>
                    🎙️ Start Recording
                  </Button>
                  <Button variant="outlined" color="error" onClick={stopRecording} disabled={!recording}>
                    ⏹️ Stop Recording
                  </Button>
                </Box>

                {/* Camera */}
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Camera</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
                  <Button variant="contained" color="info" onClick={startCamera}
                    disabled={!sessionRef.current || cameraActive}>
                    📷 Start Camera
                  </Button>
                  <Button variant="outlined" color="error" onClick={stopCamera} disabled={!cameraActive}>
                    📷 Stop
                  </Button>
                  <Button variant="outlined" onClick={switchCamera} disabled={!sessionRef.current}>
                    🔄 ({facingMode === 'user' ? 'Front' : 'Back'})
                  </Button>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Camera</InputLabel>
                    <Select value={facingMode} label="Camera" onChange={(e) => {
                      setFacingMode(e.target.value);
                      if (cameraActive) { stopCamera(); addLiveLog('Camera stopped.'); }
                    }}>
                      <MenuItem value="user">Front</MenuItem>
                      <MenuItem value="environment">Back</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Camera Preview */}
                <Box sx={{
                  mb: 2, position: 'relative', width: '100%', maxWidth: 480,
                  borderRadius: 2, overflow: 'hidden', backgroundColor: '#000',
                  display: cameraActive || liveStatus === 'connected' ? 'block' : 'none',
                }}>
                  <video ref={cameraVideoRef} autoPlay playsInline muted
                    style={{ width: '100%', display: 'block', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
                  {cameraActive && (
                    <Box sx={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', px: 1, py: 0.5, borderRadius: 1, fontSize: 12 }}>
                      🔴 LIVE — {framesSent} frames
                    </Box>
                  )}
                </Box>

                {/* Text */}
                <TextField label="Live text prompt" multiline minRows={3} fullWidth
                  value={liveTextInput} onChange={(e) => setLiveTextInput(e.target.value)}
                  sx={{ mb: 2 }} helperText="Ask about the videos, camera feed, etc." />
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                  <Button variant="contained" onClick={sendLiveText}
                    disabled={!sessionRef.current || !liveTextInput.trim()}>
                    📤 Send
                  </Button>
                  <Button variant="outlined" onClick={() => setLiveLog([])} disabled={!liveLog.length}>
                    🗑️ Clear
                  </Button>
                </Box>

                {/* Log */}
                <Paper sx={{ p: 2, backgroundColor: '#f7f8fb', maxHeight: 300, overflow: 'auto', fontFamily: 'monospace', fontSize: 13 }}>
                  {!liveLog.length
                    ? <Typography variant="body2" color="text.secondary">No events yet.</Typography>
                    : liveLog.map((e, i) => <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>{e}</Typography>)}
                </Paper>

                {/* Replay */}
                {receivedAudioUrl && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>🔊 Replay</Typography>
                    <audio controls ref={audioRef} src={receivedAudioUrl} style={{ width: '100%' }} />
                  </Box>
                )}
              </Grid>

              {resultText && (
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>{resultTitle || 'Result'}</Typography>
                  <Paper sx={{ p: 2, backgroundColor: '#f7f8fb' }}>
                    <Typography whiteSpace="pre-wrap">{resultText}</Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default VisualResources;
