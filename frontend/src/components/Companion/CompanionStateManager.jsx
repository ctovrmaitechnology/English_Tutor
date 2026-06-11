import { useState, useEffect, useCallback, useRef } from 'react';
import CompanionEvents from './CompanionEvents';

// Mapped speech databases for standard events
const SPEECH_DB = {
  idle: [
    "I'm keeping an eye on your progress!",
    "Ready for your next speaking exercise?",
    "A clean workspace leads to clear pronunciation!",
    "Breathe in, breathe out. You've got this!"
  ],
  welcome: [
    "Hey there! Ready to improve your English today?",
    "Welcome back! Let's grow your confidence together.",
    "Good to see you again!"
  ],
  returning_user: [
    "Wow! It's been a while.",
    "I was waiting for you.",
    "Let's continue where we left off."
  ],
  clicked: [
    "Hiiiiiiii!",
    "Nice to see you!",
    "Need some motivation today?"
  ],
  challenge_opened: [
    "Hmm, let me think...",
    "Give me a moment...",
    "Processing your question!"
  ],
  challenge_started: [
    "I'm cheering for you!",
    "Keep going!"
  ],
  challenge_completed: [
    "Outstanding!",
    "You nailed it!",
    "That's how it's done!",
    "I'm proud of your progress!"
  ],
  assessment_submitted: [
    "Great work!",
    "Another step forward!"
  ],
  badge_unlocked: [
    "New achievement unlocked!",
    "Look at you go!"
  ],
  profile_opened: [
    "Take a look at your growth.",
    "You've come a long way."
  ],
  long_session: [
    "You're doing amazing.",
    "Keep the momentum going!"
  ],
  ai_talking: [
    "Let me explain that for you!",
    "Here's what I think...",
    "Listen carefully!"
  ],
  ai_thinking: [
    "Let me think about that...",
    "Processing your response...",
    "Hmm, give me a second!"
  ],
  ai_happy: [
    "Excellent work! You scored really well!",
    "Fantastic! Keep it up!",
    "You're on fire! 🔥"
  ],
};

const COOLDOWN_MS = 1500;
const BUBBLE_TIMEOUT_MS = 4000;
const AUTO_RESET_EXCLUSIONS = new Set(['idle', 'hover_wave', 'ai_talking', 'ai_thinking']);

// Context-aware smart English coach responses
function generateAIResponse(userText) {
  const text = userText.toLowerCase().trim();
  if (text.includes('hello') || text.includes('hi ') || text === 'hi' || text.includes('hey')) {
    return "Hello! It's wonderful to chat with you. How is your day going, and how can I help you practice your English?";
  }
  if (text.includes('grammar') || text.includes('rule') || text.includes('mistake')) {
    return "Great question! Grammar is all about patterns. A helpful tip is to focus on subject-verb agreement first. Do you want to practice writing a sentence together now?";
  }
  if (text.includes('pronounce') || text.includes('pronunciation') || text.includes('speak')) {
    return "To improve your pronunciation, try the shadowing technique: listen to native speakers and repeat immediately after them. Let's try it now—repeat after me: 'Practice makes perfect!'";
  }
  if (text.includes('vocabulary') || text.includes('word') || text.includes('learn')) {
    return "To expand your vocabulary, try learning words in context rather than lists. For example, instead of just memorizing 'lucid', use it in a sentence like 'She gave a lucid explanation.' What word should we study?";
  }
  if (text.includes('how are you') || text.includes('how\'s it going')) {
    return "I'm doing fantastic, thank you! I'm always energized and ready to help you practice and improve your English speaking and writing skills.";
  }
  if (text.includes('thank') || text.includes('thanks')) {
    return "You are very welcome! Helping you learn is the best part of my day. What would you like to focus on next?";
  }
  // Standard educational/coaching fallbacks
  const fallbacks = [
    "That is a great point! Expressing yourself clearly is key. Could you elaborate a bit more on that so we can practice?",
    "I love how you phrased that! To make it sound even more natural, you could say: 'I would like to practice more.' What do you think?",
    "Excellent sentence structure! Let's continue. Tell me about your favorite hobby, or ask me any questions about English grammar.",
    "Practice makes progress! Your English is coming along nicely. Let's keep chatting—ask me anything or tell me about your goals."
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

export function useCompanionState() {
  const [state, setState] = useState('idle');
  const [speech, setSpeech] = useState('');
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [subtitles, setSubtitles] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hey there! I am VRM Buddy, your personal learning partner. Let's practice English together! You can type a message or tap the mic to speak to me."
    }
  ]);

  const lastStateTimeRef = useRef(Date.now());
  const bubbleTimeoutRef = useRef(null);

  // Trigger state changes and speak corresponding messages (for dashboard mode)
  const triggerState = useCallback((newState, forceSpeech = null) => {
    const now = Date.now();
    if (now - lastStateTimeRef.current < COOLDOWN_MS && newState === 'idle') {
      return;
    }
    
    if (bubbleTimeoutRef.current) {
      clearTimeout(bubbleTimeoutRef.current);
    }

    setState(newState);
    lastStateTimeRef.current = now;

    const messagesList = SPEECH_DB[newState] || SPEECH_DB.idle;
    const pickedMessage = forceSpeech || messagesList[Math.floor(Math.random() * messagesList.length)];
    
    setSpeech(pickedMessage);
    setBubbleOpen(true);

    bubbleTimeoutRef.current = setTimeout(() => {
      setBubbleOpen(false);
    }, BUBBLE_TIMEOUT_MS);

    if (!AUTO_RESET_EXCLUSIONS.has(newState)) {
      setTimeout(() => {
        setState(prev => (prev === newState ? 'idle' : prev));
      }, 5000);
    }
  }, []);

  // Text-to-speech voice execution
  const speakResponse = useCallback((text) => {
    if (!window.speechSynthesis) return;

    // Cancel any active speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Pick a premium English voice if available
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en-US')) || 
                    voices.find(v => v.lang.startsWith('en')) || 
                    voices[0];
    if (enVoice) {
      utterance.voice = enVoice;
    }

    utterance.onstart = () => {
      setState('ai_talking');
      setSubtitles(text);
    };

    utterance.onend = () => {
      setState('idle');
      setSubtitles('');
    };

    utterance.onerror = () => {
      setState('idle');
      setSubtitles('');
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // Send message flow (called by text input or speech-to-text results)
  const sendChatMessage = useCallback((text) => {
    if (!text || !text.trim()) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim()
    };

    // Update message log immediately
    setMessages(prev => [...prev, userMsg]);
    setState('ai_thinking');

    // Simulate conversational coach delay
    setTimeout(() => {
      const aiReplyText = generateAIResponse(text);
      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiReplyText
      };

      setMessages(prev => [...prev, aiMsg]);
      speakResponse(aiReplyText);
    }, 1500);
  }, [speakResponse]);

  // Voice Recognition setup
  const startVoiceRecording = useCallback(() => {
    if (isRecording) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // SpeechRecognition Fallback simulation for unsupported environments
      setIsRecording(true);
      setTimeout(() => {
        const fallbacks = [
          "Hello! Let's practice some grammar today.",
          "How can I improve my English pronunciation?",
          "Can you recommend some new vocabulary words?",
          "Let's chat about my goals."
        ];
        const randomSpokenInput = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        sendChatMessage(randomSpokenInput);
        setIsRecording(false);
      }, 3000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        sendChatMessage(transcript);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Speech recognition error:", err);
      setIsRecording(false);
    }
  }, [isRecording, sendChatMessage]);

  // Hook up external dashboard triggers
  useEffect(() => {
    const unsubLogin = CompanionEvents.on('LOGIN_SUCCESS', () => {
      triggerState('welcome');
    });

    const unsubReturn = CompanionEvents.on('RETURNING_USER', () => {
      triggerState('returning_user');
    });

    const unsubClick = CompanionEvents.on('COMPANION_CLICKED', () => {
      // In dashboard mode, clicking opens interactive chat mode
      if (!isExpanded) {
        setIsExpanded(true);
      }
    });

    const unsubChallengeOpen = CompanionEvents.on('CHALLENGE_OPENED', () => {
      triggerState('ai_thinking');
    });

    const unsubChallengeStart = CompanionEvents.on('CHALLENGE_STARTED', () => {
      triggerState('ai_talking');
    });

    const unsubChallengeComplete = CompanionEvents.on('CHALLENGE_COMPLETED', () => {
      triggerState('ai_happy');
    });

    const unsubAssessmentSubmit = CompanionEvents.on('ASSESSMENT_SUBMITTED', () => {
      triggerState('ai_happy');
    });

    const unsubBadgeUnlock = CompanionEvents.on('BADGE_UNLOCKED', () => {
      triggerState('ai_happy');
    });

    const unsubProfileOpen = CompanionEvents.on('PROFILE_OPENED', () => {
      triggerState('profile_opened');
    });

    const unsubLongSession = CompanionEvents.on('LONG_SESSION_ENCOURAGE', () => {
      triggerState('long_session');
    });

    const unsubHover = CompanionEvents.on('COMPANION_HOVERED', () => {
      triggerState('hover_wave', 'Hiiiiiiii!');
    });

    const unsubUnhover = CompanionEvents.on('COMPANION_UNHOVERED', () => {
      setState(prev => (prev === 'hover_wave' ? 'idle' : prev));
      setBubbleOpen(false);
    });

    const unsubAISpeaking = CompanionEvents.on('AI_SPEAKING_START', () => {
      triggerState('ai_talking');
    });

    const unsubAIProcessing = CompanionEvents.on('AI_PROCESSING_START', () => {
      triggerState('ai_thinking');
    });

    const unsubAIEnd = CompanionEvents.on('AI_RESPONSE_END', () => {
      triggerState('idle');
    });

    const unsubHighScore = CompanionEvents.on('HIGH_SCORE_ACHIEVED', () => {
      triggerState('ai_happy');
    });

    const unsubWaveFinished = CompanionEvents.on('WAVE_FINISHED', () => {
      setState(prev => (prev === 'hover_wave' || prev === 'hello' ? 'idle' : prev));
    });

    return () => {
      unsubLogin();
      unsubReturn();
      unsubClick();
      unsubChallengeOpen();
      unsubChallengeStart();
      unsubChallengeComplete();
      unsubAssessmentSubmit();
      unsubBadgeUnlock();
      unsubProfileOpen();
      unsubLongSession();
      unsubHover();
      unsubUnhover();
      unsubAISpeaking();
      unsubAIProcessing();
      unsubAIEnd();
      unsubHighScore();
      unsubWaveFinished();
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    };
  }, [triggerState, isExpanded]);

  // Stop active speech or recording when collapsing chat mode
  useEffect(() => {
    if (!isExpanded) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setSubtitles('');
      setState('idle');
    }
  }, [isExpanded]);

  return {
    state,
    speech,
    bubbleOpen,
    triggerState,
    isExpanded,
    setIsExpanded,
    messages,
    isRecording,
    subtitles,
    sendChatMessage,
    startVoiceRecording
  };
}
