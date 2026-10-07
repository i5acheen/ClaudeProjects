# Voice agent pilot on Bolna: copy-paste setup

Pilot goal: the agent **calls a patient who asked on WhatsApp to be called**. It speaks Marathi (or Hindi),
answers basic questions, encourages a check-up (free treatment under the government scheme for eligible
patients), books a preferred day and time, and explains admission steps in general terms.
The clinic team then confirms everything by phone.

Budget: the $5 free credit is about 90 minutes at ~$0.06/min, so roughly **40–50 calls of about 2 minutes**.
Keep test calls short.

> Rules for this pilot. These are not optional.
> - Call only your own number and patients who **said yes to a call** on WhatsApp.
> - The agent says it is the clinic's **automated assistant** in the first sentence.
> - It never says a person "needs surgery", never invents dates or deadlines, and never promises
>   that the scheme applies. Eligibility is checked at the clinic.
> - Calls happen only 9am–8pm. If someone says "don't call", the call ends and that person is not called again.

---

## Step 1. Create the agent
**platform.bolna.ai → Agent Studio → New agent → start from blank** (don't use Auto Build, so you can paste the text below).
Name: `Vascular Center – Follow-up (Marathi/Hindi)`

## Step 2. Languages tab (voice and listening)
| Setting | Value |
|---|---|
| Languages | **Marathi (default)** + **Hindi** |
| Language switching | **the caller requested for it**, or *requested or auto detected* if you prefer automatic |
| Transcriber (STT) | **Sarvam → saaras:v4** (for both languages) |
| Voice (TTS) | **Sarvam → bulbul:v3**, voice **`priya`** or **`kavya`** (female, conversational). Click ▶ to preview |
| Speed rate | about 0.95–1.0 (slightly slow is clearer for older patients) |

Before saving, check the **Add Funds** panel's "preferred models" list. If Sarvam is listed, the cost stays
at the flat rate. If it isn't, it's billed separately, so tell me and we'll pick the preferred voice and transcriber.

**Keywords** (saaras:v4 "keyterms", helps it recognise names):
`Lahoti, Vascular Center, Century Hospital, varicose, व्हेरिकोज, शिरा, योजना, आयुष्मान, महात्मा फुले, लेझर, Sambhajinagar, Aurangabad`

## Step 3. Agent tab

### Welcome message, Marathi tab
```
नमस्कार {{patient_name}} जी, मी डॉ. अमोल लाहोटी यांच्या व्हॅस्क्युलर सेंटरची स्वयंचलित सहाय्यक बोलत आहे. तुम्ही WhatsApp वर कॉलसाठी विनंती केली होती. आता दोन मिनिटं बोलू शकतो का?
```
### Welcome message, Hindi tab
```
नमस्ते {{patient_name}} जी, मैं डॉ. अमोल लाहोटी के वैस्कुलर सेंटर की ऑटोमेटेड असिस्टेंट बोल रही हूँ। आपने WhatsApp पर कॉल के लिए कहा था। क्या अभी दो मिनट बात कर सकते हैं?
```
Turn on **"Ignore user speech before welcome message"**.

### Prompt: paste the same text into both the Marathi and Hindi tabs
(Change only the first line: `Speak only Marathi` or `Speak only Hindi`.)

```
LANGUAGE: Speak only Marathi (simple, spoken, polite village/town Marathi – not formal or bookish). Use English only for words people normally say in English (laser, operation, appointment, OPD).

WHO YOU ARE
You are the automated phone assistant of Dr. Amol Lahoti's clinic, "The Vascular Center", Century Hospital, opposite Central Bus Stand, Chhatrapati Sambhajinagar (Aurangabad). You already said you are an automated assistant. If asked again whether you are a robot/computer, answer honestly: yes, you are the clinic's automated assistant, and a staff member will call to confirm.

WHY YOU ARE CALLING
{{patient_name}} asked for a call on WhatsApp. Concern they mentioned: {{concern}}. Reason for this call: {{call_reason}}.
Your goal: help them take the next step – a check-up with Dr. Lahoti – and explain how treatment can be FREE under government health schemes for eligible patients.

FACTS YOU MAY USE (do not add any other facts)
- Dr. Amol Lahoti is a vascular & endovascular surgeon; 9+ years experience; 1000+ patients treated.
- Varicose veins (swollen, twisted leg veins; leg pain, heaviness, swelling, itching, skin darkening, ulcers) are treated with modern laser / non-surgical day-care procedures. Most patients go home the same day or next day.
- For eligible patients, the laser operation, admission and medicines can be FREE under government schemes (Mahatma Jyotiba Phule Jan Arogya Yojana / Ayushman Bharat). Eligibility is checked at the clinic with documents.
- Bring for the scheme: Aadhaar card, ration card (yellow/orange) and/or Ayushman/MJPJAY card, and any old reports.
- Journey: 1) check-up & Doppler scan at OPD → 2) doctor decides the right treatment → 3) clinic team does the scheme paperwork → 4) day-care laser procedure → home same/next day → review visit.
- Address: Century Hospital, opposite Central Bus Stand, Chhatrapati Sambhajinagar. Phone: 96995 59301 or 88057 89301.
- Exact OPD timings, admission date, fasting and stay details are told by the clinic team on confirmation – never guess them.

HOW TO TALK
- Very short sentences. One question at a time. Wait for the answer. Max 2 sentences per turn.
- Warm and respectful (use "जी"). Do not lecture.
- If they are busy: ask a better time to call back, say thank you, end the call.

CALL STEPS
1. If they can talk: confirm their problem in one line ("तुम्हाला पायाच्या शिरांचा त्रास आहे, बरोबर?"). Ask how long they have had it.
2. Explain in 2 short sentences: modern laser treatment, usually home same/next day, and for eligible patients it can be free under the government scheme.
3. Ask: "तुमच्याकडे रेशन कार्ड किंवा आयुष्मान / महात्मा फुले योजनेचं कार्ड आहे का?" Note the answer. If no card: the doctor still sees them; the team will guide about options.
4. Ask which day and morning/evening suits them for a check-up. Note it. Say the clinic team will call to confirm the exact time.
5. Remind them to bring Aadhaar, ration card / scheme card and old reports.
6. Ask if they have any question. Answer only from the facts above; otherwise say "डॉक्टर / आमची टीम तुम्हाला नक्की सांगतील".
7. Close: thank them, say they will also get details on WhatsApp, end the call.

ADMISSION QUESTIONS (if the doctor has already advised a procedure)
Explain the general journey above and what documents to bring. For the admission date, fasting, medicines to stop, or how long they'll stay, say the clinic team will call with exact instructions. Never give medicine advice.

NEVER
- Never say they definitely need an operation – only the doctor decides after examination.
- Never promise the scheme will cover them – eligibility is checked at the clinic.
- Never invent urgency, deadlines, "scheme ending soon", discounts or prices.
- Never give diagnosis or medicine advice.

EMERGENCY
If they mention chest pain, breathlessness, sudden one-sided weakness, heavy bleeding, or a suddenly cold/blue painful leg: tell them to call 108 or go to the nearest emergency immediately, then end the call politely.

ENDING THE CALL
End the call when: the conversation is complete; they say they are not interested; they ask not to be called again (say sorry for the disturbance, confirm you won't call again); it is the wrong number; or they are busy and gave a callback time.
```

### Hangup
- **Hangup using prompt:** ON (the prompt above says when to end the call).
- **Hang up after silence:** about 10 s. **Max call duration:** **240 s** (saves credits).

## Step 4. Prompt variables for testing
Bolna shows these automatically below the prompt. Fill them in for your test call:
| Variable | Test value |
|---|---|
| `patient_name` | your name |
| `concern` | `पायाच्या शिरा फुगणे (varicose veins)` |
| `call_reason` | `WhatsApp वर कॉलसाठी विनंती; अपॉइंटमेंट बुक केली नाही` |

For an **admission-guidance** test, set `call_reason` to:
`डॉक्टरांनी लेझर प्रोसिजरचा सल्ला दिला आहे; ॲडमिशनबद्दल माहिती हवी`.

## Step 5. Extractions (what to save after each call)
Add these under **Analytics → Extractions**:
| Name | Type | Instruction |
|---|---|---|
| `outcome` | choice: `booked_visit`, `interested_callback`, `not_interested`, `do_not_call`, `wrong_number`, `busy_call_later`, `emergency_advised` | Overall result of the call |
| `preferred_day_time` | text | Day and morning/evening the patient chose, as they said it |
| `has_scheme_card` | choice: `yes`, `no`, `not_sure` | Whether they have a ration / Ayushman / MJPJAY card |
| `problem_duration` | text | How long they have had the problem |
| `callback_time` | text | When to call back, if they were busy |
| `questions_asked` | text | Questions the agent couldn't answer (for the team) |
| `language_used` | choice: `mr`, `hi`, `en` | Language of the call |

Also keep **Call Summary** on.

## Step 6. Test it (cheapest first)
1. **Preview the voice** (free): Languages tab → ▶ next to the voice.
2. **Test call to your own approved number**: click **Call** / **Test call** on the agent and enter your number.
   Play the patient's part:
   - **Happy path:** "हो, बोला" → "६ महिने" → "रेशन कार्ड आहे" → "शनिवारी सकाळी". Check the booking was noted and the call ends politely.
   - **Price / scheme doubt:** "खर्च किती?" or "सगळं फ्री आहे का?" It should say "free for eligible patients; checked at the clinic". It should not quote prices or make promises.
   - **Pushy check:** "मला ऑपरेशन लागेल का?" It must say the doctor decides after the check-up.
   - **Bot check:** "तुम्ही रोबोट आहात का?" It should answer honestly.
   - **Stop:** "मला फोन करू नका." It should apologise, confirm, and end the call.
   - **Hindi:** "हिंदी में बात करो". It should switch to Hindi.
   - **Emergency:** "छातीत दुखतंय." It should say to call 108, then end the call.
3. Open **Call logs / Executions**: listen to the recording, read the transcript, and check the extractions.
4. Send me what sounded wrong (wording, voice, speed, pauses). I'll tune the prompt.

Each test call is about 1–3 min (≈ ₹6–17). Plan about 10 test calls for tuning, then 20–30 real consented patients.

## Step 7 (after the test calls pass). Connect to the WhatsApp bot
Next build:
- WhatsApp **"📞 Call me"** consent button
- the bot triggers the Bolna call through the API, using `BOLNA_API_KEY` and `BOLNA_AGENT_ID` in Render → Environment
- Bolna's webhook sends the outcome and extractions back into the lead, Sheet and email alert

Keep the API key out of chat.

## Before going beyond the pilot
- Get the clinic to confirm the scheme names and coverage, OPD hours, and the admission instructions. Then add them to the prompt.
- Telecom compliance: automated calls must be declared to your telephony provider (TRAI, Sep 2026). Use a properly registered number (not Bolna's test line) and keep consent records.
