/**
 * Code-level guardrails (CLAUDE.md §7 "Hard guardrails"). These run regardless of
 * what the prompt says: input checks before the model, output checks after it.
 * Matching is on lower-cased text; Devanagari is matched as-is.
 */

export const EMERGENCY_TERMS = [
  "chest pain", "heart attack", "unconscious", "not breathing", "can't breathe", "cannot breathe", "bleeding", "blood loss",
  "fainted", "seizure", "fits", "stroke", "paralysis", "poison", "suicide", "accident", "severe pain",
  "छातीत दुखणे", "छातीत दुखत", "बेशुद्ध", "श्वास घेता येत नाही", "रक्तस्त्राव", "रक्त जात", "झटके", "अपघात", "विष",
  "सीने में दर्द", "छाती में दर्द", "बेहोश", "सांस नहीं", "खून बह", "दौरा पड़", "दुर्घटना", "ज़हर", "जहर", "आत्महत्या",
  "chhati me dard", "seene me dard", "behosh", "khoon",
];

export const HUMAN_REQUEST_TERMS = [
  "talk to a person", "talk to person", "talk to human", "real person", "human", "call me", "agent", "coordinator", "speak to someone",
  "माणसाशी बोल", "व्यक्तीशी बोल", "फोन करा", "कॉल करा", "समन्वयक",
  "इंसान से बात", "किसी से बात", "व्यक्ति से बात", "फोन करो", "कॉल करो", "कॉल कीजिए",
  "insaan se baat", "kisi se baat", "call karo", "phone karo",
];

export const ANGER_TERMS = [
  "fraud", "cheat", "scam", "useless", "idiot", "stupid", "complaint", "police", "consumer court",
  "फसवणूक", "फसवे", "बकवास", "धोखा", "धोखेबाज़", "धोखेबाज", "शिकायत", "पुलिस", "पोलीस", "बेकार", "चोर",
];

export const MEDICAL_QUESTION_TERMS = [
  "which medicine", "what medicine", "tablet", "dose", "dosage", "side effect", "is it cancer", "report says", "my report",
  "should i take", "diagnose", "diagnosis", "operation risk", "surgery risk",
  "कोणते औषध", "कुठले औषध", "गोळी", "रिपोर्ट मध्ये", "रिपोर्टमध्ये", "कॅन्सर",
  "कौन सी दवा", "कौनसी दवा", "दवाई", "गोली", "रिपोर्ट में", "कैंसर",
];

export const MONEY_TERMS = [
  "how much", "cost", "price", "fees", "fee", "charges", "pay", "payment", "deposit", "rupees", "rs.", "₹",
  "किती पैसे", "खर्च", "पैसे लागतील", "फी", "कितने पैसे", "खर्चा", "पैसा", "फीस",
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Latin terms match on word boundaries ("fee" must not match "feel"); Devanagari terms match as substrings. */
function includesAny(text: string, terms: string[]): string | null {
  const t = text.toLowerCase();
  for (const term of terms) {
    if (/^[a-z0-9' .-]+$/.test(term)) {
      if (new RegExp(`(^|[^a-z])${escape(term)}($|[^a-z])`).test(t)) return term;
    } else if (t.includes(term)) return term;
  }
  return null;
}

export type InputCheck = {
  emergency: boolean;
  wantsHuman: boolean;
  angry: boolean;
  medicalQuestion: boolean;
  moneyQuestion: boolean;
};

export function checkInput(text: string | null | undefined): InputCheck {
  const t = text ?? "";
  return {
    emergency: !!includesAny(t, EMERGENCY_TERMS),
    wantsHuman: !!includesAny(t, HUMAN_REQUEST_TERMS),
    angry: !!includesAny(t, ANGER_TERMS),
    medicalQuestion: !!includesAny(t, MEDICAL_QUESTION_TERMS),
    moneyQuestion: !!includesAny(t, MONEY_TERMS),
  };
}

/** Output checks: block medicine names, dosages, prices and guarantee phrases. */
const MEDICINE_NAMES = [
  "paracetamol", "crocin", "dolo", "ibuprofen", "aspirin", "diclofenac", "thyroxine", "levothyroxine", "thyronorm", "eltroxin",
  "carbimazole", "methimazole", "neomercazole", "pregabalin", "gabapentin", "tramadol", "antibiotic", "amoxicillin", "azithromycin",
  "daflon", "diosmin", "heparin", "warfarin", "steroid", "prednisolone", "metformin", "insulin", "painkiller", "pain killer",
  "पॅरासिटामॉल", "पेरासिटामोल", "क्रोसिन", "डोलो", "थायरॉक्सिन", "एंटीबायोटिक", "अँटीबायोटिक", "पेनकिलर", "स्टेरॉइड",
];
const DOSAGE = /\b\d+(\.\d+)?\s?(mg|mcg|µg|ml|iu|units?|tablets?|tabs?|capsules?)\b|\b(once|twice|thrice)\s+(a|per)\s+day\b|दिवसातून\s*\S+\s*वेळा|दिन में\s*\S+\s*बार/i;
const PRICE = /(₹|rs\.?|inr|rupees?|रुपये|रुपए|रु\.)\s?\d|\d[\d,]*\s?(₹|rs\.?|rupees?|रुपये|रुपए|रु\.)/i;
const GUARANTEE = [
  "guarantee", "guaranteed", "100%", "definitely free", "surely free", "will be completely free", "promise", "assured",
  "नक्की मोफत", "निश्चित मोफत", "हमखास", "खात्री देतो", "गॅरंटी", "गॅरेंटी", "पक्का मुफ्त", "ज़रूर मुफ्त", "जरूर मुफ्त", "गारंटी", "वादा",
];
const DIAGNOSIS = [
  "you have cancer", "it is cancer", "your report shows", "you need surgery", "you need an operation",
  "तुम्हाला कॅन्सर", "आपल्याला कॅन्सर आहे", "आपको कैंसर है", "आपकी रिपोर्ट में",
];

export type OutputFlag = "medicine" | "dosage" | "price" | "guarantee" | "diagnosis" | "markdown";

export function checkOutput(reply: string): OutputFlag[] {
  const flags: OutputFlag[] = [];
  const t = reply.toLowerCase();
  if (MEDICINE_NAMES.some((m) => t.includes(m))) flags.push("medicine");
  if (DOSAGE.test(reply)) flags.push("dosage");
  if (PRICE.test(reply)) flags.push("price");
  if (GUARANTEE.some((g) => t.includes(g))) flags.push("guarantee");
  if (DIAGNOSIS.some((d) => t.includes(d))) flags.push("diagnosis");
  if (/\*\*|^#{1,6}\s|```/m.test(reply)) flags.push("markdown");
  return flags;
}

/** Markdown is cosmetic: strip it rather than hand over. Everything else is blocking. */
export function isBlocking(flags: OutputFlag[]): boolean {
  return flags.some((f) => f !== "markdown");
}

export function stripMarkdown(reply: string): string {
  return reply.replace(/```[\s\S]*?```/g, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/^#{1,6}\s+/gm, "").trim();
}

export const FALLBACK_REPLY: Record<"mr" | "hi" | "en", string> = {
  mr: "आमचे समन्वयक लवकरच आपल्याला फोन करतील.",
  hi: "हमारे समन्वयक जल्द ही आपको फ़ोन करेंगे।",
  en: "Our coordinator will call you shortly.",
};

export const EMERGENCY_REPLY: Record<"mr" | "hi" | "en", string> = {
  mr: "हे तातडीचे वाटते. कृपया लगेच जवळच्या रुग्णालयात जा किंवा 108 वर फोन करा. आमचे समन्वयकही आपल्याशी संपर्क करतील.",
  hi: "यह आपातकालीन स्थिति लगती है। कृपया तुरंत नज़दीकी अस्पताल जाएँ या 108 पर फ़ोन करें। हमारे समन्वयक भी आपसे संपर्क करेंगे।",
  en: "This sounds urgent. Please go to the nearest hospital immediately or call 108. Our coordinator will also contact you.",
};

export const HANDOVER_REPLY: Record<"mr" | "hi" | "en", string> = {
  mr: "नक्की जी. आमचे समन्वयक लवकरच आपल्याला फोन करतील.",
  hi: "ज़रूर जी। हमारे समन्वयक जल्द ही आपको फ़ोन करेंगे।",
  en: "Sure. Our coordinator will call you shortly.",
};

/** Very small script-based language guess, used when the model is not consulted (emergency, handover). */
export function guessLanguage(text: string, fallback: "mr" | "hi" | "en" = "mr"): "mr" | "hi" | "en" {
  if (/[ऀ-ॿ]/.test(text)) {
    // Marathi-specific markers vs Hindi-specific markers
    const mr = (text.match(/आहे|नाही|मला|आपल्या|तुम्ही|का\?|करा|होते|ळ/g) ?? []).length;
    const hi = (text.match(/है|नहीं|मुझे|आप|कीजिए|करो|था|हूँ|हूं/g) ?? []).length;
    return hi > mr ? "hi" : "mr";
  }
  if (/[a-z]/i.test(text)) {
    const hinglish = /\b(hai|nahi|mujhe|kya|aap|karo|kaise|kitna|mera|meri)\b/i.test(text);
    const marathiLatin = /\b(aahe|nahi|mala|tumhi|kay|kasa|kiti|majha|mazi)\b/i.test(text);
    if (marathiLatin && !hinglish) return "mr";
    if (hinglish) return "hi";
    return "en";
  }
  return fallback;
}
