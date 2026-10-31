# WhatsApp conversation preview (generated from knowledge/flows.yaml)
Every fixed message, in the order patients see it. Edit the text in `knowledge/flows.yaml`, then run `python scripts/flow_preview.py`. Items marked ⚠️ need the clinic's confirmation.

**Rules:** every chat starts in **Marathi** (no language picker) and switches only when the patient asks (types "Hindi" / "English" or "Hindi me batao"). Doctor, hospital, address and phone numbers are **never** shared. If asked, the reply is that our representative will call.

---
## मराठी (default)
**1. First message: welcome + which problem?**
```
नमस्कार 🙏
आमच्याकडे *आयुष्मान भारत* / सरकारी योजनेअंतर्गत उपचाराची सुविधा उपलब्ध आहे.
(हिंदी / English साठी 'Hindi' किंवा 'English' टाइप करा)

तुम्हाला यापैकी कोणता त्रास आहे? 👇
```
List: 🦵 व्हेरिकोज व्हेन्स | व्हॅरिकोसील | 🦴 स्पाइन (मणका) त्रास | ❓ इतर त्रास

**2. Picked: 🦵 व्हेरिकोज व्हेन्स**
```
*महत्त्वपूर्ण माहिती-*
-----------------------------------
आमच्या येथे शासनातर्फे प्रायव्हेट हॉस्पिटलमध्ये मोफत *व्हेरिकोज व्हेन्स लेझर ट्रीटमेंट* करून मिळते.

ही ट्रीटमेंट आधार कार्ड आणि आयुष्मान कार्ड धारकांना मोफत करून मिळते.

लेझर ट्रीटमेंट ची वैशिष्टे:
- ही एक ऍडव्हॅन्स ट्रीटमेंट आहे.
- ट्रीटमेंट फक्त 25 मिनिटात होते.
- पायाला कुठेही कट किंवा टाका लागत नाही.

पेशंटचा दोन्ही पायाचे फोटो किंवा कलर डॉपलर टेस्टचा फोटो काढून आम्हाला याच नंबर वर पाठवा.

फोटो डॉक्टरांना दाखवून त्यांनी दिलेला सल्ला कळवला जाईल.

आम्ही कशी मदत करू? 👇
```
Menu: 📅 अपॉइंटमेंट बुक करा | 📝 माहिती फॉर्म भरा | 📷 फोटो / रिपोर्ट पाठवा | 📞 मला कॉल करा | 🩺 दुसरा त्रास निवडा | ❓ दुसरा प्रश्न

**3. Picked: व्हॅरिकोसील**
```
*व्हॅरिकोसीलचा त्रास आहे का?*
अंडकोषात सूज, दुखणे किंवा जडपणा जाणवतो का?

✅ योग्य उपचार आणि मार्गदर्शन मिळवा.
✅ *आयुष्मान भारत* अंतर्गत उपचाराची सुविधा.
✅ *मोफत सल्ला* (Free Consultancy).

सोनोग्राफी / कलर डॉपलर रिपोर्ट असल्यास त्याचा फोटो इथे पाठवा. डॉक्टरांचा सल्ला कळवला जाईल.

आम्ही कशी मदत करू? 👇
```
Menu: 📅 अपॉइंटमेंट बुक करा | 📝 माहिती फॉर्म भरा | 📷 फोटो / रिपोर्ट पाठवा | 📞 मला कॉल करा | 🩺 दुसरा त्रास निवडा | ❓ दुसरा प्रश्न

**4. Picked: 🦴 स्पाइन (मणका) त्रास**
```
*स्पाइनच्या आजाराने त्रस्त आहात?*
आता *संभाजीनगर* येथे योग्य उपचार सुविधा उपलब्ध!

✔️ कंबरदुखी
✔️ मानदुखी
✔️ पाठीचा त्रास
✔️ स्नायूंच्या वेदना
✔️ साईटिका वेदना

✅ *आयुष्मान कार्ड* द्वारे कॅशलेस उपचार उपलब्ध!

MRI / X-ray रिपोर्ट असल्यास त्याचा फोटो इथे पाठवा. डॉक्टरांचा सल्ला कळवला जाईल.

आम्ही कशी मदत करू? 👇
```
Menu: 📅 अपॉइंटमेंट बुक करा | 📝 माहिती फॉर्म भरा | 📷 फोटो / रिपोर्ट पाठवा | 📞 मला कॉल करा | 🩺 दुसरा त्रास निवडा | ❓ दुसरा प्रश्न

**5. Picked: ❓ इतर त्रास**
```
थोडक्यात त्रास टाइप करा.
```
After they type it:
```
धन्यवाद 🙏 तुमचा त्रास नोंदवला आहे. आमचे प्रतिनिधी तुम्हाला कॉल करून माहिती देतील.

आम्ही कशी मदत करू? 👇
```
Menu: 📅 अपॉइंटमेंट बुक करा | 📝 माहिती फॉर्म भरा | 📷 फोटो / रिपोर्ट पाठवा | 📞 मला कॉल करा | 🩺 दुसरा त्रास निवडा | ❓ दुसरा प्रश्न

**6. 📷 Send leg photos**
```
📷 त्रासाचे फोटो किंवा रिपोर्ट (उदा. कलर डॉपलर, सोनोग्राफी, MRI / X-ray) इथेच पाठवा.
फोटो डॉक्टरांना दाखवून त्यांनी दिलेला सल्ला कळवला जाईल.
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल हवा | ☰ मेनू

**7. ❓ Other question**
```
नक्की 🙏 तुमचा प्रश्न टाइप करा.
```

**8. If asked for address / doctor / hospital / phone (menu or AI)**
```
📞 पत्ता व इतर सर्व माहिती आमचे प्रतिनिधी तुम्हाला कॉल करून सांगतील.
```
Buttons: 📞 कॉल हवा | 📅 अपॉइंटमेंट | ☰ मेनू

**9. 📅 Book appointment: only the day**
```
📅 अपॉइंटमेंटसाठी दिवस निवडा 👇
```
List: <day 1> | <day 2> | … | 📞 आधी कॉल करा
After picking a day (done, no other questions; a tentative entry goes to the clinic calendar):
```
धन्यवाद 🙏 *<day>* साठी तुमची अपॉइंटमेंट विनंती नोंदवली आहे.
आमचे प्रतिनिधी तुम्हाला कॉल करून वेळ निश्चित करतील.
```
After "call me first":
```
धन्यवाद 🙏 आमचे प्रतिनिधी तुम्हाला लवकरच कॉल करून अपॉइंटमेंट ठरवतील.
```
Buttons: ☰ मेनू

**10. 📝 Details form (chat version; one question at a time)**
```
📝 रुग्णाची माहिती भरूया (४ छोटे प्रश्न).

1️⃣ रुग्णाचे *नाव* टाइप करा.
```
```
2️⃣ रुग्णाचे *वय* किती आहे?
```
```
3️⃣ तुम्ही कोणत्या *गाव / शहरातून* आहात?
```
Then the problem list (skipped if already chosen):
```
तुम्हाला यापैकी कोणता त्रास आहे? 👇
```
Done:
```
✅ धन्यवाद! माहिती नोंदवली आहे. आमचे प्रतिनिधी तुम्हाला लवकरच कॉल करतील.
• नाव: …
• वय: …
• ठिकाण: …
• त्रास: …
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल हवा | ☰ मेनू
_With `WHATSAPP_FORM_FLOW_ID` set, a native WhatsApp form opens instead (fields: name, age, location, problem)._

**11. 📞 Call me back (one tap)**
```
ठीक आहे 🙏 आमचे प्रतिनिधी तुम्हाला लवकरच कॉल करतील.
```

**12. 📷 Patient sends a photo (legs or Doppler report)**
Saved for staff in the inbox; the patient is thanked once per batch of photos:
```
धन्यवाद 🙏 फोटो / रिपोर्ट मिळाला. डॉक्टरांना दाखवून त्यांनी दिलेला सल्ला तुम्हाला कळवला जाईल.
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल हवा | ☰ मेनू

**13. Reminders if the patient stops replying (inside 24 h only)**
After 2 h:
```
नमस्कार <name> 🙏 तुमच्या त्रासाचे फोटो किंवा रिपोर्ट पाठवायचा असेल तर इथेच पाठवा. डॉक्टरांचा सल्ला कळवला जाईल.
किंवा अपॉइंटमेंटसाठी फक्त दिवस निवडा.
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल हवा | ☰ मेनू
After 20 h:
```
<name>, त्रासाकडे दुर्लक्ष केल्यास तो वाढू शकतो. आयुष्मान भारत / सरकारी योजनेअंतर्गत उपचाराची सुविधा उपलब्ध आहे. 🙏
अपॉइंटमेंटसाठी दिवस निवडायचा का?
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल हवा | ☰ मेनू

**14. Typed question when AI is off (menu-only mode)**
```
तुमचा प्रश्न नोंदवला आहे 🙏 आमचे प्रतिनिधी तुम्हाला कॉल करून माहिती देतील.
तोपर्यंत खालील मेनूमधून पर्याय निवडू शकता.
```
Then the main menu.

**15. ⚠️ Emergency words (always, instantly)**
```
⚠️ हे गंभीर असू शकते. कृपया *लगेच 108 वर कॉल करा* किंवा जवळच्या हॉस्पिटलच्या इमर्जन्सी विभागात जा. उशीर करू नका.
```

---
## हिंदी (only if the patient asks)
**1. First message: welcome + which problem?**
```
नमस्ते 🙏
हमारे यहां *आयुष्मान भारत* / सरकारी योजना के तहत इलाज की सुविधा उपलब्ध है.

आपको इनमें से कौन सी तकलीफ़ है? 👇
```
List: 🦵 वेरिकोज़ वेन्स | वैरिकोसील | 🦴 स्पाइन की तकलीफ़ | ❓ कोई और तकलीफ़

**2. Picked: 🦵 वेरिकोज़ वेन्स**
```
*महत्वपूर्ण जानकारी-*
-----------------------------------
हमारे यहां सरकार की ओर से प्राइवेट हॉस्पिटल में मुफ़्त *वेरिकोज़ वेन्स लेज़र ट्रीटमेंट* करवाया जाता है.

यह ट्रीटमेंट आधार कार्ड और आयुष्मान कार्ड धारकों को मुफ़्त मिलता है.

लेज़र ट्रीटमेंट की खासियतें:
- यह एक एडवांस ट्रीटमेंट है.
- ट्रीटमेंट सिर्फ़ 25 मिनट में होता है.
- पैर पर कहीं भी कट या टांका नहीं लगता.

मरीज़ के दोनों पैरों की फ़ोटो या कलर डॉप्लर टेस्ट की फ़ोटो इसी नंबर पर भेजें.

फ़ोटो डॉक्टर को दिखाकर उनकी सलाह बताई जाएगी.

हम कैसे मदद करें? 👇
```
Menu: 📅 अपॉइंटमेंट बुक करें | 📝 जानकारी फ़ॉर्म भरें | 📷 फ़ोटो / रिपोर्ट भेजें | 📞 मुझे कॉल करें | 🩺 दूसरी तकलीफ़ चुनें | ❓ दूसरा सवाल

**3. Picked: वैरिकोसील**
```
*वैरिकोसील की तकलीफ़ है?*
अंडकोष में सूजन, दर्द या भारीपन महसूस होता है?

✅ सही इलाज और मार्गदर्शन पाएं.
✅ *आयुष्मान भारत* के तहत इलाज की सुविधा.
✅ *मुफ़्त सलाह* (Free Consultancy).

सोनोग्राफी / कलर डॉप्लर रिपोर्ट हो तो उसकी फ़ोटो यहां भेजें. डॉक्टर की सलाह बताई जाएगी.

हम कैसे मदद करें? 👇
```
Menu: 📅 अपॉइंटमेंट बुक करें | 📝 जानकारी फ़ॉर्म भरें | 📷 फ़ोटो / रिपोर्ट भेजें | 📞 मुझे कॉल करें | 🩺 दूसरी तकलीफ़ चुनें | ❓ दूसरा सवाल

**4. Picked: 🦴 स्पाइन की तकलीफ़**
```
*स्पाइन की बीमारी से परेशान हैं?*
अब *संभाजीनगर* में सही इलाज की सुविधा उपलब्ध!

✔️ कमर दर्द
✔️ गर्दन दर्द
✔️ पीठ की तकलीफ़
✔️ मांसपेशियों का दर्द
✔️ साइटिका का दर्द

✅ *आयुष्मान कार्ड* से कैशलेस इलाज उपलब्ध!

MRI / X-ray रिपोर्ट हो तो उसकी फ़ोटो यहां भेजें. डॉक्टर की सलाह बताई जाएगी.

हम कैसे मदद करें? 👇
```
Menu: 📅 अपॉइंटमेंट बुक करें | 📝 जानकारी फ़ॉर्म भरें | 📷 फ़ोटो / रिपोर्ट भेजें | 📞 मुझे कॉल करें | 🩺 दूसरी तकलीफ़ चुनें | ❓ दूसरा सवाल

**5. Picked: ❓ कोई और तकलीफ़**
```
तकलीफ़ थोड़े में टाइप करें.
```
After they type it:
```
धन्यवाद 🙏 आपकी तकलीफ़ दर्ज कर ली गई है. हमारे प्रतिनिधि आपको कॉल करके जानकारी देंगे.

हम कैसे मदद करें? 👇
```
Menu: 📅 अपॉइंटमेंट बुक करें | 📝 जानकारी फ़ॉर्म भरें | 📷 फ़ोटो / रिपोर्ट भेजें | 📞 मुझे कॉल करें | 🩺 दूसरी तकलीफ़ चुनें | ❓ दूसरा सवाल

**6. 📷 Send leg photos**
```
📷 तकलीफ़ की फ़ोटो या रिपोर्ट (जैसे कलर डॉप्लर, सोनोग्राफी, MRI / X-ray) यहीं भेजें.
फ़ोटो डॉक्टर को दिखाकर उनकी सलाह बताई जाएगी.
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल करें | ☰ मेनू

**7. ❓ Other question**
```
ज़रूर 🙏 अपना सवाल टाइप करें.
```

**8. If asked for address / doctor / hospital / phone (menu or AI)**
```
📞 पता और बाकी सारी जानकारी हमारे प्रतिनिधि आपको कॉल करके बताएंगे.
```
Buttons: 📞 कॉल करें | 📅 अपॉइंटमेंट | ☰ मेनू

**9. 📅 Book appointment: only the day**
```
📅 अपॉइंटमेंट के लिए दिन चुनें 👇
```
List: <day 1> | <day 2> | … | 📞 पहले कॉल करें
After picking a day (done, no other questions; a tentative entry goes to the clinic calendar):
```
धन्यवाद 🙏 *<day>* के लिए आपका अपॉइंटमेंट अनुरोध दर्ज हो गया है.
हमारे प्रतिनिधि आपको कॉल करके समय तय करेंगे.
```
After "call me first":
```
धन्यवाद 🙏 हमारे प्रतिनिधि जल्द ही आपको कॉल करके अपॉइंटमेंट तय करेंगे.
```
Buttons: ☰ मेनू

**10. 📝 Details form (chat version; one question at a time)**
```
📝 मरीज़ की जानकारी भरते हैं (4 छोटे सवाल).

1️⃣ मरीज़ का *नाम* टाइप करें.
```
```
2️⃣ मरीज़ की *उम्र* कितनी है?
```
```
3️⃣ आप किस *गांव / शहर* से हैं?
```
Then the problem list (skipped if already chosen):
```
आपको इनमें से कौन सी तकलीफ़ है? 👇
```
Done:
```
✅ धन्यवाद! जानकारी दर्ज कर ली गई है. हमारे प्रतिनिधि जल्द ही आपको कॉल करेंगे.
• नाम: …
• उम्र: …
• जगह: …
• तकलीफ़: …
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल करें | ☰ मेनू
_With `WHATSAPP_FORM_FLOW_ID` set, a native WhatsApp form opens instead (fields: name, age, location, problem)._

**11. 📞 Call me back (one tap)**
```
ठीक है 🙏 हमारे प्रतिनिधि जल्द ही आपको कॉल करेंगे.
```

**12. 📷 Patient sends a photo (legs or Doppler report)**
Saved for staff in the inbox; the patient is thanked once per batch of photos:
```
धन्यवाद 🙏 फ़ोटो / रिपोर्ट मिल गई. डॉक्टर को दिखाकर उनकी सलाह आपको बताई जाएगी.
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल करें | ☰ मेनू

**13. Reminders if the patient stops replying (inside 24 h only)**
After 2 h:
```
नमस्ते <name> 🙏 तकलीफ़ की फ़ोटो या रिपोर्ट भेजनी हो तो यहीं भेजें. डॉक्टर की सलाह बताई जाएगी.
या अपॉइंटमेंट के लिए बस दिन चुनें.
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल करें | ☰ मेनू
After 20 h:
```
<name>, तकलीफ़ को नज़रअंदाज़ करने से वह बढ़ सकती है. आयुष्मान भारत / सरकारी योजना के तहत इलाज की सुविधा उपलब्ध है. 🙏
अपॉइंटमेंट के लिए दिन चुनें?
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल करें | ☰ मेनू

**14. Typed question when AI is off (menu-only mode)**
```
आपका सवाल दर्ज कर लिया गया है 🙏 हमारे प्रतिनिधि आपको कॉल करके जानकारी देंगे.
तब तक नीचे मेनू से विकल्प चुन सकते हैं.
```
Then the main menu.

**15. ⚠️ Emergency words (always, instantly)**
```
⚠️ यह गंभीर हो सकता है. कृपया *तुरंत 108 पर कॉल करें* या नज़दीकी अस्पताल के इमरजेंसी विभाग में जाएं. देर न करें.
```

---
## English (only if the patient asks)
**1. First message: welcome + which problem?**
```
Hello 🙏
Treatment under *Ayushman Bharat* / government schemes is available with us.

Which of these problems do you have? 👇
```
List: 🦵 Varicose veins | Varicocele | 🦴 Spine problem | ❓ Other problem

**2. Picked: 🦵 Varicose veins**
```
*Important information-*
-----------------------------------
We arrange free *varicose vein laser treatment* at a private hospital under a government scheme.

The treatment is free for Aadhaar card and Ayushman card holders.

About the laser treatment:
- It is an advanced treatment.
- It takes only 25 minutes.
- No cut or stitch anywhere on the leg.

Please send photos of both of the patient's legs, or the Colour Doppler report, to this number.

We will show the photos to the doctor and share their advice.

How can we help? 👇
```
Menu: 📅 Book appointment | 📝 Fill details form | 📷 Send photos / reports | 📞 Call me back | 🩺 Choose another problem | ❓ Other question

**3. Picked: Varicocele**
```
*Suffering from varicocele?*
Swelling, pain or heaviness in the scrotum?

✅ Get the right treatment and guidance.
✅ Treatment available under *Ayushman Bharat*.
✅ *Free consultation*.

If you have a sonography / Colour Doppler report, send a photo here for the doctor's advice.

How can we help? 👇
```
Menu: 📅 Book appointment | 📝 Fill details form | 📷 Send photos / reports | 📞 Call me back | 🩺 Choose another problem | ❓ Other question

**4. Picked: 🦴 Spine problem**
```
*Troubled by a spine problem?*
Proper treatment is now available in *Sambhajinagar*!

✔️ Lower back pain
✔️ Neck pain
✔️ Back problems
✔️ Muscle pain
✔️ Sciatica pain

✅ Cashless treatment with the *Ayushman card*!

If you have an MRI / X-ray report, send a photo here for the doctor's advice.

How can we help? 👇
```
Menu: 📅 Book appointment | 📝 Fill details form | 📷 Send photos / reports | 📞 Call me back | 🩺 Choose another problem | ❓ Other question

**5. Picked: ❓ Other problem**
```
Please type the problem in a few words.
```
After they type it:
```
Thank you 🙏 Your problem is noted. Our representative will call you with details.

How can we help? 👇
```
Menu: 📅 Book appointment | 📝 Fill details form | 📷 Send photos / reports | 📞 Call me back | 🩺 Choose another problem | ❓ Other question

**6. 📷 Send leg photos**
```
📷 Send photos or reports (e.g. Colour Doppler, sonography, MRI / X-ray) right here.
We'll show them to the doctor and share their advice.
```
Buttons: 📅 Book | 📞 Call me | ☰ Menu

**7. ❓ Other question**
```
Sure 🙏 Please type your question.
```

**8. If asked for address / doctor / hospital / phone (menu or AI)**
```
📞 Our representative will call you with the address and all other details.
```
Buttons: 📞 Call me | 📅 Book | ☰ Menu

**9. 📅 Book appointment: only the day**
```
📅 Pick a day for the appointment 👇
```
List: <day 1> | <day 2> | … | 📞 Call me first
After picking a day (done, no other questions; a tentative entry goes to the clinic calendar):
```
Thank you 🙏 Your appointment request for *<day>* is noted.
Our representative will call you to fix the time.
```
After "call me first":
```
Thank you 🙏 Our representative will call you soon to fix the appointment.
```
Buttons: ☰ Menu

**10. 📝 Details form (chat version; one question at a time)**
```
📝 Let's fill in the patient's details (4 short questions).

1️⃣ Type the patient's *name*.
```
```
2️⃣ What is the patient's *age*?
```
```
3️⃣ Which *village / city* are you from?
```
Then the problem list (skipped if already chosen):
```
Which of these problems do you have? 👇
```
Done:
```
✅ Thank you! Your details are noted. Our representative will call you soon.
• Name: …
• Age: …
• Location: …
• Problem: …
```
Buttons: 📅 Book | 📞 Call me | ☰ Menu
_With `WHATSAPP_FORM_FLOW_ID` set, a native WhatsApp form opens instead (fields: name, age, location, problem)._

**11. 📞 Call me back (one tap)**
```
Okay 🙏 Our representative will call you soon.
```

**12. 📷 Patient sends a photo (legs or Doppler report)**
Saved for staff in the inbox; the patient is thanked once per batch of photos:
```
Thank you 🙏 Photo / report received. We'll show it to the doctor and share their advice with you.
```
Buttons: 📅 Book | 📞 Call me | ☰ Menu

**13. Reminders if the patient stops replying (inside 24 h only)**
After 2 h:
```
Hello <name> 🙏 You can send photos or reports of your problem right here for the doctor's advice.
Or just pick a day for the appointment.
```
Buttons: 📅 Book | 📞 Call me | ☰ Menu
After 20 h:
```
<name>, Problems can get worse if ignored. Treatment under Ayushman Bharat / government schemes is available. 🙏
Shall we pick a day for the appointment?
```
Buttons: 📅 Book | 📞 Call me | ☰ Menu

**14. Typed question when AI is off (menu-only mode)**
```
Your question has been noted 🙏 Our representative will call you with the details.
Meanwhile, you can choose from the menu below.
```
Then the main menu.

**15. ⚠️ Emergency words (always, instantly)**
```
⚠️ This could be serious. Please *call 108 immediately* or go to the nearest hospital emergency department. Don't wait.
```

