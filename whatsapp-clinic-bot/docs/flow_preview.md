# WhatsApp conversation preview (generated from knowledge/flows.yaml)
Every fixed message, in the order patients see it. Edit the text in `knowledge/flows.yaml`, then run `python scripts/flow_preview.py`. Items marked ⚠️ need the clinic's confirmation.

**Rules:** every chat starts in **Marathi** (no language picker) and switches only when the patient asks (types "Hindi" / "English" or "Hindi me batao"). Doctor, hospital, address and phone numbers are **never** shared. If asked, the reply is that our representative will call.

---
## मराठी (default)
**1. Welcome + main menu**
```
नमस्कार 🙏 आमच्या व्हेरिकोज व्हेन्स (पायाच्या नसा) क्लिनिकमध्ये आपलं स्वागत आहे.
🆓 पात्र रुग्णांसाठी सरकारी योजनेअंतर्गत मोफत उपचार.
(हिंदी / English साठी 'Hindi' किंवा 'English' टाइप करा)

आम्ही कशी मदत करू? 👇
```
Menu: 📅 अपॉइंटमेंट बुक करा | 🆓 योजनेत मोफत उपचार | 💉 उपचार कसे होतात | 💰 खर्च व विमा | 📞 मला कॉल करा | ❓ दुसरा प्रश्न

**2. 🆓 Free treatment under scheme**
```
🆓 *सरकारी योजनेत मोफत उपचार*
पात्र रुग्णांसाठी लेझर उपचार, ॲडमिशन व औषधे मोफत होऊ शकतात. योजनेची कागदपत्रे आमची टीम करते.
तुमच्याकडे आयुष्मान भारत / MJPJAY कार्ड आहे का?
```
Buttons: ✅ कार्ड आहे | ❓ माहित नाही | 📅 अपॉइंटमेंट

**3. 💉 How treatment works**
```
*उपचार* 💉
• तपासणी + कलर डॉपलर
• गरज असल्यास डे-केअर लेझर उपचार: छोटे छिद्र, टाके नाहीत
• बहुतेक रुग्ण त्याच किंवा दुसऱ्या दिवशी घरी जातात
🆓 पात्र रुग्णांसाठी सरकारी योजनेत मोफत.
```
Buttons: 📅 अपॉइंटमेंट | 🆓 मोफत योजना | ☰ मेनू

**4. 💰 Cost & insurance**
```
*खर्च* 💰
• 🆓 पात्र रुग्णांसाठी सरकारी योजनेत उपचार मोफत
• बहुतेक आरोग्य विमा पॉलिसींमध्ये कव्हर
• अचूक खर्च तपासणीनंतर सांगितला जातो
```
Buttons: 📅 अपॉइंटमेंट | 🆓 मोफत योजना | 📞 कॉल हवा

**5. ❓ Other question**
```
नक्की 🙏 तुमचा प्रश्न टाइप करा.
```

**6. If asked for address / doctor / hospital / phone (menu or AI)**
```
📞 पत्ता व इतर सर्व माहिती आमचे प्रतिनिधी तुम्हाला कॉल करून सांगतील.
```
Buttons: 📞 कॉल हवा | 📅 अपॉइंटमेंट | ☰ मेनू

**7. Scheme answer → then booking starts**
If ✅ card:
```
छान! 👍 तपासणीला येताना योजनेचे कार्ड, आधार कार्ड व रेशन कार्ड सोबत आणा. आमची टीम योजनेची प्रक्रिया पूर्ण करण्यास मदत करेल.
```
If ❓ not sure:
```
काही हरकत नाही 🙏 आमची टीम तुमची पात्रता तपासेल. तपासणीला येताना आधार कार्ड व रेशन कार्ड सोबत आणा.
```

**8. 📅 Booking (one question at a time; known answers are skipped)**
a) Problem
```
तुम्हाला पायाचा कोणता त्रास होत आहे? 👇
```
List: व्हेरिकोज व्हेन्स | इतर त्रास
b) How long
```
हा त्रास किती काळापासून आहे?
```
Buttons: 6 महिन्यांपेक्षा कमी | 6 महिने – 2 वर्षे | 2 वर्षांपेक्षा जास्त
c) Name
```
अपॉइंटमेंटसाठी कृपया रुग्णाचे *नाव* टाइप करा.
```
d) City
```
तुम्ही कोणत्या शहरातून / भागातून आहात?
```
e) Day → morning/evening → time (from the clinic hours in `schedule`, ⚠️ example hours)
```
📅 तपासणीसाठी कोणता दिवस सोयीचा आहे? 👇
```
```
<day>: सकाळ की संध्याकाळ?
```
```
<day>: कोणती वेळ? 👇
```
f) Confirm
```
कृपया तपशील तपासा ✅
• नाव: …
• सोयीची वेळ: …
हे बरोबर आहे का?
```
Buttons: ✅ बरोबर आहे | ✏️ बदला
g) Done
```
धन्यवाद, <name>! 🙏
आमची क्लिनिक टीम लवकरच तुम्हाला कॉल करून अपॉइंटमेंट निश्चित करेल.
```
Buttons: ☰ मेनू

**9. 📞 Call me back**
Asks name, then preferred time:
```
तुम्हाला कोणती वेळ सोयीची आहे? 👇
```
List: आज | उद्या सकाळी | उद्या संध्याकाळी | या आठवड्यात | शनिवार / रविवार | आधी कॉल करा

**10. Reminders if the patient stops replying (inside 24 h only)**
After 2 h:
```
नमस्कार <name> 🙏 तुमच्या पायाच्या त्रासाबद्दल अजून काही प्रश्न आहे का?
पात्र रुग्णांसाठी लेझर ऑपरेशन सरकारी योजनेअंतर्गत मोफत होऊ शकते. तपासणीसाठी वेळ ठरवायची का?
```
Buttons: 📅 अपॉइंटमेंट | 🆓 मोफत योजना | 📞 कॉल हवा
After 20 h:
```
<name>, फुगलेल्या नसांकडे दुर्लक्ष केल्यास सूज व वेदना वाढू शकतात. वेळीच तपासणी केल्यास गुंतागुंत टाळता येते. 🙏
तुमच्यासाठी सोयीची वेळ ठरवूया का?
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल हवा | ☰ मेनू

**11. Typed question when AI is off (menu-only mode)**
```
तुमचा प्रश्न नोंदवला आहे 🙏 आमचे प्रतिनिधी तुम्हाला कॉल करून माहिती देतील.
तोपर्यंत खालील मेनूमधून पर्याय निवडू शकता.
```
Then the main menu.

**12. ⚠️ Emergency words (always, instantly)**
```
⚠️ हे गंभीर असू शकते. कृपया *लगेच 108 वर कॉल करा* किंवा जवळच्या हॉस्पिटलच्या इमर्जन्सी विभागात जा. उशीर करू नका.
```

---
## हिंदी (only if the patient asks)
**1. Welcome + main menu**
```
नमस्ते 🙏 हमारे वेरिकोज़ वेन्स (पैरों की नसें) क्लिनिक में आपका स्वागत है.
🆓 पात्र मरीज़ों के लिए सरकारी योजना में मुफ़्त इलाज.

हम कैसे मदद करें? 👇
```
Menu: 📅 अपॉइंटमेंट बुक करें | 🆓 योजना में मुफ़्त इलाज | 💉 इलाज कैसे होता है | 💰 खर्च और बीमा | 📞 मुझे कॉल करें | ❓ दूसरा सवाल

**2. 🆓 Free treatment under scheme**
```
🆓 *सरकारी योजना में मुफ़्त इलाज*
पात्र मरीज़ों के लिए लेज़र इलाज, भर्ती और दवाइयां मुफ़्त हो सकती हैं. योजना के कागज़ात हमारी टीम करती है.
क्या आपके पास आयुष्मान भारत / MJPJAY कार्ड है?
```
Buttons: ✅ कार्ड है | ❓ पता नहीं | 📅 अपॉइंटमेंट

**3. 💉 How treatment works**
```
*इलाज* 💉
• जांच + कलर डॉप्लर
• ज़रूरत हो तो डे-केयर लेज़र इलाज: छोटा छेद, टांके नहीं
• ज़्यादातर मरीज़ उसी या अगले दिन घर जाते हैं
🆓 पात्र मरीज़ों के लिए सरकारी योजना में मुफ़्त.
```
Buttons: 📅 अपॉइंटमेंट | 🆓 मुफ़्त योजना | ☰ मेनू

**4. 💰 Cost & insurance**
```
*खर्च* 💰
• 🆓 पात्र मरीज़ों के लिए सरकारी योजना में इलाज मुफ़्त
• ज़्यादातर हेल्थ इंश्योरेंस में कवर
• सही खर्च जांच के बाद बताया जाता है
```
Buttons: 📅 अपॉइंटमेंट | 🆓 मुफ़्त योजना | 📞 कॉल करें

**5. ❓ Other question**
```
ज़रूर 🙏 अपना सवाल टाइप करें.
```

**6. If asked for address / doctor / hospital / phone (menu or AI)**
```
📞 पता और बाकी सारी जानकारी हमारे प्रतिनिधि आपको कॉल करके बताएंगे.
```
Buttons: 📞 कॉल करें | 📅 अपॉइंटमेंट | ☰ मेनू

**7. Scheme answer → then booking starts**
If ✅ card:
```
बढ़िया! 👍 जांच के लिए आते समय योजना का कार्ड, आधार कार्ड और राशन कार्ड साथ लाएं. हमारी टीम योजना की प्रक्रिया में मदद करेगी.
```
If ❓ not sure:
```
कोई बात नहीं 🙏 हमारी टीम आपकी पात्रता जांचेगी. जांच के लिए आते समय आधार कार्ड और राशन कार्ड साथ लाएं.
```

**8. 📅 Booking (one question at a time; known answers are skipped)**
a) Problem
```
आपको पैर में कौन सी तकलीफ़ है? 👇
```
List: वेरिकोज़ वेन्स | कोई और तकलीफ़
b) How long
```
यह तकलीफ़ कब से है?
```
Buttons: 6 महीने से कम | 6 महीने – 2 साल | 2 साल से ज़्यादा
c) Name
```
अपॉइंटमेंट के लिए कृपया मरीज़ का *नाम* टाइप करें.
```
d) City
```
आप किस शहर / इलाके से हैं?
```
e) Day → morning/evening → time (from the clinic hours in `schedule`, ⚠️ example hours)
```
📅 जांच के लिए कौन सा दिन ठीक रहेगा? 👇
```
```
<day>: सुबह या शाम?
```
```
<day>: कौन सा समय? 👇
```
f) Confirm
```
कृपया जानकारी जांच लें ✅
• नाम: …
• सही समय: …
क्या यह सही है?
```
Buttons: ✅ सही है | ✏️ बदलें
g) Done
```
धन्यवाद, <name>! 🙏
हमारी क्लिनिक टीम जल्द ही आपको कॉल करके अपॉइंटमेंट पक्की करेगी.
```
Buttons: ☰ मेनू

**9. 📞 Call me back**
Asks name, then preferred time:
```
आपके लिए कौन सा समय सही रहेगा? 👇
```
List: आज | कल सुबह | कल शाम | इस हफ़्ते | शनिवार / रविवार | पहले कॉल करें

**10. Reminders if the patient stops replying (inside 24 h only)**
After 2 h:
```
नमस्ते <name> 🙏 पैरों की तकलीफ़ के बारे में कोई और सवाल है?
पात्र मरीज़ों के लिए लेज़र ऑपरेशन सरकारी योजना में मुफ़्त हो सकता है. जांच का समय तय करें?
```
Buttons: 📅 अपॉइंटमेंट | 🆓 मुफ़्त योजना | 📞 कॉल करें
After 20 h:
```
<name>, उभरी नसों को नज़रअंदाज़ करने से सूजन और दर्द बढ़ सकता है. समय पर जांच से जटिलताएं टाली जा सकती हैं. 🙏
आपके लिए सही समय तय करें?
```
Buttons: 📅 अपॉइंटमेंट | 📞 कॉल करें | ☰ मेनू

**11. Typed question when AI is off (menu-only mode)**
```
आपका सवाल दर्ज कर लिया गया है 🙏 हमारे प्रतिनिधि आपको कॉल करके जानकारी देंगे.
तब तक नीचे मेनू से विकल्प चुन सकते हैं.
```
Then the main menu.

**12. ⚠️ Emergency words (always, instantly)**
```
⚠️ यह गंभीर हो सकता है. कृपया *तुरंत 108 पर कॉल करें* या नज़दीकी अस्पताल के इमरजेंसी विभाग में जाएं. देर न करें.
```

---
## English (only if the patient asks)
**1. Welcome + main menu**
```
Hello 🙏 Welcome to our varicose veins (leg veins) clinic.
🆓 Free treatment for eligible patients under government schemes.

How can we help? 👇
```
Menu: 📅 Book appointment | 🆓 Free under govt scheme | 💉 How treatment works | 💰 Cost & insurance | 📞 Call me back | ❓ Other question

**2. 🆓 Free treatment under scheme**
```
🆓 *Free treatment under government schemes*
For eligible patients, laser treatment, admission and medicines can be free. Our team handles the scheme paperwork.
Do you have an Ayushman Bharat / MJPJAY card?
```
Buttons: ✅ I have a card | ❓ Not sure | 📅 Book

**3. 💉 How treatment works**
```
*Treatment* 💉
• Check-up + Colour Doppler
• If needed: day-care laser treatment, small puncture, no stitches
• Most patients go home the same or next day
🆓 Free for eligible patients under government schemes.
```
Buttons: 📅 Book | 🆓 Free scheme | ☰ Menu

**4. 💰 Cost & insurance**
```
*Cost* 💰
• 🆓 Free for eligible patients under government schemes
• Usually covered by health insurance
• The exact cost is shared after the check-up
```
Buttons: 📅 Book | 🆓 Free scheme | 📞 Call me

**5. ❓ Other question**
```
Sure 🙏 Please type your question.
```

**6. If asked for address / doctor / hospital / phone (menu or AI)**
```
📞 Our representative will call you with the address and all other details.
```
Buttons: 📞 Call me | 📅 Book | ☰ Menu

**7. Scheme answer → then booking starts**
If ✅ card:
```
Great! 👍 Please bring your scheme card, Aadhaar card and ration card to the consultation. Our team will help complete the scheme process.
```
If ❓ not sure:
```
No problem 🙏 Our team will check your eligibility. Please bring your Aadhaar card and ration card to the consultation.
```

**8. 📅 Booking (one question at a time; known answers are skipped)**
a) Problem
```
What problem are you facing? 👇
```
List: Varicose veins | Other problem
b) How long
```
How long have you had this?
```
Buttons: Under 6 months | 6 months – 2 years | Over 2 years
c) Name
```
For the appointment, please type the patient's *name*.
```
d) City
```
Which city / area are you from?
```
e) Day → morning/evening → time (from the clinic hours in `schedule`, ⚠️ example hours)
```
📅 Which day suits you for the consultation? 👇
```
```
<day>: morning or evening?
```
```
<day>: which time? 👇
```
f) Confirm
```
Please check the details ✅
• Name: …
• Preferred time: …
Is this correct?
```
Buttons: ✅ Correct | ✏️ Change
g) Done
```
Thank you, <name>! 🙏
Our clinic team will call you soon to confirm the appointment.
```
Buttons: ☰ Menu

**9. 📞 Call me back**
Asks name, then preferred time:
```
Which time suits you? 👇
```
List: Today | Tomorrow morning | Tomorrow evening | This week | Weekend | Call me first

**10. Reminders if the patient stops replying (inside 24 h only)**
After 2 h:
```
Hello <name> 🙏 Any other questions about your leg problem?
For eligible patients, the laser procedure can be free under government schemes. Shall we fix a check-up time?
```
Buttons: 📅 Book | 🆓 Free scheme | 📞 Call me
After 20 h:
```
<name>, If ignored, varicose veins can lead to more swelling and pain. An early check-up helps avoid complications. 🙏
Shall we fix a convenient time?
```
Buttons: 📅 Book | 📞 Call me | ☰ Menu

**11. Typed question when AI is off (menu-only mode)**
```
Your question has been noted 🙏 Our representative will call you with the details.
Meanwhile, you can choose from the menu below.
```
Then the main menu.

**12. ⚠️ Emergency words (always, instantly)**
```
⚠️ This could be serious. Please *call 108 immediately* or go to the nearest hospital emergency department. Don't wait.
```

