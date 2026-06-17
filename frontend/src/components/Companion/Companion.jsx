import { useState, useEffect, useRef, Fragment } from 'react';
import { Send, Mic, MicOff, X, Volume2 } from 'lucide-react';
import CompanionSpeechBubble from './CompanionSpeechBubble';
import CompanionAnimations from './CompanionAnimations';
import { useCompanionState } from './CompanionStateManager';
import CompanionEvents from './CompanionEvents';
import { chatService } from '../../services/chat.service';
import api from '../../services/api';
import { playBase64Audio, startRecording, blobToFormData } from '../../utils/audio';
import './CompanionStyles.css';

// Helper to parse basic markdown bold/italic formatting on a single line
function formatMessageLine(line) {
  let cleanLine = line.trim();
  
  if (cleanLine.startsWith('* ') || cleanLine.startsWith('- ')) {
    cleanLine = cleanLine.substring(2).trim();
  } else if (cleanLine.startsWith('•')) {
    cleanLine = cleanLine.substring(1).trim();
  }
  
  // Parse bold (**text**) and italic (*text*)
  const parts = [];
  const tokenRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match;
  
  while ((match = tokenRegex.exec(cleanLine)) !== null) {
    if (match.index > lastIndex) {
      parts.push(cleanLine.substring(lastIndex, match.index));
    }
    
    if (match[0].startsWith('**')) {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else {
      parts.push(<em key={match.index}>{match[3]}</em>);
    }
    
    lastIndex = tokenRegex.lastIndex;
  }
  
  if (lastIndex < cleanLine.length) {
    parts.push(cleanLine.substring(lastIndex));
  }
  
  const renderedLine = parts.length > 0 ? parts : cleanLine;
  
  return (
    <div className="panda-chat-line">
      {renderedLine}
    </div>
  );
}

/**
 * Renders a full multi-paragraph AI/user message as ONE single bubble.
 * Each "\n"-separated paragraph keeps its own line break for readability,
 * but visually and audio-wise it all belongs to one message/one Listen button.
 */
function formatMessageBlock(text) {
  const paragraphs = text.split('\n').map(l => l.trim()).filter(Boolean);
  return paragraphs.map((p, idx) => (
    <Fragment key={idx}>{formatMessageLine(p)}</Fragment>
  ));
}

/**
 * Converts an audio Blob into a raw base64 string (no data: prefix),
 * matching the format playBase64Audio() expects.
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result; // "data:audio/wav;base64,XXXX"
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Companion Component — Connected to real AI backend

 * Text + Voice chat with Gemini AI + TTS audio response
 */
export default function Companion() {
  const {
    state,
    speech,
    bubbleOpen,
    isExpanded,
    setIsExpanded,
    subtitles,
    triggerState,
  } = useCompanionState();

  const [inputText, setInputText]   = useState('');
  const [messages, setMessages]     = useState([
    {
      id: 'init',
      sender: 'ai',
      text: "Hey there! I am VRM Buddy, your personal learning partner. Let's practice English together! You can type a message or tap the mic to speak to me.",
      audioBase64: null,
    },
  ]);
  const [isLoading, setIsLoading]   = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [error, setError]           = useState('');

  const historyEndRef = useRef(null);
  const recorderRef   = useRef(null);
  const inputRef      = useRef(null);
  const micStreamRef  = useRef(null);

  // Listen for lesson tutor session trigger — inject lesson-specific greeting
  useEffect(() => {
    const unsub = CompanionEvents.on('OPEN_TUTOR_SESSION', async (data) => {
      const topic = data?.topic || 'this lesson';
      const moduleTitle = data?.moduleTitle || 'the module';

      const greetingText = `Hi there! I'm VRM Buddy, your personal AI tutor. Today we're going to reinforce what you learned in "${topic}" from ${moduleTitle}.\n\nFeel free to ask me anything — I can explain concepts, give examples, or quiz you further. Let's get started!`;
      const greetingId = 'lesson-init';

      // Reset chat with lesson-specific greeting (shown instantly, audio attached once ready)
      setMessages([{
        id: greetingId,
        sender: 'ai',
        text: `Hi there! 👋 I'm VRM Buddy, your personal AI tutor. Today we're going to reinforce what you learned in **"${topic}"** from **${moduleTitle}**.\n\nFeel free to ask me anything — I can explain concepts, give examples, or quiz you further. Let's get started!`,
        audioBase64: null,
      }]);

      // Generate TTS for the greeting itself so it speaks too (not just AI replies)
      let greetingAudioBase64 = null;
      try {
        const ttsRes = await api.post(
          '/voice/synthesize',
          { text: greetingText, voice: 'af_sarah', speed: 1.1 },
          { responseType: 'blob' }
        );
        greetingAudioBase64 = await blobToBase64(ttsRes.data);
        setMessages(prev => prev.map(m => m.id === greetingId ? { ...m, audioBase64: greetingAudioBase64 } : m));
      } catch {
        // TTS unavailable for greeting — text-only is still fine
      }
      if (greetingAudioBase64) {
        try { await playBase64Audio(greetingAudioBase64); } catch {}
      }

      // Auto-send context to the real backend chat
      try {
        await chatService.clearHistory?.();
        const res = await chatService.sendMessage(
          `I just finished watching the lesson video and quiz on "${topic}" in "${moduleTitle}". Please give me one short, friendly, encouraging summary of this topic in 2 to 3 sentences total — not a list. Use simple language suitable for a BPO trainee.`
        );
        if (res?.data?.text) {
          setMessages(prev => [...prev, {
            id: `lesson-ai-${Date.now()}`,
            sender: 'ai',
            text: res.data.text,
            audioBase64: res.data.audioBase64 || null,
          }]);
          if (res.data.audioBase64) {
            try { await playBase64Audio(res.data.audioBase64); } catch {}
          }
        }
      } catch {
        // Fallback: keep the greeting only
      }
    });
    return () => unsub();
  }, []);

  // Pre-initialize microphone stream to avoid latency when holding the record button
  useEffect(() => {
    if (isExpanded) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          micStreamRef.current = stream;
        })
        .catch(err => {
          console.warn('Microphone pre-initialization failed:', err);
        });
    } else {
      // Release microphone when chat is closed/collapsed to be privacy-friendly
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
    }

    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [isExpanded]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isExpanded) {
      historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);

  // Focus input when chat opens
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isExpanded]);

  // ── Play AI audio ──────────────────────────────────────────
  const playAIAudio = async (audioBase64) => {
    if (!audioBase64) return;
    setIsPlaying(true);
    try {
      await playBase64Audio(audioBase64);
    } catch {
      // Audio failed silently — text response still shown
    } finally {
      setIsPlaying(false);
    }
  };

  // ── Play User voice audio ──────────────────────────────────
  const playVoiceAudio = (url) => {
    if (!url) return;
    const audio = new Audio(url);
    audio.play().catch(err => console.error('Error playing user voice audio:', err));
  };

  // ── Send text message ──────────────────────────────────────
  const handleSend = async (e) => {
    e?.preventDefault();
    const message = inputText.trim();
    if (!message || isLoading) return;

    setInputText('');
    setError('');
    setIsLoading(true);

    // Add user message immediately
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'user',
      text: message,
    }]);

    try {
      const res = await chatService.sendMessage(message);
      const data = res.data;

      // Add AI response
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: data.text,
        audioBase64: data.audioBase64,
      }]);

      // Auto-play AI voice
      if (data.audioBase64) {
        await playAIAudio(data.audioBase64);
      }
    } catch {
      setError('Could not reach Buddy. Please check your connection.');
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: 'Sorry, I could not connect. Please try again!',
        audioBase64: null,
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // ── Voice: Start recording ─────────────────────────────────
  const handleVoiceStart = async () => {
    if (isLoading || isRecording) return;
    try {
      setIsRecording(true);
      setError('');
      recorderRef.current = await startRecording(micStreamRef.current);
    } catch {
      setError('Microphone access denied. Please allow mic access.');
      setIsRecording(false);
    }
  };

  // ── Voice: Stop + submit recording ────────────────────────
  const handleVoiceStop = async () => {
    if (!recorderRef.current || !isRecording) return;

    setIsRecording(false);
    setIsLoading(true);

    try {
      const audioBlob = await recorderRef.current.stop();
      const formData  = blobToFormData(audioBlob);
      const audioUrl  = URL.createObjectURL(audioBlob);

      // Show Voice Message bubble immediately
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'user',
        text: '🎤 Voice Message',
        isVoice: true,
        audioUrl: audioUrl,
      }]);

      const res  = await chatService.sendVoice(formData);
      const data = res.data;

      // Add AI response
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: data.aiText,
        audioBase64: data.audioBase64,
      }]);

      // Auto-play AI voice
      if (data.audioBase64) {
        await playAIAudio(data.audioBase64);
      }
    } catch {
      setError('Voice message failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Clear chat ─────────────────────────────────────────────
  const handleClear = async () => {
    try { await chatService.clearHistory(); } catch { /* ignore */ }
    setMessages([{
      id: 'init',
      sender: 'ai',
      text: "Chat cleared! Let's start fresh. How can I help you? 😊",
      audioBase64: null,
    }]);
  };

  // ── Render full-screen expanded chat ───────────────────────
  if (isExpanded) {
    return (
      <div
        className="panda-chat-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Interactive voice and text tutor chat overlay"
      >
        {/* Close Button */}
        <button
          className="panda-close-btn"
          onClick={() => setIsExpanded(false)}
          title="Minimize VRM Buddy"
          aria-label="Close tutor conversation"
        >
          <X size={24} />
        </button>

        {/* ── LEFT: 3D Animation ──────────────────────────── */}
        <div className="panda-chat-avatar-pane">
          <div style={{ width: '100%', height: '85%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CompanionAnimations state={state} />
          </div>

          {subtitles && (
            <div className="panda-chat-subtitles">{subtitles}</div>
          )}
        </div>

        {/* ── RIGHT: Chat panel ───────────────────────────── */}
        <div className="panda-chat-interface-pane">
          <div className="panda-chat-card">

            {/* Header */}
            <div className="panda-chat-header">
              <div className="panda-chat-status-dot" />
              <h2 className="panda-chat-header-title">VRM Buddy Active Partner</h2>
              <span className="panda-chat-header-subtitle">
                {isLoading
                  ? '⌨️ Thinking...'
                  : isPlaying
                  ? '🔊 Speaking...'
                  : isRecording
                  ? '🎤 Listening...'
                  : 'English Speaking Coach'}
              </span>
            </div>

            {/* Message feed */}
            <div className="panda-chat-history">
              {messages.map((msg) => {
                // Keep the full message as ONE single bubble (no splitting),
                // so the audio clip and "Listen" button always match the one bubble shown.
                const fullText = msg.text.trim();

                return (
                  <div key={msg.id} className={`panda-chat-message-row panda-chat-message-row--${msg.sender}`}>
                    <div className={`panda-chat-bubble panda-chat-bubble--${msg.sender}`}>
                      {formatMessageBlock(fullText)}
                    </div>

                    {/* Replay audio for AI messages */}
                    {msg.sender === 'ai' && msg.audioBase64 && (
                      <button
                        className="panda-replay-btn"
                        onClick={() => playAIAudio(msg.audioBase64)}
                        disabled={isPlaying}
                      >
                        <Volume2 size={11} />
                        {isPlaying ? 'Playing...' : 'Listen'}
                      </button>
                    )}
                    {msg.sender === 'ai' && !msg.audioBase64 && !isLoading && (
                      <span className="panda-audio-unavailable" style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'inline-block' }}>
                        🔇 Voice unavailable for this reply
                      </span>
                    )}

                    {/* Replay audio for User voice messages */}
                    {msg.sender === 'user' && msg.isVoice && msg.audioUrl && (
                      <button
                        className="panda-replay-btn"
                        onClick={() => playVoiceAudio(msg.audioUrl)}
                        style={{ marginTop: '4px' }}
                      >
                        <Volume2 size={11} />
                        Listen
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isLoading && (
                <div className="panda-chat-bubble panda-chat-bubble--ai">
                  <div className="panda-typing">
                    <span /><span /><span />
                  </div>
                </div>
              )}

              {/* Recording indicator */}
              {isRecording && (
                <div className="panda-recording-indicator">
                  <span className="panda-rec-dot" />
                  Recording — release mic to send
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="panda-error">{error}</p>
              )}

              <div ref={historyEndRef} />
            </div>

            {/* Input bar */}
            <form onSubmit={handleSend} className="panda-chat-input-container">
              <div className="panda-chat-input-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  className="panda-chat-input"
                  placeholder={
                    isRecording
                      ? 'Listening… release mic to send'
                      : isLoading
                      ? 'Buddy is thinking…'
                      : 'Type your message in English…'
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isRecording || isLoading}
                />

                {/* Hold-to-record mic button */}
                <button
                  type="button"
                  className={`panda-mic-btn ${isRecording ? 'panda-mic-btn--recording' : ''}`}
                  onMouseDown={handleVoiceStart}
                  onMouseUp={handleVoiceStop}
                  onTouchStart={handleVoiceStart}
                  onTouchEnd={handleVoiceStop}
                  title="Hold to speak"
                  aria-label="Hold to record voice message"
                  disabled={isLoading}
                >
                  {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              </div>

              <button
                type="submit"
                className="panda-send-btn"
                disabled={!inputText.trim() || isRecording || isLoading}
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </form>

            {/* Hint */}
            <p className="panda-input-hint">
              {isRecording
                ? '🎤 Release mic to send your voice message'
                : '💡 Hold mic to speak • Press Enter to send'}
            </p>

          </div>
        </div>
      </div>
    );
  }

  // ── Render minimized companion (dashboard view) ──────────
  return (
    <div
      className="panda-companion-container"
      role="complementary"
      aria-label="Learning Buddy Companion"
    >
      {/* Speech bubble floating above */}
      <CompanionSpeechBubble text={speech} isOpen={bubbleOpen} />

      {/* 3D GLB model — click to open chat */}
      <div
        onClick={() => setIsExpanded(true)}
        onMouseEnter={() => CompanionEvents.emit('COMPANION_HOVERED')}
        onMouseLeave={() => CompanionEvents.emit('COMPANION_UNHOVERED')}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        title="Click to open VRM Buddy chat"
        aria-label="Open interactive chat with VRM Buddy"
      >
        <CompanionAnimations state={state} />
        <div className="panda-chat-hint">
          <span>💬 Tap to chat</span>
        </div>
      </div>
    </div>
  );
}