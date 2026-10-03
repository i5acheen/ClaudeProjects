/**
 * ============================================================================
 *  SITE CONTENT & SETTINGS: the ONLY file you need to edit.
 * ============================================================================
 *
 *  Everything in [SQUARE BRACKETS] is a placeholder you still need to fill in.
 *  Search this file for "[" to find them all (see also the checklist in
 *  README.md).
 *
 *  Icons: the `icon` values are Lucide icon names (https://lucide.dev/icons).
 *  Use the PascalCase name, e.g. "MessageCircle", "CalendarCheck".
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// 1. Business & contact details
// ---------------------------------------------------------------------------
export const business = {
  name: "autonest",
  owner: "Shubham Zanwar",
  city: "Pune",
  region: "Maharashtra",
  country: "IN",
  serviceArea: "Pune and remote across India",

  /** Digits only, with country code, no "+" or spaces. e.g. "919876543210" */
  whatsappNumber: "917745804546",
  /** How the number is shown on the page, e.g. "+91 98765 43210" */
  phoneDisplay: "+91 77458 04546",
  /** Pre-filled message when someone taps a WhatsApp button */
  whatsappMessage:
    "Hi! I found your website. I'd like to know how automation could help my business.",

  email: "sacheen501@gmail.com",

  /**
   * Your discovery-call booking link (Cal.com, Calendly, Google Calendar
   * appointment page...). Must start with https://
   * While this is not a real link, "Book a call" buttons open WhatsApp instead.
   */
  bookingUrl:
    "https://calendar.google.com/calendar/u/0?cid=ZDc1YzIyNWYxNDI0YWMyZWYwODhmZjVhOTU1ODM1MmU0NTlhMGIyZDVjODBhYWNkZTFjYTVhYTlmMDE1NzhlY0Bncm91cC5jYWxlbmRhci5nb29nbGUuY29t",
};

// ---------------------------------------------------------------------------
// 2. Website address & SEO
// ---------------------------------------------------------------------------
export const seo = {
  /** Your final domain, with https:// and NO trailing slash. */
  siteUrl: "https://bhaghyashreeprovision.co.in",
  title: `AI & WhatsApp Automation Services in Pune | ${business.name}`,
  description:
    "AI automation services in Pune for small businesses across India. WhatsApp chatbots, automatic follow-ups and business process automation that win you more leads and save hours every week.",
  keywords: [
    "AI automation services Pune",
    "WhatsApp chatbot for business Pune",
    "business process automation India",
    "workflow automation Pune",
    "WhatsApp automation for small business",
  ],
  /** Social-share image in /public (1200×630). */
  ogImage: "/og-image.png",
  /** Locale for Open Graph */
  locale: "en_IN",
};

// ---------------------------------------------------------------------------
// 3. Contact form
// ---------------------------------------------------------------------------
//  Option A (default): Web3Forms. Free, no account dashboard needed.
//    1. Go to https://web3forms.com, enter the email where you want enquiries.
//    2. Paste the "Access Key" they email you below.
//  Option B: Formspree. Set provider to "formspree" and paste your form
//    endpoint (looks like https://formspree.io/f/abcdwxyz).
// ---------------------------------------------------------------------------
export const form = {
  provider: "web3forms" as "web3forms" | "formspree",
  web3formsAccessKey: "[YOUR_WEB3FORMS_ACCESS_KEY]",
  formspreeEndpoint: "https://formspree.io/f/[YOUR_FORM_ID]",
  /** Subject line of the email you receive */
  emailSubject: "New website enquiry",
};

// ---------------------------------------------------------------------------
// 4. Navigation
// ---------------------------------------------------------------------------
export const nav = [
  { label: "Services", href: "/#solutions" },
  { label: "How it works", href: "/#how" },
  { label: "Calculator", href: "/#calculator" },
  { label: "Pricing", href: "/#pricing" },
  { label: "About", href: "/#about" },
  { label: "FAQ", href: "/#faq" },
];

// ---------------------------------------------------------------------------
// 5. Page content
// ---------------------------------------------------------------------------
export const hero = {
  eyebrow: "AI & workflow automation · Pune & across India",
  headline: "Stop losing customers to slow replies and manual work.",
  subhead:
    "Tell us what's slowing your business down, and we'll build an AI workflow that fixes it, so every enquiry gets a reply, every follow-up goes out, and you get your evenings back.",
  primaryCta: "Chat on WhatsApp",
  secondaryCta: "Book a free 20-min call",
  reassurance: ["No technical knowledge needed", "Fixed-price quotes", "Works with WhatsApp & Google Sheets"],
  /** Illustrative chat shown in the hero (clearly captioned as an example). from: "customer" | "bot" */
  chatExample: {
    caption: "Example of an automatic WhatsApp reply, sent late at night while you are off duty.",
    messages: [
      { from: "customer", time: "11:42 pm", text: "Hi, are you open on Sunday? How much for a consultation?" },
      { from: "bot", time: "11:42 pm", text: "Hi! 👋 Yes, we're open Sunday 10 am – 2 pm. A consultation is ₹500. Shall I book a slot for you?" },
      { from: "customer", time: "11:43 pm", text: "Yes, 11 am please" },
      { from: "bot", time: "11:43 pm", text: "Done ✅ You're booked for Sunday, 11 am. I'll send you a reminder that morning." },
    ],
  },
};

export const problems = {
  title: "Sound familiar?",
  intro: "Most small businesses don't need “more AI”. They need these everyday headaches to go away.",
  items: [
    {
      icon: "MessageCircleX",
      title: "Enquiries slip through the cracks",
      text: "A message comes in on WhatsApp, Instagram or your website while you're busy. By the time you reply, they've gone to someone else.",
    },
    {
      icon: "Repeat",
      title: "The same questions, all day long",
      text: "Price? Timings? Location? “Is my order ready?” You or your staff answer them again and again instead of doing real work.",
    },
    {
      icon: "BellOff",
      title: "Follow-ups that never happen",
      text: "Appointment reminders, payment nudges, review requests. Everyone means to send them, but on a busy day they're the first thing to go.",
    },
    {
      icon: "ClipboardPen",
      title: "Copy-paste, all week",
      text: "Details from chats and forms get typed into Excel or a CRM by hand. It's slow and boring, and mistakes creep in.",
    },
    {
      icon: "FolderClock",
      title: "Admin & HR eating your day",
      text: "Onboarding new staff, answering leave queries, putting together the weekly report: necessary work that eats hours you don't have.",
    },
  ],
};

export const solutions = {
  title: "What we build",
  intro: "Simple, reliable workflows that plug into the tools you already use. Each one fixes a specific problem.",
  items: [
    {
      icon: "MessageCircle",
      title: "WhatsApp lead bot",
      text: "Replies to every new enquiry within seconds, day or night. It asks the right questions, shares the details people need, and passes serious leads to you or books them in.",
      outcome: "More enquiries turn into customers, even after hours.",
    },
    {
      icon: "MessagesSquare",
      title: "FAQ assistant",
      text: "Answers common questions about prices, timings, location and order status on WhatsApp or your website, in your tone, using your information. It hands over to a person when it isn't sure.",
      outcome: "Your team stops repeating itself and focuses on paying customers.",
    },
    {
      icon: "BellRing",
      title: "Automatic reminders & follow-ups",
      text: "Sends appointment reminders, payment nudges, renewal alerts and review requests at the right time, without anyone having to remember.",
      outcome: "Fewer no-shows, faster payments and more reviews.",
    },
    {
      icon: "Sheet",
      title: "Form-to-sheet & CRM pipelines",
      text: "Captures details from WhatsApp chats, website forms and Google Forms and puts them straight into Google Sheets, Excel or your CRM, neatly organised.",
      outcome: "No more copy-paste and no lost leads. You get a clean list you can actually use.",
    },
    {
      icon: "Users",
      title: "HR & admin automation",
      text: "Handles onboarding checklists, leave queries, document collection and recurring reports, so your managers aren't chasing paperwork.",
      outcome: "Hours back every week for you and your team.",
    },
  ],
};

export const audience = {
  title: "Who it's for",
  intro: "Owners and managers of small and medium businesses who are tired of doing the same tasks by hand.",
  items: [
    { icon: "Stethoscope", label: "Clinics & doctors" },
    { icon: "Scissors", label: "Salons & spas" },
    { icon: "GraduationCap", label: "Coaching classes" },
    { icon: "Calculator", label: "CA & tax firms" },
    { icon: "House", label: "Real estate agents" },
    { icon: "Store", label: "Retailers & shops" },
    { icon: "Building2", label: "Companies with 20–200 staff" },
  ],
  more: "…and many more. If it's repetitive, we can probably automate it.",
};

export const steps = {
  title: "How it works",
  intro: "A simple, no-pressure process. You always know what you're getting and what it costs before we start.",
  items: [
    {
      icon: "PhoneCall",
      title: "Free discovery call",
      text: "A 20-minute chat about what's slowing you down. We'll tell you honestly whether automation will help.",
    },
    {
      icon: "FileText",
      title: "One-page scope, fixed price",
      text: "You get a simple one-page plan: what we'll build, what it will do, the timeline and a fixed price. No surprises.",
    },
    {
      icon: "Hammer",
      title: "Build & demo",
      text: "We build it and show it working on your own WhatsApp, forms or sheets. You ask for changes before anything goes live.",
    },
    {
      icon: "LifeBuoy",
      title: "Handover + optional support",
      text: "We go live, walk your team through it and hand everything over. Want us to look after it? Add a monthly support plan.",
    },
  ],
};

export const calculator = {
  title: "How much are missed enquiries costing you?",
  intro: "Put in your own numbers. It takes 20 seconds.",
  disclaimer:
    "This is a rough estimate based only on the numbers you enter (and a 30-day month). It is not a guarantee of results.",
  defaults: {
    enquiriesPerDay: 10,
    unansweredPercent: 20,
    conversionPercent: 20,
    customerValue: 2000,
  },
  cta: "Fix this on WhatsApp",
};

export const proof = {
  title: "See it in action",
  intro: "Short demos of real workflows, so you can see exactly what your customers would experience.",
  /**
   * Add YouTube video IDs (the part after "v=" in the URL, e.g. "dQw4w9WgXcQ").
   * Leave the id as "" to show a placeholder box.
   */
  videos: [
    { id: "", title: "[ADD DEMO VIDEO 1: e.g. WhatsApp lead bot demo]" },
    { id: "", title: "[ADD DEMO VIDEO 2: e.g. Automatic appointment reminders]" },
  ],
  caseStudy: {
    label: "Case study",
    business: "[ADD CLIENT BUSINESS TYPE & CITY, with permission]",
    problem: "[ADD THE REAL PROBLEM THE CLIENT HAD]",
    solution: "[ADD WHAT YOU BUILT]",
    result: "[ADD REAL, MEASURED RESULT. Do not estimate.]",
  },
  testimonial: {
    quote: "[ADD REAL TESTIMONIAL WITH CLIENT PERMISSION]",
    author: "[CLIENT NAME, BUSINESS]",
  },
};

export const pricing = {
  title: "Simple, honest pricing",
  intro: "Every business is different, so we don't use one-size-fits-all packages. Here's how it works:",
  items: [
    {
      icon: "PackageCheck",
      title: "Ready-made workflows",
      tag: "Fixed price",
      text: "Proven setups such as a WhatsApp enquiry bot or automatic appointment reminders, adapted to your business. You know the price upfront.",
    },
    {
      icon: "PencilRuler",
      title: "Custom builds",
      tag: "Quoted after a free call",
      text: "Need something built around how you work? We'll understand it on a call and send a fixed quote in a one-page scope.",
    },
    {
      icon: "ShieldCheck",
      title: "Monthly support",
      tag: "Optional",
      text: "We keep an eye on things, fix issues and make small changes, like new prices or timings, so you don't have to.",
    },
  ],
  note: "If a tool needs its own subscription or usage fees (for example, the official WhatsApp Business API), we'll tell you clearly before you commit.",
  cta: "Get a free quote",
};

export const about = {
  title: `Hi, I'm ${business.owner}`,
  /** Put your photo in /public (e.g. /public/photo.jpg) and set "/photo.jpg". Leave "" for a placeholder. */
  photo: "",
  paragraphs: [
    "I spent around six years in HR and business operations at multinational companies, working with enterprise systems like Workday, SAP SuccessFactors and Oracle HCM. That's where I learned how processes really run day to day, and how much of the work is repetitive.",
    "As a Six Sigma Green Belt with an MBA, I look at your process first and the technology second. Today I build AI agents and automations, including WhatsApp bots, Microsoft Copilot Studio agents and workflow automations, for small and medium businesses in Pune and across India.",
  ],
  credentials: [
    { icon: "Briefcase", label: "~6 years in HR & business operations at MNCs" },
    { icon: "Award", label: "Six Sigma Green Belt" },
    { icon: "GraduationCap", label: "MBA" },
    { icon: "Layers", label: "Workday · SAP SuccessFactors · Oracle HCM" },
    { icon: "MapPin", label: "Based in Pune, Maharashtra" },
  ],
};

export const faq = {
  title: "Questions people usually ask",
  items: [
    {
      q: "Do I need any technical knowledge?",
      a: "No. You explain how things work today in plain language, and we handle the setup. At handover we walk you and your team through it and give you simple notes. If you can use WhatsApp and Google Sheets, you can use what we build.",
    },
    {
      q: "Which tools do you use?",
      a: "It depends on what you already use and your budget. We prefer working with tools you already have. Common ones include WhatsApp Business and the official WhatsApp Business API, Google Sheets and Forms, Microsoft 365 and Copilot Studio, Excel, CRMs, and automation platforms such as [ADD THE PLATFORMS YOU USE, e.g. Make / n8n / Zapier].",
    },
    {
      q: "Is my customer data safe?",
      a: "We only access the data a workflow needs, we never sell or share it, and we use official, reputable tools. Wherever possible, accounts are set up in your business's name so you stay in control. [ADD SPECIFICS: where data is stored, whether you sign an NDA, how access is removed after handover.]",
    },
    {
      q: "How long does a build take?",
      a: "It depends on the scope. Ready-made workflows are quicker than custom builds. Your one-page scope states the exact timeline before you commit. [ADD YOUR TYPICAL TIMELINES, e.g. “X–Y working days for a ready-made workflow”.]",
    },
    {
      q: "What if something breaks?",
      a: "Every build includes [ADD YOUR FIX PERIOD, e.g. 30 days] of fixes after go-live. After that, you can choose a monthly support plan or ask for help as and when you need it. We also design workflows to hand over to a person when they aren't sure, so customers are never left stuck.",
    },
    {
      q: "Will my customers feel like they're talking to a robot?",
      a: "We write replies in your tone and keep them short and helpful. Customers can always reach a real person, and you can step into any conversation at any time.",
    },
    {
      q: "Do you work outside Pune?",
      a: "Yes. We're based in Pune and can meet in person locally, and we work with businesses across India remotely over calls, screen-share and WhatsApp.",
    },
  ],
};

export const finalCta = {
  title: "Tell us what's slowing you down.",
  text: "One message is all it takes. We'll reply personally and tell you honestly if, and how, we can help.",
};

export const contact = {
  title: "Get in touch",
  intro: "Prefer to write it down? Send a quick note and we'll get back to you within 3 hours.",
  formTitle: "Send an enquiry",
  successMessage: "Thank you! Your message has been sent. We'll get back to you soon.",
  errorMessage: "Sorry, something went wrong. Please message us on WhatsApp instead.",
};

export const footer = {
  blurb: "AI & workflow automation for small and medium businesses. Based in Pune, working across India.",
};

export const privacy = {
  /** Date you last reviewed the policy, e.g. "1 November 2026" */
  lastUpdated: "[DATE]",
  /** How long you keep enquiry data, e.g. "12 months" */
  retentionPeriod: "[RETENTION PERIOD, e.g. 12 months]",
  /** Person handling privacy questions (often you) */
  grievanceOfficer: business.owner,
};

// ---------------------------------------------------------------------------
// Helpers (no need to edit below this line)
// ---------------------------------------------------------------------------
export const whatsappLink = (message: string = business.whatsappMessage) =>
  `https://wa.me/${business.whatsappNumber}?text=${encodeURIComponent(message)}`;

export const hasBookingLink = /^https?:\/\//.test(business.bookingUrl);

/** Booking link, or a WhatsApp message asking for a call if no link is set yet. */
export const bookingLink = hasBookingLink
  ? business.bookingUrl
  : whatsappLink("Hi! I'd like to book a free 20-minute discovery call. When are you available?");
