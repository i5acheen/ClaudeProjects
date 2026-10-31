# WhatsApp Cloud API setup

Direct Meta Cloud API, no BSP. Webhook: `POST /api/webhooks/whatsapp`.

## 1. WhatsApp Business Account (WABA) and number
1. In the same Meta app: **Add product → WhatsApp** → Getting started → choose your Business portfolio;
   Meta creates a WABA.
2. **Number choice**
   - *New dedicated number* (recommended for a clean start): API setup → Add phone number → display name
     (must match your brand/website, e.g. "HealthConnect Sahayak") → verify by SMS/voice.
   - *Existing WhatsApp Business app number* — use **coexistence** onboarding (Embedded Signup → "Connect
     your existing WhatsApp Business App"). The app keeps working on the phone, chat history (up to 6 months)
     syncs, and the API sends on the same number. Check Meta's current coexistence limitations (some features,
     e.g. groups and some message types, are app-only) before choosing it.
3. Copy **Phone number ID** → `WA_PHONE_NUMBER_ID`, **WhatsApp Business Account ID** → `WA_BUSINESS_ACCOUNT_ID`.
4. Set the business profile: description, address, website `https://<domain>`, privacy policy link.

## 2. Permanent token (System User)
Business Settings → System users → (the same "crm-server" user) → Assign assets → the WABA (full control)
→ Generate token with `whatsapp_business_messaging` and `whatsapp_business_management`, expiry **Never**
→ `WA_ACCESS_TOKEN`. Never use the 24-hour temporary token from the Getting-started page in production.

## 3. Webhook
1. `openssl rand -hex 32` → `WA_VERIFY_TOKEN` (Vercel), redeploy.
2. WhatsApp → **Configuration** → Webhook → Callback `https://<domain>/api/webhooks/whatsapp`, verify token
   above → Verify and save. Subscribe to the **messages** field (it carries both messages and statuses).
3. Subscribe the WABA to the app: `POST https://graph.facebook.com/<ver>/<waba-id>/subscribed_apps` with the
   System User token.
4. Signatures are checked with the same `META_APP_SECRET` as Lead Ads.

## 4. Templates (WhatsApp Manager → Message templates → Create)
Category **Utility** unless stated. Variables are `{{1}}`, `{{2}}`… Names must match exactly.

| Name | Lang | Category | Sample body |
|---|---|---|---|
| `lead_greeting_mr` | Marathi | Utility | नमस्कार {{1}} जी, आपण उपचाराबद्दल चौकशी केली होती. आम्ही MJPJAY / आयुष्मान भारत योजनेअंतर्गत उपचारासाठी मोफत मदत करतो. आपली समस्या थोडक्यात सांगाल का? थांबवण्यासाठी STOP लिहा. |
| `lead_greeting_hi` | Hindi | Utility | नमस्ते {{1}} जी, आपने इलाज के बारे में पूछताछ की थी। हम MJPJAY / आयुष्मान भारत योजना के तहत इलाज के लिए मुफ्त मदद करते हैं। अपनी समस्या संक्षेप में बताएँगे? रोकने के लिए STOP लिखें। |
| `docs_reminder_mr` | Marathi | Utility | नमस्कार जी, पात्रता तपासण्यासाठी कृपया आधार कार्ड, रेशन कार्ड आणि असल्यास आयुष्मान/MJPJAY कार्डचे स्पष्ट फोटो या चॅटवर पाठवा. |
| `docs_reminder_hi` | Hindi | Utility | नमस्ते जी, पात्रता जाँचने के लिए कृपया आधार कार्ड, राशन कार्ड और हो तो आयुष्मान/MJPJAY कार्ड की साफ़ फ़ोटो इस चैट पर भेजें। |
| `visit_confirmation_mr` | Marathi | Utility | नमस्कार जी, आपली भेट {{1}} येथे {{2}} रोजी {{3}} वाजता ठरली आहे. कृपया आधार व रेशन कार्ड सोबत आणा. |
| `visit_confirmation_hi` | Hindi | Utility | नमस्ते जी, आपकी मुलाक़ात {{1}} में {{2}} को {{3}} बजे तय है। कृपया आधार और राशन कार्ड साथ लाएँ। |
| `reengage_mr` | Marathi | **Marketing** | नमस्कार जी, उपचारासाठी अजूनही मदत हवी असल्यास "हो" लिहा. थांबवण्यासाठी STOP लिहा. |

Avoid promises ("guaranteed free") — Meta rejects or pauses misleading health templates, and our guardrails
forbid it. Approval takes minutes to a day. The `nightly-maintenance` job syncs status into `wa_templates`;
until it first runs you can insert rows by hand (see `supabase/seed.sql` for the shape).

## 5. Test
1. Send "नमस्कार" from a test phone to the business number → Inbox shows it within seconds, Sahayak replies in Marathi.
2. Send "मला माणसाशी बोलायचं आहे" → handover reply, lead shows **Needs human**, coordinator gets an alert, further
   messages get no bot reply.
3. Send "STOP" → one confirmation, then nothing more is ever sent (templates included).
4. Send a photo with caption "आधार" → appears under Documents on the profile (kind `aadhaar`, unverified).

## 6. Pricing note
Meta bills **per delivered template message**, by category (marketing > utility > authentication); replies
and free-form messages inside the 24-hour customer-service window are free. The dashboard shows this month's
template counts by category.
