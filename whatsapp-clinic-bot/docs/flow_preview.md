# WhatsApp conversation preview (generated from knowledge/flows.yaml)
Every fixed message, in the order patients see it. Edit the text in `knowledge/flows.yaml`, then run `python scripts/flow_preview.py`. Items marked ⚠️ need the clinic's confirmation.

**Rules:** every chat starts in **Marathi** (no language picker) and switches only when the patient asks (types "Hindi" / "English" or "Hindi me batao"). Doctor, hospital, address and phone numbers are **never** shared. If asked, the reply is that our representative will call.

---
## मराठी (default)
**1. Welcome + main menu**
```
नमस्कार,

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

धन्यवाद...
(हिंदी / English साठी 'Hindi' किंवा 'English' टाइप करा)

आम्ही कशी मदत करू? 👇
```
Menu: 📅 अपॉइंटमेंट बुक करा | 📷 पायाचे फोटो पाठवा | 📞 मला कॉल करा | ❓ दुसरा प्रश्न

**2. 📷 Send leg photos**
```
📷 पेशंटच्या दोन्ही पायांचे फोटो किंवा कलर डॉपलर टेस्टचा फोटो इथेच पाठवा.
फोटो डॉक्टरांना दाखवून त्यांनी दिलेला सल्ला कळवला जाईल.
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल हवा | ☰ मेनू

**3. ❓ Other question**
```
नक्की 🙏 तुमचा प्रश्न टाइप करा.
```

**4. If asked for address / doctor / hospital / phone (menu or AI)**
```
📞 पत्ता व इतर सर्व माहिती आमचे प्रतिनिधी तुम्हाला कॉल करून सांगतील.
```
Buttons: 📞 कॉल हवा | 📅 अपॉइंटमेंट | ☰ मेनू

**5. 📅 Book appointment: only the day**
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

**6. 📞 Call me back (one tap)**
```
ठीक आहे 🙏 आमचे प्रतिनिधी तुम्हाला लवकरच कॉल करतील.
```

**7. 📷 Patient sends a photo (legs or Doppler report)**
Saved for staff in the inbox; the patient is thanked once per batch of photos:
```
धन्यवाद 🙏 फोटो मिळाला. डॉक्टरांना दाखवून त्यांनी दिलेला सल्ला तुम्हाला कळवला जाईल.
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल हवा | ☰ मेनू

**8. Reminders if the patient stops replying (inside 24 h only)**
After 2 h:
```
नमस्कार <name> 🙏 पायाचे फोटो किंवा कलर डॉपलर रिपोर्ट पाठवायचा असेल तर इथेच पाठवा. डॉक्टरांचा सल्ला कळवला जाईल.
किंवा अपॉइंटमेंटसाठी फक्त दिवस निवडा.
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल हवा | ☰ मेनू
After 20 h:
```
<name>, फुगलेल्या नसांकडे दुर्लक्ष केल्यास सूज व वेदना वाढू शकतात. पात्र रुग्णांसाठी लेझर ट्रीटमेंट मोफत आहे. 🙏
अपॉइंटमेंटसाठी दिवस निवडायचा का?
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल हवा | ☰ मेनू

**9. Typed question when AI is off (menu-only mode)**
```
तुमचा प्रश्न नोंदवला आहे 🙏 आमचे प्रतिनिधी तुम्हाला कॉल करून माहिती देतील.
तोपर्यंत खालील मेनूमधून पर्याय निवडू शकता.
```
Then the main menu.

**10. ⚠️ Emergency words (always, instantly)**
```
⚠️ हे गंभीर असू शकते. कृपया *लगेच 108 वर कॉल करा* किंवा जवळच्या हॉस्पिटलच्या इमर्जन्सी विभागात जा. उशीर करू नका.
```

---
## हिंदी (only if the patient asks)
**1. Welcome + main menu**
```
नमस्ते,

*महत्वपूर्ण जानकारी-*
-----------------------------------
हमारे यहां सरकार की ओर से प्राइवेट हॉस्पिटल में मुफ़्त *वेरिकोज़ वेन्स लेज़र ट्रीटमेंट* करवाया जाता है.

यह ट्रीटमेंट आधार कार्ड और आयुष्मान कार्ड धारकों को मुफ़्त मिलता है.

लेज़र ट्रीटमेंट की खासियतें:
- यह एक एडवांस ट्रीटमेंट है.
- ट्रीटमेंट सिर्फ़ 25 मिनट में होता है.
- पैर पर कहीं भी कट या टांका नहीं लगता.

मरीज़ के दोनों पैरों की फ़ोटो या कलर डॉप्लर टेस्ट की फ़ोटो खींचकर इसी नंबर पर भेजें.

फ़ोटो डॉक्टर को दिखाकर उनकी सलाह आपको बताई जाएगी.

धन्यवाद...

हम कैसे मदद करें? 👇
```
Menu: 📅 अपॉइंटमेंट बुक करें | 📷 पैरों की फ़ोटो भेजें | 📞 मुझे कॉल करें | ❓ दूसरा सवाल

**2. 📷 Send leg photos**
```
📷 मरीज़ के दोनों पैरों की फ़ोटो या कलर डॉप्लर टेस्ट की फ़ोटो यहीं भेजें.
फ़ोटो डॉक्टर को दिखाकर उनकी सलाह बताई जाएगी.
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल करें | ☰ मेनू

**3. ❓ Other question**
```
ज़रूर 🙏 अपना सवाल टाइप करें.
```

**4. If asked for address / doctor / hospital / phone (menu or AI)**
```
📞 पता और बाकी सारी जानकारी हमारे प्रतिनिधि आपको कॉल करके बताएंगे.
```
Buttons: 📞 कॉल करें | 📅 अपॉइंटमेंट | ☰ मेनू

**5. 📅 Book appointment: only the day**
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

**6. 📞 Call me back (one tap)**
```
ठीक है 🙏 हमारे प्रतिनिधि जल्द ही आपको कॉल करेंगे.
```

**7. 📷 Patient sends a photo (legs or Doppler report)**
Saved for staff in the inbox; the patient is thanked once per batch of photos:
```
धन्यवाद 🙏 फ़ोटो मिल गई. डॉक्टर को दिखाकर उनकी सलाह आपको बताई जाएगी.
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल करें | ☰ मेनू

**8. Reminders if the patient stops replying (inside 24 h only)**
After 2 h:
```
नमस्ते <name> 🙏 पैरों की फ़ोटो या कलर डॉप्लर रिपोर्ट भेजनी हो तो यहीं भेजें. डॉक्टर की सलाह बताई जाएगी.
या अपॉइंटमेंट के लिए बस दिन चुनें.
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल करें | ☰ मेनू
After 20 h:
```
<name>, उभरी नसों को नज़रअंदाज़ करने से सूजन और दर्द बढ़ सकता है. पात्र मरीज़ों के लिए लेज़र ट्रीटमेंट मुफ़्त है. 🙏
अपॉइंटमेंट के लिए दिन चुनें?
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल करें | ☰ मेनू

**9. Typed question when AI is off (menu-only mode)**
```
आपका सवाल दर्ज कर लिया गया है 🙏 हमारे प्रतिनिधि आपको कॉल करके जानकारी देंगे.
तब तक नीचे मेनू से विकल्प चुन सकते हैं.
```
Then the main menu.

**10. ⚠️ Emergency words (always, instantly)**
```
⚠️ यह गंभीर हो सकता है. कृपया *तुरंत 108 पर कॉल करें* या नज़दीकी अस्पताल के इमरजेंसी विभाग में जाएं. देर न करें.
```

---
## English (only if the patient asks)
**1. Welcome + main menu**
```
Hello,

*Important information-*
-----------------------------------
We arrange free *varicose vein laser treatment* at a private hospital under a government scheme.

The treatment is free for Aadhaar card and Ayushman card holders.

About the laser treatment:
- It is an advanced treatment.
- It takes only 25 minutes.
- No cut or stitch anywhere on the leg.

Please send photos of both of the patient's legs, or a photo of the Colour Doppler test report, to this number.

We will show the photos to the doctor and share their advice with you.

Thank you...

How can we help? 👇
```
Menu: 📅 Book appointment | 📷 Send leg photos | 📞 Call me back | ❓ Other question

**2. 📷 Send leg photos**
```
📷 Send photos of both of the patient's legs, or the Colour Doppler report, right here.
We'll show them to the doctor and share their advice.
```
Buttons: 📅 Book | 📞 Call me | ☰ Menu

**3. ❓ Other question**
```
Sure 🙏 Please type your question.
```

**4. If asked for address / doctor / hospital / phone (menu or AI)**
```
📞 Our representative will call you with the address and all other details.
```
Buttons: 📞 Call me | 📅 Book | ☰ Menu

**5. 📅 Book appointment: only the day**
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

**6. 📞 Call me back (one tap)**
```
Okay 🙏 Our representative will call you soon.
```

**7. 📷 Patient sends a photo (legs or Doppler report)**
Saved for staff in the inbox; the patient is thanked once per batch of photos:
```
Thank you 🙏 Photo received. We'll show it to the doctor and share their advice with you.
```
Buttons: 📅 Book | 📞 Call me | ☰ Menu

**8. Reminders if the patient stops replying (inside 24 h only)**
After 2 h:
```
Hello <name> 🙏 You can send leg photos or the Colour Doppler report right here for the doctor's advice.
Or just pick a day for the appointment.
```
Buttons: 📅 Book | 📞 Call me | ☰ Menu
After 20 h:
```
<name>, If ignored, varicose veins can lead to more swelling and pain. Laser treatment is free for eligible patients. 🙏
Shall we pick a day for the appointment?
```
Buttons: 📅 Book | 📞 Call me | ☰ Menu

**9. Typed question when AI is off (menu-only mode)**
```
Your question has been noted 🙏 Our representative will call you with the details.
Meanwhile, you can choose from the menu below.
```
Then the main menu.

**10. ⚠️ Emergency words (always, instantly)**
```
⚠️ This could be serious. Please *call 108 immediately* or go to the nearest hospital emergency department. Don't wait.
```

