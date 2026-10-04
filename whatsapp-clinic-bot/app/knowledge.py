"""Pick only the relevant parts of clinic_info.md for each message, to keep prompts small."""

from __future__ import annotations

import re
from pathlib import Path

# Sections always sent (matched by heading prefix). Everything else is sent only when relevant.
CORE = ("## 1. Doctor", "### Qualifications", "## 2. Clinic location", "### Timings",
        "### Fees", "## 2b.")

# Heading prefix -> keywords (English, Romanized and Devanagari) that make the section relevant.
TOPICS: dict[str, tuple[str, ...]] = {
    "### Professional highlights": ("qualif", "degree", "experience", "hopkins", "doctor", "शिक्षण",
                                    "अनुभव", "डिग्री", "शिक्षा", "anubhav"),
    "### Other hospital": ("carewell", "jalna road", "other hospital", "दुसर", "केअरवेल", "mondha"),
    "### Practical details": ("parking", "walk", "bring", "document", "report", "पार्किंग", "कागद",
                              "रिपोर्ट", "appointment", "language"),
    "### 3.1 Varicose": ("varicose", "vein", "nas", "नस", "नसा", "laser", "लेझर", "लेजर", "glue",
                         "venaseal", "cost", "kharch", "खर्च", "किंमत", "fees", "price", "operation",
                         "ऑपरेशन", "surgery", "stocking", "recover", "doppler", "डॉपलर", "itch",
                         "cramp", "heavy", "फुग", "phug", "fugl", "insurance", "विमा", "recurr",
                         "prevent", "treatment", "upchar", "उपचार", "इलाज", "ilaj"),
    "### 3.2 Spider": ("spider", "स्पायडर", "small veins", "jalii", "जाळी"),
    "### 3.3 Leg swelling": ("swell", "sujan", "सूज", "सुज", "pain", "dukh", "दुख", "दर्द", "dard",
                             "vedana", "वेदना"),
    "### 3.4 Leg ulcer": ("ulcer", "wound", "jakham", "जखम", "घाव", "ghav", "अल्सर", "sore"),
    "### 3.5 Deep Vein": ("dvt", "clot", "thromb", "गाठ", "gath", "थ्रॉम्ब", "breath", "श्वास"),
    "### 3.6 Peripheral": ("pvd", "pad", "artery", "blockage", "claudication", "walking pain",
                           "चालताना", "chaltana", "angioplasty", "toe", "gangrene"),
    "### 3.7 Other services": ("dialysis", "fistula", "thyroid", "goiter", "varicocele", "cancer",
                               "tumor", "liver", "stroke", "carotid", "fibroid", "डायलिसिस",
                               "थायरॉईड", "कॅन्सर", "कैंसर", "पक्षाघात", "लकवा"),
    "## 4. Frequently asked": ("cost", "kharch", "खर्च", "insurance", "विमा", "scheme", "yojana",
                               "योजना", "ayushman", "come back", "recurr", "परत", "after care",
                               "stocking", "hospital", "admit", "stay", "दिवस", "video", "youtube"),
}


def _split(text: str) -> list[tuple[str, str]]:
    """Return [(heading_line, chunk_text)] split at ## and ### headings."""
    parts = re.split(r"(?m)^(?=#{2,3} )", text)
    return [(p.strip().splitlines()[0] if p.strip() else "", p) for p in parts if p.strip()]


def select_knowledge(full_text: str, query: str) -> str:
    """Core facts plus sections whose keywords appear in the query (recent messages + concern)."""
    q = query.lower()
    out = []
    chunks = _split(full_text)
    matched_topic = False
    for heading, chunk in chunks:
        if heading.startswith("# ") or heading.startswith(CORE):
            out.append(chunk)
            continue
        for prefix, words in TOPICS.items():
            if heading.startswith(prefix) and any(w in q for w in words):
                out.append(chunk)
                matched_topic = True
                break
    if not matched_topic:  # nothing specific asked yet: include the main specialty
        out += [c for h, c in chunks if h.startswith("### 3.1 Varicose")]
    return "".join(out)
