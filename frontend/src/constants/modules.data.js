// ── Video sources — maps submodule IDs to local video files ──
export const VIDEO_SOURCES = {
  'sp-1-1': new URL('../videos/vowels.mp4', import.meta.url).href,
  'wr-1-1': new URL('../videos/Copy of Verb Tenses (1).mp4', import.meta.url).href,
};
 
export const SPEAKING_PROMPTS = {
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
 
export const SPEAKING_TOPIC_ASSESSMENTS = {
  'sp-1-1': {
    title: "Self-Introduction & BPO Call Assessment",
    questions: [
      {
        type: 'voice',
        prompt: "Speaking Question 1",
        scenario: "Imagine you have joined a new company today.",
        question: "Introduce yourself to your new teammates.",
        expectedResponse: "Good morning everyone. My name is Arun. I have recently joined the company. I'm excited to work with all of you. Thank you.",
        text: "Good morning everyone. My name is Arun. I have recently joined the company. I'm excited to work with all of you. Thank you.",
        target: "good morning everyone my name is arun i have recently joined the company i'm excited to work with all of you thank you",
        tip: "Speak clearly, pause after giving your name, and sound excited to meet your team.",
        evalChecks: ["Pronunciation", "Fluency", "Grammar", "Confidence", "Completeness"],
        evalScores: { pronunciation: 88, fluency: 82, grammar: 95, vocabulary: 80, confidence: 86, completeness: 100, overall: 88 },
        strengths: ["Clear greeting", "Good pronunciation", "Professional introduction"],
        improvements: ["Speak slightly slower.", "Pause after introducing your name.", "Smile while speaking to sound more confident."]
      },
      {
        type: 'voice',
        prompt: "Speaking Question 2",
        scenario: "You answer your first customer call.",
        question: "Greet the customer and introduce yourself.",
        expectedResponse: "Good morning. Thank you for calling ABC Company. My name is Arun. How may I help you today?",
        text: "Good morning. Thank you for calling ABC Company. My name is Arun. How may I help you today?",
        target: "good morning thank you for calling abc company my name is arun how may i help you today",
        tip: "Maintain a warm, professional tone and clear speaking pace for the customer.",
        evalChecks: ["Greeting", "Name introduction", "Professional tone", "Confidence", "Speaking pace"],
        evalScores: { pronunciation: 90, fluency: 85, grammar: 96, vocabulary: 84, confidence: 88, completeness: 100, overall: 90 },
        strengths: ["Warm and professional greeting", "Clear name introduction", "Polite offer to assist"],
        improvements: ["Enunciate the company name clearly.", "Keep a steady speaking pace without rushing.", "Use friendly intonation on the final question."]
      },
      {
        type: 'voice',
        prompt: "Speaking Question 3",
        scenario: "You meet a colleague near the cafeteria.",
        question: "Introduce yourself and start a short conversation.",
        expectedResponse: "Hi, I'm Arun. I joined the team this week. Nice to meet you. Which team are you working in?",
        text: "Hi, I'm Arun. I joined the team this week. Nice to meet you. Which team are you working in?",
        target: "hi i'm arun i joined the team this week nice to meet you which team are you working in",
        tip: "Use conversational, natural speaking with clear sentence formation.",
        evalChecks: ["Natural speaking", "Sentence formation", "Fluency", "Pronunciation", "Confidence"],
        evalScores: { pronunciation: 86, fluency: 84, grammar: 92, vocabulary: 85, confidence: 87, completeness: 100, overall: 89 },
        strengths: ["Friendly and natural opening", "Good sentence formation", "Clear pronunciation of question"],
        improvements: ["Vary your pitch to sound natural and friendly.", "Avoid long pauses between sentences.", "Relax and smile while making conversation."]
      },
      {
        type: 'mcq',
        q: "Which introduction is correct in a BPO call?",
        options: [
          "\"Hello.\"",
          "\"Myself Arun.\"",
          "\"Good morning. My name is Arun. Thank you for calling.\"",
          "\"I am Arun only.\""
        ],
        correct: 2,
        explanation: "\"Good morning. My name is Arun. Thank you for calling.\" is the standard, professional BPO call opening that sets a warm first impression and identifies the agent."
      },
      {
        type: 'mcq',
        q: "Why is introducing yourself clearly important in a BPO?",
        options: [
          "Customers already know you",
          "It creates the first impression.",
          "It is not necessary.",
          "Only managers introduce themselves."
        ],
        correct: 1,
        explanation: "Introducing yourself clearly creates the first impression, establishes trust, and sets a professional, helpful tone for the rest of the conversation."
      }
    ]
  },
  'sp-1-2': {
    title: "Consonant Sounds Assessment",
    questions: [
      {
        type: 'voice',
        prompt: "Unvoiced Consonant Sound (/θ/)",
        text: "Please say this word aloud clearly: 'Think'",
        target: "think",
        tip: "Place the tip of your tongue gently between your front teeth and blow air out."
      },
      {
        type: 'voice',
        prompt: "Voiced Consonant Sound (/ð/)",
        text: "Please say this word aloud clearly: 'This'",
        target: "this",
        tip: "Use vocal cord vibration while making the 'th' sound."
      },
      {
        type: 'voice',
        prompt: "Final Consonant Clarity",
        text: "Please read aloud: 'Send the report right now'",
        target: "send the report right now",
        tip: "Make sure the ending 'd' in send and 't' in report are pronounced clearly."
      },
      {
        type: 'mcq',
        q: "What is the main difference between voiced and unvoiced consonants?",
        options: [
          "Voiced consonants require your vocal cords to vibrate.",
          "Voiced consonants are spoken whispering quietly.",
          "Unvoiced consonants only occur at the end of long words.",
          "Unvoiced consonants always require opening your mouth wide."
        ],
        correct: 0,
        explanation: "Voiced consonants (like b, d, g, v, z) vibrate the vocal cords, while unvoiced ones (like p, t, k, f, s) only use airflow."
      },
      {
        type: 'mcq',
        q: "Why should you never drop final consonants like -s, -ed, or -t at the end of words?",
        options: [
          "It makes grammar rules longer to explain.",
          "They signal crucial tense and plural meaning (e.g., worked vs. work).",
          "It helps keep your microphone volume stable.",
          "They are optional in business English."
        ],
        correct: 1,
        explanation: "Ending consonants convey whether an action is past tense (-ed) or plural (-s), so dropping them causes confusion."
      }
    ]
  },
  'sp-1-3': {
    title: "Word Stress Assessment",
    questions: [
      {
        type: 'voice',
        prompt: "Noun Stress (1st Syllable)",
        text: "Please say this noun aloud with stress on the first part: 'PRE-sent'",
        target: "present",
        tip: "Say PRE slightly louder and higher in pitch than -sent."
      },
      {
        type: 'voice',
        prompt: "Verb Stress (2nd Syllable)",
        text: "Please say this verb aloud with stress on the second part: 'pre-SENT'",
        target: "present",
        tip: "Say -SENT louder and longer."
      },
      {
        type: 'voice',
        prompt: "Multi-Syllable Stress",
        text: "Please read aloud: 'We need clear COM-mu-ni-ca-tion'",
        target: "we need clear communication",
        tip: "Stress the syllable 'ca' in communication."
      },
      {
        type: 'mcq',
        q: "In two-syllable nouns and adjectives in English, which syllable is most commonly stressed?",
        options: [
          "The first syllable (e.g., WA-ter, TA-ble)",
          "The second syllable (e.g., wa-TER, ta-BLE)",
          "Both syllables equally",
          "Neither syllable is ever stressed"
        ],
        correct: 0,
        explanation: "Over 80% of two-syllable nouns and adjectives in English stress the first syllable."
      },
      {
        type: 'mcq',
        q: "What happens when you shift stress from 'RE-cord' (noun) to 're-CORD' (verb)?",
        options: [
          "The word becomes an adjective.",
          "The part of speech changes between noun and verb.",
          "The word loses its meaning completely.",
          "It becomes British English."
        ],
        correct: 1,
        explanation: "Many word pairs change from a noun (1st syllable stress) to a verb (2nd syllable stress) simply by shifting the emphasis."
      }
    ]
  },
  'sp-2-1': {
    title: "Call Opening & Self-Introduction Assessment",
    questions: [
      {
        type: 'voice',
        prompt: "Speaking Question 1",
        scenario: "Imagine you have joined a new company today.",
        question: "Introduce yourself to your new teammates.",
        expectedResponse: "Good morning everyone. My name is Arun. I have recently joined the company. I'm excited to work with all of you. Thank you.",
        text: "Good morning everyone. My name is Arun. I have recently joined the company. I'm excited to work with all of you. Thank you.",
        target: "good morning everyone my name is arun i have recently joined the company i'm excited to work with all of you thank you",
        tip: "Speak clearly, pause after giving your name, and sound excited to meet your team.",
        evalChecks: ["Pronunciation", "Fluency", "Grammar", "Confidence", "Completeness"],
        evalScores: { pronunciation: 88, fluency: 82, grammar: 95, vocabulary: 80, confidence: 86, completeness: 100, overall: 88 },
        strengths: ["Clear greeting", "Good pronunciation", "Professional introduction"],
        improvements: ["Speak slightly slower.", "Pause after introducing your name.", "Smile while speaking to sound more confident."]
      },
      {
        type: 'voice',
        prompt: "Speaking Question 2",
        scenario: "You answer your first customer call.",
        question: "Greet the customer and introduce yourself.",
        expectedResponse: "Good morning. Thank you for calling ABC Company. My name is Arun. How may I help you today?",
        text: "Good morning. Thank you for calling ABC Company. My name is Arun. How may I help you today?",
        target: "good morning thank you for calling abc company my name is arun how may i help you today",
        tip: "Maintain a warm, professional tone and clear speaking pace for the customer.",
        evalChecks: ["Greeting", "Name introduction", "Professional tone", "Confidence", "Speaking pace"],
        evalScores: { pronunciation: 90, fluency: 85, grammar: 96, vocabulary: 84, confidence: 88, completeness: 100, overall: 90 },
        strengths: ["Warm and professional greeting", "Clear name introduction", "Polite offer to assist"],
        improvements: ["Enunciate the company name clearly.", "Keep a steady speaking pace without rushing.", "Use friendly intonation on the final question."]
      },
      {
        type: 'voice',
        prompt: "Speaking Question 3",
        scenario: "You meet a colleague near the cafeteria.",
        question: "Introduce yourself and start a short conversation.",
        expectedResponse: "Hi, I'm Arun. I joined the team this week. Nice to meet you. Which team are you working in?",
        text: "Hi, I'm Arun. I joined the team this week. Nice to meet you. Which team are you working in?",
        target: "hi i'm arun i joined the team this week nice to meet you which team are you working in",
        tip: "Use conversational, natural speaking with clear sentence formation.",
        evalChecks: ["Natural speaking", "Sentence formation", "Fluency", "Pronunciation", "Confidence"],
        evalScores: { pronunciation: 86, fluency: 84, grammar: 92, vocabulary: 85, confidence: 87, completeness: 100, overall: 89 },
        strengths: ["Friendly and natural opening", "Good sentence formation", "Clear pronunciation of question"],
        improvements: ["Vary your pitch to sound natural and friendly.", "Avoid long pauses between sentences.", "Relax and smile while making conversation."]
      },
      {
        type: 'mcq',
        q: "Which introduction is correct in a BPO call?",
        options: [
          "\"Hello.\"",
          "\"Myself Arun.\"",
          "\"Good morning. My name is Arun. Thank you for calling.\"",
          "\"I am Arun only.\""
        ],
        correct: 2,
        explanation: "\"Good morning. My name is Arun. Thank you for calling.\" is the standard, professional BPO call opening that sets a warm first impression and identifies the agent."
      },
      {
        type: 'mcq',
        q: "Why is introducing yourself clearly important in a BPO?",
        options: [
          "Customers already know you",
          "It creates the first impression.",
          "It is not necessary.",
          "Only managers introduce themselves."
        ],
        correct: 1,
        explanation: "Introducing yourself clearly creates the first impression, establishes trust, and sets a professional, helpful tone for the rest of the conversation."
      }
    ]
  },
  'default': {
    title: "Topic Speaking Assessment",
    questions: [
      {
        type: 'voice',
        prompt: "Clarity Check 1",
        text: "Please say this aloud clearly: 'Hello, I am ready to practice.'",
        target: "hello i am ready to practice",
        tip: "Speak at a moderate, steady pace with clear pronunciation."
      },
      {
        type: 'voice',
        prompt: "Clarity Check 2",
        text: "Please say this aloud clearly: 'Clear speech helps build confidence.'",
        target: "clear speech helps build confidence",
        tip: "Make sure every word is distinct and easy to follow."
      },
      {
        type: 'voice',
        prompt: "Clarity Check 3",
        text: "Please read aloud: 'Thank you for your time and guidance.'",
        target: "thank you for your time and guidance",
        tip: "Use warm intonation and complete the sentence smoothly."
      },
      {
        type: 'mcq',
        q: "Why is steady pacing important when speaking English?",
        options: [
          "It gives listeners time to process your ideas clearly.",
          "It forces you to use complicated vocabulary.",
          "It prevents your microphone from disconnecting.",
          "It makes your voice sound higher."
        ],
        correct: 0,
        explanation: "Speaking at a calm, steady pace ensures your listener can absorb and understand your message effortlessly."
      },
      {
        type: 'mcq',
        q: "What is the best way to improve pronunciation accuracy over time?",
        options: [
          "Only reading silently without speaking.",
          "Active listening and repeating target sounds out loud daily.",
          "Memorizing dictionary definitions.",
          "Speaking as fast as possible."
        ],
        correct: 1,
        explanation: "Pronunciation is a physical skill involving muscle memory, so speaking target sounds aloud daily is key to mastery."
      }
    ]
  }
};
 
export const WRITING_QUIZZES = {
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
  'wr-5-1': {
    question: "During a multi-channel support simulation, when transitioning a customer from live chat to email follow-up, what is the best practice?",
    options: [
      "Tell them you're busy and close the chat immediately",
      "Provide a clear ticket summary, verify their email address, and give a specific timeline for the email response",
      "Ask the customer to email the general support inbox",
      "Send a blank email with an attachment"
    ],
    correctIdx: 1,
    explanation: "A professional multi-channel handoff requires summarizing the agreed steps, verifying the email contact, and setting clear expectations for response times."
  },
  'wr-5-2': {
    question: "When composing a high-stakes escalation response to a VIP client whose SLA was breached, which opening is appropriate?",
    options: [
      "It wasn't our fault due to system updates.",
      "On behalf of executive management, please accept our sincere apologies for the service interruption on [Date]. We take full responsibility and have initiated root-cause remediation.",
      "Sorry for the delay.",
      "We will look into it when we get time."
    ],
    correctIdx: 1,
    explanation: "High-stakes executive escalations require immediate accountability, formal empathy, and direct mention of active remediation."
  },
  'wr-5-3': {
    question: "In speed & accuracy writing drills, how should you balance typing speed with quality?",
    options: [
      "Skip punctuation to type faster",
      "Use text shortcuts like 'u' and 'pls'",
      "Utilize text expansion templates where appropriate while ensuring 100% grammar and detail accuracy before sending",
      "Spend 45 minutes drafting a 3-line email"
    ],
    correctIdx: 2,
    explanation: "Efficiency in BPO relies on leveraging approved macros while verifying personal details and exact accuracy prior to dispatch."
  },
  'wr-5-4': {
    question: "What is the final requirement to pass the Writing Certification simulation?",
    options: [
      "Typing 100 words per minute with any error rate",
      "Completing a timed multi-stage case study demonstrating flawless grammar, empathetic tone, and precise resolution formatting across email and chat channels",
      "Memorizing grammar rules without practical application",
      "Sending one short message"
    ],
    correctIdx: 1,
    explanation: "The certification evaluates holistic performance under pressure: tone, grammar, structural clarity, and multi-channel adaptability."
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
export const GAME_QUIZZES = {
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
  'wr-5-1': { title: 'Multi-channel Simulation', questions: [
    { q: "When shifting a customer from live chat to an email follow-up, what key step ensures continuity?", options: ["Closing the chat window instantly", "Providing a ticket summary and confirming the exact email address for follow-up", "Telling the customer to wait 3 days without updates", "Asking the customer to start over via email"], correct: 1, explanation: "Confirming details and setting response expectations ensures smooth omnichannel transitions." },
    { q: "How should chat tone differ slightly from formal letter writing?", options: ["Chat allows unprofessional slang", "Chat is concise, warm, and real-time structured while remaining professional", "Chat should use 500-word paragraphs", "Chat does not require punctuation"], correct: 1, explanation: "Live chat requires conversational clarity and quick responsiveness without sacrificing professional standards." },
    { q: "Why is multi-channel versatility critical for modern BPO agents?", options: ["To avoid speaking on the phone", "Because customers interact across chat, email, and ticketing systems simultaneously", "So agents can choose their favorite channel", "It is only required for supervisors"], correct: 1, explanation: "Omnichannel customer service requires agents to adapt their writing style across real-time and asynchronous platforms." },
    { q: "When managing two concurrent support chats, what helps maintain high quality?", options: ["Copy-pasting identical generic replies to both", "Using personalized macros and keeping clear notes on each customer's specific issue", "Ignoring one customer until the other is done", "Asking both customers to wait 20 minutes"], correct: 1, explanation: "Organized multitasking and tailored macros allow fast, precise communication across concurrent chats." },
    { q: "What is the primary goal of a multi-channel resolution?", options: ["To close tickets as fast as possible regardless of quality", "To resolve the customer's core problem accurately across any platform they prefer", "To transfer the customer to another department", "To minimize word count"], correct: 1, explanation: "Omnichannel excellence centers on first-contact resolution across every customer touchpoint." }
  ]},
  'wr-5-2': { title: 'High-Stakes Escalation', questions: [
    { q: "In an executive escalation letter, what must follow your apology?", options: ["A list of excuses for the failure", "An immediate statement of accountability and the specific action plan to resolve the root cause", "A request that the client be patient", "A promotional coupon"], correct: 1, explanation: "High-stakes communications require ownership and concrete action steps to rebuild trust immediately." },
    { q: "What tone should be maintained during a tense SLA breach explanation?", options: ["Defensive and dismissive", "Calm, objective, empathetic, and strictly professional", "Aggressive to match the client's anger", "Overly casual to lighten the mood"], correct: 1, explanation: "An objective and empathetic tone reassures VIP clients that their business is valued and protected." },
    { q: "Why should you avoid technical jargon when explaining a system outage to a non-technical executive?", options: ["Jargon makes you look smart", "It obscures the core impact and resolution, creating further frustration and confusion", "Executives don't care about system details", "It takes too long to type"], correct: 1, explanation: "Executive summaries should clearly translate technical root causes into plain business impacts and solutions." },
    { q: "How should timeline commitments be handled in high-stakes escalations?", options: ["Make vague promises like 'sometime next week'", "Provide exact, realistic timestamps for updates and meet or beat every commitment", "Refuse to give any updates until 100% resolved", "Tell the client you don't know"], correct: 1, explanation: "Predictable, transparent communication cadences are essential for de-escalating critical business issues." },
    { q: "What is the final step before sending an executive escalation communication?", options: ["Sending it immediately without review", "Performing a peer or supervisor quality check for factual accuracy, tone, and formatting", "Adding extra exclamation points for emphasis", "Deleting all previous email history"], correct: 1, explanation: "A secondary review prevents costly misstatements and ensures polish on critical communications." }
  ]},
  'wr-5-3': { title: 'Speed & Accuracy Drills', questions: [
    { q: "What is the recommended approach to utilizing text expansion templates (macros)?", options: ["Send them blind without reading", "Insert the macro, customize personal details, and verify exact accuracy before sending", "Never use macros under any circumstances", "Only use macros for VIP clients"], correct: 1, explanation: "Customized macros combine high typing speed with personalized accuracy." },
    { q: "If you must choose between sending an email 30 seconds faster or fixing a typo in the customer's name, what should you do?", options: ["Send faster — speed is king", "Fix the typo — misspelling a customer's name damages professional rapport instantly", "Send a second email apologizing for the typo", "Ignore it"], correct: 1, explanation: "Accuracy and personal respect always take precedence over mere seconds of speed." },
    { q: "How does structured proofreading increase overall BPO efficiency?", options: ["It slows you down significantly", "It prevents rework, follow-up clarification tickets, and customer dissatisfaction caused by errors", "It is only necessary for trainees", "It replaces the need for training"], correct: 1, explanation: "Getting the communication right the first time eliminates costly follow-up interactions and boosts FCR (First Contact Resolution)." },
    { q: "Which habit best improves typing accuracy under high ticket volume?", options: ["Looking at the keyboard constantly", "Practicing touch typing and maintaining calm, rhythmic pacing during busy queues", "Drinking excessive amounts of caffeine", "Slouching and typing with two fingers"], correct: 1, explanation: "Touch typing combined with composed pacing ensures consistent output without error spikes." },
    { q: "When handling a high-volume queue, what should be double-checked on every outgoing message?", options: ["Recipient email, subject line accuracy, and attachments", "Only the signature line", "The font color", "Nothing, just hit send"], correct: 0, explanation: "Verifying recipient details, subject lines, and attachments prevents critical misdelivery errors." }
  ]},
  'wr-5-4': { title: 'Final Writing Certification', questions: [
    { q: "What core competencies are evaluated in the BPO Writing Mastery Certification?", options: ["Grammar accuracy, empathetic tone, structural clarity, and multi-channel adaptability under realistic constraints", "Just spelling checks", "How fast you can press the keys without accuracy", "Only formal letter formatting"], correct: 0, explanation: "Mastery requires demonstrating comprehensive communication excellence across all professional dimensions." },
    { q: "During a comprehensive case study assessment, how should you organize your written response?", options: ["Random thoughts in bullet points", "Clear greeting, empathetic acknowledgment, structured solution details, and professional sign-off", "One massive paragraph without breaks", "No greeting or sign-off to save time"], correct: 1, explanation: "Structured formatting makes complex information digestible and professional." },
    { q: "If a simulation requires resolving both a billing dispute and a technical glitch in one email, what is best practice?", options: ["Address only the billing dispute", "Address both issues clearly using headers or bullet points to keep each resolution distinct and easy to follow", "Tell the customer to submit two separate tickets", "Combine everything into one confusing sentence"], correct: 1, explanation: "Addressing multi-part inquiries with clear visual separation demonstrates elite organization and care." },
    { q: "Why is achieving this Writing Certification valuable for your BPO career?", options: ["It proves you can write code", "It validates your ability to deliver production-ready, highly professional customer engagement across global accounts", "It allows you to skip work", "It is just a decoration"], correct: 1, explanation: "Certified communication mastery opens doors to senior support, QA, and leadership roles in the global BPO industry." },
    { q: "What is the ultimate standard for production-ready business communication?", options: ["Good enough that the customer understands eventually", "Flawless clarity, professional warmth, rapid delivery, and complete issue resolution on the first interaction", "Using complex words no one knows", "Writing as briefly as possible"], correct: 1, explanation: "Production-ready BPO communication achieves First Contact Resolution through clarity, warmth, and precision." }
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
export const CATEGORIES = [
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
    desc: 'Master written English — grammar, professional emails, complaints, and BPO simulations',
    subText: 'Grammar • Emails • Complaints • Advanced Comms • BPO Mastery',
  },
];
 
// ── Speaking Modules ──────────────────────────────────────────
export const SPEAKING_MODULES = [
  {
    id: 'sp-1', number: 1,
    title: 'Speaking & Listening Foundations',
    description: 'Build basic English confidence for BPO freshers — greetings, spelling, numbers, grammar and everyday workplace conversation.',
    emoji: '🔤', color: '#6366f1', bg: '#ede9fe',
    duration: '~9 hours', tag: 'Beginner',
    subText: 'Greetings • Spelling on Calls • Numbers & Time • Tenses • Vocabulary • Confidence',
    subModules: [
      { id: 'sp-1-1',  title: 'Greetings & Introducing Yourself',                    duration: '3 min', icon: '👋' },
      { id: 'sp-1-2',  title: 'The Phonetic Alphabet for Spelling on Calls',         duration: '3 min', icon: '🔤' },
      { id: 'sp-1-3',  title: 'Numbers, Dates & Time',                               duration: '3 min', icon: '🔢' },
      { id: 'sp-1-4',  title: 'Simple Present Tense — Daily Routine & Work',         duration: '3 min', icon: '📅' },
      { id: 'sp-1-5',  title: 'Simple Sentence Structure (Subject + Verb + Object)', duration: '3 min', icon: '🧩' },
      { id: 'sp-1-6',  title: 'Common Workplace & Everyday Vocabulary',              duration: '3 min', icon: '🏢' },
      { id: 'sp-1-7',  title: 'Asking Simple Questions (What, Where, Who, When)',    duration: '3 min', icon: '❓' },
      { id: 'sp-1-8',  title: 'Describing People & Things (Basic Adjectives)',       duration: '3 min', icon: '🎨' },
      { id: 'sp-1-9',  title: 'Talking About Likes & Preferences',                   duration: '3 min', icon: '❤️' },
      { id: 'sp-1-10', title: 'Simple Past Tense — Completed Tasks',                 duration: '3 min', icon: '⏪' },
      { id: 'sp-1-11', title: 'Polite Words — Please, Thank You, Sorry, Excuse Me',  duration: '3 min', icon: '🙏' },
      { id: 'sp-1-12', title: 'Basic Listening Practice — Short Conversations',      duration: '3 min', icon: '👂' },
      { id: 'sp-1-13', title: 'Reading Simple Sentences Aloud',                      duration: '3 min', icon: '📖' },
      { id: 'sp-1-14', title: 'Common Mistakes Beginners Make',                      duration: '3 min', icon: '⚠️' },
      { id: 'sp-1-15', title: 'Vocabulary Building — Everyday & Workplace Words',    duration: '3 min', icon: '📚' },
      { id: 'sp-1-16', title: 'Simple Future Tense — Plans & Next Steps',            duration: '3 min', icon: '⏩' },
      { id: 'sp-1-17', title: 'Speaking Without Fear — Building Confidence',         duration: '3 min', icon: '💪' },
      { id: 'sp-1-18', title: 'Level 1 Review & Speaking Assessment',                duration: '3 min', icon: '🏁' },
    ],
  },
  {
    id: 'sp-2', number: 2,
    title: 'BPO Call Speaking',
    description: 'Professional telephone English — formal tone, workplace vocabulary, and handling customer conversations with confidence.',
    emoji: '📞', color: '#10b981', bg: '#d1fae5',
    duration: '2.5 hours', tag: 'Intermediate',
    subText: 'Formal English • Workplace Talk • Telephone Basics • Customer Conversations',
    subModules: [
      { id: 'sp-2-1',  title: 'Formal vs Informal English',                 duration: '3 min', icon: '🎩' },
      { id: 'sp-2-2',  title: 'Word Stress Basics',                         duration: '3 min', icon: '📢' },
      { id: 'sp-2-3',  title: 'Introducing Yourself Professionally',        duration: '3 min', icon: '👋' },
      { id: 'sp-2-4',  title: 'Making Small Talk',                          duration: '3 min', icon: '💬' },
      { id: 'sp-2-5',  title: 'Common Office & Workplace Vocabulary',       duration: '3 min', icon: '🏢' },
      { id: 'sp-2-6',  title: 'Expressing Opinions Simply',                 duration: '3 min', icon: '🗣️' },
      { id: 'sp-2-7',  title: 'Agreeing & Disagreeing Politely',            duration: '3 min', icon: '🤝' },
      { id: 'sp-2-8',  title: 'Making Requests Politely',                   duration: '3 min', icon: '🙏' },
      { id: 'sp-2-9',  title: 'Apologizing Professionally',                 duration: '3 min', icon: '😔' },
      { id: 'sp-2-10', title: 'Present Continuous — Ongoing Actions',       duration: '3 min', icon: '⏳' },
      { id: 'sp-2-11', title: 'Describing Problems & Situations',           duration: '3 min', icon: '⚠️' },
      { id: 'sp-2-12', title: 'Telephone English Basics',                   duration: '3 min', icon: '☎️' },
      { id: 'sp-2-13', title: 'Asking for Clarification',                  duration: '3 min', icon: '❓' },
      { id: 'sp-2-14', title: 'Basic Customer Conversation Practice',       duration: '3 min', icon: '🎧' },
      { id: 'sp-2-15', title: 'Basic Email Writing (Spoken Context)',       duration: '3 min', icon: '✉️' },
      { id: 'sp-2-16', title: 'Listening Practice — Workplace Conversations', duration: '3 min', icon: '👂' },
      { id: 'sp-2-17', title: 'Common Grammar Mistakes at Work',            duration: '3 min', icon: '❗' },
      { id: 'sp-2-18', title: 'Vocabulary Building — Workplace Expressions', duration: '3 min', icon: '📚' },
    ],
  },
  {
    id: 'sp-3', number: 3,
    title: 'Fluency & Confidence',
    description: 'Handle live customer calls and chats with confidence — active listening, empathy, clear speech and neutral accent awareness.',
    emoji: '🎙️', color: '#f59e0b', bg: '#fef3c7',
    duration: '3 hours', tag: 'Intermediate',
    subText: 'Call Structure • Active Listening • Empathy • Accent Awareness • Complaints',
    subModules: [
      { id: 'sp-3-1',  title: 'First Impressions on Calls & Chats',                     duration: '3 min', icon: '✨' },
      { id: 'sp-3-2',  title: 'Professional Call Opening Structure',                    duration: '3 min', icon: '📞' },
      { id: 'sp-3-3',  title: 'Active Listening on Live Calls',                         duration: '3 min', icon: '👂' },
      { id: 'sp-3-4',  title: 'Understanding Customer Intent',                          duration: '3 min', icon: '🎯' },
      { id: 'sp-3-5',  title: 'Probing Questions',                                      duration: '3 min', icon: '🔍' },
      { id: 'sp-3-6',  title: 'Clarification Techniques',                               duration: '3 min', icon: '❓' },
      { id: 'sp-3-7',  title: 'Showing Empathy to Customers',                           duration: '3 min', icon: '💙' },
      { id: 'sp-3-8',  title: 'Professional Response Framing (Saying No Politely)',     duration: '3 min', icon: '🙅' },
      { id: 'sp-3-9',  title: 'Speaking with Confidence on Calls',                      duration: '3 min', icon: '💪' },
      { id: 'sp-3-10', title: 'Clear Speech & Articulation',                            duration: '3 min', icon: '🗣️' },
      { id: 'sp-3-11', title: 'Neutral Accent Awareness (MTI Basics)',                  duration: '3 min', icon: '🌍' },
      { id: 'sp-3-12', title: 'Common Sound Corrections',                               duration: '3 min', icon: '🔤' },
      { id: 'sp-3-13', title: 'Word & Sentence Stress',                                 duration: '3 min', icon: '📢' },
      { id: 'sp-3-14', title: 'Handling Simple Customer Complaints',                    duration: '3 min', icon: '🛠️' },
      { id: 'sp-3-15', title: 'Call Documentation Basics (Spoken Summary)',             duration: '3 min', icon: '📋' },
      { id: 'sp-3-16', title: 'Professional Chat Etiquette',                            duration: '3 min', icon: '💬' },
      { id: 'sp-3-17', title: 'Ending Calls & Chats Professionally',                    duration: '3 min', icon: '✅' },
      { id: 'sp-3-18', title: 'Cross-Cultural Communication Basics',                    duration: '3 min', icon: '🌐' },
    ],
  },
  {
    id: 'sp-4', number: 4,
    title: 'Advanced Communication',
    description: 'Handle angry customers, de-escalate conflict, and manage complex calls with the accent awareness and vocabulary of a seasoned professional.',
    emoji: '🏆', color: '#ec4899', bg: '#fdf2f8',
    duration: '3 hours', tag: 'Advanced',
    subText: 'De-escalation • Escalation Procedures • Global Accents • Certification',
    subModules: [
      { id: 'sp-4-1',  title: 'Handling Angry or Frustrated Customers',              duration: '3 min', icon: '😡' },
      { id: 'sp-4-2',  title: 'De-escalation Techniques',                           duration: '3 min', icon: '🧘' },
      { id: 'sp-4-3',  title: 'Objection Handling',                                 duration: '3 min', icon: '🛡️' },
      { id: 'sp-4-4',  title: 'Conflict Resolution on Calls',                       duration: '3 min', icon: '🤝' },
      { id: 'sp-4-5',  title: 'Hold & Transfer Etiquette',                          duration: '3 min', icon: '⏸️' },
      { id: 'sp-4-6',  title: 'Escalation Procedures',                              duration: '3 min', icon: '🔺' },
      { id: 'sp-4-7',  title: 'Advanced Call Flow Management',                      duration: '3 min', icon: '🔄' },
      { id: 'sp-4-8',  title: 'Global Accent Familiarity (US, UK, Australian)',     duration: '3 min', icon: '🌍' },
      { id: 'sp-4-9',  title: 'Fast, Natural Speech — Advanced Listening',          duration: '3 min', icon: '⚡' },
      { id: 'sp-4-10', title: 'Spontaneous Speaking — Thinking on Your Feet',       duration: '3 min', icon: '🧠' },
      { id: 'sp-4-11', title: 'Advanced Vocabulary & Professional Expressions',     duration: '3 min', icon: '📚' },
      { id: 'sp-4-12', title: 'Customer-Centric Thinking & First-Call Resolution',  duration: '3 min', icon: '🎯' },
      { id: 'sp-4-13', title: 'Team Communication & Workplace Etiquette',           duration: '3 min', icon: '👥' },
      { id: 'sp-4-14', title: 'Full Mock Customer Call Simulation',                 duration: '3 min', icon: '🎬' },
      { id: 'sp-4-15', title: 'Capstone Assessment & Certification',                duration: '3 min', icon: '🎓' },
    ],
  },
];
 
// ── Writing Modules (Extended 5-Module / 19-Day Curriculum) ───
export const WRITING_MODULES = [
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
  {
    id: 'wr-5', number: 5,
    title: 'BPO Mastery Simulations',
    description: 'Complete real-world multi-channel BPO simulations under pressure and earn your certification.',
    emoji: '🏅', color: '#ec4899', bg: '#fdf2f8',
    duration: '3.5 hours', tag: 'Expert',
    subText: 'Multi-channel Sim • High-Stakes Escalation • Speed & Accuracy • Final Certification',
    subModules: [
      { id: 'wr-5-1', title: 'Multi-channel Simulation',   duration: '50 min', icon: '⚡' },
      { id: 'wr-5-2', title: 'High-Stakes Escalation',     duration: '50 min', icon: '🔥' },
      { id: 'wr-5-3', title: 'Speed & Accuracy Drills',    duration: '45 min', icon: '⏱️' },
      { id: 'wr-5-4', title: 'Final Writing Certification', duration: '60 min', icon: '🎓' },
    ],
  },
];
 
export const MODULES_MAP = { speaking: SPEAKING_MODULES, writing: WRITING_MODULES };
 