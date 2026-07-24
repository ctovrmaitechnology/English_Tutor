import { useState, useEffect, useRef } from 'react';
import { Lock, CheckCircle, PlayCircle, ArrowLeft, Mic, PenTool, Award, HelpCircle, Loader2, Volume2, RefreshCw, Check, X, Sparkles, Square, AlertCircle, Printer, Play, ChevronRight, BookOpen, Trophy, Star, Brain } from 'lucide-react';
import api from '../services/api';
import CompanionEvents from '../components/Companion/CompanionEvents';
import SpeakingLessonFlow from './SpeakingLessonFlow';
import WritingLessonFlow from './WritingLessonFlow';
import KenzaTutor from './KenzaTutor';
import { useUser } from '../context/UserContext';
import './Modules.css';

// ── Video sources — maps submodule IDs to local video files ──
const VIDEO_SOURCES = {
  'wr-1-1': new URL('../../videos/Copy of Verb Tenses (1).mp4', import.meta.url).href,

  // Beginner (sp-1)
  'sp-1-1': 'https://hel1.your-objectstorage.com/videosage/Beginner_L1.mp4',
  'sp-1-16': 'https://hel1.your-objectstorage.com/videosage/_Beginner-l16.mp4',

  // Elementary (sp-2)
  'sp-2-1': 'https://hel1.your-objectstorage.com/videosage/Elementry_L1_(1).mp4',
  'sp-2-18': 'https://hel1.your-objectstorage.com/videosage/Elementarty_L18_(1).mp4',

  // Intermediate (sp-3)
  'sp-3-1': 'https://hel1.your-objectstorage.com/videosage/Intermediate_L1_(1).mp4',
  'sp-3-18': 'https://hel1.your-objectstorage.com/videosage/intermediate_L18_(1).mp4',

  // Advanced (sp-4)
  'sp-4-1': 'https://hel1.your-objectstorage.com/videosage/Advanced_L1_(1).mp4',
  'sp-4-13': 'https://hel1.your-objectstorage.com/videosage/advanced_L13.mp4',
};

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

// ── Gamified Quiz Questions — 5 per submodule ─────────────────
const GAME_QUIZZES = {
  'wr-1-1': {
    title: 'Tenses & Their Usage', questions: [
      { q: "Which tense describes an action happening RIGHT NOW?", options: ["Simple Past", "Present Continuous", "Simple Future", "Past Perfect"], correct: 1, explanation: "Present Continuous (is/are + verb-ing) describes actions happening at this very moment." },
      { q: "Fill in: 'She ___ to work every day by bus.'", options: ["is traveling", "traveled", "travels", "will travel"], correct: 2, explanation: "Simple Present is used for regular habits and daily routines." },
      { q: "Which sentence correctly uses the Past Perfect tense?", options: ["I am eating lunch now.", "She was sleeping all morning.", "They had completed the training before the client called.", "He will attend the meeting."], correct: 2, explanation: "Past Perfect (had + past participle) describes an action completed before another past action." },
      { q: "Complete: 'By next year, I ___ this BPO training course.'", options: ["will complete", "completed", "am completing", "will have completed"], correct: 3, explanation: "Future Perfect (will have + past participle) is used for actions completed before a specific future point." },
      { q: "Which tense is used to express a general truth or permanent fact?", options: ["Present Perfect", "Simple Present", "Past Continuous", "Future Simple"], correct: 1, explanation: "Simple Present tense is used for universal truths, scientific facts, and permanent situations." }
    ]
  },
  'wr-1-2': {
    title: 'Sentence Structure', questions: [
      { q: "Which sentence has the correct Subject-Verb-Object order?", options: ["Quickly resolves the agent issues.", "The agent quickly resolves customer issues.", "Resolves issues quickly the agent.", "Customer issues the agent resolves quickly."], correct: 1, explanation: "Standard English sentence order is Subject → Verb → Object." },
      { q: "A compound sentence is formed by:", options: ["One main clause only", "Two independent clauses joined by a conjunction", "A main clause and a subordinate clause", "Three or more dependent clauses"], correct: 1, explanation: "A compound sentence joins two independent clauses with coordinating conjunctions like 'and', 'but', 'so'." },
      { q: "Identify the sentence with a CORRECT relative clause:", options: ["Running fast, the call was disconnected.", "The customer who was frustrated received a refund.", "After the call. The agent wrote notes.", "The agent wrote notes after finishing the report was sent."], correct: 1, explanation: "'Who was frustrated' correctly modifies 'the customer' with a relative clause." },
      { q: "What is a 'sentence fragment'?", options: ["A sentence with two main clauses", "A sentence missing a subject or verb", "A sentence that is too long", "A sentence with two verbs"], correct: 1, explanation: "A sentence fragment is incomplete — it's missing a subject, a verb, or does not express a complete thought." },
      { q: "Which word makes this a complex sentence: '___ the customer was angry, the agent stayed calm.'", options: ["And", "But", "Although", "So"], correct: 2, explanation: "'Although' is a subordinating conjunction that creates a complex sentence with a dependent clause." }
    ]
  },
  'wr-1-3': {
    title: 'Punctuation Rules', questions: [
      { q: "Which sentence uses a comma CORRECTLY?", options: ["She called, the customer.", "Yes, I understand your concern.", "I will, help you now.", "Please, hold, the line."], correct: 1, explanation: "A comma is used after introductory words like 'Yes', 'No', 'Well' at the start of a sentence." },
      { q: "A colon (:) is used to:", options: ["Separate two independent clauses", "Introduce a list or explanation", "Replace a comma", "Show possession"], correct: 1, explanation: "A colon introduces a list, a quote, an explanation, or an elaboration of the preceding clause." },
      { q: "'The agent checked the account however the issue persisted.' — What punctuation is missing?", options: ["A period after 'account'", "A semicolon after 'account'", "A comma after 'however'", "Quotation marks around the sentence"], correct: 1, explanation: "A semicolon joins two closely related independent clauses. '...account; however, the issue...' is correct." },
      { q: "Which sentence uses an apostrophe CORRECTLY?", options: ["The customer's complaint was valid.", "The customers's complaint was valid.", "The customers complaint was valid.", "The customer's complaint's were valid."], correct: 0, explanation: "For singular possession, add apostrophe + s: customer's complaint (belonging to one customer)." },
      { q: "In professional business writing, exclamation marks should be used:", options: ["After every positive sentence", "Frequently to sound enthusiastic", "Sparingly, only when truly necessary", "Never, under any circumstances"], correct: 2, explanation: "In professional writing, exclamation marks should be used sparingly. Overuse makes communication seem unprofessional." }
    ]
  },
  'wr-1-4': {
    title: 'Common Grammar Errors', questions: [
      { q: "Correct the error: 'Me and my team handles all complaints.'", options: ["Me and my team handle all complaints.", "My team and I handle all complaints.", "My team and me handles all complaints.", "I and my team handles all complaints."], correct: 1, explanation: "'My team and I' is correct. Use 'I' as a subject. Test: 'I handle' — correct. 'Me handles' — wrong." },
      { q: "Which sentence has a subject-verb agreement error?", options: ["The team completes the report on time.", "Each of the agents is trained.", "The number of calls are increasing.", "Neither the manager nor the agent was informed."], correct: 2, explanation: "'The number of...' takes a singular verb: 'The number of calls is increasing'." },
      { q: "Which word is used CORRECTLY?", options: ["Their is a problem with the account.", "There is a problem with the account.", "They're is a problem with the account.", "There're a problem with the account."], correct: 1, explanation: "'There' refers to a place or existence. 'Their' = belonging to them. 'They're' = they are." },
      { q: "Choose the grammatically correct sentence:", options: ["We should of called the customer earlier.", "We should have called the customer earlier.", "We should had called the customer earlier.", "We should of have called the customer earlier."], correct: 1, explanation: "'Should have' is correct. 'Should of' is a common spoken error — 'of' cannot follow 'should'." },
      { q: "Identify the INCORRECT sentence:", options: ["The report is ready to submit.", "Between you and me, the issue is resolved.", "Everyone brought their own headset.", "He don't understand the customer's complaint."], correct: 3, explanation: "'He don't' is incorrect. The correct form is 'He doesn't' — third person singular requires 'doesn't'." }
    ]
  },
  'wr-2-1': {
    title: 'Email Subject Lines', questions: [
      { q: "Which is the BEST professional email subject line?", options: ["Urgent!!!", "Invoice #4562 — Payment Correction Request", "please read this quickly", "regarding your account"], correct: 1, explanation: "A good subject line is specific, clear, and includes identifiers like invoice numbers." },
      { q: "A good email subject line should be:", options: ["As long as possible with full details", "Vague to create curiosity", "Clear, concise and specific", "In all capital letters"], correct: 2, explanation: "Subject lines should be clear and concise — typically 6 to 10 words — so the recipient understands the purpose immediately." },
      { q: "Which subject line is appropriate for a follow-up email?", options: ["Following Up", "Following up on our call — Account #78432", "FOLLOW UP!!!", "This is a follow-up on the discussion we had"], correct: 1, explanation: "Include specific identifiers (account numbers, topics) in follow-up subject lines to give context." },
      { q: "What does RE: in an email subject line indicate?", options: ["Regarding a new topic", "A reply to a previous email", "A request for urgent action", "An internal company email"], correct: 1, explanation: "RE: indicates you are responding to a previous email in the thread." },
      { q: "Which subject line for a complaint resolution is best?", options: ["Complaint", "Your Issue Has Been Resolved — Case #1234", "URGENT: Your complaint!", "About the thing you reported"], correct: 1, explanation: "Reference the case number and resolution status. This reassures the customer and sets a professional tone." }
    ]
  },
  'wr-2-2': {
    title: 'Professional Greetings', questions: [
      { q: "Which is the most professional email greeting for a known client?", options: ["Hey Mr. Jones,", "Dear Mr. Jones,", "Hello Friend,", "To whom it may concern,"], correct: 1, explanation: "'Dear Mr. Jones,' is the standard professional salutation for business correspondence." },
      { q: "When you don't know the recipient's name, use:", options: ["Hey there,", "Hi!", "Dear Sir or Madam,", "Hello,"], correct: 2, explanation: "'Dear Sir or Madam,' is the professional greeting when the recipient's name is unknown." },
      { q: "Which greeting is appropriate for an internal team email?", options: ["Dear Mr. Smith,", "Hi Team,", "Gentlemen,", "Hey guys,"], correct: 1, explanation: "'Hi Team,' is appropriate for internal communications — professional yet friendly and inclusive." },
      { q: "When replying to an upset customer, begin with:", options: ["I understand you are upset.", "Thank you for contacting us.", "I apologize for the inconvenience you have experienced.", "Let me be direct about this issue."], correct: 2, explanation: "Opening with a sincere apology acknowledges the customer's frustration and sets an empathetic tone." },
      { q: "Which opening is best for a first-contact email to a potential business client?", options: ["Hey, I'm reaching out...", "Dear [Name], I hope this email finds you well.", "Hello! Just wanted to say hi.", "Good day. I need your attention."], correct: 1, explanation: "'Dear [Name], I hope this email finds you well.' is a classic, widely accepted professional business opening." }
    ]
  },
  'wr-2-3': {
    title: 'Email Body Writing', questions: [
      { q: "The BEST way to structure a professional email body is:", options: ["Everything in one long paragraph", "Purpose → Details → Next Steps", "Start with conclusions, then explain", "Details → Purpose → Closing"], correct: 1, explanation: "State your purpose first, provide supporting details, then clearly outline next steps or requested actions." },
      { q: "Which sentence is written in the most professional tone?", options: ["I need this fixed ASAP!!!", "Could you please look into this at your earliest convenience?", "Just handle it.", "Why hasn't this been done yet?"], correct: 1, explanation: "Professional email tone is polite, clear, and respectful. Avoid demands, excessive urgency, or vague instructions." },
      { q: "In a BPO customer service email, you should:", options: ["Use technical jargon to seem expert", "Write in plain, clear language the customer easily understands", "Keep everything in one very long sentence", "Avoid explaining the resolution to keep it brief"], correct: 1, explanation: "Customer-facing emails should use plain language. Jargon confuses customers and reduces trust." },
      { q: "Which is the correct way to reference an earlier interaction?", options: ["As per our conversation on [Date], ...", "Like we said before,", "You should already know this from our call", "Previously,"], correct: 0, explanation: "'As per our conversation on [Date]' is the professional standard for referencing previous interactions." },
      { q: "When explaining a billing error to a customer, you should:", options: ["Use passive voice: 'An error was made'", "Acknowledge, explain clearly, state the resolution", "Keep the explanation vague", "Apologize excessively in every sentence"], correct: 1, explanation: "Be transparent, take responsibility, and immediately state the resolution. Customers want clarity and action." }
    ]
  },
  'wr-2-4': {
    title: 'Closing & Sign-off', questions: [
      { q: "Which is the most professional email closing?", options: ["See ya!", "Best regards,", "Bye for now,", "Later,"], correct: 1, explanation: "'Best regards,' is a widely accepted professional sign-off that is warm yet formal." },
      { q: "Which closing is appropriate for a formal complaint resolution email?", options: ["Thanks!", "Yours sincerely,", "Take care,", "Later,"], correct: 1, explanation: "'Yours sincerely,' is used in formal business correspondence when you know the recipient's name." },
      { q: "Before signing off a customer service email, you should:", options: ["Simply say goodbye", "Ask if there is anything else you can assist with", "Repeat the entire email content as a summary", "Request the customer to call instead"], correct: 1, explanation: "Always offer further assistance before closing. This shows commitment to customer satisfaction." },
      { q: "What information should be in a professional email signature?", options: ["Only your first name", "Full name, job title, company, contact number", "Personal social media links", "Your daily availability hours only"], correct: 1, explanation: "A professional email signature includes your full name, title, company name, and contact information." },
      { q: "Which closing line is best for a support ticket resolution email?", options: ["Hope this helps, bye!", "Please do not hesitate to contact us should you require further assistance.", "Problem solved. Closing ticket.", "Thanks for your patience (even though this took too long)."], correct: 1, explanation: "Professional closing lines are warm, invite further contact, and reinforce a customer-first approach." }
    ]
  },
  'sp-1-1': {
    title: 'Vowel Sounds', questions: [
      { q: "The vowel sound /iː/ (long 'ee') is found in which word?", options: ["sit", "set", "see", "sat"], correct: 2, explanation: "/iː/ is a long vowel sound as in 'see', 'tree', 'meet'. The tongue is high and lips are slightly spread." },
      { q: "Which word pair demonstrates the /ɪ/ vs /iː/ vowel contrast?", options: ["cat / car", "sit / seat", "pet / pit", "hot / hat"], correct: 1, explanation: "'sit' (short i) vs 'seat' (long ee) is the classic minimal pair for this vowel contrast." },
      { q: "The vowel /æ/ as in 'cat' requires the jaw to be:", options: ["Closed and relaxed", "Dropped low and mouth wide open", "Rounded like a circle", "High and tense"], correct: 1, explanation: "To produce /æ/, drop your jaw, open your mouth wide, and spread your lips." },
      { q: "Which word contains the /uː/ (long 'oo') vowel sound?", options: ["put", "pull", "book", "too"], correct: 3, explanation: "/uː/ as in 'too', 'food', 'blue'. Lips are rounded. Don't confuse with /ʊ/ (short oo) as in 'put', 'book'." },
      { q: "In BPO communication, clear vowel sounds are important because:", options: ["They make you sound educated", "Customers on calls rely on hearing vowels clearly to understand key words", "They speed up your speech", "Grammar requires perfect vowels"], correct: 1, explanation: "On phone calls, audio quality isn't always perfect. Clear vowel pronunciation ensures customers understand key information." }
    ]
  },
  'sp-1-2': {
    title: 'Consonant Sounds', questions: [
      { q: "The 'th' sound in 'the', 'this', 'that' requires:", options: ["Teeth together, air through nose", "Tongue tip between teeth, air forced out", "Lips together", "Tongue at roof of mouth"], correct: 1, explanation: "For voiced 'th' (ð), place the tongue tip lightly between your front teeth and push air out." },
      { q: "Which word pair highlights the /v/ vs /b/ consonant contrast?", options: ["van / ban", "pig / big", "thin / tin", "wet / yet"], correct: 0, explanation: "'van' uses /v/ (top teeth on lower lip) vs 'ban' which uses /b/ (both lips together)." },
      { q: "The /r/ sound in General American English is produced by:", options: ["Rolling the 'r' strongly", "Curling the tongue slightly back without touching the roof", "Not pronouncing the 'r' at all", "Pronouncing it like the letter name"], correct: 1, explanation: "In General American English, the /r/ is a retroflex sound — the tongue curls slightly back but doesn't touch the palate." },
      { q: "Why is it important to pronounce consonants at the END of words clearly?", options: ["It sounds more formal", "It prevents misunderstanding — 'billed' vs 'bill', 'called' vs 'call'", "International customers prefer it", "It slows your speech professionally"], correct: 1, explanation: "Final consonants differentiate past tense from present, singular from plural. Dropping them causes miscommunication." },
      { q: "Which sentence best practices multiple consonant sounds in a professional BPO context?", options: ["She sells sea shells by the sea shore", "I see the ships at sea", "The customer's request was resolved successfully", "She said she saw Susan"], correct: 2, explanation: "'The customer's request was resolved successfully' contains multiple consonant sounds in a professional BPO context." }
    ]
  },
  'sp-2-1': {
    title: 'Call Opening Phrases', questions: [
      { q: "What is the standard structure for a professional BPO call opening?", options: ["Just say 'Hello?'", "Company greeting + Your name + How may I help?", "Ask for account number immediately", "Introduce the problem you'll solve"], correct: 1, explanation: "Professional openings: 'Thank you for calling [Company]. This is [Name]. How may I help you today?'" },
      { q: "Which opening sounds most professional and welcoming?", options: ["'Yeah, what do you need?'", "'Thank you for calling RuralShores. My name is Alex. How may I assist you today?'", "'RuralShores, hold please.'", "'Customer service, what's your problem?'"], correct: 1, explanation: "The professional opening is warm, identifies the company and agent, and uses polite language." },
      { q: "When a customer calls and immediately starts complaining, you should:", options: ["Interrupt and ask for their account number", "Let them finish, then say: 'I completely understand your frustration. I'm going to help resolve this right away.'", "Put them on hold immediately", "Transfer to a supervisor without listening"], correct: 1, explanation: "Let the customer speak first. Acknowledge their frustration before asking for account details — this builds rapport." },
      { q: "The phrase 'How may I assist you today?' is preferred because:", options: ["It's shorter", "It uses formal, respectful language and sets a professional tone", "It confuses customers", "Customers prefer simpler questions"], correct: 1, explanation: "'May I assist' is polite and formal. Language choices directly impact customer satisfaction scores." },
      { q: "After the customer explains their issue, the BEST immediate response is:", options: ["'Ok, hold on.'", "'I understand, [Name]. Let me look into this for you right away.'", "'That's not our fault.'", "'Have you tried turning it off and on?'"], correct: 1, explanation: "Using the customer's name, acknowledging the issue, and committing to action shows empathy and professionalism." }
    ]
  },
  'sp-2-2': {
    title: 'Active Listening', questions: [
      { q: "Active listening in a call means:", options: ["Waiting silently for the customer to stop talking", "Paying full attention, noting key details, and confirming understanding", "Multi-tasking while the customer speaks", "Interrupting to show you already know the answer"], correct: 1, explanation: "Active listening involves focused attention, mental note-taking, and verbal acknowledgment to show engagement." },
      { q: "Which phrase best demonstrates active listening confirmation?", options: ["'Okay.'", "'I understand that your invoice shows a charge of $45 that you did not authorize. Is that correct?'", "'Please repeat that.'", "'We hear this complaint a lot.'"], correct: 1, explanation: "Repeating back specific details confirms you listened accurately and prevents misunderstandings." },
      { q: "The technique of paraphrasing in customer calls means:", options: ["Repeating the exact words the customer said", "Restating the customer's concern in your own words to confirm understanding", "Asking the customer to clarify what they said", "Summarizing every detail at the end of the call"], correct: 1, explanation: "Paraphrasing shows you processed the information: 'So what you're saying is the delivery never arrived — is that right?'" },
      { q: "When a customer is explaining a complex billing issue, you should:", options: ["Start typing notes and stop listening", "Listen fully, write key details, then confirm: 'Let me verify what I've noted down.'", "Ask them to send an email instead", "Transfer immediately to billing department"], correct: 1, explanation: "Note key specifics while listening, then verbally verify your notes. This shows professionalism and prevents error." },
      { q: "Which listening response is MOST professional during a customer's explanation?", options: ["'Uh-huh, yeah, yeah.'", "'I see. Please go on.'", "'Mm... okay... yeah.'", "'Right, right, right.'"], correct: 1, explanation: "'I see. Please go on.' is professional and encouraging without sounding dismissive or filler-heavy." }
    ]
  },
  'default': {
    title: 'Module Quiz', questions: [
      { q: "In professional communication, clarity means:", options: ["Using long, impressive vocabulary", "Expressing ideas simply so they are easily understood", "Writing very detailed emails", "Avoiding all technical terms"], correct: 1, explanation: "Clarity in communication means your message is understood exactly as intended, without confusion or ambiguity." },
      { q: "The most important quality of a BPO professional is:", options: ["Speed of response", "Empathy and problem-solving combined with clear communication", "Technical knowledge only", "Memorizing scripts word for word"], correct: 1, explanation: "BPO excellence combines empathy with efficient problem-solving and clear communication." },
      { q: "Which of the following is an example of professional language?", options: ["'That's not possible.'", "'I will explore all available options to resolve this for you.'", "'Not my department.'", "'I don't know.'"], correct: 1, explanation: "Professional language focuses on solutions, shows ownership, and maintains a positive tone." },
      { q: "When you don't know the answer to a customer's question, you should:", options: ["Make something up", "'I'll need to verify that for you. May I place you on a brief hold?'", "'I don't know, call back later.'", "Transfer immediately without explanation"], correct: 1, explanation: "Honesty combined with a clear action plan maintains trust. Never guess or give incorrect information." },
      { q: "A professional tone in customer service means:", options: ["Always being formal and never friendly", "Being respectful, polite, and helpful regardless of the customer's tone", "Matching the customer's anger if they are upset", "Using only scripted responses"], correct: 1, explanation: "Professional tone stays calm, respectful, and solution-focused regardless of the customer's emotional state." }
    ]
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
    title: 'Speaking & Listening Foundations',
    description: 'Build basic English confidence for BPO freshers — greetings, spelling, numbers, grammar and everyday workplace conversation.',
    emoji: '🔤', color: '#6366f1', bg: '#ede9fe',
    duration: '6 hours', tag: 'Beginner',
    subText: 'Greetings • Spelling on Calls • Numbers & Time • Tenses • Vocabulary • Confidence',
    subModules: [
      { id: 'sp-1-1', title: 'Greetings & Introducing Yourself', duration: '20 min', icon: '👋' },
      { id: 'sp-1-2', title: 'The Phonetic Alphabet for Spelling on Calls', duration: '20 min', icon: '🔤' },
      { id: 'sp-1-3', title: 'Numbers, Dates & Time', duration: '20 min', icon: '🔢' },
      { id: 'sp-1-4', title: 'Simple Present Tense', duration: '20 min', icon: '⏱️' },
      { id: 'sp-1-5', title: 'Simple Sentence Structure', duration: '20 min', icon: '🧱' },
      { id: 'sp-1-6', title: 'Common Workplace & Everyday Vocabulary', duration: '20 min', icon: '💼' },
      { id: 'sp-1-7', title: 'Asking Simple Questions', duration: '20 min', icon: '❓' },
      { id: 'sp-1-8', title: 'Describing People & Things', duration: '20 min', icon: '👤' },
      { id: 'sp-1-9', title: 'Talking About Likes & Preferences', duration: '20 min', icon: '👍' },
      { id: 'sp-1-10', title: 'Simple Past Tense', duration: '20 min', icon: '⏪' },
      { id: 'sp-1-11', title: 'Polite Words', duration: '20 min', icon: '🙏' },
      { id: 'sp-1-12', title: 'Basic Listening Practice', duration: '20 min', icon: '👂' },
      { id: 'sp-1-13', title: 'Reading Simple Sentences Aloud', duration: '20 min', icon: '📖' },
      { id: 'sp-1-14', title: 'Common Beginner Mistakes', duration: '20 min', icon: '⚠️' },
      { id: 'sp-1-15', title: 'Vocabulary Building', duration: '20 min', icon: '📚' },
      { id: 'sp-1-16', title: 'Simple Future Tense', duration: '20 min', icon: '⏩' },
      { id: 'sp-1-17', title: 'Assessment', duration: '30 min', icon: '🏆' },
    ],
  },
  {
    id: 'sp-2', number: 2,
    title: 'BPO Call Speaking',
    description: 'Professional telephone English — formal tone, workplace vocabulary, and handling customer conversations with confidence.',
    emoji: '📞', color: '#10b981', bg: '#d1fae5',
    duration: '7 hours', tag: 'Intermediate',
    subText: 'Formal English • Workplace Talk • Telephone Basics • Customer Conversations',
    subModules: [
      { id: 'sp-2-1', title: 'Formal vs Informal English', duration: '20 min', icon: '👔' },
      { id: 'sp-2-2', title: 'Word Stress Basics', duration: '20 min', icon: '📢' },
      { id: 'sp-2-3', title: 'Professional Self-Introduction', duration: '20 min', icon: '🤝' },
      { id: 'sp-2-4', title: 'Making Small Talk', duration: '20 min', icon: '💬' },
      { id: 'sp-2-5', title: 'Office & Workplace Vocabulary', duration: '20 min', icon: '🏢' },
      { id: 'sp-2-6', title: 'Expressing Opinions', duration: '20 min', icon: '💡' },
      { id: 'sp-2-7', title: 'Agreeing & Disagreeing Politely', duration: '20 min', icon: '⚖️' },
      { id: 'sp-2-8', title: 'Making Requests Politely', duration: '20 min', icon: '🙏' },
      { id: 'sp-2-9', title: 'Professional Apologies', duration: '20 min', icon: '🙇' },
      { id: 'sp-2-10', title: 'Present Continuous Tense', duration: '20 min', icon: '⏱️' },
      { id: 'sp-2-11', title: 'Describing Problems & Situations', duration: '20 min', icon: '🚨' },
      { id: 'sp-2-12', title: 'Telephone English Basics', duration: '20 min', icon: '📞' },
      { id: 'sp-2-13', title: 'Asking for Clarification', duration: '20 min', icon: '❓' },
      { id: 'sp-2-14', title: 'Basic Customer Conversations', duration: '20 min', icon: '🗣️' },
      { id: 'sp-2-15', title: 'Basic Email Communication', duration: '20 min', icon: '✉️' },
      { id: 'sp-2-16', title: 'Workplace Listening Practice', duration: '20 min', icon: '👂' },
      { id: 'sp-2-17', title: 'Common Grammar Mistakes at Work', duration: '20 min', icon: '⚠️' },
      { id: 'sp-2-18', title: 'Workplace Expressions', duration: '20 min', icon: '💬' },
      { id: 'sp-2-19', title: 'Assessment', duration: '30 min', icon: '🏆' },
    ],
  },
  {
    id: 'sp-3', number: 3,
    title: 'Fluency & Confidence',
    description: 'Handle live customer calls and chats with confidence — active listening, empathy, clear speech and neutral accent awareness.',
    emoji: '🎙️', color: '#f59e0b', bg: '#fef3c7',
    duration: '7 hours', tag: 'Intermediate',
    subText: 'Call Structure • Active Listening • Empathy • Accent Awareness • Complaints',
    subModules: [
      { id: 'sp-3-1', title: 'First Impressions on Calls & Chats', duration: '20 min', icon: '🌟' },
      { id: 'sp-3-2', title: 'Professional Call Opening Structure', duration: '20 min', icon: '📞' },
      { id: 'sp-3-3', title: 'Active Listening', duration: '20 min', icon: '👂' },
      { id: 'sp-3-4', title: 'Understanding Customer Intent', duration: '20 min', icon: '🧠' },
      { id: 'sp-3-5', title: 'Probing Questions', duration: '20 min', icon: '❓' },
      { id: 'sp-3-6', title: 'Clarification Techniques', duration: '20 min', icon: '💡' },
      { id: 'sp-3-7', title: 'Showing Empathy to Customers', duration: '20 min', icon: '💙' },
      { id: 'sp-3-8', title: 'Professional Response Framing (Saying No Politely)', duration: '20 min', icon: '🚫' },
      { id: 'sp-3-9', title: 'Speaking with Confidence on Calls', duration: '20 min', icon: '💪' },
      { id: 'sp-3-10', title: 'Clear Speech & Articulation', duration: '20 min', icon: '🗣️' },
      { id: 'sp-3-11', title: 'Neutral Accent Awareness (MTI Basics)', duration: '20 min', icon: '🌍' },
      { id: 'sp-3-12', title: 'Common Sound Corrections', duration: '20 min', icon: '🔧' },
      { id: 'sp-3-13', title: 'Word & Sentence Stress', duration: '20 min', icon: '📢' },
      { id: 'sp-3-14', title: 'Handling Simple Customer Complaints', duration: '20 min', icon: '🛡️' },
      { id: 'sp-3-15', title: 'Call Documentation Basics', duration: '20 min', icon: '📝' },
      { id: 'sp-3-16', title: 'Professional Chat Etiquette', duration: '20 min', icon: '💬' },
      { id: 'sp-3-17', title: 'Ending Calls & Chats Professionally', duration: '20 min', icon: '✅' },
      { id: 'sp-3-18', title: 'Cross-Cultural Communication Basics', duration: '20 min', icon: '🌐' },
      { id: 'sp-3-19', title: 'Assessment', duration: '30 min', icon: '🏆' },
    ],
  },
  {
    id: 'sp-4', number: 4,
    title: 'Advanced Communication',
    description: 'Handle angry customers, de-escalate conflict, and manage complex calls with the accent awareness and vocabulary of a seasoned professional.',
    emoji: '🏆', color: '#ec4899', bg: '#fdf2f8',
    duration: '5 hours', tag: 'Advanced',
    subText: 'De-escalation • Escalation Procedures • Global Accents • Certification',
    subModules: [
      { id: 'sp-4-1', title: 'Handling Angry or Frustrated Customers', duration: '20 min', icon: '🔥' },
      { id: 'sp-4-2', title: 'De-escalation Techniques', duration: '20 min', icon: '🧊' },
      { id: 'sp-4-3', title: 'Objection Handling', duration: '20 min', icon: '🤝' },
      { id: 'sp-4-4', title: 'Conflict Resolution on Calls', duration: '20 min', icon: '🕊️' },
      { id: 'sp-4-5', title: 'Hold & Transfer Etiquette', duration: '20 min', icon: '⏸️' },
      { id: 'sp-4-6', title: 'Escalation Procedures', duration: '20 min', icon: '🔺' },
      { id: 'sp-4-7', title: 'Advanced Call Flow Management', duration: '20 min', icon: '📊' },
      { id: 'sp-4-8', title: 'Global Accent Familiarity (US, UK & Australian)', duration: '20 min', icon: '🌍' },
      { id: 'sp-4-9', title: 'Fast, Natural Speech – Advanced Listening', duration: '20 min', icon: '👂' },
      { id: 'sp-4-10', title: 'Spontaneous Speaking – Thinking on Your Feet', duration: '20 min', icon: '🧠' },
      { id: 'sp-4-11', title: 'Advanced Vocabulary & Professional Expressions', duration: '20 min', icon: '📚' },
      { id: 'sp-4-12', title: 'Customer-Centric Thinking & First-Call Resolution', duration: '20 min', icon: '🎯' },
      { id: 'sp-4-13', title: 'Team Communication & Workplace Etiquette', duration: '20 min', icon: '👥' },
      { id: 'sp-4-14', title: 'Assessment', duration: '30 min', icon: '🏆' },
    ],
  },
];

// ── Writing Modules ───────────────────────────────────────────
const WRITING_MODULES = [
  {
    id: 'wr-1', number: 1,
    title: 'Grammar Foundations',
    description: 'Build a strong base with grammar rules, sentence formation, tenses, and workplace writing fundamentals.',
    emoji: '📝', color: '#3b82f6', bg: '#eff6ff',
    duration: '12 hours', tag: 'Beginner',
    subText: 'Workplace Writing • Sentence Structure • Tenses • Punctuation • Workplace Paragraphs',
    subModules: [
      { id: 'wr-1-1', title: 'Introduction to Workplace Writing', duration: '20 min', icon: '📝' },
      { id: 'wr-1-2', title: 'Why Writing Matters in Everyday Life & BPO', duration: '20 min', icon: '💼' },
      { id: 'wr-1-3', title: 'Writing vs Speaking', duration: '20 min', icon: '⚖️' },
      { id: 'wr-1-4', title: 'Characteristics of Good Writing', duration: '20 min', icon: '✨' },
      { id: 'wr-1-5', title: 'Subject, Verb & Object (SVO)', duration: '20 min', icon: '🧱' },
      { id: 'wr-1-6', title: 'Sentence Formation', duration: '20 min', icon: '✏️' },
      { id: 'wr-1-7', title: 'Word Order', duration: '20 min', icon: '🔤' },
      { id: 'wr-1-8', title: 'Types of Sentences', duration: '20 min', icon: '📄' },
      { id: 'wr-1-9', title: 'Everyday Vocabulary', duration: '20 min', icon: '📚' },
      { id: 'wr-1-10', title: 'Workplace Vocabulary', duration: '20 min', icon: '🏢' },
      { id: 'wr-1-11', title: 'Nouns', duration: '20 min', icon: '🏷️' },
      { id: 'wr-1-12', title: 'Pronouns', duration: '20 min', icon: '👤' },
      { id: 'wr-1-13', title: 'Verbs', duration: '20 min', icon: '⚡' },
      { id: 'wr-1-14', title: 'Adjectives', duration: '20 min', icon: '🎨' },
      { id: 'wr-1-15', title: 'Adverbs', duration: '20 min', icon: '🚀' },
      { id: 'wr-1-16', title: 'Articles (A, An, The)', duration: '20 min', icon: '🔤' },
      { id: 'wr-1-17', title: 'Prepositions', duration: '20 min', icon: '📍' },
      { id: 'wr-1-18', title: 'Conjunctions', duration: '20 min', icon: '🔗' },
      { id: 'wr-1-19', title: 'Subject–Verb Agreement', duration: '20 min', icon: '⚖️' },
      { id: 'wr-1-20', title: 'Simple Present Tense', duration: '20 min', icon: '⏱️' },
      { id: 'wr-1-21', title: 'Present Continuous Tense', duration: '20 min', icon: '🔄' },
      { id: 'wr-1-22', title: 'Simple Past Tense', duration: '20 min', icon: '⏪' },
      { id: 'wr-1-23', title: 'Simple Future Tense', duration: '20 min', icon: '⏩' },
      { id: 'wr-1-24', title: 'Question Formation', duration: '20 min', icon: '❓' },
      { id: 'wr-1-25', title: 'Negative Sentences', duration: '20 min', icon: '🚫' },
      { id: 'wr-1-26', title: 'Capitalization', duration: '20 min', icon: '🔠' },
      { id: 'wr-1-27', title: 'Punctuation', duration: '20 min', icon: '❗' },
      { id: 'wr-1-28', title: 'Spelling Rules', duration: '20 min', icon: '✍️' },
      { id: 'wr-1-29', title: 'Common MTI Mistakes', duration: '20 min', icon: '⚠️' },
      { id: 'wr-1-30', title: 'Proofreading Basics', duration: '20 min', icon: '🔍' },
      { id: 'wr-1-31', title: 'Writing Simple Workplace Sentences', duration: '20 min', icon: '💼' },
      { id: 'wr-1-32', title: 'Self Introduction Writing', duration: '20 min', icon: '👋' },
      { id: 'wr-1-33', title: 'Daily Routine Writing', duration: '20 min', icon: '📅' },
      { id: 'wr-1-34', title: 'Writing Simple Descriptions', duration: '20 min', icon: '📝' },
      { id: 'wr-1-35', title: 'Writing Short Paragraphs', duration: '20 min', icon: '📑' },
      { id: 'wr-1-36', title: 'Filling Forms Correctly', duration: '20 min', icon: '📋' },
      { id: 'wr-1-37', title: 'Assessment', duration: '30 min', icon: '🏆' },
    ],
  },
  {
    id: 'wr-2', number: 2,
    title: 'Professional Emails',
    description: 'Write clear, polite, and structured customer service emails and professional chat messages.',
    emoji: '✉️', color: '#8b5cf6', bg: '#f5f3ff',
    duration: '14 hours', tag: 'Intermediate',
    subText: 'Professional Vocabulary • Email Structure • Requests & Confirmations • Chat Etiquette',
    subModules: [
      { id: 'wr-2-1', title: 'Professional Vocabulary', duration: '20 min', icon: '📚' },
      { id: 'wr-2-2', title: 'Positive Language', duration: '20 min', icon: '🌟' },
      { id: 'wr-2-3', title: 'Formal vs Informal Writing', duration: '20 min', icon: '👔' },
      { id: 'wr-2-4', title: 'Professional Tone', duration: '20 min', icon: '🎯' },
      { id: 'wr-2-5', title: 'Polite Expressions', duration: '20 min', icon: '🙏' },
      { id: 'wr-2-6', title: 'Modal Verbs', duration: '20 min', icon: '💡' },
      { id: 'wr-2-7', title: 'Quantifiers', duration: '20 min', icon: '🔢' },
      { id: 'wr-2-8', title: 'Present Perfect Tense', duration: '20 min', icon: '⏱️' },
      { id: 'wr-2-9', title: 'Past Continuous Tense', duration: '20 min', icon: '🔄' },
      { id: 'wr-2-10', title: 'Past Perfect Tense', duration: '20 min', icon: '⏪' },
      { id: 'wr-2-11', title: 'Future Continuous Tense', duration: '20 min', icon: '⏩' },
      { id: 'wr-2-12', title: 'Will vs Going To', duration: '20 min', icon: '🔮' },
      { id: 'wr-2-13', title: 'Linking Words', duration: '20 min', icon: '🔗' },
      { id: 'wr-2-14', title: 'Cohesion', duration: '20 min', icon: '🧩' },
      { id: 'wr-2-15', title: 'Coherence', duration: '20 min', icon: '🧠' },
      { id: 'wr-2-16', title: 'Topic Sentences', duration: '20 min', icon: '📌' },
      { id: 'wr-2-17', title: 'Supporting Sentences', duration: '20 min', icon: '🧱' },
      { id: 'wr-2-18', title: 'Concluding Sentences', duration: '20 min', icon: '🏁' },
      { id: 'wr-2-19', title: 'Request Messages', duration: '20 min', icon: '📩' },
      { id: 'wr-2-20', title: 'Reminder Messages', duration: '20 min', icon: '⏰' },
      { id: 'wr-2-21', title: 'Confirmation Messages', duration: '20 min', icon: '✅' },
      { id: 'wr-2-22', title: 'Thank You Messages', duration: '20 min', icon: '💙' },
      { id: 'wr-2-23', title: 'Apology Messages', duration: '20 min', icon: '🙇' },
      { id: 'wr-2-24', title: 'Leave Request Writing', duration: '20 min', icon: '🏖️' },
      { id: 'wr-2-25', title: 'Follow-up Messages', duration: '20 min', icon: '📬' },
      { id: 'wr-2-26', title: 'Clarification Messages', duration: '20 min', icon: '❓' },
      { id: 'wr-2-27', title: 'Email Structure', duration: '20 min', icon: '📄' },
      { id: 'wr-2-28', title: 'Subject Line Writing', duration: '20 min', icon: '📌' },
      { id: 'wr-2-29', title: 'Greetings & Salutations', duration: '20 min', icon: '👋' },
      { id: 'wr-2-30', title: 'Email Body', duration: '20 min', icon: '📝' },
      { id: 'wr-2-31', title: 'Professional Closing', duration: '20 min', icon: '✍️' },
      { id: 'wr-2-32', title: 'Email Signature', duration: '20 min', icon: '📇' },
      { id: 'wr-2-33', title: 'Email Etiquette', duration: '20 min', icon: '⚖️' },
      { id: 'wr-2-34', title: 'Introduction to Chat Writing', duration: '20 min', icon: '💬' },
      { id: 'wr-2-35', title: 'Chat Etiquette', duration: '20 min', icon: '🤝' },
      { id: 'wr-2-36', title: 'Greeting Customers', duration: '20 min', icon: '😃' },
      { id: 'wr-2-37', title: 'Customer Verification', duration: '20 min', icon: '🛡️' },
      { id: 'wr-2-38', title: 'Customer Response Writing', duration: '20 min', icon: '💬' },
      { id: 'wr-2-39', title: 'Closing Customer Chats', duration: '20 min', icon: '✅' },
      { id: 'wr-2-40', title: 'Assessment', duration: '30 min', icon: '🏆' },
    ],
  },
  {
    id: 'wr-3', number: 3,
    title: 'Handling Complaints',
    description: 'Master writing responses to complex complaints, CRM notes, ticket resolutions, and shift documentation.',
    emoji: '🛡️', color: '#ef4444', bg: '#fef2f2',
    duration: '14 hours', tag: 'Intermediate',
    subText: 'Empathy & Ownership • Refund Emails • CRM Ticket Notes • Live Chat Simulations',
    subModules: [
      { id: 'wr-3-1', title: 'Business Email Writing', duration: '20 min', icon: '✉️' },
      { id: 'wr-3-2', title: 'Professional Tone', duration: '20 min', icon: '🎯' },
      { id: 'wr-3-3', title: 'Customer Communication', duration: '20 min', icon: '🗣️' },
      { id: 'wr-3-4', title: 'Empathy Statements', duration: '20 min', icon: '💙' },
      { id: 'wr-3-5', title: 'Ownership Statements', duration: '20 min', icon: '🤝' },
      { id: 'wr-3-6', title: 'Active Voice', duration: '20 min', icon: '⚡' },
      { id: 'wr-3-7', title: 'Passive Voice', duration: '20 min', icon: '⚖️' },
      { id: 'wr-3-8', title: 'Direct & Indirect Speech', duration: '20 min', icon: '💬' },
      { id: 'wr-3-9', title: 'Zero Conditional', duration: '20 min', icon: '⚙️' },
      { id: 'wr-3-10', title: 'First Conditional', duration: '20 min', icon: '➡️' },
      { id: 'wr-3-11', title: 'Complaint Email Writing', duration: '20 min', icon: '🚨' },
      { id: 'wr-3-12', title: 'Refund Email Writing', duration: '20 min', icon: '💰' },
      { id: 'wr-3-13', title: 'Apology & De-escalation Writing', duration: '20 min', icon: '🧊' },
      { id: 'wr-3-14', title: 'Explaining Company Policies', duration: '20 min', icon: '📜' },
      { id: 'wr-3-15', title: 'Offering Alternatives & Solutions', duration: '20 min', icon: '💡' },
      { id: 'wr-3-16', title: 'Live Chat Writing Structure', duration: '20 min', icon: '💬' },
      { id: 'wr-3-17', title: 'Fast & Professional Chat Responses', duration: '20 min', icon: '⚡' },
      { id: 'wr-3-18', title: 'Handling Difficult Customers in Chat', duration: '20 min', icon: '🔥' },
      { id: 'wr-3-19', title: 'CRM Ticket Notes Basics', duration: '20 min', icon: '📝' },
      { id: 'wr-3-20', title: 'Structuring Clear CRM Summaries', duration: '20 min', icon: '📊' },
      { id: 'wr-3-21', title: 'Resolution Notes & Case Closing', duration: '20 min', icon: '✅' },
      { id: 'wr-3-22', title: 'Internal Escalation Notes', duration: '20 min', icon: '🔺' },
      { id: 'wr-3-23', title: 'Shift Handover Documentation', duration: '20 min', icon: '🔄' },
      { id: 'wr-3-24', title: 'Meeting Notes', duration: '20 min', icon: '📌' },
      { id: 'wr-3-25', title: 'Daily Status Reports', duration: '20 min', icon: '📈' },
      { id: 'wr-3-26', title: 'Business Reports', duration: '20 min', icon: '📑' },
      { id: 'wr-3-27', title: 'Writing Clear Instructions', duration: '20 min', icon: '💡' },
      { id: 'wr-3-28', title: 'Process Documentation', duration: '20 min', icon: '📋' },
      { id: 'wr-3-29', title: 'Editing Business Documents', duration: '20 min', icon: '✏️' },
      { id: 'wr-3-30', title: 'Proofreading Business Documents', duration: '20 min', icon: '🔍' },
      { id: 'wr-3-31', title: 'Standard Response Templates', duration: '20 min', icon: '📁' },
      { id: 'wr-3-32', title: 'Knowledge Base Writing', duration: '20 min', icon: '📚' },
      { id: 'wr-3-33', title: 'Customer Scenario Writing', duration: '20 min', icon: '🎭' },
      { id: 'wr-3-34', title: 'Email Simulation', duration: '20 min', icon: '✉️' },
      { id: 'wr-3-35', title: 'Chat Simulation', duration: '20 min', icon: '💬' },
      { id: 'wr-3-36', title: 'CRM Simulation', duration: '20 min', icon: '🖥️' },
      { id: 'wr-3-37', title: 'Workplace Documentation Practice', duration: '20 min', icon: '📂' },
      { id: 'wr-3-38', title: 'AI Business Writing', duration: '20 min', icon: '🤖' },
      { id: 'wr-3-39', title: 'Integrated Business Writing', duration: '20 min', icon: '🌐' },
      { id: 'wr-3-40', title: 'Assessment', duration: '30 min', icon: '🏆' },
    ],
  },
  {
    id: 'wr-4', number: 4,
    title: 'Advanced Business Writing',
    description: 'SOPs, incident reports, SLA pressure drills, escalation management, and executive production simulations.',
    emoji: '💼', color: '#14b8a6', bg: '#f0fdfa',
    duration: '12 hours', tag: 'Advanced',
    subText: 'Escalation Management • SOPs & Compliance • Timed Drills • Root Cause Analysis',
    subModules: [
      { id: 'wr-4-1', title: 'Advanced Customer Communication', duration: '20 min', icon: '🌟' },
      { id: 'wr-4-2', title: 'Complaint Resolution', duration: '20 min', icon: '🛡️' },
      { id: 'wr-4-3', title: 'Escalation Management', duration: '20 min', icon: '🔺' },
      { id: 'wr-4-4', title: 'Conflict Resolution', duration: '20 min', icon: '🕊️' },
      { id: 'wr-4-5', title: 'Customer Retention Communication', duration: '20 min', icon: '🤝' },
      { id: 'wr-4-6', title: 'Advanced Modal Verbs', duration: '20 min', icon: '💡' },
      { id: 'wr-4-7', title: 'Second Conditional', duration: '20 min', icon: '➡️' },
      { id: 'wr-4-8', title: 'Advanced Sentence Variety', duration: '20 min', icon: '🎨' },
      { id: 'wr-4-9', title: 'Advanced Linking Devices', duration: '20 min', icon: '🔗' },
      { id: 'wr-4-10', title: 'Persuasive Writing', duration: '20 min', icon: '📣' },
      { id: 'wr-4-11', title: 'Writing Standard Operating Procedures (SOPs)', duration: '20 min', icon: '📜' },
      { id: 'wr-4-12', title: 'SOP Formatting & Checklist Design', duration: '20 min', icon: '📋' },
      { id: 'wr-4-13', title: 'Compliance & Policy Documentation', duration: '20 min', icon: '⚖️' },
      { id: 'wr-4-14', title: 'Regulatory & Legal Notice Writing', duration: '20 min', icon: '🚨' },
      { id: 'wr-4-15', title: 'Incident Report Writing', duration: '20 min', icon: '📑' },
      { id: 'wr-4-16', title: 'Security & Data Privacy Documentation', duration: '20 min', icon: '🔒' },
      { id: 'wr-4-17', title: 'Timed Email Writing Drills', duration: '20 min', icon: '⏱️' },
      { id: 'wr-4-18', title: 'Timed Chat Response Drills', duration: '20 min', icon: '⚡' },
      { id: 'wr-4-19', title: 'Timed Escalation Summary Drills', duration: '20 min', icon: '📊' },
      { id: 'wr-4-20', title: 'Speed & Accuracy under SLA Pressure', duration: '20 min', icon: '🎯' },
      { id: 'wr-4-21', title: 'Multi-Channel Support Communication', duration: '20 min', icon: '🌐' },
      { id: 'wr-4-22', title: 'Handling Multiple Simultaneous Chats', duration: '20 min', icon: '💬' },
      { id: 'wr-4-23', title: 'High-Priority Customer Cases', duration: '20 min', icon: '🔥' },
      { id: 'wr-4-24', title: 'Complex Customer Scenarios', duration: '20 min', icon: '🧠' },
      { id: 'wr-4-25', title: 'End-to-End Customer Journey Writing', duration: '20 min', icon: '🗺️' },
      { id: 'wr-4-26', title: 'Documentation Audit', duration: '20 min', icon: '🔍' },
      { id: 'wr-4-27', title: 'Quality Audit Writing', duration: '20 min', icon: '📊' },
      { id: 'wr-4-28', title: 'Root Cause Analysis Writing', duration: '20 min', icon: '🔬' },
      { id: 'wr-4-29', title: 'Professional Report Writing', duration: '20 min', icon: '📑' },
      { id: 'wr-4-30', title: 'Executive Summary Writing', duration: '20 min', icon: '👑' },
      { id: 'wr-4-31', title: 'Production Email Simulation', duration: '20 min', icon: '✉️' },
      { id: 'wr-4-32', title: 'Production Chat Simulation', duration: '20 min', icon: '💬' },
      { id: 'wr-4-33', title: 'Production Documentation', duration: '20 min', icon: '📂' },
      { id: 'wr-4-34', title: 'Multi-task Writing', duration: '20 min', icon: '⚙️' },
      { id: 'wr-4-35', title: 'Assessment', duration: '30 min', icon: '🏆' },
    ],
  },
];

const MODULES_MAP = { speaking: SPEAKING_MODULES, writing: WRITING_MODULES };

// ── 3-Step Lesson Flow: Video → Quiz/Pronunciation → AI Tutor ─
function LessonFlowView({ sub, module, category, onBack, onComplete, onUncomplete, isCompleted }) {
  const [step, setStep] = useState('video'); // 'video' | 'quiz' | 'tutor'
  const videoRef = useRef(null);
  const isSpeaking = category === 'speaking';
  const videoSrc = VIDEO_SOURCES[sub.id] || null;

  const [videoCompleted, setVideoCompleted] = useState(!videoSrc);

  useEffect(() => {
    setVideoCompleted(!videoSrc);
  }, [sub?.id, videoSrc]);

  // Quiz state (writing lessons — multiple-choice knowledge check)
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [showExp, setShowExp] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [tutorOpened, setTutorOpened] = useState(false);
  const [setUsed, setSetUsed] = useState('SET_1');

  const [dbWritingQuestions, setDbWritingQuestions] = useState([]);
  const [retakeModalOpen, setRetakeModalOpen] = useState(false);
  const [hasStartedRetake, setHasStartedRetake] = useState(false);

  const fetchWritingQuestions = async (excludeSet = null) => {
    try {
      let url = `/writing/questions/${sub.id}`;
      if (excludeSet) url += `?exclude=${excludeSet}`;
      const res = await api.get(url);
      if (res.data) {
        if (res.data.set_used) setSetUsed(res.data.set_used);
        if (Array.isArray(res.data.partA) && res.data.partA.length > 0) {
          setDbWritingQuestions(res.data.partA);
        }
      }
    } catch (err) {
      console.warn('Could not fetch writing questions:', err);
    }
  };

  const handleStepClick = (targetStep) => {
    if (targetStep === step) return;
    if (targetStep !== 'video' && !videoCompleted && !isCompleted) {
      alert('Please watch the full video lecture before advancing to the assessment.');
      return;
    }
    if (isCompleted && !hasStartedRetake && targetStep === 'quiz') {
      setRetakeModalOpen(true);
      return;
    }
    setStep(targetStep);
  };

  const handleConfirmRetake = async () => {
    setRetakeModalOpen(false);
    setHasStartedRetake(true);
    setQIdx(0);
    setSelected(null);
    setIsCorrect(null);
    setShowExp(false);
    setCorrectCount(0);
    setQuizDone(false);
    setQuizResponseList([]);
    await fetchWritingQuestions(setUsed);
    setStep('quiz');
  };

  const [loading, setLoading] = useState(true);

  // Fetch writing set and questions for this specific lesson
  useEffect(() => {
    if (sub?.id) {
      CompanionEvents.emit('PRELOAD_TUTOR_SESSION', {
        lessonId: sub.id,
        topic: sub.title,
        moduleTitle: module.title,
        category: isSpeaking ? 'speaking' : 'writing',
      });
    }

    let active = true;
    (async () => {
      setLoading(true);
      try {
        if (!isSpeaking) {
          const res = await api.get(`/writing/questions/${sub.id}`);
          if (active && res.data) {
            if (res.data.set_used) setSetUsed(res.data.set_used);
            if (Array.isArray(res.data.partA) && res.data.partA.length > 0) {
              setDbWritingQuestions(res.data.partA);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch writing question set, using SET_1 fallback:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [sub.id, isSpeaking]);

  // Pronunciation test state (speaking lessons)
  const [lessonData, setLessonData] = useState(null);
  const [loadingPrompt, setLoadingPrompt] = useState(isSpeaking);
  const [pronState, setPronState] = useState('idle'); // idle | recording | analyzing | completed
  const [pronSeconds, setPronSeconds] = useState(0);
  const [pronResult, setPronResult] = useState(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const pronTimerRef = useRef(null);
  const pronRecognitionRef = useRef(null);
  const pronMediaRecorderRef = useRef(null);
  const pronAudioChunksRef = useRef([]);
  const pronLocalTranscriptRef = useRef('');
  const ttsAudioRef = useRef(null);

  const FALLBACK_QUIZ_QUESTIONS = [
    {
      q: 'Which sentence demonstrates correct business writing tone?',
      opts: ['Hey, send me the money ASAP!', 'Please process the payment at your earliest convenience.', 'Give money now.', 'Why money not sent?'],
      options: ['Hey, send me the money ASAP!', 'Please process the payment at your earliest convenience.', 'Give money now.', 'Why money not sent?'],
      correct: 1,
      exp: 'Please process the payment at your earliest convenience.',
      explanation: 'Please process the payment at your earliest convenience.'
    },
    {
      q: 'Choose the correct punctuation: "Dear Ms. Davis___ I am writing to follow up on..."',
      opts: [',', '!', '?', ';'],
      options: [',', '!', '?', ';'],
      correct: 0,
      exp: ',',
      explanation: ','
    }
  ];

  // Format DB questions into quiz structure
  const formattedDbQuestions = (dbWritingQuestions || []).map(q => {
    const opts = [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean);
    const correctIdx = (q.correctOption === 'B' || q.correctOption === 'b') ? 1 :
                       (q.correctOption === 'C' || q.correctOption === 'c') ? 2 :
                       (q.correctOption === 'D' || q.correctOption === 'd') ? 3 : 0;
    return {
      q: q.question || 'Question',
      opts,
      options: opts,
      correct: correctIdx,
      exp: q.answer || 'Good job!',
      explanation: q.answer || 'Good job!'
    };
  }).filter(q => q.options.length > 0);

  const activeQuestions = formattedDbQuestions.length > 0
    ? formattedDbQuestions
    : FALLBACK_QUIZ_QUESTIONS;

  const currentQ = activeQuestions[qIdx] || activeQuestions[0] || FALLBACK_QUIZ_QUESTIONS[0];
  const totalQ = activeQuestions.length;

  const fallbackSpeakingPrompt = SPEAKING_PROMPTS[sub.id] || SPEAKING_PROMPTS['default'];
  const speakingPrompt = lessonData && isSpeaking
    ? { prompt: lessonData.prompt, text: lessonData.questionText, tip: lessonData.explanation }
    : fallbackSpeakingPrompt;

  // Fetch the real lesson prompt from the DB for speaking lessons
  useEffect(() => {
    if (!isSpeaking) return;
    let active = true;
    (async () => {
      setLoadingPrompt(true);
      try {
        const res = await api.get(`/assessment/lesson-question/${sub.id}`);
        if (active) setLessonData(res.data || null);
      } catch (err) {
        console.error('Failed to load lesson speaking prompt, using fallback', err);
        if (active) setLessonData(null);
      } finally {
        if (active) setLoadingPrompt(false);
      }
    })();
    return () => { active = false; };
  }, [sub.id, isSpeaking]);

  // Pronunciation recording timer
  useEffect(() => {
    if (pronState === 'recording') {
      setPronSeconds(0);
      pronTimerRef.current = setInterval(() => {
        setPronSeconds(prev => {
          if (prev >= 11) {
            stopPronRecording();
            return 12;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (pronTimerRef.current) {
      clearInterval(pronTimerRef.current);
      pronTimerRef.current = null;
    }
    return () => { if (pronTimerRef.current) clearInterval(pronTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronState]);

  // Cleanup audio/speech on unmount
  useEffect(() => {
    return () => {
      if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (pronRecognitionRef.current) { try { pronRecognitionRef.current.stop(); } catch (e) { } }
    };
  }, []);

  const fallbackSpeak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.onstart = () => setTtsPlaying(true);
      utterance.onend = () => setTtsPlaying(false);
      utterance.onerror = () => setTtsPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const playPromptTTS = () => {
    const cleanText = (speakingPrompt?.text || '').replace(/[•\d.\-]/g, '').trim();
    if (!('speechSynthesis' in window)) return;

    // If already speaking, stop it (toggle off)
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setTtsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onstart = () => setTtsPlaying(true);
    utterance.onend = () => setTtsPlaying(false);
    utterance.onerror = () => setTtsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  const startPronRecording = async () => {
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setTtsPlaying(false);

    setPronState('recording');
    setPronResult(null);
    pronAudioChunksRef.current = [];
    pronLocalTranscriptRef.current = '';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = 'en-US';
        rec.onresult = (event) => {
          let text = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) text += event.results[i][0].transcript + ' ';
          }
          pronLocalTranscriptRef.current += text;
        };
        pronRecognitionRef.current = rec;
        rec.start();
      } catch (e) {
        console.warn('Parallel SpeechRecognition start failed:', e);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      pronMediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) pronAudioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(pronAudioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await sendPronToBackend(audioBlob);
      };

      mediaRecorder.start();
    } catch (err) {
      console.error('Microphone access failed, relying on browser speech recognition only:', err);
    }
  };

  const stopPronRecording = () => {
    setPronState('analyzing');
    if (pronMediaRecorderRef.current && pronMediaRecorderRef.current.state !== 'inactive') {
      pronMediaRecorderRef.current.stop();
    } else if (pronRecognitionRef.current) {
      try { pronRecognitionRef.current.stop(); } catch (e) { }
      setTimeout(() => evaluatePronClientSide(pronLocalTranscriptRef.current), 600);
    } else {
      evaluatePronClientSide('');
    }
  };

  const sendPronToBackend = async (audioBlob) => {
    setPronState('analyzing');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      const response = await api.post(`/assessment/lesson/speaking/transcribe/${sub.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = response.data;
      setPronResult({
        score: data.similarityScore ?? 0,
        feedback: data.feedback || '',
        transcript: data.transcript || '',
      });
      setPronState('completed');
    } catch (err) {
      console.error('Backend pronunciation scoring failed, falling back to local transcript', err);
      if (pronRecognitionRef.current) { try { pronRecognitionRef.current.stop(); } catch (e) { } }
      setTimeout(() => evaluatePronClientSide(pronLocalTranscriptRef.current), 300);
    }
  };

  const evaluatePronClientSide = (transcript) => {
    setPronState('analyzing');
    setTimeout(() => {
      const cleanText = (text) => text
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()?•]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      const targetText = (speakingPrompt?.text || '').replace(/[•\d.\-]/g, '');
      const target = cleanText(targetText);
      const spoken = cleanText(transcript);

      if (!spoken) {
        setPronResult({ score: 0, feedback: 'No voice detected. Please speak clearly into your microphone.', transcript: '' });
        setPronState('completed');
        return;
      }

      const targetWords = target.split(' ').filter(Boolean);
      const spokenWords = spoken.split(' ').filter(Boolean);
      let matches = 0;
      targetWords.forEach(w => { if (spokenWords.includes(w)) matches++; });

      let score = Math.round((matches / targetWords.length) * 100);
      score = score > 0 ? Math.min(100, Math.max(15, score)) : 0;

      const feedback = score >= 85
        ? 'Excellent pronunciation and natural rhythm. Well done!'
        : score >= 70
          ? 'Good attempt! Keep practicing to improve syllable stress and clarity.'
          : 'We had trouble matching your voice. Speak clearly and follow the pronunciation tips.';

      setPronResult({ score, feedback, transcript });
      setPronState('completed');
    }, 1200);
  };

  const handleRetryPron = () => {
    setPronState('idle');
    setPronResult(null);
    setPronSeconds(0);
  };

  const [quizResponseList, setQuizResponseList] = useState([]);

  const handleSelectOption = (idx) => {
    if (selected !== null || !currentQ) return;
    const correct = idx === currentQ.correct;
    setSelected(idx);
    setIsCorrect(correct);
    setShowExp(true);
    if (correct) setCorrectCount(c => c + 1);

    const optsList = currentQ.options || currentQ.opts || [];
    const answerItem = {
      questionNumber: qIdx + 1,
      question: currentQ.q,
      userAnswer: optsList[idx] || '',
      correctAnswer: optsList[currentQ.correct] || '',
      isCorrect: correct,
      marks: correct ? 1 : 0
    };

    setQuizResponseList(prev => [...prev, answerItem]);
  };

  const handleNextQ = async () => {
    if (qIdx < totalQ - 1) {
      setQIdx(q => q + 1);
      setSelected(null);
      setIsCorrect(null);
      setShowExp(false);
    } else {
      setQuizDone(true);
      if (!isSpeaking) {
        const correctCountReal = quizResponseList.filter(q => q.isCorrect).length;
        const totalNum = Math.max(1, totalQ);
        const finalScore = Math.round((correctCountReal / totalNum) * 100);

        try {
          await api.post('/lesson/attempt', {
            moduleId: module?.id || sub.id.split('-').slice(0, 2).join('-'),
            lessonId: sub.id,
            level: 'BEGINNER',
            set: setUsed || 'SET_1',
            partAScore: finalScore,
            score: finalScore,
            status: 'completed',
            responses: {
              partA: {
                score: finalScore,
                totalQuestions: totalNum,
                correctAnswers: correctCountReal,
                questions: quizResponseList
              }
            }
          });
          if (onComplete) onComplete();
        } catch (err) {
          console.error('Failed to save writing attempt:', err);
        }
      }
    }
  };

  const handleOpenTutor = () => {
    setTutorOpened(true);
    CompanionEvents.emit('OPEN_TUTOR_SESSION', {
      lessonId: sub.id,
      topic: sub.title,
      moduleTitle: module.title,
      category,
    });
  };

  const scoreLabel = () => {
    const pct = Math.round((correctCount / totalQ) * 100);
    if (pct === 100) return { label: 'Perfect Score! 🎉', color: '#10b981' };
    if (pct >= 80) return { label: 'Great Job! 👏', color: '#3b82f6' };
    if (pct >= 60) return { label: 'Good Effort! 💪', color: '#f59e0b' };
    return { label: 'Keep Practicing! 📚', color: '#ef4444' };
  };

  const optionLabel = ['A', 'B', 'C', 'D'];
  const stepLabels = isSpeaking
    ? ['📹 Video Lecture', '🎤 Pronunciation', '🤖 AI Tutor']
    : ['📹 Video Lecture', '📝 Topic Assessment', '🤖 AI Tutor'];

  if (loading) {
    return (
      <div className="lf-container">
        <button className="lf-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back to {module?.title || 'Lessons'}
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '380px', width: '100%' }}>
          <Loader2 className="animate-spin" size={48} style={{ color: module?.color || '#6366f1', animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="lf-container">
      {/* Back button */}
      <button className="lf-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to Lessons
      </button>

      {/* Step indicator */}
      <div className="lf-step-bar">
        {['video', 'quiz', 'tutor'].map((s, i) => {
          const done = isCompleted ||
            (s === 'quiz' && (step === 'quiz' || step === 'tutor')) ||
            (s === 'video' && (step === 'quiz' || step === 'tutor')) ||
            (s === 'tutor' && step === 'tutor');
          const active = step === s;
          return (
            <div
              key={s}
              className={`lf-step-pill ${active ? 'lf-step-active' : done ? 'lf-step-done' : 'lf-step-idle'}`}
              onClick={() => handleStepClick(s)}
              style={{
                cursor: 'pointer',
                ...(isCompleted ? {
                  borderColor: '#10b981',
                  color: active ? '#fff' : '#10b981',
                  backgroundColor: active ? '#10b981' : '#f0fdf4'
                } : {})
              }}
            >
              {(done || isCompleted) && !active ? <Check size={13} /> : <span>{i + 1}</span>}
              {stepLabels[i]}
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: VIDEO ─────────────────────────────────────── */}
      {step === 'video' && (
        <div className="lf-card">
          <div className="lf-card-header">
            <BookOpen size={20} style={{ color: '#6366f1' }} />
            <div>
              <p className="lf-card-sub">Step 1 of 3 — Video Lecture</p>
              <h3 className="lf-card-title">{sub.title}</h3>
            </div>
          </div>

          {videoSrc ? (
            <div className="lf-video-wrap">
              <video
                ref={videoRef}
                className="lf-video"
                controls
                src={videoSrc}
                preload="metadata"
                onEnded={() => setVideoCompleted(true)}
                onTimeUpdate={(e) => {
                  if (e.target.currentTime > 0 && e.target.duration > 0 && e.target.currentTime >= e.target.duration - 1) {
                    setVideoCompleted(true);
                  }
                }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <div className="lf-video-placeholder">
              <Play size={48} style={{ color: '#94a3b8' }} />
              <p style={{ color: '#64748b', fontWeight: 600, marginTop: 12 }}>Video lecture coming soon</p>
              <p style={{ color: '#94a3b8', fontSize: 13 }}>The video for this lesson will be added shortly.</p>
            </div>
          )}

          <div className="lf-video-tip">
            <span>💡</span>
            <p>
              {!videoCompleted && !isCompleted ? (
                <>Please watch the full video lecture to unlock the assessment.</>
              ) : (
                <>Watch the video lecture, then click <strong>Continue to {isSpeaking ? 'Pronunciation Test' : 'Topic Assessment'}</strong> to test what you've learned.</>
              )}
            </p>
          </div>

          <button 
            className="lf-primary-btn" 
            onClick={() => handleStepClick('quiz')}
            disabled={!videoCompleted && !isCompleted}
            style={!videoCompleted && !isCompleted ? { opacity: 0.6, cursor: 'not-allowed', background: '#94a3b8' } : {}}
          >
            {!videoCompleted && !isCompleted ? (
              <>Watch Full Video to Unlock Next Step <Lock size={16} style={{ marginLeft: 6 }} /></>
            ) : (
              <>Continue to {isSpeaking ? 'Pronunciation Test' : 'Topic Assessment'} <ChevronRight size={18} /></>
            )}
          </button>
        </div>
      )}

      {/* ── STEP 2A: PRONUNCIATION TEST (speaking lessons) ─────── */}
      {step === 'quiz' && isSpeaking && (
        <div className="lf-card">
          <div className="lf-card-header">
            <Mic size={20} style={{ color: '#8b5cf6' }} />
            <div>
              <p className="lf-card-sub">Step 2 of 3 — Pronunciation Test</p>
              <h3 className="lf-card-title">{speakingPrompt.prompt}</h3>
            </div>
          </div>

          {loadingPrompt ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <Loader2 className="animate-spin" size={32} style={{ color: '#8b5cf6' }} />
            </div>
          ) : (
            <>
              <div className="prompt-card" style={{ '--theme-color': '#8b5cf6' }}>
                <div className="prompt-card-header">
                  <button
                    type="button"
                    onClick={playPromptTTS}
                    disabled={ttsLoading}
                    className={`prompt-tts-btn ${ttsPlaying ? 'prompt-tts-btn--playing' : ''}`}
                    title="Listen to correct pronunciation"
                    style={{
                      background: 'none', border: 'none', padding: 0, marginRight: 8,
                      cursor: ttsLoading ? 'wait' : 'pointer', display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: ttsPlaying ? '#8b5cf6' : '#64748b', verticalAlign: 'middle',
                    }}
                  >
                    {ttsLoading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Volume2 size={20} className={ttsPlaying ? 'animate-pulse' : ''} />
                    )}
                  </button>
                  <h4 style={{ display: 'inline-block', verticalAlign: 'middle', margin: 0 }}>Read Aloud</h4>
                </div>
                <div className="prompt-card-text" style={{ borderLeftColor: '#8b5cf6' }}>
                  {speakingPrompt.text.split('\n').map((line, idx) => (
                    <p key={idx} style={{ margin: '4px 0' }}>{line}</p>
                  ))}
                </div>
                <div className="prompt-card-tip">
                  <strong>💡 Tip:</strong> {speakingPrompt.tip}
                </div>
              </div>

              {pronState === 'idle' && (
                <div className="speaking-action-zone">
                  <p className="speaking-action-hint">Click the microphone and read the passage above aloud.</p>
                  <button className="record-btn" onClick={startPronRecording} style={{ '--theme-color': '#8b5cf6' }}>
                    <Mic size={32} />
                  </button>
                </div>
              )}

              {pronState === 'recording' && (
                <div className="speaking-action-zone">
                  <p className="speaking-action-hint recording-text">Recording... Speak clearly now.</p>
                  <div className="wave-animation">
                    <span className="wave-bar bar-1" style={{ backgroundColor: '#8b5cf6' }}></span>
                    <span className="wave-bar bar-2" style={{ backgroundColor: '#8b5cf6' }}></span>
                    <span className="wave-bar bar-3" style={{ backgroundColor: '#8b5cf6' }}></span>
                    <span className="wave-bar bar-4" style={{ backgroundColor: '#8b5cf6' }}></span>
                    <span className="wave-bar bar-5" style={{ backgroundColor: '#8b5cf6' }}></span>
                  </div>
                  <p className="recording-timer">0:{pronSeconds < 10 ? `0${pronSeconds}` : pronSeconds} / 0:12</p>
                  <button className="record-btn record-btn--recording" onClick={stopPronRecording}>
                    <Square size={24} fill="#fff" />
                  </button>
                </div>
              )}

              {pronState === 'analyzing' && (
                <div className="speaking-action-zone">
                  <Loader2 className="animate-spin analysis-loader" size={48} style={{ color: '#8b5cf6' }} />
                  <p className="analyzing-text">AI is analyzing your pronunciation & fluency...</p>
                </div>
              )}

              {pronState === 'completed' && pronResult && (
                <div className="speaking-results-zone">
                  <div className="score-header-box">
                    <div className="score-circle" style={{ borderColor: pronResult.score >= 70 ? '#10b981' : '#ef4444' }}>
                      <span className="score-num">{pronResult.score}%</span>
                      <span className="score-lbl">AI Score</span>
                    </div>
                    <div className="score-metrics">
                      <div className="metric-row">
                        <span>Accuracy:</span>
                        <div className="metric-bar-track">
                          <div className="metric-bar-fill" style={{ width: `${pronResult.score}%`, background: '#8b5cf6' }}></div>
                        </div>
                        <span className="metric-val">{pronResult.score}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="feedback-card" style={pronResult.score < 70 ? { background: '#fef2f2', border: '1px solid #fca5a5' } : {}}>
                    <Sparkles size={20} className="feedback-icon" style={{ color: pronResult.score >= 70 ? '#16a34a' : '#ef4444' }} />
                    <div className="feedback-text">
                      <h5 style={pronResult.score < 70 ? { color: '#7f1d1d' } : {}}>AI Pronunciation Feedback</h5>
                      <p style={pronResult.score < 70 ? { color: '#991b1b' } : {}}>{pronResult.feedback}</p>
                    </div>
                  </div>

                  {pronResult.transcript && (
                    <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>What you said:</span>
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: '#334155', fontStyle: 'italic' }}>"{pronResult.transcript}"</p>
                    </div>
                  )}

                  <div className="result-buttons">
                    <button className="retry-btn" onClick={handleRetryPron}>
                      <RefreshCw size={16} /> Try Again
                    </button>
                    <button className="lf-primary-btn" style={{ width: 'auto', flex: 1 }} onClick={() => setStep('tutor')}>
                      Meet Your AI Tutor <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── STEP 2B: GAMIFIED QUIZ (writing lessons) ───────────── */}
      {step === 'quiz' && !isSpeaking && !quizDone && (
        <div className="lf-card">
          <div className="lf-card-header">
            <Brain size={20} style={{ color: '#8b5cf6' }} />
            <div>
              <p className="lf-card-sub">Step 2 of 3 — Topic Assessment</p>
              <h3 className="lf-card-title">{sub?.title || 'Lesson'} Topic Assessment</h3>
            </div>
          </div>

          {/* Progress bar */}
          <div className="lf-quiz-progress-track">
            <div className="lf-quiz-progress-fill" style={{ width: `${((qIdx) / totalQ) * 100}%` }} />
          </div>
          <p className="lf-quiz-counter">Question {qIdx + 1} of {totalQ}</p>

          {/* Question */}
          <div className="lf-question-box">
            <p className="lf-question-text">{currentQ.q}</p>
          </div>

          {/* Options */}
          <div className="lf-options-grid">
            {currentQ.options.map((opt, i) => {
              let cls = 'lf-option-btn';
              if (selected !== null) {
                if (i === currentQ.correct) cls += ' lf-option-correct';
                else if (i === selected && !isCorrect) cls += ' lf-option-wrong';
                else cls += ' lf-option-dim';
              }
              return (
                <button
                  key={i}
                  className={cls}
                  onClick={() => handleSelectOption(i)}
                  disabled={selected !== null}
                >
                  <span className="lf-option-letter">{optionLabel[i]}</span>
                  <span className="lf-option-text">{opt}</span>
                  {selected !== null && i === currentQ.correct && <Check size={18} className="lf-opt-icon" />}
                  {selected !== null && i === selected && !isCorrect && <X size={18} className="lf-opt-icon" />}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExp && (
            <div className={`lf-explanation ${isCorrect ? 'lf-exp-correct' : 'lf-exp-wrong'}`}>
              <span>{isCorrect ? '✅' : '❌'}</span>
              <div>
                <strong>{isCorrect ? 'Correct!' : 'Not quite.'}</strong>
                <p>{currentQ.explanation}</p>
              </div>
            </div>
          )}

          {selected !== null && (
            <button className="lf-primary-btn" onClick={handleNextQ} style={{ marginTop: 12 }}>
              {qIdx < totalQ - 1 ? 'Next Question' : 'See My Score'} <ChevronRight size={18} />
            </button>
          )}
        </div>
      )}

      {/* ── QUIZ SCORE SUMMARY (writing lessons) ───────────────── */}
      {step === 'quiz' && !isSpeaking && quizDone && (
        <div className="lf-card lf-score-card">
          <Trophy size={52} style={{ color: '#f59e0b', margin: '0 auto 8px' }} />
          <h3 className="lf-score-title">{scoreLabel().label}</h3>
          <div className="lf-score-circle" style={{ borderColor: scoreLabel().color }}>
            <span style={{ color: scoreLabel().color, fontSize: 32, fontWeight: 700 }}>{correctCount}</span>
            <span style={{ color: '#94a3b8', fontSize: 14 }}>out of {totalQ}</span>
          </div>
          <div className="lf-score-breakdown">
            {(activeQuestions || []).map((q, i) => (
              <div key={i} className="lf-score-row">
                <span className={`lf-score-dot ${i < correctCount ? 'lf-dot-correct' : 'lf-dot-wrong'}`} />
                <span style={{ fontSize: 13, color: '#475569', flex: 1 }}>{(q.q || '').substring(0, 60)}...</span>
              </div>
            ))}
          </div>
          <button className="lf-primary-btn" style={{ marginTop: 20 }} onClick={() => setStep('tutor')}>
            Meet Your AI Tutor <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ── STEP 3: AI TUTOR ──────────────────────────────────── */}
      {step === 'tutor' && (
        <div className="lf-card lf-tutor-card">
          <div className="lf-card-header">
            <Star size={20} style={{ color: '#f59e0b' }} />
            <div>
              <p className="lf-card-sub">Step 3 of 3 — AI Tutor Session</p>
              <h3 className="lf-card-title">Learn with Tutor</h3>
            </div>
          </div>

          <div className="lf-tutor-intro">
            {/* Kenza 3D character */}
            <div style={{ width: 160, height: 220, flexShrink: 0 }}>
              <KenzaTutor state={tutorOpened ? 'talking' : 'hello'} size="100%" />
            </div>
            <div className="lf-tutor-bubble">
              <p><strong>Tutor</strong> is ready to coach you on <strong>{sub.title}</strong>!</p>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                Your AI tutor will walk you through key concepts, analyze your quiz answers, answer questions, and help reinforce what you learned.
              </p>
            </div>
          </div>

          <div className="lf-tutor-features">
            <div className="lf-tutor-feat"><span>✍️</span> Practice writing emails, chats & answers</div>
            <div className="lf-tutor-feat"><span>💬</span> Ask any question about the lesson</div>
            <div className="lf-tutor-feat"><span>📖</span> Get personalized feedback on your quiz answers</div>
          </div>

          {!tutorOpened ? (
            <button className="lf-tutor-open-btn" onClick={handleOpenTutor}>
              <span>✨</span> Open AI Tutor Session
            </button>
          ) : (
            <div className="lf-tutor-opened-note">
              <Check size={18} style={{ color: '#10b981' }} />
              <p>AI Tutor is open! Chat with Kenza in the overlay.</p>
            </div>
          )}

          <div className="lf-complete-section">
            <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
              After your tutor session, mark this lesson as complete to unlock the next one.
            </p>
            {isCompleted ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <div className="lf-completed-badge"><CheckCircle size={16} /> Lesson Completed!</div>
                <button className="lf-uncomplete-btn" onClick={onUncomplete}>Mark Incomplete</button>
              </div>
            ) : (
              <button
                className="lf-complete-btn"
                onClick={async () => {
                  if (!isSpeaking) {
                    const finalScore = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 100;
                    try {
                      await api.post('/lesson/attempt', {
                        moduleId: module?.id || sub.id.split('-').slice(0, 2).join('-'),
                        lessonId: sub.id,
                        level: 'BEGINNER',
                        set: setUsed || 'SET_1',
                        score: finalScore > 0 ? finalScore : 100,
                        responses: { manualCompletion: true }
                      });
                    } catch (err) {
                      console.error('Failed to save writing attempt:', err);
                    }
                  }
                  if (onComplete) onComplete();
                }}
              >
                <CheckCircle size={18} /> Mark Lesson as Complete ✓
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── RETAKE TEST CONFIRMATION MODAL ───────────────────────── */}
      {retakeModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)', textAlign: 'center'
          }}>
            <RefreshCw size={48} style={{ color: '#8b5cf6', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>
              Re-Take Practice Test?
            </h2>
            <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.5', marginBottom: '24px' }}>
              You have already completed this lesson. Would you like to attempt a new question set to improve your score?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => setRetakeModalOpen(false)}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1',
                  background: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer'
                }}>
                Cancel
              </button>
              <button 
                onClick={handleConfirmRetake}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: '#8b5cf6', color: '#fff', fontWeight: '600', cursor: 'pointer'
                }}>
                Start Retake 🔄
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '380px', width: '100%' }}>
          <Loader2 className="animate-spin" size={48} style={{ color: module?.color || '#6366f1', animation: 'spin 1s linear infinite' }} />
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

      <div className="module-detail-list">
        {module.subModules.map((sub, i) => {
          const done = completedSubs.includes(sub.id);
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

      {progress === 100 && (
        isAssessmentPassed ? (
          <div className="modules-assessment-card animate-fade-in" style={{
            background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
            border: '1.5px dashed #0284c7',
            borderRadius: '16px',
            padding: '20px',
            margin: '24px 0 0 0',
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
            margin: '24px 0 0 0',
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
  const { entryLevel } = useUser();
  const isIntermediate = entryLevel === 'intermediate';

  // For intermediate users — hide Module 1, renumber the rest from 1
  const allModules = MODULES_MAP[category.id];
  const modules = isIntermediate
    ? allModules.slice(1).map((m, i) => ({ ...m, number: i + 1 }))
    : allModules;

  const isCompleted = (module) =>
    module.subModules.every(s => completedSubModules.includes(s.id));

  const isUnlocked = (module, index) => {
    if (index === 0) return true;

    if (!isIntermediate && index === 1) {
      // Beginner: Module 2 unlocks after Module 1 assessment
      if (category.id === 'speaking') return !!assessmentStatus?.passedSpeakingBeginner;
      else return !!assessmentStatus?.passedWritingBeginner;
    }

    if (isIntermediate && index === 1) {
      // Intermediate: Their "Module 2" unlocks after their "Module 1"
      if (category.id === 'speaking') return !!assessmentStatus?.passedSpeakingIntermediate;
      else return !!assessmentStatus?.passedWritingIntermediate;
    }

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
          const unlocked = isUnlocked(module, index);
          const completed = isCompleted(module);
          const progress = getProgress(module);

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
  const { currentUser } = useUser();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [activeSubModule, setActiveSubModule] = useState(null);
  const [completedSubModules, setCompletedSubModules] = useState(() => {
    try {
      const cached = sessionStorage.getItem('vrm_completed_submodules');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [assessmentStatus, setAssessmentStatus] = useState(null);

  const fetchProgressAndStatus = () => {
    api.get('/lesson/completed-lessons')
      .then(res => {
        const completedIds = Array.isArray(res.data) ? res.data : [];
        setCompletedSubModules(completedIds);
        try {
          sessionStorage.setItem('vrm_completed_submodules', JSON.stringify(completedIds));
        } catch {}
      })
      .catch(err => {
        console.error('Failed to fetch completed lessons:', err);
      });

    api.get('/assessment/status')
      .then(res => {
        if (res.data) setAssessmentStatus(res.data);
      })
      .catch(err => {
        console.warn('Assessment status not available:', err);
      });
  };

  useEffect(() => {
    fetchProgressAndStatus();
  }, [currentUser?.id]); // re-fetch once user id is available

  const handleCompleteSubModule = async () => {
    if (!activeSubModule) return;
    try {
      await fetchProgressAndStatus();
      setActiveSubModule(null);
    } catch (err) {
      console.error('Failed to update lesson status:', err);
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
    if (selectedCategory.id === 'speaking') {
      return (
        <SpeakingLessonFlow
          sub={activeSubModule.sub}
          module={activeSubModule.module}
          videoUrl={VIDEO_SOURCES[activeSubModule.sub.id]}
          onBack={() => setActiveSubModule(null)}
          onComplete={handleCompleteSubModule}
          onRefreshProgress={fetchProgressAndStatus}
          onUncomplete={() => handleUncompleteSubModule(activeSubModule.sub.id, activeSubModule.module.id)}
          isCompleted={completedSubModules.includes(activeSubModule.sub.id)}
        />
      );
    }
    return (
      <WritingLessonFlow
        sub={activeSubModule.sub}
        module={activeSubModule.module}
        videoUrl={VIDEO_SOURCES[activeSubModule.sub.id]}
        onBack={() => setActiveSubModule(null)}
        onComplete={handleCompleteSubModule}
        onRefreshProgress={fetchProgressAndStatus}
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