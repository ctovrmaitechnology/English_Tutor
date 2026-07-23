import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const LABELS = ['A', 'B', 'C', 'D'];

// ── Module Metadata ───────────────────────────────────────────────────────────
const MODULE_META = {
  'sp-1': { label: 'Pronunciation Basics',   icon: '🔊', color: '#6366f1', gradient: 'linear-gradient(135deg,#4f46e5,#7c3aed)', category: 'speaking' },
  'sp-2': { label: 'BPO Communication',      icon: '📞', color: '#8b5cf6', gradient: 'linear-gradient(135deg,#7c3aed,#a855f7)', category: 'speaking' },
  'sp-3': { label: 'Advanced Speaking',      icon: '🎙️', color: '#ec4899', gradient: 'linear-gradient(135deg,#db2777,#f43f5e)', category: 'speaking' },
  'sp-4': { label: 'Expert Level Speaking',  icon: '⭐', color: '#f59e0b', gradient: 'linear-gradient(135deg,#d97706,#f59e0b)', category: 'speaking' },
  'wr-1': { label: 'Grammar Foundations',   icon: '✍️', color: '#10b981', gradient: 'linear-gradient(135deg,#059669,#10b981)', category: 'writing' },
  'wr-2': { label: 'Professional Emails',   icon: '📧', color: '#3b82f6', gradient: 'linear-gradient(135deg,#2563eb,#3b82f6)', category: 'writing' },
  'wr-3': { label: 'Handling Complaints',       icon: '📝', color: '#06b6d4', gradient: 'linear-gradient(135deg,#0891b2,#06b6d4)', category: 'writing' },
  'wr-4': { label: 'Advanced Business Writing',         icon: '🏆', color: '#84cc16', gradient: 'linear-gradient(135deg,#65a30d,#84cc16)', category: 'writing' },
};

// ── Sub-module Metadata ───────────────────────────────────────────────────────
const SUBMODULE_META = {
  'sp-1-1':'Vowel Sounds',        'sp-1-2':'Consonant Sounds',
  'sp-1-3':'Word Stress',         'sp-1-4':'Sentence Intonation',
  'sp-2-1':'Call Opening',        'sp-2-2':'Active Listening',
  'sp-2-3':'Objection Handling',  'sp-2-4':'Call Closing',
  'sp-3-1':'Persuasive Speaking', 'sp-3-2':'Negotiation Talk',
  'sp-3-3':'De-escalation',       'sp-3-4':'Empathy Expression',
  'sp-4-1':'Complex Scenarios',   'sp-4-2':'Advanced Objections',
  'sp-4-3':'Leadership Speech',   'sp-4-4':'Cultural Sensitivity',
  'wr-1-1':'Tense Usage',         'wr-1-2':'Sentence Structure',
  'wr-1-3':'Punctuation',         'wr-1-4':'Subject-Verb Agreement',
  'wr-2-1':'Email Subject Lines', 'wr-2-2':'Email Greetings',
  'wr-2-3':'Email Body Writing',  'wr-2-4':'Email Closings',
  'wr-3-1':'Escalation Emails',   'wr-3-2':'Negotiation Writing',
  'wr-3-3':'Complaint Handling',  'wr-3-4':'Report Writing',
  'wr-4-1':'Complex Grammar',     'wr-4-2':'Business Metrics Writing',
  'wr-4-3':'Formal Correspondence','wr-4-4':'De-escalation Writing',
};

// ── Fallback Questions (5 per sub-module) ────────────────────────────────────
const FALLBACK = {
  // SPEAKING — each item: { text, tip }
  'sp-1-1': { type:'speaking', title:'Vowel Sounds', questions:[
    { text:'The sheep sleep near the deep blue sea.', tip:'Focus on the long /iː/ sound in sheep, sleep, deep, sea.' },
    { text:'I can feel the heat from the green field.', tip:'Distinguish /iː/ in feel, heat, green, field.' },
    { text:'The cat sat on a flat mat in the black bag.', tip:'Practise the short /æ/ vowel sound clearly.' },
    { text:'Put the good book on the wooden hood.', tip:'Focus on the short /ʊ/ sound in put, good, wood, hood.' },
    { text:'The blue moon loomed over the cool pool.', tip:'Practise the long /uː/ vowel in blue, moon, cool, pool.' },
  ]},
  'sp-1-2': { type:'speaking', title:'Consonant Sounds', questions:[
    { text:'She sells seashells by the seashore every single summer.', tip:'Alternate cleanly between /s/ and /ʃ/ consonant sounds.' },
    { text:'The thick thread was thrown through the thin hole.', tip:'Practise the voiced /ð/ and unvoiced /θ/ th-sounds.' },
    { text:'Victor drove the van over the vast valley very vividly.', tip:'Focus on the /v/ consonant — do not substitute /b/ or /w/.' },
    { text:'The zebra zigzagged past the buzzing jazz zone.', tip:'Practise the voiced /z/ consonant at different word positions.' },
    { text:'Please place the plastic plate gently on the plank.', tip:'Practise the /pl/ consonant cluster at the start of words.' },
  ]},
  'sp-1-3': { type:'speaking', title:'Word Stress', questions:[
    { text:'Please present the present to the department manager.', tip:'Stress the first syllable for noun (PRE-sent), second for verb (pre-SENT).' },
    { text:'The record shows that they record every call.', tip:'Noun: RE-cord. Verb: re-CORD. Stress shifts the meaning.' },
    { text:'We need to permit entry, but the permit expires today.', tip:'Noun: PER-mit. Verb: per-MIT. Watch the stress shift.' },
    { text:'The increase in calls will increase our workload.', tip:'Noun: IN-crease. Verb: in-CREASE. Practice both in one breath.' },
    { text:'There was a conflict when the teams began to conflict over the project.', tip:'Noun: CON-flict. Verb: con-FLICT. Maintain steady rhythm.' },
  ]},
  'sp-1-4': { type:'speaking', title:'Sentence Intonation', questions:[
    { text:'Are you calling about your billing issue today?', tip:'Use rising intonation at the end — yes/no question.' },
    { text:'Where would you like us to send the confirmation email?', tip:'WH-questions use falling intonation at the end.' },
    { text:'I can help you with that, or I can transfer you to billing.', tip:'Rise on first option, fall on second in an or-choice.' },
    { text:'Thank you for calling. Have a great day!', tip:'Warm, falling intonation on both phrases to sound sincere.' },
    { text:'Could you please hold for just one moment?', tip:'Slightly rising polite request — avoid sounding flat or robotic.' },
  ]},
  'sp-2-1': { type:'speaking', title:'Call Opening', questions:[
    { text:'Thank you for calling RuralShores Support. My name is Alex. How may I assist you today?', tip:'Sound energetic and professional. Enunciate every word in the greeting.' },
    { text:'Good afternoon! You have reached the billing department. This is Sam speaking.', tip:'Maintain a warm, upbeat tone in the department introduction.' },
    { text:'Welcome to RuralShores technical support. I am happy to help you. May I have your account number?', tip:'Pause after each phrase to sound composed and unhurried.' },
    { text:'Thank you for your patience. My name is Rachel and I will be assisting you today.', tip:'Stress your name clearly so the customer remembers who is helping them.' },
    { text:'Good morning! Thank you for choosing RuralShores. How can I make your day better?', tip:'The closing question should sound genuinely enthusiastic — not scripted.' },
  ]},
  'sp-2-2': { type:'speaking', title:'Active Listening', questions:[
    { text:'I completely understand your frustration, and I want you to know that I am here to help.', tip:'Stress "completely" and "here" to emphasise genuine empathy.' },
    { text:'Just to confirm, you mentioned that your service has been down since yesterday morning. Is that correct?', tip:'Repeat key facts when paraphrasing — it shows you are listening.' },
    { text:'I hear you, and I appreciate your patience while I look into this for you right now.', tip:'Pause naturally after "hear you" to make the empathy feel real.' },
    { text:'Could you tell me a little more about when this issue first started happening?', tip:'Use a gentle, inquisitive tone — not interrogating, but caring.' },
    { text:'Thank you for explaining that so clearly. Let me make sure I have all the details correct.', tip:'Praise clarity politely, then transition to verification smoothly.' },
  ]},
  'sp-2-3': { type:'speaking', title:'Objection Handling', questions:[
    { text:'I completely understand your concern about the charges. Allow me to explain what each item covers.', tip:'Validate before you explain — never argue with the customer.' },
    { text:'I see why that could be confusing. Many customers feel the same way at first. Here is what we found.', tip:'Use the feel-felt-found technique to build connection.' },
    { text:'You are absolutely right that the turnaround time was longer than expected, and I sincerely apologise.', tip:'Agree with the factual complaint before offering a resolution.' },
    { text:'I understand this has been inconvenient. What I can offer you today is a one-month service credit.', tip:'Bridge from empathy to resolution with a smooth transition.' },
    { text:'While I am unable to process a full refund, I assure you that I will escalate this to our billing manager.', tip:'State limitations clearly but compensate with a strong action commitment.' },
  ]},
  'sp-2-4': { type:'speaking', title:'Call Closing', questions:[
    { text:'Is there anything else I can assist you with today before we end the call?', tip:'Ask sincerely — never rush the customer off the line.' },
    { text:'I am glad we were able to resolve this for you. Thank you so much for calling RuralShores.', tip:'Confirm the resolution before thanking — do not assume the customer is satisfied.' },
    { text:'You will receive a confirmation email within the next 24 hours. Please do not hesitate to call us back.', tip:'State the next steps clearly and invite the customer to return if needed.' },
    { text:'It was truly my pleasure assisting you today. On behalf of RuralShores, have a wonderful evening.', tip:'Sound warm and genuine — avoid sounding like you are reading from a script.' },
    { text:'Thank you for your patience and understanding throughout this call. We really appreciate your loyalty.', tip:'Acknowledge their patience explicitly before the final farewell.' },
  ]},
  'sp-3-1': { type:'speaking', title:'Persuasive Speaking', questions:[
    { text:'Our premium plan not only saves you money in the long run but also gives you priority access to our support team.', tip:'Stress the two key selling points — "saves you money" and "priority access".' },
    { text:'Customers who upgraded to our advanced tier reported a forty percent reduction in downtime.', tip:'Cite statistics confidently — pause briefly before the number.' },
    { text:'I strongly recommend taking advantage of this limited-time offer before it expires at the end of this month.', tip:'Create urgency with "limited-time" — say it with controlled energy.' },
    { text:'Based on your usage pattern, this plan would save your company approximately three hundred dollars every quarter.', tip:'Personalise the pitch — "your company" and "your usage" are key persuasion words.' },
    { text:'Many businesses in your industry have already made the switch and have not looked back since.', tip:'Social proof is persuasive — say it with quiet confidence, not pressure.' },
  ]},
  'sp-3-2': { type:'speaking', title:'Negotiation Talk', questions:[
    { text:'I understand your budget constraints. Let us explore an option that works for both of us.', tip:'Use collaborative language — "both of us" removes adversarial tension.' },
    { text:'What if we extended your contract by six months in exchange for the discount you are requesting?', tip:'Propose a trade-off clearly and confidently without sounding defensive.' },
    { text:'I can offer you a fifteen percent reduction today, provided the payment is processed within seven days.', tip:'Attach a clear condition to the offer — it adds credibility and urgency.' },
    { text:'Rather than a full refund, would you be open to a service credit that you can use any time in the next year?', tip:'Present the alternative as an open question — give the customer agency.' },
    { text:'I appreciate your flexibility. Let me confirm what we have agreed on before we proceed.', tip:'Summarise the agreement verbally to prevent misunderstanding later.' },
  ]},
  'sp-3-3': { type:'speaking', title:'De-escalation', questions:[
    { text:'I can hear how frustrated you are, and I want you to know that your concern is completely valid.', tip:'Match the emotional weight of their frustration — do not sound dismissive.' },
    { text:'I sincerely apologise for the experience you have had. Let me take full ownership of this issue right now.', tip:'Ownership language ("I") builds immediate trust better than blaming systems.' },
    { text:'I am going to personally make sure this gets resolved today so that you do not have to call us back.', tip:'Commit to a specific outcome — vague promises escalate frustration further.' },
    { text:'I completely understand why you feel that way, and I would feel the same if I were in your position.', tip:'Perspective-taking language is the most powerful de-escalation tool available.' },
    { text:'Let us slow down for just a moment and go through this together so we can find the best solution for you.', tip:'A calm, measured pace is essential — never match an angry customer\'s speed or volume.' },
  ]},
  'sp-3-4': { type:'speaking', title:'Empathy Expression', questions:[
    { text:'I truly understand how stressful this situation must be, especially when you rely on this service for your work.', tip:'Acknowledge both the emotion and the impact of the problem on their life.' },
    { text:'That sounds really challenging, and I appreciate you bringing this to our attention so we can improve.', tip:'Pair empathy with appreciation — it disarms defensiveness.' },
    { text:'I want to make sure you feel heard before we move on to the solution, so please take your time.', tip:'Give verbal permission to speak freely — it reduces tension significantly.' },
    { text:'Your loyalty to RuralShores means a great deal to us, and we never want you to feel let down by our service.', tip:'Reference loyalty explicitly — it signals the customer is valued, not just a ticket number.' },
    { text:'I know this is the third time you have called about this, and I am truly sorry we have not resolved it sooner.', tip:'Acknowledging repeat contacts directly and sincerely reduces anger faster than any policy.' },
  ]},
  'sp-4-1': { type:'speaking', title:'Complex Scenarios', questions:[
    { text:'I understand that you have been routed to three different departments. Allow me to take complete ownership of your case right now and see it through to resolution.', tip:'Acknowledge the journey clearly and take full ownership without blaming other teams.' },
    { text:'Given the sensitivity of the data involved, I will need to verify your identity through two additional security steps before proceeding.', tip:'State security procedures calmly — frame them as protection for the customer, not barriers.' },
    { text:'I am flagging your account as priority level one and personally contacting our technical team while you are on the line.', tip:'Real-time action narration builds confidence that you are actually doing something.' },
    { text:'I completely acknowledge the financial impact this outage has had on your operations, and I am escalating this to our senior management team immediately.', tip:'Acknowledge consequences before action — sequence matters in high-stakes calls.' },
    { text:'To prevent this from happening again, I am submitting a formal incident report that will be reviewed by our service quality team within forty-eight hours.', tip:'Preventive language reassures the customer that systemic fixes are being made.' },
  ]},
  'sp-4-2': { type:'speaking', title:'Advanced Objections', questions:[
    { text:'I hear your concern about the price increase. What I can tell you is that this reflects a significant upgrade to our infrastructure that directly benefits your account.', tip:'Connect the price objection directly to a tangible benefit for their specific account.' },
    { text:'You are absolutely right that this is a significant investment. Let me walk you through exactly what you are getting in return, step by step.', tip:'Never minimise the objection — amplify it then redirect with specifics.' },
    { text:'I understand you are considering switching to a competitor. I respect that decision, but I would love the opportunity to address the specific concerns before you make a final choice.', tip:'Ask for one more chance without sounding desperate — use a respectful, confident tone.' },
    { text:'The contract clause you are referring to does provide for that, and I want to make sure we honour it fully and transparently.', tip:'Cite contract details confidently — never hedge on policy facts.' },
    { text:'While I cannot override the system limitation right now, I am documenting this as a formal exception request to our compliance team on your behalf.', tip:'When you cannot say yes, show the customer exactly what you can do instead.' },
  ]},
  'sp-4-3': { type:'speaking', title:'Leadership Speech', questions:[
    { text:'Our team is committed to delivering not just solutions but experiences that restore your confidence in our service.', tip:'Leadership language focuses on outcomes ("experiences") not just tasks ("solutions").' },
    { text:'I am taking personal responsibility for ensuring every action item discussed today is tracked and completed within the agreed timeframe.', tip:'Personal accountability is the hallmark of leadership communication in BPO.' },
    { text:'Our quality assurance team will conduct a full audit of this case to identify root causes and implement corrective measures across the board.', tip:'Systemic thinking ("across the board") signals maturity and credibility.' },
    { text:'I want to assure you that the feedback you have shared today will directly influence the way we train our frontline teams going forward.', tip:'Connecting customer feedback to training demonstrates organisational ownership.' },
    { text:'As the senior point of contact for your account, I am authorising an immediate exception to our standard protocol to resolve this today.', tip:'Authority language ("I am authorising") closes complex objections faster than policy recitation.' },
  ]},
  'sp-4-4': { type:'speaking', title:'Cultural Sensitivity', questions:[
    { text:'I want to make sure I am pronouncing your name correctly. Could you guide me on the correct pronunciation?', tip:'Asking about name pronunciation shows respect and builds immediate rapport.' },
    { text:'I appreciate you sharing that context about your local situation. It helps me understand your needs much better.', tip:'Acknowledging cultural or regional context validates the customer\'s unique perspective.' },
    { text:'I want to make sure our communication today is completely clear and comfortable for you. Please stop me at any point if I need to clarify anything.', tip:'Open permission to interrupt reduces language-barrier anxiety for the customer.' },
    { text:'We deeply respect the cultural importance of that occasion. We will make sure your service is fully restored well before then.', tip:'Acknowledging cultural events shows personalisation beyond the script.' },
    { text:'I understand that business practices can vary across regions. Let me make sure the solution I offer aligns with what works best in your context.', tip:'Adapting solutions to regional business norms reflects global service intelligence.' },
  ]},

  // WRITING — each item: { question, options, correct, explanation }
  'wr-1-1': { type:'writing', title:'Tense Usage', questions:[
    { question:'Choose the correct tense: "By the time the manager arrived, the agent ___ the customer."', options:['has already helped','had already helped','already helped','will help'], correct:1, explanation:'Past perfect (had + past participle) is used for an action completed before another past event.' },
    { question:'Which sentence uses the future perfect tense correctly?', options:['We will complete the training by Friday.','We will have completed the training by Friday.','We have completed the training by Friday.','We completed the training by Friday.'], correct:1, explanation:'Future perfect (will have + past participle) expresses an action done before a future point.' },
    { question:'Select the correct sentence in the present perfect continuous tense:', options:['She is working here for five years.','She has been working here for five years.','She was working here for five years.','She works here for five years.'], correct:1, explanation:'Present perfect continuous (has/have been + verb-ing) describes an ongoing action from past to now.' },
    { question:'"If I ___ about the delay, I would have called the customer immediately."', options:['knew','know','had known','have known'], correct:2, explanation:'Third conditional uses "had known" (past perfect) in the if-clause.' },
    { question:'Which tense is most appropriate for a service update email?', options:['The issue is being investigated.','The issue was being investigated.','The issue will be investigated.','The issue has been investigated and resolved.'], correct:3, explanation:'Present perfect signals completed action — most reassuring for a customer update.' },
  ]},
  'wr-1-2': { type:'writing', title:'Sentence Structure', questions:[
    { question:'Identify the sentence with the correct structure:', options:['Because the server was down, so we could not process the request.','Because the server was down, we could not process the request.','The server was down because, we could not process the request.','We could not process the request, because of the server was down.'], correct:1, explanation:'Do not use "so" after "because" — they are both conjunctions and cannot be used together.' },
    { question:'Which is a correctly structured compound sentence?', options:['The agent was busy he could not answer.','The agent was busy, so he could not answer.','The agent was busy and could not answer the phone call.','Both B and C are correct.'], correct:3, explanation:'Compound sentences join independent clauses with a conjunction (and, but, so, or).' },
    { question:'Choose the sentence with correct parallel structure:', options:['She likes to answer calls, writing emails, and training new staff.','She likes answering calls, writing emails, and to train new staff.','She likes answering calls, writing emails, and training new staff.','She likes to answer, write emails, and training.'], correct:2, explanation:'Parallel structure requires all items in a list to use the same grammatical form.' },
    { question:'Which sentence correctly uses a relative clause?', options:['The customer who called yesterday, he was very upset.','The customer who called yesterday was very upset.','The customer, who he called yesterday, was very upset.','The customer called yesterday who was very upset.'], correct:1, explanation:'Do not repeat the subject (he) after a relative clause (who called yesterday).' },
    { question:'Identify the run-on sentence:', options:['The call was escalated, and the supervisor took over.','The call was escalated the supervisor took over.','After the call was escalated, the supervisor took over.','The supervisor took over the escalated call.'], correct:1, explanation:'A run-on sentence joins two independent clauses without any punctuation or conjunction.' },
  ]},
  'wr-1-3': { type:'writing', title:'Punctuation', questions:[
    { question:'Choose the correctly punctuated sentence:', options:['Dear Mr Smith I am writing to follow up on your request.','Dear Mr. Smith, I am writing to follow up on your request.','Dear, Mr. Smith I am writing to follow up on your request.','Dear Mr. Smith; I am writing to follow up on your request.'], correct:1, explanation:'Use a comma after the salutation in business emails, and a period after abbreviated titles.' },
    { question:'Which sentence uses the semicolon correctly?', options:['The ticket is open; and it needs urgent attention.','The ticket is open; it needs urgent attention.','The ticket; is open and needs urgent attention.','The ticket is open, it needs; urgent attention.'], correct:1, explanation:'A semicolon joins two independent clauses without a conjunction.' },
    { question:"Select the sentence with correct apostrophe usage:", options:["The customer's account has been updated.","The customers account has been updated.","The customers' account's have been updated.","The customer account has been updated."], correct:0, explanation:"Singular possessive: add apostrophe + s (customer's) to show ownership." },
    { question:'Which sentence uses a colon correctly?', options:['Please bring the following: your ID, account number, and billing statement.','Please bring: the following your ID, account number, and billing statement.','Please bring the following your ID: account number, and billing statement.','Please: bring the following your ID, account number, and billing statement.'], correct:0, explanation:'A colon introduces a list that follows a complete independent clause.' },
    { question:'Identify the sentence with correct comma usage in a list:', options:['We offer support via phone email and chat.','We offer support via phone, email, and chat.','We offer support via, phone, email and chat.','We offer support, via phone, email, and chat.'], correct:1, explanation:'Use commas to separate items in a list. The Oxford comma before "and" is recommended in professional writing.' },
  ]},
  'wr-1-4': { type:'writing', title:'Subject-Verb Agreement', questions:[
    { question:'Choose the correct verb: "Neither the manager nor the agents ___ available right now."', options:['is','are','was','were'], correct:1, explanation:'With neither/nor, the verb agrees with the subject closest to it. "Agents" is plural, so use "are".' },
    { question:'Select the correct sentence:', options:['The team are ready for the briefing.','The team is ready for the briefing.','The teams is ready for the briefing.','The team are readying for the briefing.'], correct:1, explanation:'Collective nouns like "team" take a singular verb in American English.' },
    { question:'"Everyone on the support floor ___ trained on the new system."', options:['are','were','have been','has been'], correct:3, explanation:'"Everyone" is singular and indefinite — it takes a singular verb (has been).' },
    { question:'Which sentence has correct subject-verb agreement?', options:['The list of pending tickets are very long.','The list of pending tickets is very long.','The lists of pending ticket are very long.','The list of pending tickets have grown.'], correct:1, explanation:'The subject is "list" (singular), not "tickets". Use the singular verb "is".' },
    { question:'Choose the correct form: "Each of the agents ___ responsible for their own ticket queue."', options:['are','is','were','have'], correct:1, explanation:'"Each" is always singular and takes a singular verb.' },
  ]},
  'wr-2-1': { type:'writing', title:'Email Subject Lines', questions:[
    { question:'Which is the most professional subject line for following up on an unresolved issue?', options:['Still no reply!!!','Follow-Up: Ticket #4821 — Billing Discrepancy','please check this','Regarding the thing we discussed'], correct:1, explanation:'Professional subject lines include the action type, ticket number, and specific topic.' },
    { question:'Which subject line is most appropriate for a service outage notification?', options:['Service Alert: Scheduled Maintenance on July 25, 2025 — 2:00 AM to 4:00 AM IST','Maintenance','We are doing maintenance tonight','URGENT: System Down!!!'], correct:0, explanation:'Outage notifications should include the type, date, and exact time window in the subject.' },
    { question:'Choose the subject line that best conveys urgency without being unprofessional:', options:['URGENT URGENT URGENT!!!','Action Required: Account Suspension Notice — Please Respond by July 20','Important: Read This!!!','Your Account'], correct:1, explanation:'Use "Action Required" and a deadline in the subject for urgent but professional communication.' },
    { question:'Which subject line is best for an introductory email to a new client?', options:['Introduction: [Your Name], Your Dedicated Account Manager at RuralShores','Hello from RuralShores!','Hi there!','New contact'], correct:0, explanation:'Introductory emails should include your name, role, and company in the subject line.' },
    { question:'Select the subject line that is too vague for a business email:', options:['Invoice #5501 Payment Confirmation — July 2025','Account Update: New Security Protocol Effective August 1','Meeting Reschedule: Project Sync — July 22, 3:00 PM','Please see below'], correct:3, explanation:'"Please see below" provides no context and forces the recipient to open the email to understand the topic.' },
  ]},
  'wr-2-2': { type:'writing', title:'Email Greetings', questions:[
    { question:'Which is the most professional greeting for an email to a client you have never met?', options:['Hey!','Dear Mr. Patel,','Yo Mr. Patel,','Hi buddy,'], correct:1, explanation:'"Dear [Title] [Last Name]," is the standard professional salutation for formal first-contact emails.' },
    { question:'When addressing a group of clients in an email, which greeting is most appropriate?', options:['Hey everyone,','Dear Valued Customers,','Hello All,','Hi Team,'], correct:1, explanation:'"Dear Valued Customers," is respectful and appropriately formal for external group correspondence.' },
    { question:'Which greeting is appropriate for an internal email to a colleague you know well?', options:['Dear Mr. Sharma,','Hi Raj,','Dear Sir,','Greetings and salutations,'], correct:1, explanation:'For known internal colleagues, "Hi [First Name]," strikes the right balance of professional and friendly.' },
    { question:"When you do not know the recipient's name or gender, which greeting is best?", options:['Dear Sir or Madam,','Hey you,','To Whom It May Concern,','Both A and C are acceptable'], correct:3, explanation:'Both "Dear Sir or Madam," and "To Whom It May Concern," are acceptable when the recipient is unknown.' },
    { question:'Which greeting is NOT appropriate for a professional business email?', options:['Dear Ms. Johnson,','Good morning, Mr. Chen,','Yo, what\'s up?','Dear Hiring Manager,'], correct:2, explanation:'Casual slang like "Yo, what\'s up?" is inappropriate for any professional business communication.' },
  ]},
  'wr-2-3': { type:'writing', title:'Email Body Writing', questions:[
    { question:'Which sentence is the best opening line for a customer complaint response email?', options:['We got your complaint.','Thank you for reaching out. I sincerely apologise for the inconvenience you have experienced.','Sorry about that.','Your complaint has been noted.'], correct:1, explanation:'A professional response opens with gratitude and a sincere apology before addressing the issue.' },
    { question:'Which email body paragraph is most professional?', options:['Your refund is not possible because of our policy.','While our standard policy does not permit refunds after 30 days, I have submitted a formal exception request on your behalf, which will be reviewed within 48 hours.','Cannot refund. Policy says so.','Refund is impossible as per terms.'], correct:1, explanation:'Acknowledge the limitation, then immediately show what action you are taking — never just say no.' },
    { question:'Select the most concise and professional way to request additional information:', options:['We need more info from you.','Could you please provide your account number and the date of the transaction so we can investigate this further?','Send us everything related to this.','Give us your details.'], correct:1, explanation:'Specify exactly what information is needed and why — vague requests delay resolution.' },
    { question:'Which sentence best transitions between explaining an issue and offering a solution?', options:['Anyway, here is what we can do.','Moving forward, I would like to offer you the following options to resolve this matter.','So yeah, we can fix it.','Let us just do this instead.'], correct:1, explanation:'Professional transitions use phrases like "Moving forward" before presenting solutions.' },
    { question:'Which sentence is NOT appropriate in a professional email body?', options:['I have escalated your case to our senior team for urgent review.','You should have read the terms and conditions more carefully.','We appreciate your patience while we investigate this matter.','Please find the updated invoice attached for your reference.'], correct:1, explanation:'Blaming the customer is unprofessional and escalates conflict.' },
  ]},
  'wr-2-4': { type:'writing', title:'Email Closings', questions:[
    { question:'Which is the most professional email closing for a formal client email?', options:['Bye!','Yours sincerely,','Later,','Cheers,'], correct:1, explanation:'"Yours sincerely," is the standard formal closing when you know the recipient\'s name.' },
    { question:'Which closing line best sets expectations before the sign-off?', options:['Hope this helps.','Please do not hesitate to contact us if you have any further questions. We are happy to assist.','That is all for now.','OK, bye.'], correct:1, explanation:'A professional pre-closing line invites further contact and reinforces helpfulness.' },
    { question:"Which closing is appropriate when you do NOT know the recipient's name?", options:['Yours sincerely,','Yours faithfully,','Best regards,','Kind regards,'], correct:1, explanation:'"Yours faithfully," is used when the salutation was "Dear Sir or Madam" (unknown recipient).' },
    { question:'Which element should always be included in a professional email signature?', options:['Personal social media links','Full name, job title, company name, and contact number','Only your first name','Your photo and hobbies'], correct:1, explanation:'A professional signature includes full name, title, company, and contact details for easy follow-up.' },
    { question:'Which closing is best for an email that requires the recipient to take an action?', options:['Please action the above at your earliest convenience. Thank you for your prompt attention.','Do it ASAP.','See what you can do.','Get back to me.'], correct:0, explanation:'"Please action" with "thank you for your prompt attention" is polite but clearly communicates urgency.' },
  ]},
  'wr-3-1': { type:'writing', title:'Escalation Emails', questions:[
    { question:'Which subject line is best for an escalation email to a senior manager?', options:['Problem!!!','Escalation: Unresolved Customer Issue — Ticket #7823 — Requires Immediate Attention','FYI','Help needed'], correct:1, explanation:'Escalation emails must clearly state "Escalation", the ticket reference, and urgency level.' },
    { question:'Which opening line is most appropriate for an internal escalation email?', options:['I am writing to formally escalate Ticket #7823 as it has remained unresolved for 72 hours despite two previous attempts.','This is taking too long.','The customer keeps calling.','We have a problem with a ticket.'], correct:0, explanation:'Formal escalation emails state the issue, ticket number, duration, and prior attempts objectively.' },
    { question:'Which sentence best describes the impact of an unresolved issue in an escalation email?', options:['The customer is angry.','The continued delay has resulted in a potential contract cancellation risk and has been flagged as a high-priority account.','The customer might leave.','This is bad for business.'], correct:1, explanation:'Escalation emails should quantify or qualify business impact to communicate urgency effectively.' },
    { question:'What should always be included at the end of an escalation email?', options:['A complaint about the team','Clear next steps, requested action, and a response deadline','A list of who is to blame','Just the ticket number'], correct:1, explanation:'Escalation emails must close with a specific requested action and a deadline to drive resolution.' },
    { question:'Which tone is most appropriate for an escalation email?', options:['Angry and accusatory','Objective, factual, and solution-focused','Casual and informal','Overly apologetic and passive'], correct:1, explanation:'Escalation emails should be factual and professional — emotional language undermines credibility.' },
  ]},
  'wr-3-2': { type:'writing', title:'Negotiation Writing', questions:[
    { question:'Which written offer best demonstrates a negotiation compromise?', options:['No refund.','While a full refund is outside our current policy, we are pleased to offer a 50% credit toward your next invoice as a goodwill gesture.','Take it or leave it.','We cannot help you.'], correct:1, explanation:'Written negotiation offers acknowledge limitations while proposing a concrete alternative.' },
    { question:'Which sentence correctly presents a written counter-offer?', options:["What you are asking for is too much.","Thank you for your proposal. We would like to suggest a revised arrangement: a 12-month contract extension in exchange for the discount requested.","We cannot do that. Try something else.","Our final answer is no."], correct:1, explanation:'Counter-offers in writing should acknowledge the original request before presenting the alternative.' },
    { question:'Select the sentence that best protects your position in a written negotiation:', options:['This offer is only valid until the close of business on July 25, 2025, and is subject to management approval.','Offer good for now.','We might be able to do this maybe.','Let us see what happens.'], correct:0, explanation:'Written offers must include validity deadlines and approval conditions to maintain professional credibility.' },
    { question:'Which closing line best wraps up a written negotiation email?', options:['Hope you agree.','We look forward to your response and remain open to further discussion to reach a mutually beneficial agreement.','Let us know what you decide.','Reply when you can.'], correct:1, explanation:'"Mutually beneficial" signals collaborative intent — the strongest way to close a negotiation email.' },
    { question:'Which phrase should be AVOIDED in a written negotiation?', options:['We value your partnership and want to find a solution that works for both parties.','This is our final and non-negotiable position.','We propose the following arrangement for your consideration.','We are open to exploring alternatives that meet your requirements.'], correct:1, explanation:'"Final and non-negotiable" closes dialogue — it should be avoided unless truly necessary.' },
  ]},
  'wr-3-3': { type:'writing', title:'Complaint Handling', questions:[
    { question:'Which written response best acknowledges a customer complaint?', options:['We received your complaint.','Thank you for bringing this to our attention. We sincerely apologise for the experience you have had and want to assure you that this is being treated as a priority.','Your complaint is noted.','We will look into it.'], correct:1, explanation:'Complaint acknowledgment should include gratitude, apology, and a reassurance that action is being taken.' },
    { question:'Which written sentence best explains a resolution timeline?', options:['We will fix it soon.','We expect to have a full resolution in place within 3 to 5 business days and will provide you with a progress update by end of day tomorrow.','It will be done when it is done.','Our team is on it.'], correct:1, explanation:'Written complaint responses must include a specific timeline and an interim update commitment.' },
    { question:'Which written compensation offer is most professionally phrased?', options:['We are giving you a discount.','As a gesture of goodwill and in recognition of the inconvenience caused, we would like to offer you a one-month service credit.','Here is something for your trouble.','We will credit your account.'], correct:1, explanation:'"Gesture of goodwill" and "in recognition of the inconvenience" are key professional compensation phrases.' },
    { question:'Which closing statement is most appropriate for a complaint resolution email?', options:['Hope you are happy now.','We genuinely value your feedback as it helps us improve our service. Thank you for giving us the opportunity to make this right.','Complaint closed.','That should fix it.'], correct:1, explanation:'Close complaint emails by reframing the complaint as feedback — it converts a negative into a positive relationship signal.' },
    { question:'What should be AVOIDED when writing a response to a complaint?', options:['Apologising for the inconvenience','Blaming the customer for the issue','Offering a resolution timeline','Expressing appreciation for their feedback'], correct:1, explanation:'Never blame the customer in writing — it is unprofessional and can create legal liability.' },
  ]},
  'wr-3-4': { type:'writing', title:'Report Writing', questions:[
    { question:'Which sentence is the most appropriate opening for a business incident report?', options:['Something went wrong yesterday.','This report documents the service disruption that occurred on July 14, 2025, between 14:00 and 16:30 IST, affecting approximately 450 customer accounts.','We had a problem.','The system broke.'], correct:1, explanation:'Incident report openings must state what happened, when it happened, and the scope of impact.' },
    { question:'Which phrase is most appropriate in the "Root Cause" section of a report?', options:['It just happened.','The disruption was caused by an unplanned database migration that was executed without prior testing in the staging environment.','Someone made an error.','The system failed.'], correct:1, explanation:'Root cause analysis in reports should be specific, technical, and non-accusatory.' },
    { question:'Which sentence belongs in the "Corrective Actions" section of an incident report?', options:['We will try to do better.','Effective immediately, all database migrations will undergo a mandatory 48-hour testing protocol in the staging environment before production deployment.','This will not happen again.','The team has been warned.'], correct:1, explanation:'Corrective actions must be specific, measurable, and preventive — not vague promises.' },
    { question:'Which format is most appropriate for listing multiple findings in a business report?', options:['Writing everything in one long paragraph without any structure','A numbered list with clear, concise headings for each finding','Random bullet points with no clear order','A table with unlabelled columns'], correct:1, explanation:'Numbered lists with headings make reports scannable and professional.' },
    { question:'Which closing statement is most professional for a business report?', options:['That is everything.','This report has been reviewed and approved by the Quality Assurance team and will be submitted to senior management for review by July 20, 2025.','Done now.','Report ends here.'], correct:1, explanation:'Professional reports close with accountability (who reviewed it) and a next-step deadline.' },
  ]},
  'wr-4-1': { type:'writing', title:'Complex Grammar', questions:[
    { question:'Choose the grammatically correct sentence using the subjunctive mood:', options:['It is important that he attends the meeting.','It is important that he attend the meeting.','It is important that he attended the meeting.','It is important that he will attend the meeting.'], correct:1, explanation:'The subjunctive mood uses the base form of the verb (attend, not attends) after "it is important that".' },
    { question:'Identify the dangling modifier in: "Having reviewed the contract, the terms were unclear."', options:['Having reviewed','the contract','the terms','were unclear'], correct:0, explanation:'"Having reviewed" implies a subject (someone reviewed it), but the sentence says "the terms" reviewed it — this is a dangling modifier.' },
    { question:'Choose the correctly structured conditional sentence for a business scenario:', options:['Had we been informed earlier, we would have escalated the issue sooner.','If we been informed earlier, we would escalate the issue sooner.','If we have been informed earlier, we would have escalated sooner.','We would escalate sooner if we informed earlier.'], correct:0, explanation:'Third conditional inverted form: "Had we been (past perfect), we would have (past conditional)".' },
    { question:'Which sentence uses the passive voice most appropriately in a business context?', options:['Someone has processed your refund.','Your refund has been processed and will reflect in your account within 3 to 5 business days.','We processed your refund.','The refund was being processed by our team.'], correct:1, explanation:'Passive voice is preferred in business writing when the action matters more than who performed it.' },
    { question:'Select the sentence that avoids a split infinitive in formal writing:', options:['We aim to fully resolve this by tomorrow.','We aim to resolve this fully by tomorrow.','We aim fully to resolve this by tomorrow.','We fully aim to resolve this by tomorrow.'], correct:1, explanation:'In formal writing, place the adverb after the verb rather than splitting "to + verb".' },
  ]},
  'wr-4-2': { type:'writing', title:'Business Metrics Writing', questions:[
    { question:'Which sentence best describes a KPI in a business report?', options:['We are doing well.','Our First Contact Resolution (FCR) rate improved from 72% to 89% in Q2 2025, representing a 17-percentage-point gain.','Numbers went up.','FCR is good now.'], correct:1, explanation:'KPI descriptions must include the metric name, baseline, current value, and the change over time.' },
    { question:'Which sentence most professionally describes a drop in customer satisfaction scores?', options:['CSAT went down.','Customer Satisfaction (CSAT) scores declined from 88% to 79% in June 2025, primarily attributed to increased wait times during the system migration period.','People are less happy.','We did poorly.'], correct:1, explanation:'Metric drops must be quantified and contextualised with a root cause to be useful in business writing.' },
    { question:'Which phrase is most appropriate when presenting a data trend in a written report?', options:['Things got better.','The data indicates a consistent upward trend in average handle time (AHT) reduction over the past three consecutive quarters.','AHT went down.','It looks like improvement happened.'], correct:1, explanation:'Data trends in reports must include the metric name, direction, and time period.' },
    { question:'Which sentence correctly uses a business metric abbreviation on first reference?', options:['NPS improved this quarter.','Net Promoter Score (NPS) improved by 12 points this quarter, reaching an all-time high of 74.','The NPS is at 74.','Our score is now 74.'], correct:1, explanation:'Always spell out the full name followed by the abbreviation in parentheses on first use in a document.' },
    { question:'What is the most professional way to recommend action based on data in a business report?', options:['We should do something about this.','Based on the observed decline in CSAT scores, it is recommended that the team implement a targeted call quality audit programme in Q3 2025.','Fix the scores.','Someone needs to act.'], correct:1, explanation:'Data-driven recommendations must cite the specific metric and propose a concrete, time-bound action.' },
  ]},
  'wr-4-3': { type:'writing', title:'Formal Correspondence', questions:[
    { question:'Which is the correct format for the date in a formal business letter?', options:['14/7/25','July 14, 2025','14-07-2025','7/14/25'], correct:1, explanation:'Formal business letters use the full date written out: Month Day, Year.' },
    { question:'Which salutation is correct when addressing a senior executive in a formal letter?', options:['Hey John,','Dear Mr. Fernandez,','Hi there,','To John Fernandez:'], correct:1, explanation:'"Dear [Title] [Last Name]," is the only acceptable salutation in formal business correspondence.' },
    { question:'Which sentence is the most professional way to begin the body of a formal letter?', options:['I am writing to ask you something.','I am writing to formally request an extension of the payment deadline for Invoice #9041, originally due on July 20, 2025.','Just wanted to reach out.','So basically we need more time.'], correct:1, explanation:'The first sentence of a formal letter body must state the purpose clearly and specifically.' },
    { question:"Which closing is appropriate for a formal letter when you know the recipient's name?", options:['Yours faithfully,','Yours sincerely,','Cheers,','Best,'], correct:1, explanation:'"Yours sincerely," is used when the salutation includes the recipient\'s name.' },
    { question:'Which enclosure notation is correct at the bottom of a formal letter?', options:['I have attached some stuff.','Enc: Invoice #9041, Payment Schedule, Supporting Documentation','See attached.','Documents below.'], correct:1, explanation:'"Enc:" followed by a list of documents is the standard enclosure notation in formal correspondence.' },
  ]},
  'wr-4-4': { type:'writing', title:'De-escalation Writing', questions:[
    { question:'Which written response best de-escalates an angry customer email?', options:['Calm down please.','We completely understand your frustration, and we sincerely apologise for the experience. Your concern has been flagged as our highest priority.','Your complaint is being reviewed.','This is not our fault.'], correct:1, explanation:'De-escalation in writing starts with validation ("completely understand") before any explanation or action.' },
    { question:'Which phrase should be AVOIDED when writing to an upset customer?', options:['We understand your frustration.','As per our policy...','We sincerely apologise for the inconvenience.','We are committed to resolving this immediately.'], correct:1, explanation:'"As per our policy" sounds bureaucratic and dismissive — it escalates rather than de-escalates.' },
    { question:'Which sentence best demonstrates written empathy in a customer service email?', options:['That sounds really bad.','We recognise how significantly this disruption has impacted your daily operations, and we take full responsibility for the experience you have had.','We are sorry.','We understand.'], correct:1, explanation:'Specific empathy ("significantly impacted your daily operations") is far more effective than generic apologies.' },
    { question:'Which written response best handles a customer threatening to cancel their contract?', options:['That is your choice.','We are truly sorry to hear that you are considering cancelling. We value your partnership deeply and would like to personally connect with you to discuss how we can make this right before any final decisions are made.','Please do not cancel.','We cannot stop you from cancelling.'], correct:1, explanation:'Retention responses must express genuine value, propose a personal escalation, and keep the door open.' },
    { question:'Which closing line is most effective in a written de-escalation email?', options:['Hope you feel better.','We remain committed to earning back your trust and will follow up personally within 24 hours to ensure that your concerns have been fully addressed.','Sorry again.','Thank you for your email.'], correct:1, explanation:'De-escalation closings must commit to a specific follow-up action and timeline to restore confidence.' },
  ]},
};

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:     { padding:'28px 32px', fontFamily:"'Inter',-apple-system,sans-serif", background:'#f8fafc', minHeight:'100vh' },
  heroCard: { borderRadius:20, padding:'28px 32px', marginBottom:24, color:'#fff' },
  card:     { background:'#fff', borderRadius:16, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)', border:'1px solid #f1f5f9', marginBottom:20 },
  btn:      (c, outline) => ({ background:outline?'transparent':c, color:outline?c:'#fff', border:`2px solid ${c}`, borderRadius:12, padding:'11px 24px', fontSize:14, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8 }),
  badge:    (c) => ({ background:c+'18', color:c, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, border:`1px solid ${c}30` }),
  grid:     { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 },
  progressBar:  { height:8, background:'#e2e8f0', borderRadius:10, overflow:'hidden', marginBottom:8 },
  progressFill: (p,c) => ({ height:'100%', background:c, width:`${Math.min(p,100)}%`, transition:'width 0.5s ease', borderRadius:10 }),
  spinner:  { display:'flex', alignItems:'center', justifyContent:'center', padding:'80px 0', flexDirection:'column', gap:16 },
  option:   (state) => ({ padding:'13px 18px', borderRadius:12, cursor:state==='done'?'default':'pointer', border:state==='correct'?'2px solid #10b981':state==='wrong'?'2px solid #ef4444':state==='selected'?'2px solid #6366f1':'2px solid #e2e8f0', background:state==='correct'?'#f0fdf4':state==='wrong'?'#fef2f2':state==='selected'?'#ede9fe':'#fff', display:'flex', alignItems:'center', gap:12, marginBottom:10, transition:'all 0.15s' }),
  optLetter:{ width:28, height:28, borderRadius:'50%', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#475569', flexShrink:0 },
  waveBar:  (i) => ({ width:5, borderRadius:4, background:'#8b5cf6', animation:`wave${i} 0.8s ease-in-out infinite`, animationDelay:`${i*0.15}s` }),
};

function Spinner({ text }) {
  return (
    <div style={S.spinner}>
      <div style={{ width:40, height:40, border:'3px solid #e2e8f0', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <span style={{ fontSize:14, color:'#64748b' }}>{text}</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes wave0{0%,100%{height:12px}50%{height:28px}}@keyframes wave1{0%,100%{height:20px}50%{height:8px}}@keyframes wave2{0%,100%{height:8px}50%{height:24px}}@keyframes wave3{0%,100%{height:24px}50%{height:12px}}@keyframes wave4{0%,100%{height:16px}50%{height:32px}}`}</style>
    </div>
  );
}

// ── LEVEL 1: Module Picker ────────────────────────────────────────────────────
function ModulePicker({ onSelect, completedModules }) {
  const moduleIds = Object.keys(MODULE_META);
  return (
    <div>
      <div style={{ ...S.heroCard, background:'linear-gradient(135deg,#1e1b4b,#4f46e5)' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🎯</div>
        <div style={{ fontSize:22, fontWeight:800, marginBottom:8 }}>Practice Sessions</div>
        <div style={{ fontSize:14, color:'#c7d2fe', lineHeight:1.6 }}>Reinforce what you learned. Only completed modules are available for practice.</div>
      </div>

      {completedModules.length === 0 && (
        <div style={{ textAlign:'center', padding:'32px', background:'#f8fafc', borderRadius:16, border:'1px solid #e2e8f0', marginBottom:20 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📚</div>
          <div style={{ fontSize:16, fontWeight:700, color:'#1e293b', marginBottom:8 }}>No Modules Completed Yet</div>
          <div style={{ fontSize:14, color:'#64748b' }}>Complete learning modules first to unlock practice sessions.</div>
        </div>
      )}

      <div style={S.grid}>
        {moduleIds.map(id => {
          const m = MODULE_META[id];
          const unlocked = completedModules.includes(id);
          return (
            <div key={id}
              onClick={() => unlocked && onSelect(id)}
              style={{ background:'#fff', borderRadius:16, padding:'20px', border:`2px solid ${unlocked ? m.color+'40' : '#e2e8f0'}`, cursor:unlocked?'pointer':'not-allowed', opacity:unlocked?1:0.5, transition:'all 0.15s', position:'relative' }}
              onMouseEnter={e => unlocked && (e.currentTarget.style.transform='translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform='translateY(0)')}
            >
              <div style={{ width:52, height:52, borderRadius:14, background:unlocked?m.gradient:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:12 }}>
                {unlocked ? m.icon : '🔒'}
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:unlocked?m.color:'#94a3b8', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>
                {m.category === 'speaking' ? 'Speaking' : 'Writing'}
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:unlocked?'#1e293b':'#94a3b8', marginBottom:4 }}>{m.label}</div>
              <div style={{ fontSize:12, color:'#94a3b8' }}>{unlocked ? '4 sub-modules available' : 'Complete module to unlock'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── LEVEL 2: Sub-module Picker ────────────────────────────────────────────────
function SubModulePicker({ moduleId, doneSubModules, onSelect, onBack }) {
  const m = MODULE_META[moduleId];
  const subIds = [`${moduleId}-1`, `${moduleId}-2`, `${moduleId}-3`, `${moduleId}-4`];
  const subIcons = ['📖', '✏️', '🎯', '🏅'];

  return (
    <div>
      <button style={{ ...S.btn('#94a3b8', true), marginBottom:20 }} onClick={onBack}>← Back to Modules</button>

      <div style={{ ...S.heroCard, background:m.gradient }}>
        <div style={{ fontSize:36, marginBottom:8 }}>{m.icon}</div>
        <div style={{ fontSize:20, fontWeight:800, marginBottom:4 }}>{m.label}</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.8)' }}>
          {doneSubModules.filter(s => subIds.includes(s)).length} / {subIds.length} sub-modules completed
        </div>
      </div>

      <div style={S.grid}>
        {subIds.map((subId, idx) => {
          const done = doneSubModules.includes(subId);
          const data = FALLBACK[subId];
          return (
            <div key={subId}
              onClick={() => onSelect(subId)}
              style={{ background:'#fff', borderRadius:16, padding:'20px', border:`2px solid ${done?'#86efac':m.color+'30'}`, cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.transform='translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform='translateY(0)')}
            >
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:done?'#d1fae5':m.color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                  {done ? '✅' : subIcons[idx]}
                </div>
                <span style={S.badge(done?'#10b981':m.color)}>{done ? 'Completed' : `${data?.questions?.length || 5} Questions`}</span>
              </div>
              <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Sub-module {idx + 1}</div>
              <div style={{ fontSize:15, fontWeight:700, color:'#1e293b', marginBottom:4 }}>{SUBMODULE_META[subId]}</div>
              <div style={{ fontSize:12, color:'#94a3b8' }}>
                {m.category === 'speaking' ? '🎤 Speaking drills — read aloud & record' : '✍️ Multiple choice writing exercises'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── LEVEL 3a: Speaking Practice ───────────────────────────────────────────────
function SpeakingPractice({ subModuleId, moduleId, onComplete, onBack }) {
  const data   = FALLBACK[subModuleId];
  const m      = MODULE_META[moduleId];
  const total  = data?.questions?.length || 0;

  const [qIdx,       setQIdx]       = useState(0);
  const [recState,   setRecState]   = useState('idle');
  const [seconds,    setSeconds]    = useState(0);
  const [result,     setResult]     = useState(null);
  const [scores,     setScores]     = useState([]);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const timerRef    = useRef(null);
  const mediaRecRef = useRef(null);
  const chunksRef   = useRef([]);
  const ttsAudioRef = useRef(null);

  const currentQ = data?.questions?.[qIdx];
  const isLast   = qIdx === total - 1;

  useEffect(() => {
    if (recState === 'recording') {
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds(s => { if (s >= 14) { stopRecording(); return 15; } return s + 1; });
      }, 1000);
    } else if (timerRef.current) clearInterval(timerRef.current);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recState]);

  const playTTS = async () => {
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; setTtsPlaying(false); return; }
    setTtsLoading(true);
    try {
      const res = await api.post('/voice/synthesize', { text: currentQ.text, voice:'af_heart', speed:1.0 }, { responseType:'blob' });
      const url  = URL.createObjectURL(res.data);
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      audio.onplay  = () => { setTtsLoading(false); setTtsPlaying(true); };
      audio.onended = () => { setTtsPlaying(false); ttsAudioRef.current = null; URL.revokeObjectURL(url); };
      audio.onerror = () => { setTtsLoading(false); setTtsPlaying(false); };
      await audio.play();
    } catch { setTtsLoading(false); }
  };

  const startRecording = async () => {
    setResult(null); setRecState('recording'); chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const mr = new MediaRecorder(stream, { mimeType:'audio/webm' });
      mediaRecRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => { stream.getTracks().forEach(t => t.stop()); await sendToBackend(new Blob(chunksRef.current, { type:'audio/webm' })); };
      mr.start();
    } catch { setRecState('idle'); alert('Microphone access denied. Please allow mic access and try again.'); }
  };

  const stopRecording = () => { setRecState('analyzing'); if (mediaRecRef.current?.state !== 'inactive') mediaRecRef.current?.stop(); };

  const sendToBackend = async (blob) => {
    setRecState('analyzing');
    try {
      const form = new FormData();
      form.append('audio', blob, 'audio.webm');
      form.append('sectionId', subModuleId);
      const res = await api.post(`/practice/module/${moduleId}/speaking/transcribe`, form, { headers:{ 'Content-Type':'multipart/form-data' } });
      setResult(res.data);
      setScores(prev => [...prev, res.data.score || 0]);
    } catch {
      const fallbackResult = { score:50, passed:false, feedback:'Could not reach STT service. Please check it is running.', transcript:'' };
      setResult(fallbackResult);
      setScores(prev => [...prev, 50]);
    }
    setRecState('done');
  };

  const handleNext = () => {
    setQIdx(i => i + 1);
    setRecState('idle');
    setResult(null);
    setSeconds(0);
  };

  const handleFinish = () => {
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    onComplete(subModuleId, avg);
  };

  const scoreColor = result?.score >= 80 ? '#10b981' : result?.score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <button style={{ ...S.btn('#94a3b8', true), marginBottom:20 }} onClick={onBack}>← Back to Sub-modules</button>

      {/* Progress */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <span style={{ fontSize:13, color:'#94a3b8' }}>Question {qIdx + 1} of {total}</span>
        <span style={S.badge(m.color)}>SPEAKING</span>
      </div>
      <div style={S.progressBar}><div style={S.progressFill(((qIdx + (result ? 1 : 0)) / total) * 100, m.color)} /></div>

      <div style={S.card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:12, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:1 }}>{SUBMODULE_META[subModuleId]}</div>
            <div style={{ fontSize:18, fontWeight:800, color:'#1e1b4b', marginTop:2 }}>Speaking Drill {qIdx + 1}</div>
          </div>
          <button onClick={playTTS} disabled={ttsLoading} style={{ background:'none', border:`2px solid ${m.color}`, borderRadius:10, padding:'8px 14px', cursor:'pointer', color:m.color, fontWeight:700, fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
            {ttsLoading ? '⏳' : ttsPlaying ? '⏸' : '🔊'} {ttsLoading ? 'Loading...' : ttsPlaying ? 'Stop' : 'Listen'}
          </button>
        </div>

        <div style={{ background:'#f8fafc', borderRadius:12, padding:'20px 24px', border:'1px solid #e2e8f0', marginBottom:20, borderLeft:`4px solid ${m.color}` }}>
          <p style={{ margin:0, fontSize:15, color:'#334155', lineHeight:1.8, fontStyle:'italic' }}>"{currentQ?.text}"</p>
        </div>

        {currentQ?.tip && (
          <div style={{ padding:'10px 14px', background:'#ede9fe', borderRadius:10, marginBottom:20, fontSize:13, color:'#4c1d95' }}>
            <strong>💡 Tip:</strong> {currentQ.tip}
          </div>
        )}

        {recState === 'idle' && (
          <div style={{ textAlign:'center', padding:'24px 0' }}>
            <p style={{ color:'#64748b', marginBottom:16 }}>Read the passage above aloud and click record.</p>
            <button style={S.btn(m.color)} onClick={startRecording}>🎤 Start Recording</button>
          </div>
        )}

        {recState === 'recording' && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <p style={{ color:'#8b5cf6', fontWeight:700, marginBottom:16 }}>🔴 Recording... speak clearly</p>
            <div style={{ display:'flex', gap:6, alignItems:'flex-end', justifyContent:'center', height:48, marginBottom:16 }}>
              {[0,1,2,3,4].map(i => <div key={i} style={S.waveBar(i)} />)}
            </div>
            <p style={{ color:'#94a3b8', fontSize:13, marginBottom:16 }}>0:{seconds < 10 ? `0${seconds}` : seconds} / 0:15</p>
            <button style={S.btn('#ef4444')} onClick={stopRecording}>⏹ Stop Recording</button>
          </div>
        )}

        {recState === 'analyzing' && <Spinner text="Analysing your pronunciation..." />}

        {recState === 'done' && result && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:20, padding:'20px', background:'#f8fafc', borderRadius:14, marginBottom:16 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:36, fontWeight:800, color:scoreColor }}>{result.score}%</div>
                <div style={{ fontSize:11, color:'#94a3b8' }}>AI Score</div>
              </div>
              <div style={{ flex:1 }}>
                <div style={S.progressBar}><div style={S.progressFill(result.score, scoreColor)} /></div>
                <div style={{ fontSize:13, color:'#334155' }}>{result.feedback}</div>
              </div>
            </div>

            {result.transcript && (
              <div style={{ padding:'12px 16px', background:'#f1f5f9', borderRadius:10, marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>You said:</div>
                <p style={{ margin:'4px 0 0', fontSize:13, color:'#334155', fontStyle:'italic' }}>"{result.transcript}"</p>
              </div>
            )}

            <div style={{ display:'flex', gap:12 }}>
              <button style={S.btn('#94a3b8', true)} onClick={() => { setRecState('idle'); setResult(null); }}>🔄 Try Again</button>
              {!isLast
                ? <button style={S.btn(m.color)} onClick={handleNext}>Next Question →</button>
                : <button style={S.btn('#10b981')} onClick={handleFinish}>✅ Complete Sub-module</button>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── LEVEL 3b: Writing Practice ────────────────────────────────────────────────
function WritingPractice({ subModuleId, moduleId, onComplete, onBack }) {
  const data  = FALLBACK[subModuleId];
  const m     = MODULE_META[moduleId];
  const qs    = data?.questions || [];
  const total = qs.length;

  const [qIdx,      setQIdx]      = useState(0);
  const [answers,   setAnswers]   = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [finished,  setFinished]  = useState(false);

  const currentQ   = qs[qIdx];
  const selectedAns = answers[qIdx];
  const isAnswered  = selectedAns !== undefined;
  const isLast      = qIdx === total - 1;
  const allAnswered  = Object.keys(answers).length === total;

  const score    = allAnswered ? Math.round((qs.filter((q, i) => answers[i] === q.correct).length / total) * 100) : 0;
  const correct  = allAnswered ? qs.filter((q, i) => answers[i] === q.correct).length : 0;
  const passed   = score >= 60;

  if (finished) {
    return (
      <div>
        <div style={{ background:passed?'linear-gradient(135deg,#064e3b,#059669)':'linear-gradient(135deg,#7f1d1d,#dc2626)', borderRadius:20, padding:'32px', color:'#fff', textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:56, marginBottom:12 }}>{passed ? '🌟' : '💪'}</div>
          <div style={{ fontSize:30, fontWeight:800, marginBottom:8 }}>{score}%</div>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>{passed ? 'Sub-module Completed!' : 'Keep Practising!'}</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.8)' }}>{correct} out of {total} correct</div>
        </div>

        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:700, color:'#1e293b', marginBottom:16 }}>Answer Review</div>
          {qs.map((q, i) => {
            const isCorrect = answers[i] === q.correct;
            return (
              <div key={i} style={{ padding:'14px 18px', borderRadius:12, background:isCorrect?'#f0fdf4':'#fef2f2', border:`1px solid ${isCorrect?'#86efac':'#fca5a5'}`, marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span>{isCorrect ? '✅' : '❌'}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>Q{i+1}: {q.question.slice(0, 70)}...</span>
                </div>
                <div style={{ fontSize:12, color:'#475569', marginBottom:4 }}>
                  Your answer: <strong>{q.options[answers[i]] ?? 'Not answered'}</strong>
                  {!isCorrect && <span style={{ color:'#059669' }}> → Correct: <strong>{q.options[q.correct]}</strong></span>}
                </div>
                {q.explanation && <div style={{ fontSize:12, color:'#64748b' }}>💡 {q.explanation}</div>}
              </div>
            );
          })}
          <div style={{ display:'flex', gap:12, marginTop:16 }}>
            <button style={S.btn(m.color)} onClick={() => onComplete(subModuleId, score)}>✓ Done</button>
            <button style={S.btn('#94a3b8', true)} onClick={() => { setAnswers({}); setQIdx(0); setSubmitted(false); setFinished(false); }}>🔄 Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button style={{ ...S.btn('#94a3b8', true), marginBottom:20 }} onClick={onBack}>← Back to Sub-modules</button>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <span style={{ fontSize:13, color:'#94a3b8' }}>Question {qIdx + 1} of {total}</span>
        <span style={S.badge(m.color)}>WRITING</span>
      </div>
      <div style={S.progressBar}><div style={S.progressFill(((qIdx + (submitted?1:0)) / total) * 100, m.color)} /></div>

      <div style={S.card}>
        <div style={{ fontSize:11, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>{SUBMODULE_META[subModuleId]}</div>
        <div style={{ fontSize:16, fontWeight:700, color:'#1e293b', lineHeight:1.6, marginBottom:20 }}>{currentQ?.question}</div>

        {currentQ?.options?.map((opt, i) => {
          let state = 'idle';
          if (submitted) {
            if (i === currentQ.correct) state = 'correct';
            else if (i === selectedAns) state = 'wrong';
            else state = 'done';
          } else if (selectedAns === i) state = 'selected';
          return (
            <div key={i} style={S.option(state)} onClick={() => !submitted && setAnswers(prev => ({ ...prev, [qIdx]: i }))}>
              <div style={S.optLetter}>{LABELS[i]}</div>
              <span style={{ fontSize:14, color:'#334155', flex:1 }}>{opt}</span>
              {submitted && i === currentQ.correct && <span>✅</span>}
              {submitted && i === selectedAns && i !== currentQ.correct && <span>❌</span>}
            </div>
          );
        })}

        {submitted && currentQ?.explanation && (
          <div style={{ padding:'12px 16px', background:'#f0fdf4', borderRadius:10, border:'1px solid #86efac', marginTop:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#065f46' }}>💡 Explanation</div>
            <div style={{ fontSize:13, color:'#14532d', marginTop:4 }}>{currentQ.explanation}</div>
          </div>
        )}
      </div>

      <div style={{ display:'flex', gap:12, justifyContent:'space-between' }}>
        <button style={{ ...S.btn('#f1f5f9', false), color:'#64748b' }} disabled={qIdx === 0} onClick={() => { setQIdx(i => Math.max(0, i-1)); setSubmitted(false); }}>← Prev</button>
        <div style={{ display:'flex', gap:12 }}>
          {isAnswered && !submitted && <button style={S.btn(m.color)} onClick={() => setSubmitted(true)}>Check Answer</button>}
          {submitted && !isLast    && <button style={S.btn('#6366f1')} onClick={() => { setQIdx(i => i+1); setSubmitted(false); }}>Next →</button>}
          {submitted && isLast     && <button style={S.btn('#f59e0b')} onClick={() => setFinished(true)}>🏁 See Results</button>}
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function PracticeSession({ onNavigate }) {
  const [screen,           setScreen]           = useState('modules');
  const [selectedModule,   setSelectedModule]   = useState(null);
  const [selectedSubModule,setSelectedSubModule]= useState(null);
  const [completedModules, setCompletedModules] = useState([]);
  const [doneSubModules,   setDoneSubModules]   = useState([]);
  const [modulesLoading,   setModulesLoading]   = useState(true);

  useEffect(() => {
    setModulesLoading(true);
    api.get('/practice/completed-modules')
      .then(res => setCompletedModules(res.data?.completedModules || []))
      .catch(() => setCompletedModules([]))
      .finally(() => setModulesLoading(false));
  }, []);

  const handleSelectModule = (moduleId) => {
    setSelectedModule(moduleId);
    setScreen('submodules');
    // Load sub-module completion status
    api.get(`/practice/module/${moduleId}`)
      .then(res => {
        const completed = (res.data?.exercises || []).filter(e => e.isCompleted).map(e => e.sectionId);
        setDoneSubModules(completed);
      })
      .catch(() => {});
  };

  const handleSelectSubModule = (subModuleId) => {
    setSelectedSubModule(subModuleId);
    const category = MODULE_META[selectedModule]?.category;
    setScreen(category === 'speaking' ? 'speaking' : 'writing');
  };

  const handleComplete = (subModuleId, score) => {
    setDoneSubModules(prev => prev.includes(subModuleId) ? prev : [...prev, subModuleId]);
    setScreen('submodules');
    setSelectedSubModule(null);
  };

  return (
    <div style={S.page}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:'#1e1b4b', margin:0 }}>Practice Sessions 🎯</h1>
        <p style={{ fontSize:14, color:'#64748b', marginTop:4 }}>Reinforce your learning with targeted drills tied to each module</p>
      </div>

      {modulesLoading ? (
        <Spinner text="Loading your modules..." />
      ) : screen === 'modules' ? (
        <ModulePicker onSelect={handleSelectModule} completedModules={completedModules} />
      ) : screen === 'submodules' ? (
        <SubModulePicker
          moduleId={selectedModule}
          doneSubModules={doneSubModules}
          onSelect={handleSelectSubModule}
          onBack={() => setScreen('modules')}
        />
      ) : screen === 'speaking' ? (
        <SpeakingPractice
          subModuleId={selectedSubModule}
          moduleId={selectedModule}
          onComplete={handleComplete}
          onBack={() => setScreen('submodules')}
        />
      ) : screen === 'writing' ? (
        <WritingPractice
          subModuleId={selectedSubModule}
          moduleId={selectedModule}
          onComplete={handleComplete}
          onBack={() => setScreen('submodules')}
        />
      ) : null}
    </div>
  );
}
