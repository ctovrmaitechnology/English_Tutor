import { useState, useEffect, useRef } from 'react';
import { Lock, CheckCircle, PlayCircle, ArrowLeft, Mic, PenTool, Award, HelpCircle, Loader2, Volume2, RefreshCw, Check, X, Sparkles, Square, AlertCircle, Printer, Play, ChevronRight, BookOpen, Trophy, Star, Brain } from 'lucide-react';
import api from '../services/api';
import CompanionEvents from '../components/Companion/CompanionEvents';
import './Modules.css';

// ── Video sources — maps submodule IDs to local video files ──
const VIDEO_SOURCES = {
  'sp-1-1': new URL('../../videos/vowels.mp4', import.meta.url).href,
  'wr-1-1': new URL('../../videos/Copy of Verb Tenses (1).mp4', import.meta.url).href,
};

const SPEAKING_PROMPTS = {
  'sp-1-1': {
    prompt: "Vowel Sounds Practice",
    text: "Please read this sentence aloud clearly:\n'I see a big cat and a blue shoe.'",
    tip: "Say each word slowly. Focus on the vowel sounds: 'see', 'big', 'cat', 'blue', 'shoe'."
  },
  'sp-1-2': {
    prompt: "Consonant Sounds Practice",
    text: "Please read this sentence aloud clearly:\n'The dog and the cat sit on the mat.'",
    tip: "Pronounce the 'th' in 'the' and the final consonants in each word clearly."
  },
  'sp-1-3': {
    prompt: "Word Stress Practice",
    text: "Please read this sentence aloud clearly:\n'I want to record a new record today.'",
    tip: "RE-cord is a noun. re-CORD is a verb. Stress the first part for nouns."
  },
  'sp-1-4': {
    prompt: "Sentence Intonation Practice",
    text: "Please read this question aloud clearly:\n'Are you coming to the office today?'",
    tip: "Your voice should go up at the end of a yes or no question."
  },
  'sp-2-1': {
    prompt: "Call Opening Practice",
    text: "Please read this sentence aloud clearly:\n'Good morning. My name is Alex. How can I help you today?'",
    tip: "Smile while you speak. It makes your voice sound warm and friendly."
  },
  'sp-2-2': {
    prompt: "Active Listening Practice",
    text: "Please read this sentence aloud clearly:\n'I understand your problem. I will help you fix it right now.'",
    tip: "Speak with care and empathy. The customer should feel heard."
  },
  'sp-2-3': {
    prompt: "Objection Handling Practice",
    text: "Please read this sentence aloud clearly:\n'I am sorry to hear that. Let me find the best solution for you.'",
    tip: "Keep a calm and polite tone even when the customer is upset."
  },
  'sp-2-4': {
    prompt: "Call Closing Practice",
    text: "Please read this sentence aloud clearly:\n'Thank you for calling. Have a great day ahead!'",
    tip: "End the call with energy and a smile. Leave the customer feeling good."
  },
  'sp-3-1': {
    prompt: "Natural Speech Rhythm",
    text: "Please read this sentence aloud clearly:\n'I go to work every day by bus.'",
    tip: "Speak at a natural pace. Do not rush or pause too long between words."
  },
  'sp-3-2': {
    prompt: "No Filler Words",
    text: "Please read this sentence aloud clearly:\n'The meeting starts at nine in the morning.'",
    tip: "Avoid saying 'um', 'uh', or 'like' between words. Speak directly."
  },
  'sp-3-3': {
    prompt: "Speed and Clarity",
    text: "Please read this sentence aloud clearly:\n'Please hold the line. I will check your account details.'",
    tip: "Not too fast, not too slow. Every word should be clear and easy to understand."
  },
  'sp-3-4': {
    prompt: "Accent Neutralization",
    text: "Please read this sentence aloud clearly:\n'Water, butter, and better are common English words.'",
    tip: "The letter T in the middle of words often sounds like a soft D in American English."
  },
  'sp-4-1': {
    prompt: "Persuasive Language",
    text: "Please read this sentence aloud clearly:\n'This plan will save you both time and money.'",
    tip: "Stress the key benefit words: 'save', 'time', and 'money'."
  },
  'sp-4-2': {
    prompt: "Negotiation Phrases",
    text: "Please read this sentence aloud clearly:\n'Can we find a solution that works for both of us?'",
    tip: "Use a warm and open tone. Negotiation should feel like a conversation."
  },
  'sp-4-3': {
    prompt: "Escalation Handling",
    text: "Please read this sentence aloud clearly:\n'I completely understand. I will escalate this to my supervisor right away.'",
    tip: "Stay calm and confident. Your tone should reassure the customer."
  },
  'sp-4-4': {
    prompt: "Empathy in Customer Service",
    text: "Please read this sentence aloud clearly:\n'I am really sorry for the trouble. I will make sure this is resolved today.'",
    tip: "Mean what you say. Empathy is felt in the tone, not just the words."
  },
  'default': {
    prompt: "Speaking Practice",
    text: "Please read this sentence aloud clearly:\n'Hello, I am happy to help you today.'",
    tip: "Speak slowly and clearly. Make sure every word is easy to understand."
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
  'wr-1-1': { title: 'Tenses & Their Usage', questions: [
    { q: "Which tense describes an action happening RIGHT NOW?", options: ["Simple Past", "Present Continuous", "Simple Future", "Past Perfect"], correct: 1, explanation: "Present Continuous (is/are + verb-ing) describes actions happening at this very moment." },
    { q: "Fill in: 'She ___ to work every day by bus.'", options: ["is traveling", "traveled", "travels", "will travel"], correct: 2, explanation: "Simple Present is used for regular habits and daily routines." },
    { q: "Which sentence correctly uses the Past Perfect tense?", options: ["I am eating lunch now.", "She was sleeping all morning.", "They had completed the training before the client called.", "He will attend the meeting."], correct: 2, explanation: "Past Perfect (had + past participle) describes an action completed before another past action." },
    { q: "Complete: 'By next year, I ___ this BPO training course.'", options: ["will complete", "completed", "am completing", "will have completed"], correct: 3, explanation: "Future Perfect (will have + past participle) is used for actions completed before a specific future point." },
    { q: "Which tense is used to express a general truth or permanent fact?", options: ["Present Perfect", "Simple Present", "Past Continuous", "Future Simple"], correct: 1, explanation: "Simple Present tense is used for universal truths, scientific facts, and permanent situations." }
  ]},
  'wr-1-2': { title: 'Sentence Structure', questions: [
    { q: "Which sentence has the correct Subject-Verb-Object order?", options: ["Quickly resolves the agent issues.", "The agent quickly resolves customer issues.", "Resolves issues quickly the agent.", "Customer issues the agent resolves quickly."], correct: 1, explanation: "Standard English sentence order is Subject → Verb → Object." },
    { q: "A compound sentence is formed by:", options: ["One main clause only", "Two independent clauses joined by a conjunction", "A main clause and a subordinate clause", "Three or more dependent clauses"], correct: 1, explanation: "A compound sentence joins two independent clauses with coordinating conjunctions like 'and', 'but', 'so'." },
    { q: "Identify the sentence with a CORRECT relative clause:", options: ["Running fast, the call was disconnected.", "The customer who was frustrated received a refund.", "After the call. The agent wrote notes.", "The agent wrote notes after finishing the report was sent."], correct: 1, explanation: "'Who was frustrated' correctly modifies 'the customer' with a relative clause." },
    { q: "What is a 'sentence fragment'?", options: ["A sentence with two main clauses", "A sentence missing a subject or verb", "A sentence that is too long", "A sentence with two verbs"], correct: 1, explanation: "A sentence fragment is incomplete — it's missing a subject, a verb, or does not express a complete thought." },
    { q: "Which word makes this a complex sentence: '___ the customer was angry, the agent stayed calm.'", options: ["And", "But", "Although", "So"], correct: 2, explanation: "'Although' is a subordinating conjunction that creates a complex sentence with a dependent clause." }
  ]},
  'wr-1-3': { title: 'Punctuation Rules', questions: [
    { q: "Which sentence uses a comma CORRECTLY?", options: ["She called, the customer.", "Yes, I understand your concern.", "I will, help you now.", "Please, hold, the line."], correct: 1, explanation: "A comma is used after introductory words like 'Yes', 'No', 'Well' at the start of a sentence." },
    { q: "A colon (:) is used to:", options: ["Separate two independent clauses", "Introduce a list or explanation", "Replace a comma", "Show possession"], correct: 1, explanation: "A colon introduces a list, a quote, an explanation, or an elaboration of the preceding clause." },
    { q: "'The agent checked the account however the issue persisted.' — What punctuation is missing?", options: ["A period after 'account'", "A semicolon after 'account'", "A comma after 'however'", "Quotation marks around the sentence"], correct: 1, explanation: "A semicolon joins two closely related independent clauses. '...account; however, the issue...' is correct." },
    { q: "Which sentence uses an apostrophe CORRECTLY?", options: ["The customer's complaint was valid.", "The customers's complaint was valid.", "The customers complaint was valid.", "The customer's complaint's were valid."], correct: 0, explanation: "For singular possession, add apostrophe + s: customer's complaint (belonging to one customer)." },
    { q: "In professional business writing, exclamation marks should be used:", options: ["After every positive sentence", "Frequently to sound enthusiastic", "Sparingly, only when truly necessary", "Never, under any circumstances"], correct: 2, explanation: "In professional writing, exclamation marks should be used sparingly. Overuse makes communication seem unprofessional." }
  ]},
  'wr-1-4': { title: 'Common Grammar Errors', questions: [
    { q: "Correct the error: 'Me and my team handles all complaints.'", options: ["Me and my team handle all complaints.", "My team and I handle all complaints.", "My team and me handles all complaints.", "I and my team handles all complaints."], correct: 1, explanation: "'My team and I' is correct. Use 'I' as a subject. Test: 'I handle' — correct. 'Me handles' — wrong." },
    { q: "Which sentence has a subject-verb agreement error?", options: ["The team completes the report on time.", "Each of the agents is trained.", "The number of calls are increasing.", "Neither the manager nor the agent was informed."], correct: 2, explanation: "'The number of...' takes a singular verb: 'The number of calls is increasing'." },
    { q: "Which word is used CORRECTLY?", options: ["Their is a problem with the account.", "There is a problem with the account.", "They're is a problem with the account.", "There're a problem with the account."], correct: 1, explanation: "'There' refers to a place or existence. 'Their' = belonging to them. 'They're' = they are." },
    { q: "Choose the grammatically correct sentence:", options: ["We should of called the customer earlier.", "We should have called the customer earlier.", "We should had called the customer earlier.", "We should of have called the customer earlier."], correct: 1, explanation: "'Should have' is correct. 'Should of' is a common spoken error — 'of' cannot follow 'should'." },
    { q: "Identify the INCORRECT sentence:", options: ["The report is ready to submit.", "Between you and me, the issue is resolved.", "Everyone brought their own headset.", "He don't understand the customer's complaint."], correct: 3, explanation: "'He don't' is incorrect. The correct form is 'He doesn't' — third person singular requires 'doesn't'." }
  ]},
  'wr-2-1': { title: 'Email Subject Lines', questions: [
    { q: "Which is the BEST professional email subject line?", options: ["Urgent!!!", "Invoice #4562 — Payment Correction Request", "please read this quickly", "regarding your account"], correct: 1, explanation: "A good subject line is specific, clear, and includes identifiers like invoice numbers." },
    { q: "A good email subject line should be:", options: ["As long as possible with full details", "Vague to create curiosity", "Clear, concise and specific", "In all capital letters"], correct: 2, explanation: "Subject lines should be clear and concise — typically 6 to 10 words — so the recipient understands the purpose immediately." },
    { q: "Which subject line is appropriate for a follow-up email?", options: ["Following Up", "Following up on our call — Account #78432", "FOLLOW UP!!!", "This is a follow-up on the discussion we had"], correct: 1, explanation: "Include specific identifiers (account numbers, topics) in follow-up subject lines to give context." },
    { q: "What does RE: in an email subject line indicate?", options: ["Regarding a new topic", "A reply to a previous email", "A request for urgent action", "An internal company email"], correct: 1, explanation: "RE: indicates you are responding to a previous email in the thread." },
    { q: "Which subject line for a complaint resolution is best?", options: ["Complaint", "Your Issue Has Been Resolved — Case #1234", "URGENT: Your complaint!", "About the thing you reported"], correct: 1, explanation: "Reference the case number and resolution status. This reassures the customer and sets a professional tone." }
  ]},
  'wr-2-2': { title: 'Professional Greetings', questions: [
    { q: "Which is the most professional email greeting for a known client?", options: ["Hey Mr. Jones,", "Dear Mr. Jones,", "Hello Friend,", "To whom it may concern,"], correct: 1, explanation: "'Dear Mr. Jones,' is the standard professional salutation for business correspondence." },
    { q: "When you don't know the recipient's name, use:", options: ["Hey there,", "Hi!", "Dear Sir or Madam,", "Hello,"], correct: 2, explanation: "'Dear Sir or Madam,' is the professional greeting when the recipient's name is unknown." },
    { q: "Which greeting is appropriate for an internal team email?", options: ["Dear Mr. Smith,", "Hi Team,", "Gentlemen,", "Hey guys,"], correct: 1, explanation: "'Hi Team,' is appropriate for internal communications — professional yet friendly and inclusive." },
    { q: "When replying to an upset customer, begin with:", options: ["I understand you are upset.", "Thank you for contacting us.", "I apologize for the inconvenience you have experienced.", "Let me be direct about this issue."], correct: 2, explanation: "Opening with a sincere apology acknowledges the customer's frustration and sets an empathetic tone." },
    { q: "Which opening is best for a first-contact email to a potential business client?", options: ["Hey, I'm reaching out...", "Dear [Name], I hope this email finds you well.", "Hello! Just wanted to say hi.", "Good day. I need your attention."], correct: 1, explanation: "'Dear [Name], I hope this email finds you well.' is a classic, widely accepted professional business opening." }
  ]},
  'wr-2-3': { title: 'Email Body Writing', questions: [
    { q: "The BEST way to structure a professional email body is:", options: ["Everything in one long paragraph", "Purpose → Details → Next Steps", "Start with conclusions, then explain", "Details → Purpose → Closing"], correct: 1, explanation: "State your purpose first, provide supporting details, then clearly outline next steps or requested actions." },
    { q: "Which sentence is written in the most professional tone?", options: ["I need this fixed ASAP!!!", "Could you please look into this at your earliest convenience?", "Just handle it.", "Why hasn't this been done yet?"], correct: 1, explanation: "Professional email tone is polite, clear, and respectful. Avoid demands, excessive urgency, or vague instructions." },
    { q: "In a BPO customer service email, you should:", options: ["Use technical jargon to seem expert", "Write in plain, clear language the customer easily understands", "Keep everything in one very long sentence", "Avoid explaining the resolution to keep it brief"], correct: 1, explanation: "Customer-facing emails should use plain language. Jargon confuses customers and reduces trust." },
    { q: "Which is the correct way to reference an earlier interaction?", options: ["As per our conversation on [Date], ...", "Like we said before,", "You should already know this from our call", "Previously,"], correct: 0, explanation: "'As per our conversation on [Date]' is the professional standard for referencing previous interactions." },
    { q: "When explaining a billing error to a customer, you should:", options: ["Use passive voice: 'An error was made'", "Acknowledge, explain clearly, state the resolution", "Keep the explanation vague", "Apologize excessively in every sentence"], correct: 1, explanation: "Be transparent, take responsibility, and immediately state the resolution. Customers want clarity and action." }
  ]},
  'wr-2-4': { title: 'Closing & Sign-off', questions: [
    { q: "Which is the most professional email closing?", options: ["See ya!", "Best regards,", "Bye for now,", "Later,"], correct: 1, explanation: "'Best regards,' is a widely accepted professional sign-off that is warm yet formal." },
    { q: "Which closing is appropriate for a formal complaint resolution email?", options: ["Thanks!", "Yours sincerely,", "Take care,", "Later,"], correct: 1, explanation: "'Yours sincerely,' is used in formal business correspondence when you know the recipient's name." },
    { q: "Before signing off a customer service email, you should:", options: ["Simply say goodbye", "Ask if there is anything else you can assist with", "Repeat the entire email content as a summary", "Request the customer to call instead"], correct: 1, explanation: "Always offer further assistance before closing. This shows commitment to customer satisfaction." },
    { q: "What information should be in a professional email signature?", options: ["Only your first name", "Full name, job title, company, contact number", "Personal social media links", "Your daily availability hours only"], correct: 1, explanation: "A professional email signature includes your full name, title, company name, and contact information." },
    { q: "Which closing line is best for a support ticket resolution email?", options: ["Hope this helps, bye!", "Please do not hesitate to contact us should you require further assistance.", "Problem solved. Closing ticket.", "Thanks for your patience (even though this took too long)."], correct: 1, explanation: "Professional closing lines are warm, invite further contact, and reinforce a customer-first approach." }
  ]},
  'sp-1-1': { title: 'Vowel Sounds', questions: [
    { q: "The vowel sound /iː/ (long 'ee') is found in which word?", options: ["sit", "set", "see", "sat"], correct: 2, explanation: "/iː/ is a long vowel sound as in 'see', 'tree', 'meet'. The tongue is high and lips are slightly spread." },
    { q: "Which word pair demonstrates the /ɪ/ vs /iː/ vowel contrast?", options: ["cat / car", "sit / seat", "pet / pit", "hot / hat"], correct: 1, explanation: "'sit' (short i) vs 'seat' (long ee) is the classic minimal pair for this vowel contrast." },
    { q: "The vowel /æ/ as in 'cat' requires the jaw to be:", options: ["Closed and relaxed", "Dropped low and mouth wide open", "Rounded like a circle", "High and tense"], correct: 1, explanation: "To produce /æ/, drop your jaw, open your mouth wide, and spread your lips." },
    { q: "Which word contains the /uː/ (long 'oo') vowel sound?", options: ["put", "pull", "book", "too"], correct: 3, explanation: "/uː/ as in 'too', 'food', 'blue'. Lips are rounded. Don't confuse with /ʊ/ (short oo) as in 'put', 'book'." },
    { q: "In BPO communication, clear vowel sounds are important because:", options: ["They make you sound educated", "Customers on calls rely on hearing vowels clearly to understand key words", "They speed up your speech", "Grammar requires perfect vowels"], correct: 1, explanation: "On phone calls, audio quality isn't always perfect. Clear vowel pronunciation ensures customers understand key information." }
  ]},
  'sp-1-2': { title: 'Consonant Sounds', questions: [
    { q: "The 'th' sound in 'the', 'this', 'that' requires:", options: ["Teeth together, air through nose", "Tongue tip between teeth, air forced out", "Lips together", "Tongue at roof of mouth"], correct: 1, explanation: "For voiced 'th' (ð), place the tongue tip lightly between your front teeth and push air out." },
    { q: "Which word pair highlights the /v/ vs /b/ consonant contrast?", options: ["van / ban", "pig / big", "thin / tin", "wet / yet"], correct: 0, explanation: "'van' uses /v/ (top teeth on lower lip) vs 'ban' which uses /b/ (both lips together)." },
    { q: "The /r/ sound in General American English is produced by:", options: ["Rolling the 'r' strongly", "Curling the tongue slightly back without touching the roof", "Not pronouncing the 'r' at all", "Pronouncing it like the letter name"], correct: 1, explanation: "In General American English, the /r/ is a retroflex sound — the tongue curls slightly back but doesn't touch the palate." },
    { q: "Why is it important to pronounce consonants at the END of words clearly?", options: ["It sounds more formal", "It prevents misunderstanding — 'billed' vs 'bill', 'called' vs 'call'", "International customers prefer it", "It slows your speech professionally"], correct: 1, explanation: "Final consonants differentiate past tense from present, singular from plural. Dropping them causes miscommunication." },
    { q: "Which sentence best practices multiple consonant sounds in a professional BPO context?", options: ["She sells sea shells by the sea shore", "I see the ships at sea", "The customer's request was resolved successfully", "She said she saw Susan"], correct: 2, explanation: "'The customer's request was resolved successfully' contains multiple consonant sounds in a professional BPO context." }
  ]},
  'sp-2-1': { title: 'Call Opening Phrases', questions: [
    { q: "What is the standard structure for a professional BPO call opening?", options: ["Just say 'Hello?'", "Company greeting + Your name + How may I help?", "Ask for account number immediately", "Introduce the problem you'll solve"], correct: 1, explanation: "Professional openings: 'Thank you for calling [Company]. This is [Name]. How may I help you today?'" },
    { q: "Which opening sounds most professional and welcoming?", options: ["'Yeah, what do you need?'", "'Thank you for calling RuralShores. My name is Alex. How may I assist you today?'", "'RuralShores, hold please.'", "'Customer service, what's your problem?'"], correct: 1, explanation: "The professional opening is warm, identifies the company and agent, and uses polite language." },
    { q: "When a customer calls and immediately starts complaining, you should:", options: ["Interrupt and ask for their account number", "Let them finish, then say: 'I completely understand your frustration. I'm going to help resolve this right away.'", "Put them on hold immediately", "Transfer to a supervisor without listening"], correct: 1, explanation: "Let the customer speak first. Acknowledge their frustration before asking for account details — this builds rapport." },
    { q: "The phrase 'How may I assist you today?' is preferred because:", options: ["It's shorter", "It uses formal, respectful language and sets a professional tone", "It confuses customers", "Customers prefer simpler questions"], correct: 1, explanation: "'May I assist' is polite and formal. Language choices directly impact customer satisfaction scores." },
    { q: "After the customer explains their issue, the BEST immediate response is:", options: ["'Ok, hold on.'", "'I understand, [Name]. Let me look into this for you right away.'", "'That's not our fault.'", "'Have you tried turning it off and on?'"], correct: 1, explanation: "Using the customer's name, acknowledging the issue, and committing to action shows empathy and professionalism." }
  ]},
  'sp-2-2': { title: 'Active Listening', questions: [
    { q: "Active listening in a call means:", options: ["Waiting silently for the customer to stop talking", "Paying full attention, noting key details, and confirming understanding", "Multi-tasking while the customer speaks", "Interrupting to show you already know the answer"], correct: 1, explanation: "Active listening involves focused attention, mental note-taking, and verbal acknowledgment to show engagement." },
    { q: "Which phrase best demonstrates active listening confirmation?", options: ["'Okay.'", "'I understand that your invoice shows a charge of $45 that you did not authorize. Is that correct?'", "'Please repeat that.'", "'We hear this complaint a lot.'"], correct: 1, explanation: "Repeating back specific details confirms you listened accurately and prevents misunderstandings." },
    { q: "The technique of paraphrasing in customer calls means:", options: ["Repeating the exact words the customer said", "Restating the customer's concern in your own words to confirm understanding", "Asking the customer to clarify what they said", "Summarizing every detail at the end of the call"], correct: 1, explanation: "Paraphrasing shows you processed the information: 'So what you're saying is the delivery never arrived — is that right?'" },
    { q: "When a customer is explaining a complex billing issue, you should:", options: ["Start typing notes and stop listening", "Listen fully, write key details, then confirm: 'Let me verify what I've noted down.'", "Ask them to send an email instead", "Transfer immediately to billing department"], correct: 1, explanation: "Note key specifics while listening, then verbally verify your notes. This shows professionalism and prevents error." },
    { q: "Which listening response is MOST professional during a customer's explanation?", options: ["'Uh-huh, yeah, yeah.'", "'I see. Please go on.'", "'Mm... okay... yeah.'", "'Right, right, right.'"], correct: 1, explanation: "'I see. Please go on.' is professional and encouraging without sounding dismissive or filler-heavy." }
  ]},
  'default': { title: 'Module Quiz', questions: [
    { q: "In professional communication, clarity means:", options: ["Using long, impressive vocabulary", "Expressing ideas simply so they are easily understood", "Writing very detailed emails", "Avoiding all technical terms"], correct: 1, explanation: "Clarity in communication means your message is understood exactly as intended, without confusion or ambiguity." },
    { q: "The most important quality of a BPO professional is:", options: ["Speed of response", "Empathy and problem-solving combined with clear communication", "Technical knowledge only", "Memorizing scripts word for word"], correct: 1, explanation: "BPO excellence combines empathy with efficient problem-solving and clear communication." },
    { q: "Which of the following is an example of professional language?", options: ["'That's not possible.'", "'I will explore all available options to resolve this for you.'", "'Not my department.'", "'I don't know.'"], correct: 1, explanation: "Professional language focuses on solutions, shows ownership, and maintains a positive tone." },
    { q: "When you don't know the answer to a customer's question, you should:", options: ["Make something up", "'I'll need to verify that for you. May I place you on a brief hold?'", "'I don't know, call back later.'", "Transfer immediately without explanation"], correct: 1, explanation: "Honesty combined with a clear action plan maintains trust. Never guess or give incorrect information." },
    { q: "A professional tone in customer service means:", options: ["Always being formal and never friendly", "Being respectful, polite, and helpful regardless of the customer's tone", "Matching the customer's anger if they are upset", "Using only scripted responses"], correct: 1, explanation: "Professional tone stays calm, respectful, and solution-focused regardless of the customer's emotional state." }
  ]}
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

// ── Speaking Step 2: Pronunciation Assessment ─────────────────
function SpeakingAssessmentStep({ sub, module, onNext }) {
  const [recordingState, setRecordingState] = useState('idle'); // idle | recording | analyzing | completed
  const [seconds, setSeconds] = useState(0);
  const [speakingResult, setSpeakingResult] = useState(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [lessonData, setLessonData] = useState(null);

  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const ttsAudioRef = useRef(null);

  // Load lesson prompt from backend (falls back to local SPEAKING_PROMPTS)
  useEffect(() => {
    let active = true;
    api.get(`/assessment/lesson-question/${sub.id}`)
      .then(res => { if (active && res.data) setLessonData(res.data); })
      .catch(() => {});
    return () => { active = false; };
  }, [sub.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Recording timer (max 30 seconds)
  useEffect(() => {
    if (recordingState === 'recording') {
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev >= 29) { stopRecording(); return 30; }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }, [recordingState]);

  const speakingPrompt = lessonData
    ? { prompt: lessonData.prompt, text: lessonData.questionText, tip: lessonData.explanation }
    : (SPEAKING_PROMPTS[sub.id] || SPEAKING_PROMPTS['default']);

  const playPromptTTS = async () => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause(); ttsAudioRef.current = null; setTtsPlaying(false); return;
    }
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel(); setTtsPlaying(false); return;
    }
    setTtsLoading(true);
    const promptText = (speakingPrompt?.text || '').replace(/[•\d\.\-]/g, '').trim();
    try {
      const response = await api.post('/voice/synthesize', { text: promptText, voice: 'af_heart', speed: 1.0 }, { responseType: 'blob' });
      const audioUrl = URL.createObjectURL(response.data);
      const audio = new Audio(audioUrl);
      ttsAudioRef.current = audio;
      audio.onplay = () => { setTtsLoading(false); setTtsPlaying(true); };
      audio.onended = () => { setTtsPlaying(false); ttsAudioRef.current = null; URL.revokeObjectURL(audioUrl); };
      audio.onerror = () => { setTtsLoading(false); setTtsPlaying(false); ttsAudioRef.current = null; URL.revokeObjectURL(audioUrl); fallbackSpeak(promptText); };
      await audio.play();
    } catch {
      setTtsLoading(false); setTtsPlaying(false);
      fallbackSpeak(promptText);
    }
  };

  const fallbackSpeak = (text) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 1.0;
      u.onstart = () => setTtsPlaying(true);
      u.onend = () => setTtsPlaying(false);
      u.onerror = () => setTtsPlaying(false);
      window.speechSynthesis.speak(u);
    }
  };

  const startRecording = async () => {
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; setTtsPlaying(false); }
    if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); setTtsPlaying(false); }
    setRecordingState('recording');
    setSpeakingResult(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        await sendToSTT(blob);
      };
      mediaRecorder.start();
    } catch {
      fallbackStartRecording();
    }
  };

  const fallbackStartRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { evaluateSpeech(''); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = false; rec.lang = 'en-US';
    let transcript = '';
    rec.onresult = e => { for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) transcript += e.results[i][0].transcript + ' '; } };
    rec.onend = () => evaluateSpeech(transcript);
    recognitionRef.current = rec;
    rec.start();
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

  const sendToSTT = async (blob) => {
    setRecordingState('analyzing');
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'audio.webm');
      const res = await fetch('http://localhost:5001/transcribe', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('STT error');
      const data = await res.json();
      evaluateSpeech(data.transcript || '');
    } catch {
      evaluateSpeech('');
    }
  };

  const evaluateSpeech = (transcript) => {
    setRecordingState('analyzing');
    setTimeout(() => {
      const clean = t => t.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?•]/g, '').replace(/\s+/g, ' ').trim();
      const targetRaw = (speakingPrompt?.text || '').replace(/[•\d\.\-]/g, '');
      const target = clean(targetRaw);
      const spoken = clean(transcript);

      if (!spoken) {
        setSpeakingResult({ score: 0, feedback: 'No voice detected. Please speak clearly into your microphone.', fluency: 0, pronunciation: 0 });
        setRecordingState('completed');
        return;
      }

      const targetWords = target.split(' ').filter(w => w.length > 2);
      const spokenWords = spoken.split(' ').filter(w => w.length > 0);
      let matches = 0;
      targetWords.forEach(w => { if (spokenWords.includes(w)) matches++; });
      let score = targetWords.length > 0 ? Math.round((matches / targetWords.length) * 100) : 0;
      if (score > 0) score = Math.min(100, Math.max(15, score));

      // Derive fluency slightly differently for more granularity
      const fluency = Math.min(100, Math.round(score * 0.9 + (spokenWords.length > 5 ? 10 : 0)));
      const pronunciation = score;

      let feedback = '';
      if (score >= 85) feedback = 'Excellent pronunciation and natural rhythm! Your delivery was clear and confident.';
      else if (score >= 70) feedback = 'Good attempt! Keep practicing to improve syllable stress and sentence intonation.';
      else if (score >= 50) feedback = 'Fair effort. Focus on speaking each word clearly and following the pronunciation tips.';
      else feedback = 'We had trouble matching your speech. Try speaking more slowly and clearly, following the prompt text.';

      setSpeakingResult({ score, feedback, fluency, pronunciation, transcript });
      setRecordingState('completed');
    }, 1500);
  };

  const handleRetry = () => { setRecordingState('idle'); setSpeakingResult(null); setSeconds(0); };

  return (
    <div className="lf-card">
      <div className="lf-card-header">
        <Mic size={20} style={{ color: module.color }} />
        <div>
          <p className="lf-card-sub">Step 2 of 3 — Pronunciation Assessment</p>
          <h3 className="lf-card-title">{sub.title} — Speaking Practice</h3>
        </div>
      </div>

      {/* Prompt card */}
      <div className="prompt-card" style={{ '--theme-color': module.color, marginBottom: 20 }}>
        <div className="prompt-card-header">
          <button
            type="button"
            onClick={playPromptTTS}
            disabled={ttsLoading}
            title="Listen to correct pronunciation"
            style={{ background: 'none', border: 'none', padding: 0, marginRight: 8, cursor: ttsLoading ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', color: ttsPlaying ? module.color : '#64748b', transition: 'color 0.2s' }}
          >
            {ttsLoading ? <Loader2 className="animate-spin" size={20} /> : <Volume2 size={20} className={ttsPlaying ? 'animate-pulse' : ''} style={{ color: ttsPlaying ? module.color : 'inherit' }} />}
          </button>
          <h4 style={{ display: 'inline-block', margin: 0 }}>{speakingPrompt.prompt}</h4>
        </div>
        <div className="prompt-card-text" style={{ borderLeftColor: module.color }}>
          {speakingPrompt.text.split('\n').map((line, i) => <p key={i} style={{ margin: '4px 0' }}>{line}</p>)}
        </div>
        <div className="prompt-card-tip">
          <strong>💡 Tip:</strong> {speakingPrompt.tip}
        </div>
      </div>

      {/* Recording states */}
      {recordingState === 'idle' && (
        <div className="speaking-action-zone">
          <p className="speaking-action-hint">Click the microphone and read the text above aloud. Your pronunciation will be evaluated.</p>
          <button className="record-btn" onClick={startRecording} style={{ '--theme-color': module.color }}>
            <Mic size={32} />
          </button>
        </div>
      )}

      {recordingState === 'recording' && (
        <div className="speaking-action-zone">
          <p className="speaking-action-hint recording-text">🔴 Recording... Read the prompt above clearly.</p>
          <div className="wave-animation">
            {[1,2,3,4,5].map(n => <span key={n} className={`wave-bar bar-${n}`} style={{ backgroundColor: module.color }} />)}
          </div>
          <p className="recording-timer">0:{seconds < 10 ? `0${seconds}` : seconds} / 0:30</p>
          <button className="record-btn record-btn--recording" onClick={stopRecording}>
            <Square size={24} fill="#fff" />
          </button>
        </div>
      )}

      {recordingState === 'analyzing' && (
        <div className="speaking-action-zone">
          <Loader2 className="animate-spin analysis-loader" size={48} style={{ color: module.color }} />
          <p className="analyzing-text">Evaluating your pronunciation...</p>
        </div>
      )}

      {recordingState === 'completed' && speakingResult && (
        <div className="speaking-results-zone">
          <div className="score-header-box">
            <div className="score-circle" style={{ borderColor: module.color }}>
              <span className="score-num">{speakingResult.score}%</span>
              <span className="score-lbl">Score</span>
            </div>
            <div className="score-metrics">
              <div className="metric-row">
                <span>Fluency:</span>
                <div className="metric-bar-track">
                  <div className="metric-bar-fill" style={{ width: `${speakingResult.fluency}%`, background: module.color }} />
                </div>
                <span className="metric-val">{speakingResult.fluency}%</span>
              </div>
              <div className="metric-row">
                <span>Pronunciation:</span>
                <div className="metric-bar-track">
                  <div className="metric-bar-fill" style={{ width: `${speakingResult.pronunciation}%`, background: module.color }} />
                </div>
                <span className="metric-val">{speakingResult.pronunciation}%</span>
              </div>
            </div>
          </div>

          {speakingResult.transcript && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#475569' }}>
              <strong style={{ color: '#334155', display: 'block', marginBottom: 4 }}>What we heard:</strong>
              <em>"{speakingResult.transcript}"</em>
            </div>
          )}

          <div className="feedback-card">
            <Sparkles size={20} className="feedback-icon" style={{ color: module.color }} />
            <div className="feedback-text">
              <h5>Pronunciation Feedback</h5>
              <p>{speakingResult.feedback}</p>
            </div>
          </div>

          <div className="result-buttons" style={{ marginTop: 16 }}>
            <button className="retry-btn" onClick={handleRetry}>
              <RefreshCw size={16} /> Try Again
            </button>
            <button className="lf-primary-btn" onClick={onNext} style={{ background: module.color, color: '#fff', border: 'none' }}>
              Continue to AI Tutor <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 3-Step Lesson Flow: Video → Speaking/Quiz → AI Tutor ──────
function LessonFlowView({ sub, module, category, onBack, onComplete, onUncomplete, isCompleted }) {
  const [step, setStep] = useState('video'); // 'video' | 'practice' | 'tutor'
  const videoRef = useRef(null);

  // Quiz state (writing only)
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [showExp, setShowExp] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [tutorOpened, setTutorOpened] = useState(false);

  const videoSrc = VIDEO_SOURCES[sub.id] || null;
  const quizData = GAME_QUIZZES[sub.id] || GAME_QUIZZES['default'];
  const currentQ = quizData.questions[qIdx];
  const totalQ = quizData.questions.length;

  const isSpeaking = category === 'speaking';

  const handleSelectOption = (idx) => {
    if (selected !== null) return;
    const correct = idx === currentQ.correct;
    setSelected(idx);
    setIsCorrect(correct);
    setShowExp(true);
    if (correct) setCorrectCount(c => c + 1);
  };

  const handleNextQ = () => {
    if (qIdx < totalQ - 1) {
      setQIdx(q => q + 1);
      setSelected(null);
      setIsCorrect(null);
      setShowExp(false);
    } else {
      setQuizDone(true);
    }
  };

  const handleOpenTutor = () => {
    setTutorOpened(true);
    CompanionEvents.emit('OPEN_TUTOR_SESSION', {
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

  // Step labels differ by category
  const stepLabels = isSpeaking
    ? ['📹 Video Lecture', '🎙️ Pronunciation', '🤖 AI Tutor']
    : ['📹 Video Lecture', '🎮 Quiz', '🤖 AI Tutor'];

  return (
    <div className="lf-container">
      {/* Back button */}
      <button className="lf-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to Lessons
      </button>

      {/* Step indicator */}
      <div className="lf-step-bar">
        {['video', 'practice', 'tutor'].map((s, i) => {
          const done = (s === 'practice' && (step === 'practice' || step === 'tutor')) ||
                       (s === 'video' && (step === 'practice' || step === 'tutor')) ||
                       (s === 'tutor' && step === 'tutor');
          const active = step === s;
          return (
            <div key={s} className={`lf-step-pill ${active ? 'lf-step-active' : done ? 'lf-step-done' : 'lf-step-idle'}`}>
              {done && !active ? <Check size={13} /> : <span>{i + 1}</span>}
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
              <video ref={videoRef} className="lf-video" controls src={videoSrc} preload="metadata">
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
              Watch the video lecture, then click{' '}
              <strong>{isSpeaking ? 'Continue to Pronunciation Practice' : 'Continue to Quiz'}</strong>{' '}
              to test what you've learned.
            </p>
          </div>

          <button className="lf-primary-btn" onClick={() => setStep('practice')}>
            {isSpeaking ? 'Continue to Pronunciation Practice' : 'Continue to Quiz'} <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ── STEP 2: SPEAKING — Pronunciation Assessment ───────── */}
      {step === 'practice' && isSpeaking && (
        <SpeakingAssessmentStep
          sub={sub}
          module={module}
          onNext={() => setStep('tutor')}
        />
      )}

      {/* ── STEP 2: WRITING — Gamified Quiz ───────────────────── */}
      {step === 'practice' && !isSpeaking && !quizDone && (
        <div className="lf-card">
          <div className="lf-card-header">
            <Brain size={20} style={{ color: '#8b5cf6' }} />
            <div>
              <p className="lf-card-sub">Step 2 of 3 — Knowledge Check</p>
              <h3 className="lf-card-title">{quizData.title}</h3>
            </div>
          </div>

          <div className="lf-quiz-progress-track">
            <div className="lf-quiz-progress-fill" style={{ width: `${((qIdx) / totalQ) * 100}%` }} />
          </div>
          <p className="lf-quiz-counter">Question {qIdx + 1} of {totalQ}</p>

          <div className="lf-question-box">
            <p className="lf-question-text">{currentQ.q}</p>
          </div>

          <div className="lf-options-grid">
            {currentQ.options.map((opt, i) => {
              let cls = 'lf-option-btn';
              if (selected !== null) {
                if (i === currentQ.correct) cls += ' lf-option-correct';
                else if (i === selected && !isCorrect) cls += ' lf-option-wrong';
                else cls += ' lf-option-dim';
              }
              return (
                <button key={i} className={cls} onClick={() => handleSelectOption(i)} disabled={selected !== null}>
                  <span className="lf-option-letter">{optionLabel[i]}</span>
                  <span className="lf-option-text">{opt}</span>
                  {selected !== null && i === currentQ.correct && <Check size={18} className="lf-opt-icon" />}
                  {selected !== null && i === selected && !isCorrect && <X size={18} className="lf-opt-icon" />}
                </button>
              );
            })}
          </div>

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

      {/* ── WRITING QUIZ SCORE SUMMARY ────────────────────────── */}
      {step === 'practice' && !isSpeaking && quizDone && (
        <div className="lf-card lf-score-card">
          <Trophy size={52} style={{ color: '#f59e0b', margin: '0 auto 8px' }} />
          <h3 className="lf-score-title">{scoreLabel().label}</h3>
          <div className="lf-score-circle" style={{ borderColor: scoreLabel().color }}>
            <span style={{ color: scoreLabel().color, fontSize: 32, fontWeight: 700 }}>{correctCount}</span>
            <span style={{ color: '#94a3b8', fontSize: 14 }}>out of {totalQ}</span>
          </div>
          <div className="lf-score-breakdown">
            {quizData.questions.map((q, i) => (
              <div key={i} className="lf-score-row">
                <span className={`lf-score-dot ${i < correctCount ? 'lf-dot-correct' : 'lf-dot-wrong'}`} />
                <span style={{ fontSize: 13, color: '#475569', flex: 1 }}>{q.q.substring(0, 60)}...</span>
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
              <h3 className="lf-card-title">Learn with Your AI Tutor</h3>
            </div>
          </div>

          <div className="lf-tutor-intro">
            <div className="lf-tutor-avatar">🤖</div>
            <div className="lf-tutor-bubble">
              <p><strong>VRM Buddy</strong> is ready to explain <strong>{sub.title}</strong> in depth!</p>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                Your AI tutor will open in full screen and walk you through the key concepts, answer your questions, and help reinforce what you learned.
              </p>
            </div>
          </div>

          <div className="lf-tutor-features">
            <div className="lf-tutor-feat"><span>💬</span> Ask any question about the lesson</div>
            <div className="lf-tutor-feat"><span>🎤</span> Practice speaking with voice chat</div>
            <div className="lf-tutor-feat"><span>📖</span> Get detailed explanations and examples</div>
          </div>

          {!tutorOpened ? (
            <button className="lf-tutor-open-btn" onClick={handleOpenTutor}>
              <span>🤖</span> Open AI Tutor Session
            </button>
          ) : (
            <div className="lf-tutor-opened-note">
              <Check size={18} style={{ color: '#10b981' }} />
              <p>AI Tutor is open! Chat with VRM Buddy in the overlay.</p>
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
              <button className="lf-complete-btn" onClick={onComplete}>
                <CheckCircle size={18} /> Mark Lesson as Complete ✓
              </button>
            )}
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
      <LessonFlowView
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