import { useState, useEffect, useRef } from 'react';
import { Lock, CheckCircle, PlayCircle, ArrowLeft, Mic, PenTool, Award, HelpCircle, Loader2, Volume2, RefreshCw, Check, X, Sparkles, Square, AlertCircle, Printer } from 'lucide-react';
import api from '../services/api';
import './Modules.css';

const SPEAKING_PROMPTS = {
  'sp-1-1': {
    prompt: "Vowel Sounds Practice",
    text: "Read the following vowel sounds aloud clearly:\n• /i:/ as in 'see'\n• /ɪ/ as in 'sit'\n• /æ/ as in 'cat'\n• /u:/ as in 'too'",
    tip: "Focus on the difference between the long /i:/ sound and the short /ɪ/ sound."
  },
  'sp-1-2': {
    prompt: "Consonant Sounds Practice",
    text: "Read the following sentence aloud focusing on clear consonants:\n'The quick brown fox jumps over the lazy dog.'",
    tip: "Make sure you articulate the 'th', 'v', and 'z' sounds clearly."
  },
  'sp-1-3': {
    prompt: "Word Stress Practice",
    text: "Read the noun and verb stress difference aloud:\n• 'RE-cord' (noun) vs. 're-CORD' (verb)\n• 'PRE-sent' (noun) vs. 'pre-SENT' (verb)",
    tip: "Stress the first syllable for nouns, and the second syllable for verbs."
  },
  'sp-1-4': {
    prompt: "Sentence Intonation Practice",
    text: "Read the following sentences with correct intonation:\n1. 'Are you joining us today?' (Rising intonation)\n2. 'Where is the customer billing info?' (Falling intonation)",
    tip: "Questions starting with helping verbs rise at the end; WH-questions fall."
  },
  'sp-2-1': {
    prompt: "Call Opening Practice",
    text: "Read this professional BPO call opening greeting:\n'Thank you for calling RuralShores Customer Support. My name is Alex. How may I help you today?'",
    tip: "Sound energetic, polite, and clear during the first 10 seconds."
  },
  'sp-2-2': {
    prompt: "Active Listening Practice",
    text: "Say this active listening confirmation response:\n'I understand that you have not received your invoice yet, Mr. Smith. Let me search that for you in our system right now.'",
    tip: "Acknowledge the customer's specific problem to show you are listening."
  },
  'sp-2-3': {
    prompt: "Objection Handling Practice",
    text: "Read the following objection response:\n'I completely agree that the service fee is higher than expected. However, this includes our 24/7 premium technical support.'",
    tip: "Use the 'Feel-Felt-Found' technique to validate and pivot."
  },
  'sp-2-4': {
    prompt: "Call Closing Practice",
    text: "Read this polite call closure statement:\n'It was a pleasure assisting you today. Thank you for choosing RuralShores. Have a wonderful day ahead!'",
    tip: "Ensure you ask if they need anything else before saying goodbye."
  },
  'default': {
    prompt: "Speaking Exercise",
    text: "Please read this sentence aloud:\n'Our main goal is to deliver high-quality, professional customer support at all times.'",
    tip: "Keep a steady pace and speak with confidence."
  }
};

const WRITING_QUIZZES = {
  'wr-1-1': {
    question: "Complete the sentence with the correct tense: 'By the time the manager arrived, the team ___ the customer issue.'",
    options: [
      "has already solved",
      "had already solved",
      "already solved",
      "will solve"
    ],
    correctIdx: 1,
    explanation: "We use the past perfect ('had already solved') for an action completed before another past action ('arrived')."
  },
  'wr-1-2': {
    question: "Identify the grammatically correct written sentence structure:",
    options: [
      "The client requested a refund, because she was unhappy with the product.",
      "The client requested a refund because she was unhappy with the product.",
      "Because she was unhappy with the product, so the client requested a refund.",
      "The client requested a refund, she was unhappy with the product."
    ],
    correctIdx: 1,
    explanation: "No comma is needed before 'because' when the dependent clause follows the main clause."
  },
  'wr-1-3': {
    question: "Which punctuation mark is correct to separate two independent clauses without a conjunction?",
    options: [
      "Comma",
      "Semicolon",
      "Colon",
      "Hyphen"
    ],
    correctIdx: 1,
    explanation: "A semicolon is used to link two independent clauses that are closely related in thought."
  },
  'wr-1-4': {
    question: "Find the common grammar error in this email draft sentence: 'Neither of the agents have completed the report.'",
    options: [
      "No error",
      "Use 'has' instead of 'have'",
      "Use 'agent' instead of 'agents'",
      "Use 'completed' instead of 'complete'"
    ],
    correctIdx: 1,
    explanation: "'Neither' is a singular pronoun and takes the singular verb 'has'."
  },
  'wr-2-1': {
    question: "Which is the most professional email subject line for an invoice update?",
    options: [
      "Urgent bill!",
      "Invoice #4562 Correction Request",
      "please read this quickly",
      "regarding your account details"
    ],
    correctIdx: 1,
    explanation: "A professional subject line should be specific, clear, and include relevant identifiers like Invoice #."
  },
  'wr-2-2': {
    question: "Which is a professional written greeting when emailing a client for the first time?",
    options: [
      "Hey Mr. Jones,",
      "Dear Mr. Jones,",
      "Hello Friend,",
      "To whom it may concern (too impersonal)"
    ],
    correctIdx: 1,
    explanation: "'Dear Mr. Jones,' is the standard professional written salutation for business correspondence."
  },
  'default': {
    question: "Choose the correct spelling:",
    options: [
      "Receiving",
      "Recieving",
      "Receving",
      "Riceiving"
    ],
    correctIdx: 0,
    explanation: "'Receive' follows the rule 'i before e except after c'."
  }
};

// ── Categories ────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'speaking',
    emoji: '🎙️',
    label: 'Speaking',
    color: '#6366f1',
    bg: '#ede9fe',
    tag: 'Speaking',
    desc: 'Master spoken English — pronunciation, fluency and professional BPO communication',
    subText: 'Pronunciation • BPO Calls • Fluency • Advanced Communication',
  },
  {
    id: 'writing',
    emoji: '✍️',
    label: 'Writing',
    color: '#3b82f6',
    bg: '#eff6ff',
    tag: 'Writing',
    desc: 'Master written English — grammar, professional emails and business writing',
    subText: 'Grammar • Professional Emails • Complaints • Business Writing',
  },
];

// ── Speaking Modules ──────────────────────────────────────────
const SPEAKING_MODULES = [
  {
    id: 'sp-1', number: 1,
    title: 'Pronunciation Basics',
    description: 'Master the fundamental sounds of English — vowels, consonants and word stress.',
    emoji: '🔤', color: '#6366f1', bg: '#ede9fe',
    duration: '2 hours', tag: 'Beginner',
    subText: 'Vowel Sounds • Consonant Sounds • Word Stress • Intonation',
    subModules: [
      { id: 'sp-1-1', title: 'Vowel Sounds',        duration: '25 min', icon: '🅰️' },
      { id: 'sp-1-2', title: 'Consonant Sounds',    duration: '25 min', icon: '🔡' },
      { id: 'sp-1-3', title: 'Word Stress',          duration: '30 min', icon: '📢' },
      { id: 'sp-1-4', title: 'Sentence Intonation',  duration: '40 min', icon: '〰️' },
    ],
  },
  {
    id: 'sp-2', number: 2,
    title: 'BPO Call Speaking',
    description: 'Professional telephone English — how to open, handle and close customer calls.',
    emoji: '📞', color: '#10b981', bg: '#d1fae5',
    duration: '2.5 hours', tag: 'Intermediate',
    subText: 'Call Opening • Active Listening • Handling Objections • Call Closing',
    subModules: [
      { id: 'sp-2-1', title: 'Call Opening Phrases',   duration: '30 min', icon: '👋' },
      { id: 'sp-2-2', title: 'Active Listening',        duration: '35 min', icon: '👂' },
      { id: 'sp-2-3', title: 'Handling Objections',     duration: '40 min', icon: '🤝' },
      { id: 'sp-2-4', title: 'Call Closing Techniques', duration: '35 min', icon: '✅' },
    ],
  },
  {
    id: 'sp-3', number: 3,
    title: 'Fluency & Confidence',
    description: 'Speak naturally and confidently without filler words or hesitation.',
    emoji: '🎙️', color: '#f59e0b', bg: '#fef3c7',
    duration: '3 hours', tag: 'Intermediate',
    subText: 'Natural Rhythm • No Filler Words • Speed & Clarity • Accent Tips',
    subModules: [
      { id: 'sp-3-1', title: 'Natural Speech Rhythm',    duration: '40 min', icon: '🎵' },
      { id: 'sp-3-2', title: 'Eliminating Filler Words', duration: '45 min', icon: '🚫' },
      { id: 'sp-3-3', title: 'Speed & Clarity',          duration: '45 min', icon: '⚡' },
      { id: 'sp-3-4', title: 'Accent Neutralization',    duration: '50 min', icon: '🌍' },
    ],
  },
  {
    id: 'sp-4', number: 4,
    title: 'Advanced Communication',
    description: 'Persuasion, negotiation and handling escalations like a professional.',
    emoji: '🏆', color: '#ec4899', bg: '#fdf2f8',
    duration: '3 hours', tag: 'Advanced',
    subText: 'Persuasion • Negotiation • Escalation Handling • Empathy',
    subModules: [
      { id: 'sp-4-1', title: 'Persuasive Language',         duration: '45 min', icon: '💡' },
      { id: 'sp-4-2', title: 'Negotiation Phrases',         duration: '45 min', icon: '🤜' },
      { id: 'sp-4-3', title: 'Escalation Handling',         duration: '45 min', icon: '🔥' },
      { id: 'sp-4-4', title: 'Empathy in Customer Service', duration: '45 min', icon: '💙' },
    ],
  },
];

// ── Writing Modules ───────────────────────────────────────────
const WRITING_MODULES = [
  {
    id: 'wr-1', number: 1,
    title: 'Grammar Foundations',
    description: 'Build a strong base with tenses, sentence structure and punctuation.',
    emoji: '📝', color: '#3b82f6', bg: '#eff6ff',
    duration: '2 hours', tag: 'Beginner',
    subText: 'Tenses • Sentence Structure • Punctuation • Common Errors',
    subModules: [
      { id: 'wr-1-1', title: 'Tenses & Their Usage',  duration: '35 min', icon: '⏰' },
      { id: 'wr-1-2', title: 'Sentence Structure',    duration: '30 min', icon: '🧱' },
      { id: 'wr-1-3', title: 'Punctuation Rules',     duration: '25 min', icon: '❗' },
      { id: 'wr-1-4', title: 'Common Grammar Errors', duration: '30 min', icon: '⚠️' },
    ],
  },
  {
    id: 'wr-2', number: 2,
    title: 'Professional Emails',
    description: 'Write clear, polite and effective customer service emails.',
    emoji: '✉️', color: '#8b5cf6', bg: '#f5f3ff',
    duration: '2.5 hours', tag: 'Intermediate',
    subText: 'Subject Lines • Greetings • Email Body • Sign-off',
    subModules: [
      { id: 'wr-2-1', title: 'Email Subject Lines',    duration: '25 min', icon: '📌' },
      { id: 'wr-2-2', title: 'Professional Greetings', duration: '30 min', icon: '🙏' },
      { id: 'wr-2-3', title: 'Email Body Writing',     duration: '40 min', icon: '📄' },
      { id: 'wr-2-4', title: 'Closing & Sign-off',     duration: '25 min', icon: '✍️' },
    ],
  },
  {
    id: 'wr-3', number: 3,
    title: 'Handling Complaints',
    description: 'Write professional responses to angry customers and difficult situations.',
    emoji: '🛡️', color: '#ef4444', bg: '#fef2f2',
    duration: '2.5 hours', tag: 'Intermediate',
    subText: 'Acknowledging • Offering Solutions • Refund Writing • Follow-ups',
    subModules: [
      { id: 'wr-3-1', title: 'Acknowledging Complaints', duration: '35 min', icon: '👂' },
      { id: 'wr-3-2', title: 'Offering Solutions',       duration: '35 min', icon: '💡' },
      { id: 'wr-3-3', title: 'Refund & Compensation',    duration: '30 min', icon: '💰' },
      { id: 'wr-3-4', title: 'Follow-up Messages',       duration: '40 min', icon: '📬' },
    ],
  },
  {
    id: 'wr-4', number: 4,
    title: 'Advanced Business Writing',
    description: 'Reports, escalations and formal correspondence at a professional level.',
    emoji: '💼', color: '#14b8a6', bg: '#f0fdfa',
    duration: '3 hours', tag: 'Advanced',
    subText: 'Escalation Emails • Reports • Chat Support • Internal Comms',
    subModules: [
      { id: 'wr-4-1', title: 'Escalation Emails',      duration: '45 min', icon: '🔺' },
      { id: 'wr-4-2', title: 'Incident Reports',       duration: '45 min', icon: '📋' },
      { id: 'wr-4-3', title: 'Chat Support Writing',   duration: '40 min', icon: '💬' },
      { id: 'wr-4-4', title: 'Internal Communication', duration: '50 min', icon: '🏢' },
    ],
  },
];

const MODULES_MAP = { speaking: SPEAKING_MODULES, writing: WRITING_MODULES };

// ── Sub-module lesson view ────────────────────────────────────
function SubModuleView({ sub, module, category, onBack, onComplete, onUncomplete, isCompleted }) {
  const [loading, setLoading] = useState(true);
  const [lessonData, setLessonData] = useState(null);

  const [recordingState, setRecordingState] = useState('idle'); // idle, recording, analyzing, completed
  const [seconds, setSeconds] = useState(0);
  const [speakingResult, setSpeakingResult] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // TTS State variables
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const ttsAudioRef = useRef(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Clear any playing TTS audio when sub.id changes or on unmount
  useEffect(() => {
    return () => {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [sub.id]);

  const fallbackSpeak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.onstart = () => {
        setTtsPlaying(true);
      };
      utterance.onend = () => {
        setTtsPlaying(false);
      };
      utterance.onerror = () => {
        setTtsPlaying(false);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  const playPromptTTS = async () => {
    // If already playing, stop it
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
      setTtsPlaying(false);
      return;
    }
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setTtsPlaying(false);
      return;
    }

    setTtsLoading(true);
    try {
      const promptText = (speakingPrompt?.text || '')
        .replace(/[•\d\.\-]/g, '')
        .trim();

      const response = await api.post('/voice/synthesize', {
        text: promptText,
        voice: 'af_heart', // warm friendly American voice
        speed: 1.1
      }, {
        responseType: 'blob'
      });

      const audioUrl = URL.createObjectURL(response.data);
      const audio = new Audio(audioUrl);
      ttsAudioRef.current = audio;

      audio.onplay = () => {
        setTtsLoading(false);
        setTtsPlaying(true);
      };

      audio.onended = () => {
        setTtsPlaying(false);
        ttsAudioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setTtsLoading(false);
        setTtsPlaying(false);
        ttsAudioRef.current = null;
        URL.revokeObjectURL(audioUrl);
        fallbackSpeak(promptText);
      };

      await audio.play();
    } catch (err) {
      console.error('Failed to play TTS from backend:', err);
      setTtsLoading(false);
      setTtsPlaying(false);
      const fallbackText = (speakingPrompt?.text || '')
        .replace(/[•\d\.\-]/g, '')
        .trim();
      fallbackSpeak(fallbackText);
    }
  };

  // Fetch lesson data from DB on mount/update
  useEffect(() => {
    let active = true;
    const loadLessonQuestion = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/assessment/lesson-question/${sub.id}`);
        if (active) {
          if (res.data) {
            setLessonData(res.data);
          } else {
            setLessonData(null);
          }
        }
      } catch (err) {
        console.error("Failed to load lesson question from DB, using fallback", err);
        if (active) setLessonData(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadLessonQuestion();
    return () => { active = false; };
  }, [sub.id]);

  // Timer effect for speaking recording
  useEffect(() => {
    if (recordingState === 'recording') {
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= 9) {
            stopRecording();
            return 10;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [recordingState]);

  const startRecording = async () => {
    // Stop any playing TTS audio before starting recording
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
      setTtsPlaying(false);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setTtsPlaying(false);
    }

    setRecordingState('recording');
    setSpeakingResult(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await sendToWhisper(audioBlob);
      };

      mediaRecorder.start();
    } catch (err) {
      console.error('Failed to start recording:', err);
      fallbackStartRecording();
    }
  };

  const fallbackStartRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      let fullTranscript = '';
      rec.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            fullTranscript += event.results[i][0].transcript + ' ';
          }
        }
      };

      rec.onend = () => {
        evaluateSpeech(fullTranscript);
      };

      recognitionRef.current = rec;
      rec.start();
    } else {
      console.warn('Speech recognition not supported in this browser.');
      recognitionRef.current = null;
    }
  };

  const stopRecording = () => {
    setRecordingState('analyzing');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    } else {
      evaluateSpeech('');
    }
  };

  const sendToWhisper = async (audioBlob) => {
    setRecordingState('analyzing');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const response = await fetch('http://localhost:5001/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Whisper server error');
      }

      const data = await response.json();
      const transcript = data.transcript || '';
      console.log('Whisper transcription:', transcript);
      evaluateSpeech(transcript);
    } catch (err) {
      console.error('Whisper STT failed, falling back to local SpeechRecognition logic', err);
      evaluateSpeech('');
    }
  };

  const evaluateSpeech = (transcript) => {
    setRecordingState('analyzing');

    setTimeout(() => {
      const cleanText = (text) => {
        return text
          .toLowerCase()
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?•]/g, "")
          .replace(/\s+/g, " ")
          .trim();
      };

      const targetText = (speakingPrompt?.text || '')
        .replace(/[•\d\.\-]/g, '');

      const target = cleanText(targetText);
      const spoken = cleanText(transcript);

      if (!spoken) {
        // Silent or no speech detected
        setSpeakingResult({
          score: 0,
          feedback: "No voice detected. Please speak clearly into your microphone.",
          fluency: 0,
          pronunciation: 0
        });
        setRecordingState('completed');
        return;
      }

      const targetWords = target.split(' ').filter(w => w.length > 0);
      const spokenWords = spoken.split(' ').filter(w => w.length > 0);

      let matches = 0;
      targetWords.forEach(word => {
        if (spokenWords.includes(word)) {
          matches++;
        }
      });

      let score = Math.round((matches / targetWords.length) * 100);
      if (score > 0) {
        score = Math.min(100, Math.max(15, score));
      } else {
        score = 0;
      }

      let feedback = "";
      if (score >= 85) {
        feedback = "Excellent pronunciation and natural rhythm. Well done!";
      } else if (score >= 70) {
        feedback = "Good attempt! Keep practicing to improve syllable stress and sentence intonation.";
      } else {
        feedback = "We had trouble matching your voice. Speak clearly and follow the pronunciation tips.";
      }

      setSpeakingResult({
        score,
        feedback,
        fluency: score,
        pronunciation: score
      });
      setRecordingState('completed');
    }, 1500);
  };

  const handleRetrySpeaking = () => {
    setRecordingState('idle');
    setSpeakingResult(null);
    setSeconds(0);
  };

  // Setup options/fallbacks
  const fallbackSpeaking = SPEAKING_PROMPTS[sub.id] || SPEAKING_PROMPTS['default'];
  const fallbackWriting = WRITING_QUIZZES[sub.id] || WRITING_QUIZZES['default'];

  const speakingPrompt = lessonData && category === 'speaking' ? {
    prompt: lessonData.prompt,
    text: lessonData.questionText,
    tip: lessonData.explanation
  } : fallbackSpeaking;

  const quiz = lessonData && category === 'writing' ? {
    question: lessonData.questionText,
    options: lessonData.options || [],
    correctIdx: lessonData.correctOptionIndex,
    explanation: lessonData.explanation
  } : fallbackWriting;

  const handleSelectOption = (idx) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
  };

  const handleRetryWriting = () => {
    setSelectedOption(null);
  };

  if (loading) {
    return (
      <div className="modules-page">
        <button className="modules-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back to {module.title}
        </button>
        <div className="modules-submodule-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <Loader2 className="animate-spin" size={40} style={{ color: module.color }} />
          <span style={{ marginLeft: '12px', fontWeight: 600, color: '#475569' }}>Loading lesson content...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="modules-page">
      <button className="modules-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to {module.title}
      </button>

      <div className="modules-submodule-card">
        <div className="modules-submodule-header"
          style={{ background: `linear-gradient(135deg, ${module.color}, ${module.color}bb)` }}>
          <span className="modules-submodule-emoji">{sub.icon}</span>
          <div>
            <p className="modules-submodule-module-name">Module {module.number} • {category === 'speaking' ? 'Speaking Lesson' : 'Writing Lesson'}</p>
            <h2 className="modules-submodule-title">{sub.title}</h2>
          </div>
        </div>

        <div className="modules-submodule-body">
          {category === 'speaking' ? (
            <div className="speaking-lesson-container">
              <div className="prompt-card" style={{ '--theme-color': module.color }}>
                <div className="prompt-card-header">
                  <button
                    type="button"
                    onClick={playPromptTTS}
                    disabled={ttsLoading}
                    className={`prompt-tts-btn ${ttsPlaying ? 'prompt-tts-btn--playing' : ''} ${ttsLoading ? 'prompt-tts-btn--loading' : ''}`}
                    title="Listen to correct pronunciation"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      marginRight: '8px',
                      cursor: ttsLoading ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: ttsPlaying ? module.color : '#64748b',
                      transition: 'color 0.2s, transform 0.1s',
                      verticalAlign: 'middle'
                    }}
                    onMouseDown={(e) => {
                      if (!ttsLoading) e.currentTarget.style.transform = 'scale(0.9)';
                    }}
                    onMouseUp={(e) => {
                      if (!ttsLoading) e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {ttsLoading ? (
                      <Loader2 className="animate-spin prompt-card-icon" size={20} style={{ margin: 0 }} />
                    ) : (
                      <Volume2 
                        size={20} 
                        className={`prompt-card-icon ${ttsPlaying ? 'animate-pulse' : ''}`} 
                        style={{ color: ttsPlaying ? module.color : 'inherit', margin: 0 }}
                      />
                    )}
                  </button>
                  <h4 style={{ display: 'inline-block', verticalAlign: 'middle', margin: 0 }}>{speakingPrompt.prompt}</h4>
                </div>
                <div className="prompt-card-text" style={{ borderLeftColor: module.color }}>
                  {speakingPrompt.text.split('\n').map((line, idx) => (
                    <p key={idx} style={{ margin: '4px 0' }}>{line}</p>
                  ))}
                </div>
                <div className="prompt-card-tip">
                  <strong>💡 Tip:</strong> {speakingPrompt.tip}
                </div>
              </div>

              {recordingState === 'idle' && (
                <div className="speaking-action-zone">
                  <p className="speaking-action-hint">Click the microphone to start reading the prompt above.</p>
                  <button className="record-btn" onClick={startRecording} style={{ '--theme-color': module.color }}>
                    <Mic size={32} />
                  </button>
                  {isCompleted && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
                      <div className="modules-already-done" style={{ margin: 0 }}>
                        ✅ Lesson Completed! You can practice again to improve.
                      </div>
                      <button 
                        type="button"
                        onClick={onUncomplete}
                        className="relearn-submodule-btn"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#fff',
                          color: '#dc2626',
                          border: '1.5px solid #fca5a5',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.background = '#fef2f2';
                          e.currentTarget.style.borderColor = '#ef4444';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = '#fff';
                          e.currentTarget.style.borderColor = '#fca5a5';
                        }}
                      >
                        <RefreshCw size={14} /> Re-learn Submodule (Mark as Unread)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {recordingState === 'recording' && (
                <div className="speaking-action-zone">
                  <p className="speaking-action-hint recording-text">Recording... Speak clearly now.</p>
                  
                  {/* Waveform animation */}
                  <div className="wave-animation">
                    <span className="wave-bar bar-1" style={{ backgroundColor: module.color }}></span>
                    <span className="wave-bar bar-2" style={{ backgroundColor: module.color }}></span>
                    <span className="wave-bar bar-3" style={{ backgroundColor: module.color }}></span>
                    <span className="wave-bar bar-4" style={{ backgroundColor: module.color }}></span>
                    <span className="wave-bar bar-5" style={{ backgroundColor: module.color }}></span>
                  </div>

                  <p className="recording-timer">0:{seconds < 10 ? `0${seconds}` : seconds} / 0:10</p>
                  
                  <button className="record-btn record-btn--recording" onClick={stopRecording}>
                    <Square size={24} fill="#fff" />
                  </button>
                </div>
              )}

              {recordingState === 'analyzing' && (
                <div className="speaking-action-zone">
                  <Loader2 className="animate-spin analysis-loader" size={48} style={{ color: module.color }} />
                  <p className="analyzing-text">AI is analyzing your pronunciation & fluency...</p>
                </div>
              )}

              {recordingState === 'completed' && speakingResult && (
                <div className="speaking-results-zone">
                  <div className="score-header-box">
                    <div className="score-circle" style={{ borderColor: module.color }}>
                      <span className="score-num">{speakingResult.score}%</span>
                      <span className="score-lbl">AI Score</span>
                    </div>
                    <div className="score-metrics">
                      <div className="metric-row">
                        <span>Fluency:</span>
                        <div className="metric-bar-track">
                          <div className="metric-bar-fill" style={{ width: `${speakingResult.fluency}%`, background: module.color }}></div>
                        </div>
                        <span className="metric-val">{speakingResult.fluency}%</span>
                      </div>
                      <div className="metric-row">
                        <span>Pronunciation:</span>
                        <div className="metric-bar-track">
                          <div className="metric-bar-fill" style={{ width: `${speakingResult.pronunciation}%`, background: module.color }}></div>
                        </div>
                        <span className="metric-val">{speakingResult.pronunciation}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="feedback-card">
                    <Sparkles size={20} className="feedback-icon" style={{ color: module.color }} />
                    <div className="feedback-text">
                      <h5>AI Pronunciation Feedback</h5>
                      <p>{speakingResult.feedback}</p>
                    </div>
                  </div>

                  <div className="result-buttons">
                    <button className="retry-btn" onClick={handleRetrySpeaking}>
                      <RefreshCw size={16} /> Try Again
                    </button>
                    <button className="modules-complete-btn" style={{ background: module.color }} onClick={onComplete}>
                      <Check size={18} /> Complete Lesson
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="writing-lesson-container">
              <div className="writing-question-card">
                <div className="question-header">
                  <PenTool size={20} className="question-icon" style={{ color: module.color }} />
                  <h4>Practice Quiz</h4>
                </div>
                <p className="question-text">{quiz.question}</p>
              </div>

              <div className="option-cards" style={{ '--theme-color': module.color }}>
                {quiz.options.map((opt, idx) => {
                  let cardClass = "option-card";
                  let iconElement = null;

                  if (selectedOption !== null) {
                    if (idx === selectedOption) {
                      if (idx === quiz.correctIdx) {
                        cardClass += " option-card--correct";
                        iconElement = <Check size={18} className="option-icon-status" />;
                      } else {
                        cardClass += " option-card--incorrect";
                        iconElement = <X size={18} className="option-icon-status" />;
                      }
                    } else if (idx === quiz.correctIdx) {
                      cardClass += " option-card--should-be";
                      iconElement = <Check size={18} className="option-icon-status" />;
                    } else {
                      cardClass += " option-card--disabled";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      className={cardClass}
                      onClick={() => handleSelectOption(idx)}
                      disabled={selectedOption !== null}
                      style={{ '--theme-color': module.color }}
                    >
                      <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                      <span className="option-text">{opt}</span>
                      {iconElement}
                    </button>
                  );
                })}
              </div>

              {selectedOption !== null && (
                <div className="explanation-box animate-fade-in">
                  <div className="explanation-header">
                    <AlertCircle size={18} className="explanation-icon" />
                    <h5>Explanation</h5>
                  </div>
                  <p className="explanation-text">{quiz.explanation}</p>
                  
                  <div className="result-buttons" style={{ marginTop: '20px' }}>
                    {selectedOption !== quiz.correctIdx ? (
                      <button className="retry-btn" onClick={handleRetryWriting}>
                        <RefreshCw size={16} /> Try Again
                      </button>
                    ) : (
                      <button className="modules-complete-btn" style={{ background: module.color }} onClick={onComplete}>
                        <Check size={18} /> Complete Lesson
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selectedOption === null && isCompleted && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '24px', width: '100%' }}>
                  <div className="modules-already-done" style={{ margin: 0, textAlign: 'center' }}>
                    ✅ Lesson Completed! Feel free to practice the quiz again.
                  </div>
                  <button 
                    type="button"
                    onClick={onUncomplete}
                    className="relearn-submodule-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#fff',
                      color: '#dc2626',
                      border: '1.5px solid #fca5a5',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = '#fef2f2';
                      e.currentTarget.style.borderColor = '#ef4444';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = '#fca5a5';
                    }}
                  >
                    <RefreshCw size={14} /> Re-learn Submodule (Mark as Unread)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Module detail (sub-modules list) ─────────────────────────
function ModuleDetail({ module, completedSubs, onSubClick, onBack, categoryColor, onNavigate, assessmentStatus }) {
  const [showCert, setShowCert] = useState(false);

  const progress = Math.round(
    (module.subModules.filter(s => completedSubs.includes(s.id)).length / module.subModules.length) * 100
  );

  const categoryId = categoryColor ? (module.id.startsWith('sp') ? 'speaking' : 'writing') : 'speaking';
  const hasCertificate = categoryId === 'speaking'
    ? !!assessmentStatus?.speakingCertificate
    : !!assessmentStatus?.writingCertificate;
  const tagKey = module.tag?.toUpperCase(); // 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'

  let isAssessmentPassed = false;
  if (assessmentStatus) {
    if (categoryId === 'speaking') {
      if (tagKey === 'BEGINNER') isAssessmentPassed = !!assessmentStatus.passedSpeakingBeginner;
      else if (tagKey === 'INTERMEDIATE') isAssessmentPassed = !!assessmentStatus.passedSpeakingIntermediate;
      else if (tagKey === 'ADVANCED') isAssessmentPassed = !!assessmentStatus.passedSpeakingAdvanced;
    } else {
      if (tagKey === 'BEGINNER') isAssessmentPassed = !!assessmentStatus.passedWritingBeginner;
      else if (tagKey === 'INTERMEDIATE') isAssessmentPassed = !!assessmentStatus.passedWritingIntermediate;
      else if (tagKey === 'ADVANCED') isAssessmentPassed = !!assessmentStatus.passedWritingAdvanced;
    }
  }

  const handleRetake = () => {
    const confirmText = `Are you sure you want to retake the ${categoryId} assessment? This will reset your current level test progress, but your earned certificate will remain saved.`;
    if (window.confirm(confirmText)) {
      api.post(`/assessment/retake/${categoryId}`)
        .then(() => {
          alert(`Assessment reset successfully! Redirecting to the Assessment Center.`);
          onNavigate('assessment');
        })
        .catch(err => {
          console.error('Failed to reset:', err);
          alert('Could not reset assessment. Please try again.');
        });
    }
  };

  return (
    <div className="modules-page">
      <button className="modules-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to Modules
      </button>

      <div className="module-detail-header"
        style={{ background: `linear-gradient(135deg, ${module.color}, ${module.color}bb)` }}>
        <span className="module-detail-emoji">{module.emoji}</span>
        <div style={{ flex: 1 }}>
          <p className="module-detail-tag">Module {module.number} • {module.tag}</p>
          <h1 className="module-detail-title">{module.title}</h1>
          <p className="module-detail-desc">{module.description}</p>
        </div>
        <div className="module-detail-progress">
          <span>{progress}%</span>
          <div className="module-detail-progress-track">
            <div className="module-detail-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>{module.subModules.filter(s => completedSubs.includes(s.id)).length}/{module.subModules.length} lessons</span>
        </div>
      </div>

      {progress === 100 && (
        isAssessmentPassed ? (
          <div className="modules-assessment-card animate-fade-in" style={{
            background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
            border: '1.5px dashed #0284c7',
            borderRadius: '16px',
            padding: '20px',
            margin: '0 0 24px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}>
            <div>
              <h3 style={{ margin: 0, color: '#075985', fontSize: '18px', fontWeight: 700 }}>
                🎓 Module Certified!
              </h3>
              <p style={{ margin: '4px 0 0', color: '#0369a1', fontSize: '14px', lineHeight: 1.5 }}>
                You have completed all lessons in this module and passed the corresponding level assessment. If you wish to practice or try for a higher score, you can retake the assessment.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => setShowCert(true)}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
                  whiteSpace: 'nowrap',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                View Certificate 🎓
              </button>
              <button
                onClick={handleRetake}
                style={{
                  background: '#ea580c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(234, 88, 12, 0.3)',
                  whiteSpace: 'nowrap',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                Retake Assessment 🔄
              </button>
            </div>
          </div>
        ) : (
          <div className="modules-assessment-card animate-fade-in" style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '1.5px dashed #f59e0b',
            borderRadius: '16px',
            padding: '20px',
            margin: '0 0 24px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}>
            <div>
              <h3 style={{ margin: 0, color: '#92400e', fontSize: '18px', fontWeight: 700 }}>
                🎉 Module Completed!
              </h3>
              <p style={{ margin: '4px 0 0', color: '#b45309', fontSize: '14px', lineHeight: 1.5 }}>
                You have completed all lessons in this module. To finish this module and earn your certificate, please take the corresponding level assessment.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {hasCertificate && (
                <>
                  <button
                    onClick={() => setShowCert(true)}
                    style={{
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
                      whiteSpace: 'nowrap',
                      transition: 'transform 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    View Certificate 🎓
                  </button>
                  <button
                    onClick={handleRetake}
                    style={{
                      background: '#ea580c',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px -1px rgba(234, 88, 12, 0.3)',
                      whiteSpace: 'nowrap',
                      transition: 'transform 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    Retake Assessment 🔄
                  </button>
                </>
              )}
              <button
                onClick={() => onNavigate('assessment')}
                style={{
                  background: '#d97706',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(217, 119, 6, 0.3)',
                  whiteSpace: 'nowrap',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                Take Assessment →
              </button>
            </div>
          </div>
        )
      )}

      <div className="module-detail-list">
        {module.subModules.map((sub, i) => {
          const done     = completedSubs.includes(sub.id);
          const unlocked = i === 0 || completedSubs.includes(module.subModules[i - 1].id);
          return (
            <button key={sub.id}
              className={`submodule-row ${done ? 'submodule-row--completed' : ''} ${!unlocked ? 'submodule-row--locked' : ''}`}
              onClick={() => unlocked && onSubClick(sub, module)}
              disabled={!unlocked}
            >
              <div className="submodule-row__num"
                style={{ background: unlocked ? module.bg : '#f1f5f9', color: unlocked ? module.color : '#94a3b8' }}>
                {done ? '✓' : i + 1}
              </div>
              <div className="submodule-row__icon">{sub.icon}</div>
              <div className="submodule-row__info">
                <span className="submodule-row__title">{sub.title}</span>
              </div>
              <div className="submodule-row__status">
                {done ? <CheckCircle size={20} color="#10b981" />
                  : !unlocked ? <Lock size={18} color="#cbd5e1" />
                  : <PlayCircle size={20} color={module.color} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* RURALSHORES CERTIFICATE POPUP MODAL */}
      {showCert && (
        <div className="certificate-modal-overlay">
          <div className="certificate-modal-container animate-scale-up">
            
            <button 
              className="certificate-close-btn" 
              onClick={() => setShowCert(false)}
              style={{
                position: 'absolute',
                top: '-16px',
                right: '-16px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                zIndex: 10
              }}
            >
              <X size={18} />
            </button>

            <div className="certificate-frame printable-certificate">
              <div className="certificate-inner-border">
                
                <h1 className="cert-header">CERTIFICATE OF COMPLETION</h1>
                
                <p className="cert-sub">This is to certify that</p>
                
                <h2 className="cert-name">{assessmentStatus?.recipientName || 'Employee'}</h2>
                
                <p className="cert-body">
                  has successfully completed the course on <br />
                  <strong>"{categoryId === 'speaking' ? 'English Speaking Communication' : 'English Writing Communication'}"</strong> with a score of <strong>{(categoryId === 'speaking' ? (assessmentStatus?.speakingCertificate?.score) : (assessmentStatus?.writingCertificate?.score)) || 100}%</strong>.
                </p>
                
                <p className="cert-presenter">Presented by RuralShores</p>
                
                <div className="cert-footer">
                  <div className="cert-footer-item">
                    <div style={{ height: '35px', content: '""' }}></div>
                    <div className="cert-footer-line">
                      {categoryId === 'speaking' && assessmentStatus?.speakingCertificate?.createdAt
                        ? new Date(assessmentStatus.speakingCertificate.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : categoryId === 'writing' && assessmentStatus?.writingCertificate?.createdAt
                        ? new Date(assessmentStatus.writingCertificate.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <span style={{ fontSize: '10px', color: '#666' }}>Date</span>
                  </div>
                  
                  <div className="cert-footer-item">
                    <div className="cert-signature">RuralShores Admin</div>
                    <div className="cert-footer-line">Authorized Signature</div>
                  </div>
                </div>

              </div>

              <svg width="90" height="90" viewBox="0 0 100 100" style={{ position: 'absolute', bottom: '50px', right: '45px' }}>
                <path d="M40 70 L30 95 L50 85 L70 95 L60 70" fill="#b8931d" />
                <path d="M45 70 L38 95 L50 85 L62 95 L55 70" fill="#e2c15a" />
                <circle cx="50" cy="50" r="35" fill="url(#goldGrad)" stroke="#b8931d" strokeWidth="1.5" />
                <circle cx="50" cy="50" r="31" fill="none" stroke="#f2db83" strokeWidth="1.5" strokeDasharray="3 2" />
                <polygon points="50,22 55,35 68,35 58,43 62,56 50,48 38,56 42,43 32,35 45,35" fill="#fcf3cf" />
                <defs>
                  <radialGradient id="goldGrad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
                    <stop offset="0%" stopColor="#fef9db" />
                    <stop offset="50%" stopColor="#d4af37" />
                    <stop offset="100%" stopColor="#aa7c11" />
                  </radialGradient>
                </defs>
              </svg>

            </div>

            <div className="certificate-actions">
              <button 
                className="modules-complete-btn" 
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', width: 'auto', background: '#3b82f6' }}
              >
                <Printer size={16} /> Print / Save PDF
              </button>
              <button 
                className="modules-back-btn" 
                onClick={() => setShowCert(false)}
                style={{ padding: '10px 20px', margin: 0 }}
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// ── Category modules grid ─────────────────────────────────────
function CategoryModules({ category, completedSubModules, assessmentStatus, onModuleClick, onBack, onNavigate, onResetModule }) {
  const modules   = MODULES_MAP[category.id];

  const isCompleted = (module) =>
    module.subModules.every(s => completedSubModules.includes(s.id));

  const isUnlocked = (module, index) => {
    if (index === 0) return true;
    if (index === 1) {
      // Module 2 is unlocked ONLY when assessmentStatus is unlocked for this category
      if (category.id === 'speaking') {
        return !!assessmentStatus?.isSpeakingModule2Unlocked;
      } else {
        return !!assessmentStatus?.isWritingModule2Unlocked;
      }
    }
    // Modules 3 and 4 unlock sequentially after Module 2 is unlocked and completed
    return isCompleted(modules[index - 1]);
  };

  const getProgress = (module) => {
    const done = module.subModules.filter(s => completedSubModules.includes(s.id)).length;
    return Math.round((done / module.subModules.length) * 100);
  };

  // Check if Module 1 of this category is completed
  const isModule1Completed = isCompleted(modules[0]);
  const hasCertificate = category.id === 'speaking'
    ? !!assessmentStatus?.speakingCertificate
    : !!assessmentStatus?.writingCertificate;

  return (
    <div className="modules-page">
      <button className="modules-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to Modules
      </button>

      {/* Category header */}
      <div className="modules-cat-header"
        style={{ background: `linear-gradient(135deg, ${category.color} 0%, ${category.color}bb 100%)` }}>
        <span className="modules-cat-emoji">{category.emoji}</span>
        <div>
          <h1 className="modules-cat-title">{category.label}</h1>
          <p className="modules-cat-desc">{category.desc}</p>
        </div>
        <span className="modules-cat-badge">{category.tag}</span>
      </div>


      {/* Module cards grid */}
      <div className="modules-grid">
        {modules.map((module, index) => {
          const unlocked  = isUnlocked(module, index);
          const completed = isCompleted(module);
          const progress  = getProgress(module);

          return (
            <div key={module.id}
              className={`module-card-box ${!unlocked ? 'module-card-box--locked' : ''}`}
              style={{ '--mc': module.color, '--mb': module.bg }}
              onClick={() => unlocked && onModuleClick(module)}
            >
              <div className="module-card-box__icon-area" style={{ background: module.bg }}>
                {unlocked
                  ? completed
                    ? <CheckCircle size={56} color={module.color} strokeWidth={1.5} />
                    : <span className="module-card-box__emoji">{module.emoji}</span>
                  : <Lock size={48} color="#cbd5e1" strokeWidth={1.5} />}
              </div>

              <div className="module-card-box__body">
                <div className="module-card-box__tags">
                  <span className="module-card-box__tag"
                    style={{ color: module.color, background: module.bg }}>
                    Module {module.number}
                  </span>
                  <span className={`module-card-box__level module-card-box__level--${module.tag.toLowerCase()}`}>
                    {module.tag}
                  </span>
                </div>
                <h3 className="module-card-box__title"
                  style={{ color: unlocked ? '#1e293b' : '#94a3b8' }}>
                  {module.title}
                </h3>
                <p className="module-card-box__desc">
                  {unlocked ? module.description : 'Complete Module 1 and pass all 3 assessments to unlock Module 2.'}
                </p>
                <p className="module-card-box__sub">{module.subText}</p>
                {unlocked && (
                  <div className="module-card-box__progress">
                    <div className="module-card-box__progress-track">
                      <div className="module-card-box__progress-fill"
                        style={{ width: `${progress}%`, background: module.color }} />
                    </div>
                    <span style={{ color: module.color }}>{progress}%</span>
                  </div>
                )}
              </div>

              <div className="module-card-box__footer"
                style={{ 
                  background: unlocked ? module.color : '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: completed ? '10px' : '0px'
                }}>
                {unlocked ? (
                  completed ? (
                    <>
                      <span>✅ Completed</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onResetModule(module.id);
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          border: '1px solid rgba(255, 255, 255, 0.4)',
                          color: '#ffffff',
                          borderRadius: '6px',
                          padding: '3px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s',
                          textTransform: 'uppercase',
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                        }}
                      >
                        <RefreshCw size={11} /> Re-learn
                      </button>
                    </>
                  ) : progress > 0 ? 'Continue →' : 'Start →'
                ) : '🔒 Locked'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Modules Page ─────────────────────────────────────────
export default function ModulesPage({ onNavigate }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedModule, setSelectedModule]     = useState(null);
  const [activeSubModule, setActiveSubModule]   = useState(null);
  const [completedSubModules, setCompletedSubModules] = useState([]);
  const [assessmentStatus, setAssessmentStatus] = useState(null);

  const fetchProgressAndStatus = async () => {
    try {
      const progressRes = await api.get('/assessment/progress');
      setCompletedSubModules(progressRes.data);

      const statusRes = await api.get('/assessment/status');
      setAssessmentStatus(statusRes.data);
    } catch (err) {
      console.error('Failed to load progress or status:', err);
    }
  };

  useEffect(() => {
    fetchProgressAndStatus();
  }, []);

  const handleCompleteSubModule = async () => {
    if (!activeSubModule) return;
    try {
      await api.post('/assessment/progress', {
        category: selectedCategory.id,
        moduleId: activeSubModule.module.id,
        subModuleId: activeSubModule.sub.id,
      });
      await fetchProgressAndStatus();
      setActiveSubModule(null);
    } catch (err) {
      console.error('Failed to complete lesson in backend:', err);
      // Fallback
      setCompletedSubModules(prev =>
        prev.includes(activeSubModule.sub.id) ? prev : [...prev, activeSubModule.sub.id]
      );
      setActiveSubModule(null);
    }
  };

  const handleUncompleteSubModule = async (subId, moduleId) => {
    try {
      await api.post('/assessment/progress', {
        category: selectedCategory.id,
        moduleId,
        subModuleId: subId,
        completed: false,
      });
      await fetchProgressAndStatus();
      setActiveSubModule(null);
    } catch (err) {
      console.error('Failed to uncomplete lesson in backend:', err);
      // Fallback
      setCompletedSubModules(prev => prev.filter(id => id !== subId));
      setActiveSubModule(null);
    }
  };

  const handleResetModuleProgress = async (moduleId) => {
    const confirmText = `Are you sure you want to reset all progress for this module? You will be able to re-learn all of its lessons.`;
    if (!window.confirm(confirmText)) return;

    try {
      await api.post(`/assessment/reset-module/${moduleId}`);
      await fetchProgressAndStatus();
    } catch (err) {
      console.error('Failed to reset module progress:', err);
      alert('Could not reset progress. Please try again.');
    }
  };

  // ── Level 3: Lesson view ────────────────────────────────────
  if (activeSubModule) {
    return (
      <SubModuleView
        sub={activeSubModule.sub}
        module={activeSubModule.module}
        category={selectedCategory.id}
        onBack={() => setActiveSubModule(null)}
        onComplete={handleCompleteSubModule}
        onUncomplete={() => handleUncompleteSubModule(activeSubModule.sub.id, activeSubModule.module.id)}
        isCompleted={completedSubModules.includes(activeSubModule.sub.id)}
      />
    );
  }

  // ── Level 2: Module detail ──────────────────────────────────
  if (selectedModule) {
    return (
      <ModuleDetail
        module={selectedModule}
        completedSubs={completedSubModules.filter(id =>
          selectedModule.subModules.some(s => s.id === id)
        )}
        onSubClick={(sub, module) => setActiveSubModule({ sub, module })}
        onBack={() => setSelectedModule(null)}
        categoryColor={selectedCategory?.color}
        onNavigate={onNavigate}
        assessmentStatus={assessmentStatus}
      />
    );
  }

  // ── Level 1b: Category modules ──────────────────────────────
  if (selectedCategory) {
    return (
      <CategoryModules
        category={selectedCategory}
        completedSubModules={completedSubModules}
        assessmentStatus={assessmentStatus}
        onModuleClick={(module) => setSelectedModule(module)}
        onBack={() => setSelectedCategory(null)}
        onNavigate={onNavigate}
        onResetModule={handleResetModuleProgress}
      />
    );
  }

  // ── Level 1: Category cards (Speaking / Writing) ────────────
  return (
    <div className="modules-page">
      <div className="modules-lobby-header">
        <h1 className="modules-lobby-title">📚 Learning Modules</h1>
        <p className="modules-lobby-sub">Choose a category and start learning!</p>
      </div>

      <div className="modules-categories-grid">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className="module-cat-card"
            style={{ '--cc': cat.color, '--cb': cat.bg }}
            onClick={() => setSelectedCategory(cat)}
          >
            <div className="module-cat-card__icon-wrap" style={{ background: cat.bg }}>
              <span className="module-cat-card__emoji">{cat.emoji}</span>
            </div>
            <div className="module-cat-card__body">
              <span className="module-cat-card__tag"
                style={{ color: cat.color, background: cat.bg }}>
                {cat.tag}
              </span>
              <h3 className="module-cat-card__title">{cat.label}</h3>
              <p className="module-cat-card__desc">{cat.desc}</p>
              <p className="module-cat-card__sub">{cat.subText}</p>
            </div>
            <div className="module-cat-card__footer"
              style={{ background: cat.color }}>
              Explore →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}