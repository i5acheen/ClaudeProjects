# Voice agent: free and open-source options (research, Oct 2026)

Goal: replicate the Bolna "Neha" agent (Marathi/Hindi, natural voice, follow-up calls) at the lowest cost.
Prices are from vendor pages or third-party blogs, so verify them before committing.

## 1. Call engine (open source, free)
| Framework | License | Fit for us |
|---|---|---|
| **Pipecat** (Daily) | BSD-2 | **Best fit.** Python like our bot. Ready connectors for Sarvam, Gemini Live, Plivo/Exotel/Twilio, and a **WhatsApp calling transport**. Largest ecosystem. |
| LiveKit Agents | Apache-2.0 | Strongest native SIP/phone stack. Heavier: needs a LiveKit media server. Good at large call-centre scale. |
| TEN Framework | Apache-2.0 (with conditions) | Fast compiled core, graph config. Steeper setup, smaller ecosystem. |
| Bolna (open-source core) | MIT | Same engine as the hosted product, aimed at phone agents. Smaller community than Pipecat. |
| Vocode | MIT | Losing momentum. Not recommended for new builds. |

## 2. Speech, voice and LLM options
| Part | Free/open option | Marathi quality | Notes |
|---|---|---|---|
| **All-in-one (hears + thinks + speaks)** | **Gemini Live native audio** (gemini-3.8-live / 3.1-flash-live) | Marathi listed (mr / mr-IN). **Must test** | **Free tier** on the Gemini API (limits not published). Paid ≈ $0.023/min (~₹2). Fewest moving parts, very natural turn-taking. Not open source. |
| STT (hosted) | Sarvam saaras (₹1,000 free credit), **Azure free: 5 h/month** | Sarvam about 8% WER on clean Marathi (vendor claim) | Azure F0 free tier renews every month. |
| STT (open) | AI4Bharat **IndicConformer**, **IndicWhisper** (MIT) | Workable; phone audio (8 kHz) adds about 5–10 points of WER | Needs a GPU server to run fast enough for live calls. |
| TTS (hosted) | Sarvam bulbul (free credit), **Azure free 0.5 M chars/month** (mr-IN Aarohi/Manohar), Google Chirp 3 HD (reportedly 1 M chars free, unverified) | Good | Azure/Google Marathi voices are a bit "announcer"-like; Sarvam sounds more conversational. |
| TTS (open) | **AI4Bharat Indic Parler-TTS** (Apache) | **Near-human Marathi** in its paper (88 vs 91.8 for human speech) | GPU needed. IndicF5 ranked **last** in a large 2026 listener study, so avoid it. |
| LLM | Groq/OpenRouter free (gpt-oss, Gemma, Qwen), **Sarvam 30B / 105B open weights (Apache-2.0)**, trained on Indian languages | Sarvam LLMs are built for Indian languages | We already use the free chain in the WhatsApp bot. |

## 3. The phone line (never fully free, except WhatsApp calls)
| Route | Cost | Notes |
|---|---|---|
| **WhatsApp voice calls to our business number** (Pipecat `WhatsAppTransport`) | **Free when the patient calls us** ("All user-initiated calls are free", Meta) | Patient taps 📞 in WhatsApp. Same number as the bot, no SIP or DLT needed. **Calls we make** need the patient's call permission and are billed per minute (India rate not published, so check the Meta rate card). Calling must be enabled on the number; India availability needs to be confirmed. |
| Plivo | **₹0.38/min** (official India SIP page) + about ₹250/month per number | Free trial credits. Pipecat supports it. |
| Vobiz | ₹0.38/min (vendor claim) | Indian provider, already integrated with Bolna. |
| Exotel | Quote-based, ~₹0.5–0.7/min | Best for DND/compliance handling. |
| Twilio | ~$0.046+/min | Most expensive for India. |

## 4. Recommended stack: Option B+
1. **Engine:** Pipecat on one small always-on server (~₹500–800/month). Render free is not suitable because it sleeps.
2. **Two brains to compare in the free browser test:**
   - **B1: Gemini Live** (free tier, single model, most natural pauses), or
   - **B2: Sarvam STT + free open LLM + Sarvam TTS** (proven Marathi voice). Fallback TTS: Azure free tier.
   Keep whichever sounds better in Marathi.
3. **Phone line:**
   - Inbound **WhatsApp calls (₹0)**: patient taps "📞 Call" in the bot's chat, and Neha answers.
   - Outbound follow-ups by **Plivo/Vobiz (₹0.38/min)**, only to patients who said yes on WhatsApp.
4. **Same prompt and knowledge** (`VOICE_PROMPT_NATURAL_MR.md`, `VOICE_CLINIC_KNOWLEDGE.md`). Results go to the same DB, Sheet and email alerts.

Estimated cost per minute (vs Bolna ₹5.5):
| Setup | ₹/min |
|---|---|
| WhatsApp inbound + Gemini Live free tier | **~₹0** (until free-tier limits) |
| WhatsApp inbound + Sarvam | ~₹0.6–1 |
| Plivo outbound + Gemini Live paid | ~₹2.4 |
| Plivo outbound + Sarvam | ~₹1–1.5 |

**Fully self-hosted (Option C)** = Pipecat + IndicConformer + Indic Parler-TTS + Sarvam 30B on our own GPU. That's about ₹20–60k/month for the server, so it's only worth it at very high volume or when data must stay on our own servers.

## 5. Bolna open source (github.com/bolna-ai/bolna): checked in detail
Looked at the code itself on 7 Oct 2026:
- **License:** MIT. **Very active:** commits on the same day as this check.
- **Same engine as hosted Bolna:** the agent settings and Neha prompt we tuned on platform.bolna.ai carry over. The config is the same agent JSON (welcome message, prompt, transcriber, synthesizer, engine settings).
- **Built-in Indian phone providers:** Plivo, **Exotel, Vobiz**, Twilio, plus a generic **SIP trunk** and **FreeSWITCH**.
- **Speech:** Sarvam STT and TTS (incl. live Marathi/Hindi switching), Azure (free tier), Google, ElevenLabs, Smallest, and others. There's also a **"realtime transcriber" for self-hosted ASR** (e.g. IndicConformer later).
- **LLM:** via LiteLLM, so Groq / OpenRouter free models (same as our WhatsApp bot), OpenAI, Gemini, Azure.
- **Speech-to-speech:** **Gemini Live** and OpenAI Realtime are built in.
- **Local mic test:** `quickstart_client.py` lets you talk to the agent from a laptop microphone with no phone line (₹0).
- **Runs as:** Docker Compose with 3–4 containers: bolna-app (agent server, port 5001), Redis (stores agents), a Plivo or Twilio call server, and ngrok (only for local testing).

**Missing compared with hosted Bolna:**
- No dashboard: no Call History UI, recordings viewer or extraction screen. Agents are created and calls placed through a simple REST API.
- We'd log call results into our own DB, Sheet and email from the call transcript, using code we already have.
- No WhatsApp-calling transport (Pipecat has one).
- Smaller community and thinner docs than Pipecat.

### Verdict: Bolna OSS vs Pipecat for us
| | Bolna OSS | Pipecat |
|---|---|---|
| Move the tuned Neha agent over | **Easiest** (same engine and settings) | Rebuild and re-tune |
| Indian phone lines (Plivo/Exotel/Vobiz) | **Built in** | Plivo/Exotel via serializers |
| Free WhatsApp inbound calls | No | **Yes** |
| Gemini Live / Sarvam / free LLMs | Yes | Yes |
| Dashboard | No (we build simple logging) | No |
| Community / docs | Smaller | Larger |

**Recommendation:** use **Bolna OSS for the phone follow-up calls** (the main goal).
- The pilot tuning carries over directly.
- Indian providers (Vobiz/Plivo at about ₹0.38/min) are built in.
- Add free WhatsApp inbound calls later with a small Pipecat service, only if patients actually use the 📞 button.

Source: [bolna-ai/bolna on GitHub](https://github.com/bolna-ai/bolna)

## Sources
- Frameworks: [Plivo: LiveKit/Pipecat/TEN](https://www.plivo.com/blog/how-to-build-a-voice-ai-agent-livekit-pipecat-ten-or-native/), [Micdrop 2026 comparison](https://micdrop.dev/blog/open-source-voice-agent-frameworks), [Pipecat vs LiveKit vs Bolna](https://www.thinnest.ai/blog/open-source-voice-ai-frameworks), [Soniox wiki](https://soniox.com/wiki/voice-agent-frameworks)
- Pipecat WhatsApp calling: [docs](https://docs.pipecat.ai/server/services/transport/whatsapp), [guide](https://docs.pipecat.ai/guides/features/whatsapp)
- Meta calling pricing: [WhatsApp Cloud API calling pricing](https://developers.facebook.com/docs/whatsapp/cloud-api/calling/pricing)
- Gemini Live: [languages](https://ai.google.dev/gemini-api/docs/live-guide), [pricing](https://ai.google.dev/gemini-api/docs/pricing)
- TTS: [Indic Parler-TTS](https://huggingface.co/ai4bharat/indic-parler-tts), [RASMALAI paper](https://arxiv.org/pdf/2505.18609), [IndicF5](https://github.com/AI4Bharat/IndicF5), [Indian TTS preference study 2026](https://arxiv.org/pdf/2604.21481), [Azure Marathi voice](https://json2video.com/ai-voices/azure/voices/mr-in-aarohineural/), [Azure speech pricing](https://azure.microsoft.com/es-es/pricing/details/speech/), [Google Chirp 3 HD](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd)
- STT: [Voice of India benchmark](https://arxiv.org/pdf/2604.19151), [IndicWhisper Marathi](https://huggingface.co/itsskofficial/livewhisper-mr-indicwhisper), [WER benchmarks](https://caller.digital/blog/voice-ai-wer-benchmarks-indian-languages-hindi-tamil-telugu-bengali-marathi-2026)
- LLM: [Sarvam 30B/105B open weights](https://www.businesstoday.in/tech-today/story/sarvam-ai-launches-30b-and-105b-open-source-models-516729-2026-02-18)
- Telephony: [Plivo India SIP pricing](https://www.plivo.com/sip-trunking/pricing/in/), [Twilio India SIP pricing](https://www.twilio.com/en-us/sip-trunking/pricing/in), [India telephony comparison](https://caller.digital/blog/telephony-partner-voice-ai-india-plivo-exotel-ozonetel-knowlarity-twilio-2026), [Vobiz](https://www.vobiz.ai/resources/blogs/buyers-guide/migrating-to-vobiz-plivo-twilio-exotel-telnyx-switching-guide/)
