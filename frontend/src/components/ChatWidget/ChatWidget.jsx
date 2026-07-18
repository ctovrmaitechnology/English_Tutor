import { useState, useRef, useEffect } from 'react';
import { X, Send, Mic, MicOff, Trash2, Volume2 } from 'lucide-react';
import { chatService } from '../../services/chat.service';
import { startRecording, blobToFormData, playBase64Audio } from '../../utils/audio';
import { CompanionEvents } from '../Companion/CompanionStateManager';
import './ChatWidget.css';

const QUICK_PROMPTS = [
  'Correct my grammar ✍️',
  'Teach me a BPO phrase 🏢',
  'How to handle angry customer 😤',
  'Pronunciation tip 🎙️',
  'Professional email phrases ✉️',
];

export default function ChatWidget() {
  const [isOpen, setIsOpen]       = useState(false);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError]         = useState('');
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const recorderRef    = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add welcome message
      setMessages([{
        role: 'ai',
        text: "Hi! I'm Buddy, your English tutor 👋 How can I help you today? You can ask me anything about English!",
        audioBase64: null,
      }]);
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  // ── Send text message ────────────────────────────────────────
  const handleSend = async (text = input) => {
    const message = text.trim();
    if (!message || isLoading) return;

    setInput('');
    setShowQuickPrompts(false);
    setError('');
    setIsLoading(true);

    // Add user message immediately
    setMessages(prev => [...prev, { role: 'user', text: message }]);

    // Trigger companion thinking animation
    CompanionEvents.emit('AI_SPEAKING_START');

    try {
      const res = await chatService.sendMessage(message);
      const data = res.data;

      setMessages(prev => [...prev, {
        role: 'ai',
        text: data.text,
        audioBase64: data.audioBase64,
      }]);

      // Auto-play AI audio response
      if (data.audioBase64) {
        await playAIAudio(data.audioBase64);
      }
    } catch {
      setError('Could not reach Buddy. Check your connection.');
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // ── Send voice message ───────────────────────────────────────
  const handleVoiceStart = async () => {
    try {
      setIsRecording(true);
      setError('');
      recorderRef.current = await startRecording();
    } catch {
      setError('Microphone access denied.');
      setIsRecording(false);
    }
  };

  const handleVoiceStop = async () => {
    if (!recorderRef.current) return;
    setIsRecording(false);
    setIsLoading(true);
    setShowQuickPrompts(false);

    try {
      const audioBlob = await recorderRef.current.stop();
      const formData  = blobToFormData(audioBlob);
      const audioUrl  = URL.createObjectURL(audioBlob);

      // Show voice message bubble immediately
      setMessages(prev => [...prev, {
        role: 'user',
        text: '🎤 Voice Message',
        isVoice: true,
        audioUrl: audioUrl,
      }]);

      CompanionEvents.emit('AI_SPEAKING_START');

      const res = await chatService.sendVoice(formData);
      const data = res.data;

      // Add AI response
      setMessages(prev => [...prev, {
        role: 'ai',
        text: data.aiText,
        audioBase64: data.audioBase64,
      }]);

      // Auto-play AI audio
      if (data.audioBase64) {
        await playAIAudio(data.audioBase64);
      }
    } catch {
      setError('Voice message failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Play AI audio ────────────────────────────────────────────
  const playAIAudio = async (audioBase64) => {
    if (!audioBase64) return;
    setIsPlaying(true);
    CompanionEvents.emit('AI_SPEAKING_START');
    try {
      await playBase64Audio(audioBase64);
    } catch {
      // Audio failed silently
    } finally {
      setIsPlaying(false);
    }
  };

  // ── Clear chat ───────────────────────────────────────────────
  const clearChat = async () => {
    try {
      await chatService.clearHistory();
    } catch { /* ignore */ }
    setMessages([{
      role: 'ai',
      text: "Chat cleared! Let's start fresh. How can I help you? 😊",
      audioBase64: null,
    }]);
    setShowQuickPrompts(true);
  };

  return (
    <div className="chat-widget">

      {/* Chat Panel */}
      {isOpen && (
        <div className="cw-panel">

          {/* Header */}
          <div className="cw-header">
            <div className="cw-header-info">
              <div className="cw-avatar">🤖</div>
              <div>
                <p className="cw-name">Buddy</p>
                <p className="cw-status">
                  {isLoading ? '⌨️ Thinking...' : isPlaying ? '🔊 Speaking...' : '🟢 Online'}
                </p>
              </div>
            </div>
            <div className="cw-header-actions">
              <button className="cw-icon-btn" onClick={clearChat} title="Clear chat">
                <Trash2 size={16} />
              </button>
              <button className="cw-icon-btn cw-close-btn" onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="cw-messages">

            {/* Quick prompts */}
            {showQuickPrompts && messages.length <= 1 && (
              <div className="cw-quick-prompts">
                <p className="cw-quick-label">Try asking:</p>
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    className="cw-quick-btn"
                    onClick={() => handleSend(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`cw-msg cw-msg--${msg.role}`}>
                {msg.role === 'ai' && (
                  <div className="cw-msg-avatar">🤖</div>
                )}
                <div className="cw-msg-content">
                  <div className="cw-msg-bubble">
                    {msg.text}
                  </div>
                  {/* Replay audio button */}
                  {msg.role === 'ai' && msg.audioBase64 && (
                    <button
                      className="cw-replay-btn"
                      onClick={() => playAIAudio(msg.audioBase64)}
                      disabled={isPlaying}
                    >
                      <Volume2 size={12} />
                      {isPlaying ? 'Playing...' : 'Listen'}
                    </button>
                  )}

                  {/* Replay audio button for user voice messages */}
                  {msg.role === 'user' && msg.isVoice && msg.audioUrl && (
                    <button
                      className="cw-replay-btn"
                      onClick={() => {
                        const audio = new Audio(msg.audioUrl);
                        audio.play().catch(err => console.error('Error playing user voice audio:', err));
                      }}
                    >
                      <Volume2 size={12} />
                      Listen
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="cw-msg cw-msg--ai">
                <div className="cw-msg-avatar">🤖</div>
                <div className="cw-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {error && <p className="cw-error">{error}</p>}

          {/* Input area */}
          <div className="cw-input-area">

            {/* Recording state */}
            {isRecording && (
              <div className="cw-recording-bar">
                <span className="cw-rec-dot" />
                Recording... tap mic to send
              </div>
            )}

            <div className="cw-input-row">
              <input
                ref={inputRef}
                type="text"
                className="cw-input"
                placeholder="Ask Buddy anything..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                disabled={isLoading || isRecording}
              />

              {/* Voice button */}
              <button
                className={`cw-voice-btn ${isRecording ? 'cw-voice-btn--recording' : ''}`}
                onMouseDown={handleVoiceStart}
                onMouseUp={handleVoiceStop}
                onTouchStart={handleVoiceStart}
                onTouchEnd={handleVoiceStop}
                disabled={isLoading}
                title="Hold to speak"
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* Send button */}
              <button
                className="cw-send-btn"
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim() || isRecording}
              >
                <Send size={18} />
              </button>
            </div>

            <p className="cw-hint">
              {isRecording ? '🎤 Release mic to send' : '💡 Hold mic to speak • Press Enter to send'}
            </p>
          </div>

        </div>
      )}

      {/* Toggle button */}
      <button
        className={`cw-toggle-btn ${isOpen ? 'cw-toggle-btn--open' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
      >
        {isOpen ? (
          <X size={22} />
        ) : (
          <div className="cw-toggle-content">
            <span className="cw-toggle-icon">💬</span>
            <span className="cw-toggle-label">Tap to chat</span>
          </div>
        )}
      </button>

    </div>
  );
}