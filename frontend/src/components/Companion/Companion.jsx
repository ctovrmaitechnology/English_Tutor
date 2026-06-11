import { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, X, Volume2 } from 'lucide-react';
import CompanionSpeechBubble from './CompanionSpeechBubble';
import CompanionAnimations from './CompanionAnimations';
import { useCompanionState } from './CompanionStateManager';
import CompanionEvents from './CompanionEvents';
import { chatService } from '../../services/chat.service';
import { playBase64Audio, startRecording, blobToFormData } from '../../utils/audio';
import './CompanionStyles.css';

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
      recorderRef.current = await startRecording();
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

      // Show placeholder while transcribing
      const placeholderId = Date.now();
      setMessages(prev => [...prev, {
        id: placeholderId,
        sender: 'user',
        text: '🎤 ...',
      }]);

      const res  = await chatService.sendVoice(formData);
      const data = res.data;

      // Replace placeholder with actual transcript
      setMessages(prev => prev.map(msg =>
        msg.id === placeholderId
          ? { ...msg, text: data.userText }
          : msg
      ));

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
              {messages.map((msg) => (
                <div key={msg.id}>
                  <div className={`panda-chat-bubble panda-chat-bubble--${msg.sender}`}>
                    {msg.text}
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
                </div>
              ))}

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