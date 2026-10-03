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
  web3formsAccessKey: "17953a73-9537-4ee5-94f2-0d5fda1f65c5",
  formspreeEndpoint: "https://formspree.io/f/[YOUR_FORM_ID]",
  /** Subject line of the email you receive */
  emailSubject: "New website enquiry",
};

// ---------------------------------------------------------------------------
// 4. Navigation
// ---------------------------------------------------------------------------
export const nav = [
  { label: "Services", href: "/#services" },
  { label: "How it works", href: "/#how" },
  { label: "Calculator", href: "/#calculator" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Why us", href: "/#about" },
  { label: "FAQ", href: "/#faq" },
];

// ---------------------------------------------------------------------------
// 5. Page content
// ---------------------------------------------------------------------------
export const hero = {
  eyebrow: "AI & WhatsApp automation · Pune & across India",
  /** The part of the headline inside {curly braces} is highlighted. */
  headline: "Stop losing customers to {slow replies} and manual work.",
  subhead:
    "We build simple AI workflows that answer every enquiry, send every follow-up and end the copy-paste, so you can focus on the business.",
  primaryCta: "Chat on WhatsApp",
  secondaryCta: "Book a free 20-min call",
  reassurance: ["No tech skills needed", "Fixed-price quotes", "Works with WhatsApp & Sheets"],
  /** Illustrative chat shown in the hero (clearly captioned as an example). from: "customer" | "bot" */
  chatExample: {
    caption: "Example: an automatic reply at 11:42 pm",
    messages: [
      { from: "customer", time: "11:42 pm", text: "Hi, are you open Sunday? Price for a consultation?" },
      { from: "bot", time: "11:42 pm", text: "Hi! 👋 Yes, 10 am – 2 pm. A consultation is ₹500. Shall I book you in?" },
      { from: "customer", time: "11:43 pm", text: "Yes, 11 am please" },
      { from: "bot", time: "11:43 pm", text: "Done ✅ Booked for Sunday, 11 am. I'll remind you that morning." },
    ],
  },
};

/** Business types shown in the scrolling strip under the hero. */
export const audience = {
  label: "Built for",
  items: [
    { icon: "Stethoscope", label: "Clinics" },
    { icon: "Scissors", label: "Salons & spas" },
    { icon: "GraduationCap", label: "Coaching classes" },
    { icon: "Calculator", label: "CA firms" },
    { icon: "House", label: "Real estate" },
    { icon: "Store", label: "Retail shops" },
    { icon: "Building2", label: "Growing companies" },
  ],
};

/** Each card: the everyday problem → what we build → the outcome. */
export const services = {
  eyebrow: "What we automate",
  title: "WhatsApp & workflow automation for everyday business headaches",
  items: [
    {
      icon: "MessageCircle",
      problem: "Missed enquiries",
      title: "WhatsApp lead bot",
      text: "Replies to every enquiry in seconds, 24×7, and books serious leads straight in.",
      outcome: "More enquiries become customers",
    },
    {
      icon: "MessagesSquare",
      problem: "Same questions all day",
      title: "FAQ assistant",
      text: "Answers prices, timings and order status in your tone, and hands over when unsure.",
      outcome: "Your team stops repeating itself",
    },
    {
      icon: "BellRing",
      problem: "Forgotten follow-ups",
      title: "Reminders & follow-ups",
      text: "Appointment reminders, payment nudges and review requests, sent on time, automatically.",
      outcome: "Fewer no-shows, faster payments",
    },
    {
      icon: "Sheet",
      problem: "Manual data entry",
      title: "Forms → Sheets & CRM",
      text: "Details from chats and forms land neatly in Google Sheets, Excel or your CRM.",
      outcome: "No copy-paste, no lost leads",
    },
    {
      icon: "Users",
      problem: "Admin & HR overload",
      title: "HR & admin automation",
      text: "Onboarding, leave queries, document collection and weekly reports, handled.",
      outcome: "Hours back every week",
    },
  ],
  more: { title: "Something else slowing you down?", text: "If it's repetitive, we can probably automate it.", cta: "Tell us about it" },
};

export const steps = {
  eyebrow: "How it works",
  title: "From first chat to live in four simple steps",
  items: [
    { icon: "PhoneCall", title: "Free 20-min call", text: "Tell us what's slowing you down." },
    { icon: "FileText", title: "Fixed-price scope", text: "A one-page plan. No surprises." },
    { icon: "Hammer", title: "Build & demo", text: "See it working before go-live." },
    { icon: "Rocket", title: "Launch & support", text: "Handover, plus optional monthly care." },
  ],
};

export const calculator = {
  title: "What are missed enquiries costing you?",
  intro: "Enter your own numbers. It takes 20 seconds.",
  disclaimer: "Rough estimate based only on your numbers and a 30-day month. Not a guarantee of results.",
  defaults: {
    enquiriesPerDay: 10,
    unansweredPercent: 20,
    conversionPercent: 20,
    customerValue: 2000,
  },
  cta: "Fix this on WhatsApp",
};

/**
 * Demos & proof. This section stays HIDDEN until you add at least one real
 * video ID, or fill in the case study / testimonial. Never add made-up results.
 */
export const proof = {
  title: "See it in action",
  /** YouTube video IDs (the part after "v=" in the URL). Leave "" to skip. */
  videos: [
    { id: "", title: "WhatsApp lead bot demo" },
    { id: "", title: "Automatic appointment reminders" },
  ],
  caseStudy: {
    business: "",
    problem: "",
    solution: "",
    result: "",
  },
  testimonial: {
    quote: "",
    author: "",
  },
};

export const pricing = {
  eyebrow: "Pricing",
  title: "Simple, honest pricing",
  items: [
    { icon: "PackageCheck", title: "Ready-made workflows", tag: "Fixed price", text: "Proven setups, adapted to your business." },
    { icon: "PencilRuler", title: "Custom builds", tag: "Quoted after a free call", text: "Built around how you actually work." },
    { icon: "ShieldCheck", title: "Monthly support", tag: "Optional", text: "Fixes, tweaks and updates, handled." },
  ],
  note: "Any third-party fees (e.g. the official WhatsApp Business API) are shown upfront.",
  cta: "Get a free quote",
};

export const about = {
  eyebrow: `Why ${business.name}`,
  title: "Process first. Technology second.",
  text: `${business.name} helps small and medium businesses in Pune and across India replace repetitive work with simple, reliable automation, using the tools you already have.`,
  values: [
    { icon: "Workflow", title: "Process first" },
    { icon: "Plug", title: "Works with your tools" },
    { icon: "FileText", title: "Plain English, fixed prices" },
    { icon: "MapPin", title: "Pune-based, India-wide" },
  ],
};

export const faq = {
  eyebrow: "FAQ",
  title: "Questions, answered",
  items: [
    {
      q: "Do I need any technical knowledge?",
      a: "No. You explain how things work today, we handle the setup, and we walk your team through it at handover.",
    },
    {
      q: "Which tools do you use?",
      a: "Mostly what you already have: WhatsApp Business (including the official API), Google Sheets & Forms, Excel, Microsoft 365, Copilot Studio and popular CRMs.",
    },
    {
      q: "Is my customer data safe?",
      a: "We only access what a workflow needs, never sell or share data, and set accounts up in your business's name wherever possible.",
    },
    {
      q: "How long does a build take?",
      a: "It depends on scope. Ready-made workflows are quickest, and your one-page scope states the exact timeline before you commit.",
    },
    {
      q: "What if something breaks?",
      a: "Fixes after go-live are included for the period in your scope. After that, choose monthly support or pay as you go.",
    },
    {
      q: "Do you work outside Pune?",
      a: "Yes. We meet in person in Pune and work remotely with businesses across India.",
    },
  ],
};

export const contact = {
  eyebrow: "Contact",
  title: "Tell us what's slowing you down.",
  intro: "Send a message and we'll reply within 3 hours.",
  formTitle: "Send an enquiry",
  successMessage: "Thank you! Your message has been sent. We'll get back to you soon.",
  errorMessage: "Sorry, something went wrong. Please message us on WhatsApp instead.",
};

export const footer = {
  blurb: "AI & WhatsApp automation for small and medium businesses. Based in Pune, working across India.",
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
