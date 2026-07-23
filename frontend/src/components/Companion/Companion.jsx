import { useState, useEffect, useRef, Fragment } from 'react';
import { Send, Mic, MicOff, X, Volume2 } from 'lucide-react';
import CompanionSpeechBubble from './CompanionSpeechBubble';
import CompanionAnimations from './CompanionAnimations';
import { useCompanionState } from './CompanionStateManager';
import CompanionEvents from './CompanionEvents';
import { chatService } from '../../services/chat.service';
import api from '../../services/api';
import { playBase64Audio, startRecording, blobToFormData } from '../../utils/audio';
import { useUser } from '../../context/UserContext';
import './CompanionStyles.css';

function formatMessageLine(line) {
  let cleanLine = line.trim();
  if (cleanLine.startsWith('* ') || cleanLine.startsWith('- ')) cleanLine = cleanLine.substring(2).trim();
  else if (cleanLine.startsWith('•')) cleanLine = cleanLine.substring(1).trim();

  const parts = [];
  const tokenRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0, match;
  while ((match = tokenRegex.exec(cleanLine)) !== null) {
    if (match.index > lastIndex) parts.push(cleanLine.substring(lastIndex, match.index));
    if (match[0].startsWith('**')) parts.push(<strong key={match.index}>{match[2]}</strong>);
    else parts.push(<em key={match.index}>{match[3]}</em>);
    lastIndex = tokenRegex.lastIndex;
  }
  if (lastIndex < cleanLine.length) parts.push(cleanLine.substring(lastIndex));
  return <div className="panda-chat-line">{parts.length > 0 ? parts : cleanLine}</div>;
}

function formatMessageBlock(text) {
  const paragraphs = text.split('\n').map(l => l.trim()).filter(Boolean);
  return paragraphs.map((p, idx) => <Fragment key={idx}>{formatMessageLine(p)}</Fragment>);
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Entry Test Locked State ────────────────────────────────────────────────────
function LockedCompanion({ character }) {
  return (
    <div className="panda-companion-container" style={{ pointerEvents: 'none', opacity: 0.9 }}>
      {/* Clean speech bubble */}
      <div style={{
        position: 'absolute',
        bottom: '85%',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'linear-gradient(135deg,#1e1b4b,#4f46e5)',
        color: '#e0e7ff',
        borderRadius: 14,
        padding: '10px 16px',
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 20px rgba(79,70,229,0.4)',
        border: '1px solid rgba(165,180,252,0.2)',
        lineHeight: 1.4,
        textAlign: 'center',
        zIndex: 10,
      }}>
        🎯 Complete Entry Test first!
        {/* Arrow */}
        <div style={{
          position: 'absolute',
          bottom: -7, left: '50%',
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '7px solid transparent',
          borderRight: '7px solid transparent',
          borderTop: '7px solid #4f46e5',
        }} />
      </div>
      <CompanionAnimations state="idle" character={character} />
    </div>
  );
}

export default function Companion() {
  const { character, remarkContext, currentUser } = useUser();
  const hasCompletedEntryTest = currentUser?.hasCompletedEntryTest ?? true;

  const userName = currentUser?.first_name ? currentUser.first_name.trim() : (currentUser?.name || currentUser?.username || 'there');
  const fullName = currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim() : (currentUser?.name || currentUser?.username || 'Learner');

  const {
    state, speech, bubbleOpen, isExpanded, setIsExpanded, subtitles,
  } = useCompanionState();

  const [inputText, setInputText] = useState('');
  const [chatMode, setChatMode] = useState('buddy'); // 'buddy' or 'tutor'
  const [currentTopicTitle, setCurrentTopicTitle] = useState('');
  const [messages, setMessages] = useState([{
    id: 'init', sender: 'ai',
    text: `Hey ${userName !== 'there' ? userName : 'there'}! I am VRM Buddy, your personal learning partner. Let's practice English together! You can type a message or tap the mic to speak to me.`,
    audioBase64: null,
  }]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');

  const historyEndRef = useRef(null);
  const recorderRef = useRef(null);
  const inputRef = useRef(null);
  const micStreamRef = useRef(null);

  // ── Show locked state if entry test not completed ─────────────────────────
  if (!hasCompletedEntryTest) {
    return <LockedCompanion character={character} />;
  }

  // Lesson tutor session trigger
  useEffect(() => {
    const handleTutorLogic = async (data, isPreload = false) => {
      const topic       = data?.topic || 'this lesson';
      const moduleTitle = data?.moduleTitle || 'the module';
      const greetingId  = 'lesson-init';
      const greetingText = `Hi ${userName}! Ready to practice ${topic}? You can either speak your response or type it here!`;

      setChatMode('tutor');
      setCurrentTopicTitle(topic);

      let initialMessages = [{
        id: greetingId, sender: 'ai',
        text: `Hi ${userName}! 👋 Ready to practice **"${topic}"**?\n\nYou can either speak your response or type it here. Let's get started! 🎤💬`,
        audioBase64: null,
      }];

      if (!isPreload) {
        setMessages(initialMessages);
      }

      let greetingAudioBase64 = null;
      try {
        const ttsRes = await api.post('/voice/synthesize', { text: greetingText, voice: 'af_sarah', speed: 1.1 }, { responseType: 'blob' });
        greetingAudioBase64 = await blobToBase64(ttsRes.data);
        initialMessages[0].audioBase64 = greetingAudioBase64;
        
        if (!isPreload) {
          setMessages(prev => prev.map(m => m.id === greetingId ? { ...m, audioBase64: greetingAudioBase64 } : m));
          if (greetingAudioBase64) { try { await playBase64Audio(greetingAudioBase64); } catch { } }
        }
      } catch { }

      try {
        if (!isPreload) await chatService.clearHistory?.('tutor');
      } catch { }
    };

    const unsubOpen = CompanionEvents.on('OPEN_TUTOR_SESSION', (data) => handleTutorLogic(data, false));
    const unsubPreload = CompanionEvents.on('PRELOAD_TUTOR_SESSION', (data) => handleTutorLogic(data, true));

    return () => {
      unsubOpen();
      unsubPreload();
    };
  }, [remarkContext]);

  useEffect(() => {
    if (isExpanded) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => { micStreamRef.current = stream; })
        .catch(() => { });
    } else {
      if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
    }
    return () => { if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop()); };
  }, [isExpanded]);

  useEffect(() => { if (isExpanded) historyEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isExpanded]);
  useEffect(() => { if (isExpanded) setTimeout(() => inputRef.current?.focus(), 300); }, [isExpanded]);

  const playAIAudio = async (audioBase64) => {
    if (!audioBase64) return;
    setIsPlaying(true);
    try { await playBase64Audio(audioBase64); } catch { }
    finally { setIsPlaying(false); }
  };

  const playVoiceAudio = (url) => { if (!url) return; new Audio(url).play().catch(() => { }); };

  // ── Send message — injects active lesson topic & remark context ────────────
  const handleSend = async (e) => {
    e?.preventDefault();
    const message = inputText.trim();
    if (!message || isLoading) return;

    setInputText('');
    setError('');
    setIsLoading(true);
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: message }]);

    try {
      const topicContext = (chatMode === 'tutor' && currentTopicTitle) ? `STRICT LESSON TOPIC: "${currentTopicTitle}". ` : '';
      const combinedContext = `${topicContext}${remarkContext || ''}`;

      const res = await chatService.sendMessage(message, combinedContext, chatMode);
      const data = res.data;
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: data.text, audioBase64: data.audioBase64 }]);
      if (data.audioBase64) await playAIAudio(data.audioBase64);
    } catch {
      setError('Could not reach AI. Please check your connection.');
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: 'Sorry, I could not connect. Please try again!', audioBase64: null }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleVoiceStart = async () => {
    if (isLoading || isRecording) return;
    try { setIsRecording(true); setError(''); recorderRef.current = await startRecording(micStreamRef.current); }
    catch { setError('Microphone access denied. Please allow mic access.'); setIsRecording(false); }
  };

  const handleVoiceStop = async () => {
    if (!recorderRef.current || !isRecording) return;
    setIsRecording(false);
    setIsLoading(true);
    try {
      const audioBlob = await recorderRef.current.stop();
      const audioUrl = URL.createObjectURL(audioBlob);
      setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: '🎤 Voice Message', isVoice: true, audioUrl }]);
      const res = await chatService.sendVoice(blobToFormData(audioBlob), chatMode);
      const data = res.data;
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: data.aiText, audioBase64: data.audioBase64 }]);
      if (data.audioBase64) await playAIAudio(data.audioBase64);
    } catch { setError('Voice message failed. Please try again.'); }
    finally { setIsLoading(false); }
  };

  const handleClear = async () => {
    try { await chatService.clearHistory(chatMode); } catch { }
    setMessages([{ id: 'init', sender: 'ai', text: "Chat cleared! Let's start fresh. How can I help you? 😊", audioBase64: null }]);
  };

  // Track AI tutor time — start timer when chat opens, save when closes
  useEffect(() => {
    if (!isExpanded) return;
    const start = Date.now();
    return () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const prev = parseInt(sessionStorage.getItem('vrm_ai_tutor_secs') || '0');
      const total = prev + elapsed;
      sessionStorage.setItem('vrm_ai_tutor_secs', String(total));
      // Update backend periodically
      api.post('/sessions/ai-tutor', { aiTutorDuration: total }).catch(() => { });
    };
  }, [isExpanded]);
  if (isExpanded) {
    return (
      <div className="panda-chat-overlay" role="dialog" aria-modal="true" aria-label="VRM Buddy chat">
        <button className="panda-close-btn" onClick={() => setIsExpanded(false)} title="Minimize VRM Buddy">
          <X size={24} />
        </button>

        <div className="panda-chat-avatar-pane">
          <div style={{ width: '100%', height: '85%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CompanionAnimations state={state} character={character} />
          </div>
          {subtitles && <div className="panda-chat-subtitles">{subtitles}</div>}
        </div>

        <div className="panda-chat-interface-pane">
          <div className="panda-chat-card">
            <div className="panda-chat-header">
              <div className="panda-chat-status-dot" />
              <h2 className="panda-chat-header-title">VRM Buddy Active Partner</h2>
              <span className="panda-chat-header-subtitle">
                {isLoading ? '⌨️ Thinking...' : isPlaying ? '🔊 Speaking...' : isRecording ? '🎤 Listening...' : 'English Speaking Coach'}
              </span>
            </div>

            <div className="panda-chat-history">
              {messages.map((msg) => (
                <div key={msg.id} className={`panda-chat-message-row panda-chat-message-row--${msg.sender}`}>
                  <div className={`panda-chat-bubble panda-chat-bubble--${msg.sender}`}>
                    {formatMessageBlock(msg.text.trim())}
                  </div>
                  {msg.sender === 'ai' && msg.audioBase64 && (
                    <button className="panda-replay-btn" onClick={() => playAIAudio(msg.audioBase64)} disabled={isPlaying}>
                      <Volume2 size={11} />{isPlaying ? 'Playing...' : 'Listen'}
                    </button>
                  )}
                  {msg.sender === 'ai' && !msg.audioBase64 && !isLoading && (
                    <span className="panda-audio-unavailable" style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'inline-block' }}>🔇 Voice unavailable</span>
                  )}
                  {msg.sender === 'user' && msg.isVoice && msg.audioUrl && (
                    <button className="panda-replay-btn" onClick={() => playVoiceAudio(msg.audioUrl)} style={{ marginTop: 4 }}>
                      <Volume2 size={11} />Listen
                    </button>
                  )}
                </div>
              ))}
              {isLoading && <div className="panda-chat-bubble panda-chat-bubble--ai"><div className="panda-typing"><span /><span /><span /></div></div>}
              {isRecording && <div className="panda-recording-indicator"><span className="panda-rec-dot" />Recording — release mic to send</div>}
              {error && <p className="panda-error">{error}</p>}
              <div ref={historyEndRef} />
            </div>

            <form onSubmit={handleSend} className="panda-chat-input-container">
              <div className="panda-chat-input-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  className="panda-chat-input"
                  placeholder={isRecording ? 'Listening…' : isLoading ? 'Buddy is thinking…' : 'Type your message in English…'}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isRecording || isLoading}
                />
                <button type="button" className={`panda-mic-btn ${isRecording ? 'panda-mic-btn--recording' : ''}`}
                  onMouseDown={handleVoiceStart} onMouseUp={handleVoiceStop}
                  onTouchStart={handleVoiceStart} onTouchEnd={handleVoiceStop}
                  title="Hold to speak" disabled={isLoading}
                >
                  {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              </div>
              <button type="submit" className="panda-send-btn" disabled={!inputText.trim() || isRecording || isLoading}>
                <Send size={18} />
              </button>
            </form>

            <p className="panda-input-hint">
              {isRecording ? '🎤 Release mic to send' : '💡 Hold mic to speak • Press Enter to send'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Minimized companion ───────────────────────────────────────────────────
  return (
    <div className="panda-companion-container" role="complementary">
      <CompanionSpeechBubble text={speech} isOpen={bubbleOpen} />
      <div
        onClick={() => setIsExpanded(true)}
        onMouseEnter={() => CompanionEvents.emit('COMPANION_HOVERED')}
        onMouseLeave={() => CompanionEvents.emit('COMPANION_UNHOVERED')}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        title="Click to open VRM Buddy chat"
      >
        <CompanionAnimations state={state} character={character} />
        <div className="panda-chat-hint"><span>💬 Tap to chat</span></div>
      </div>
    </div>
  );
}