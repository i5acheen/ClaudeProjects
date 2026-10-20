import Link from "next/link";
import { InstallApp } from "@/components/app/InstallApp";
import { BabyIcon, BookIcon, CalendarIcon, ChecklistIcon, LockIcon, LogoMark, MailIcon, PaletteIcon, PrinterIcon, StarIcon } from "@/components/ui/Icons";
import { SignInButton } from "@/components/app/SignInButton";
import { SiteFooter } from "@/components/legal/SiteFooter";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { CoverPage, GuidedPage, MemoryPage } from "@/components/book/BookPages";
import { InkFilters } from "@/components/book/Doodles";
import { demoJournal } from "@/lib/demo-data";
import { APP_NAME, OVERVIEW, SIGN_IN_NOTE, TAGLINE, TAGLINE_HIGHLIGHT, TAGLINE_HINGLISH } from "@/content/marketing";

const ERRORS: Record<string, string> = {
  AccessDenied: "That Google account isn’t on the list of people allowed to open this book.",
  Configuration: "Google sign-in isn’t set up correctly yet — see the README.",
};

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string; deleted?: string }> }) {
  const { error, deleted } = await searchParams;
  const signInConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_SECRET);
  const session = signInConfigured ? await auth().catch(() => null) : null;
  if (session?.user) redirect("/book/write");

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/book/write" });
  }

  const startButton = (label: string, className: string) =>
    signInConfigured ? (
      <SignInButton action={signInWithGoogle} className={className}>
        <GoogleMark /> {label}
      </SignInButton>
    ) : (
      <a href="#setup-needed" className={`${className} opacity-60`}>
        <GoogleMark /> Sign in with Google
      </a>
    );

  return (
    <main className="home">
      <InkFilters />

      <div className="home-sky">
      <SkyDecor />
      <header className="home-nav">
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-[var(--home-ink)]">
          <LogoMark className="size-9" />
          {APP_NAME}
        </Link>
        <nav aria-label="On this page" className="hidden items-center gap-7 text-[0.95rem] text-[var(--home-soft)] md:flex">
          <a href="#how" className="hover:text-[var(--home-ink)]">How it works</a>
          <a href="#privacy" className="hover:text-[var(--home-ink)]">Privacy</a>
          <a href="#pricing" className="hover:text-[var(--home-ink)]">Pricing</a>
          <Link href="/demo" className="hover:text-[var(--home-ink)]">Look inside</Link>
        </nav>
        <span className="md:hidden">
          <Link href="/demo" className="home-btn home-btn--ghost">
            Look inside
          </Link>
        </span>
      </header>

      <section className="home-hero">
        <div className="home-hero__text">
        <h1 className="home-h1 home-tagline">
          <Highlighted text={TAGLINE} highlight={TAGLINE_HIGHLIGHT} />
        </h1>
        <p className="home-hinglish" lang="hi-Latn">
          {TAGLINE_HINGLISH}
        </p>
        <p className="home-lead home-overview">{OVERVIEW}</p>
        <div className="home-hero__actions">
          {startButton("Start your book — free", "home-btn home-btn--sun")}
          <Link href="/demo" className="home-btn home-btn--white">
            Look inside a book
          </Link>
        </div>
        <p className="home-hero__note">
          <LockIcon className="mr-1 inline size-4 align-[-3px]" />
          {SIGN_IN_NOTE}
        </p>

        {deleted && <p className="home-note mx-auto mt-6">Your account has been deleted. Thank you for using {APP_NAME}.</p>}
        {error && (
          <p className="mx-auto mt-6 max-w-md font-semibold text-[#a3261b]">{ERRORS[error] ?? "Sign-in didn’t work. Please try again."}</p>
        )}
        {!signInConfigured && (
          <div id="setup-needed" className="home-note mx-auto mt-6 text-left">
            <b className="text-[var(--home-ink)]">Sign-in is almost ready.</b> It switches on once this app&rsquo;s Google keys are added
            (a one-time, 15-minute setup — see <i>README → steps 1 and 2</i>). Until then, the demo book works without signing in.
          </div>
        )}

        </div>

        <div className="home-book-stage">
          <span className="home-rainbow" aria-hidden />
          <Link href="/demo" title="Look inside a book" className="home-book">
            <div className="aspect-[3/4] w-full [container-type:size]">
              <CoverPage settings={demoJournal.settings} priority />
            </div>
            <span className="sr-only">Look inside a demo book</span>
          </Link>
        </div>
      </section>
      <Wave className="home-wave--sky" />
      </div>

      <section className="home-band" aria-label="In short">
        {HIGHLIGHTS.map(({ icon, strong, rest }, i) => (
          <p key={strong} className="flex items-center gap-2.5">
            <span className={`home-bubble home-bubble--${i}`} aria-hidden>
              {icon}
            </span>
            <span>
              <b className="font-bold text-[var(--home-ink)] uppercase">{strong}</b> {rest}
            </span>
          </p>
        ))}
      </section>

      <Wave className="home-wave--mint" flip />
      <section id="how" className="home-section home-section--mint">
        <div className="home-wrap text-center">
          <p className="home-eyebrow">How it works</p>
          <h2 className="home-h2 mt-3">
            From a photo to a <span className="home-accent">real book</span>.
          </h2>
          <p className="home-lead mx-auto mt-4 max-w-xl">A minute a day is plenty. Three steps, no design skills needed.</p>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {STEPS.map(({ title, text, time }, i) => (
              <div key={title} className={`home-step home-step--${i}`}>
                <p className="home-step__n">{i + 1}</p>
                <h3 className="mt-3 text-xl font-bold text-[var(--home-ink)]">{title}</h3>
                <p className="mt-2 text-[var(--home-soft)]">{text}</p>
                <p className="mt-5 text-sm font-semibold text-[var(--home-ink)]">{time}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Wave className="home-wave--mint" />
      <section id="inside" className="home-section" aria-labelledby="inside-heading">
        <div className="home-wrap text-center">
          <p className="home-eyebrow">What&rsquo;s inside</p>
          <h2 id="inside-heading" className="home-h2 mt-3">
            Pages you&rsquo;ll <span className="home-accent">love to fill</span>.
          </h2>
          <p className="home-lead mx-auto mt-4 max-w-xl">
            Your photos and words become real book pages, and ready-made pages guide you through the big little moments.
          </p>
          <div className="home-pages">
            {INSIDE_PAGES.map(({ id, caption }, i) => {
              const memory = demoJournal.memories.find((m) => m.id === id)!;
              return (
                <figure key={id} className="home-page" style={{ "--tilt": `${[-3, 2, -1.5, 3][i]}deg` } as React.CSSProperties}>
                  <div className="home-page__sheet">
                    <div className="page-surface">
                      {memory.kind === "guided" ? (
                        <GuidedPage memory={memory} dateOfBirth={demoJournal.settings.dateOfBirth} pageNumber={i + 2} />
                      ) : (
                        <MemoryPage
                          memory={memory}
                          text={memory.text}
                          continued={false}
                          hasMore={false}
                          dateOfBirth={demoJournal.settings.dateOfBirth}
                          childName={demoJournal.settings.childName}
                          pageNumber={i + 2}
                        />
                      )}
                    </div>
                  </div>
                  <figcaption className="home-page__caption">{caption}</figcaption>
                </figure>
              );
            })}
          </div>
          <ul className="home-inside-list">
            {INSIDE_LIST.map(({ Icon, title, text, tint }) => (
              <li key={title}>
                <span className={`home-inside-icon home-inside-icon--${tint}`} aria-hidden>
                  <Icon />
                </span>
                <span>
                  <b className="block font-bold text-[var(--home-ink)]">{title}</b>
                  <span className="block text-[0.92rem]">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="privacy" className="home-section !pt-0">
        <div className="home-wrap">
          <p className="home-eyebrow">Why {APP_NAME}</p>
          <h2 className="home-h2 mt-3">
            <span className="home-accent">Your memories</span> stay yours.
          </h2>
          <p className="home-lead mt-4 max-w-2xl">
            Your child&rsquo;s photos, name and stories are saved in a folder in your own Google Drive — never on our servers.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {FEATURES.map(({ icon, title, text }, i) => (
              <div key={title} className="home-card">
                <span className={`home-card__icon home-bubble--${i}`} aria-hidden>
                  {icon}
                </span>
                <h3 className="mt-5 text-lg font-bold text-[var(--home-ink)]">{title}</h3>
                <p className="mt-2 text-[0.95rem] text-[var(--home-soft)]">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8">
            <Link href="/privacy" className="home-btn home-btn--white">
              How your privacy is protected
            </Link>
          </p>
        </div>
      </section>

      <Wave className="home-wave--lilac" flip />
      <section id="pricing" className="home-section home-section--lilac" aria-labelledby="pricing-heading">
        <div className="home-wrap text-center">
          <p className="home-eyebrow">Pricing</p>
          <h2 id="pricing-heading" className="home-h2 mt-3">
            Free to start. <span className="home-accent">Free to keep.</span>
          </h2>
          <div className="mx-auto mt-12 grid max-w-4xl gap-5 text-left sm:grid-cols-2">
            <div className="home-price">
              <p className="text-lg font-bold text-[var(--home-ink)]">Free</p>
              <p className="mt-2 text-5xl font-bold tracking-tight text-[var(--home-ink)]">₹0</p>
              <ul className="home-checks mt-6">
                <li>Unlimited memories and photos (in your Drive)</li>
                <li>Family sharing, letters, month pages</li>
                <li>Cover colours, paper styles and PDF download</li>
              </ul>
            </div>
            <div className="home-price home-price--soon">
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-bold text-[var(--home-ink)]">Premium</p>
                <span className="home-badge">Coming soon</span>
              </div>
              <p className="mt-4 text-[var(--home-soft)]">
                Extra book designs, printed-book ready exports and reminders — paid securely by UPI. Everything free stays free.
              </p>
            </div>
          </div>
          <div className="mx-auto mt-10 max-w-md">
            <InstallApp className="text-left" />
          </div>
        </div>
      </section>

      <Wave className="home-wave--lilac" />
      <section className="home-cta">
        <Stars className="home-cta__stars" />
        <p className="home-cta__mark" aria-hidden>
          {APP_NAME}
        </p>
        <h2 className="mt-8 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Start the book they&rsquo;ll <em>treasure</em>.
        </h2>
        <p className="mx-auto mt-4 max-w-md">The first page takes a minute. The rest is a lifetime of little moments.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {startButton("Start your book", "home-btn home-btn--sun")}
          <Link href="/demo" className="home-btn home-btn--sun">
            Look inside a book
          </Link>
        </div>
      </section>

      <div className="home-footer">
        <SiteFooter className="!mt-0" />
      </div>
    </main>
  );
}

/** The text, with its key words on a sunny marker stroke. */
function Highlighted({ text, highlight }: { text: string; highlight: string }) {
  const at = highlight ? text.indexOf(highlight) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className="home-accent">{highlight}</span>
      {text.slice(at + highlight.length)}
    </>
  );
}

/** A soft wave where one section's colour meets the next (flipped: the colour starts below it). */
function Wave({ className, flip = false }: { className: string; flip?: boolean }) {
  return (
    <svg
      className={`home-wave ${className}`}
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      aria-hidden
      style={flip ? { transform: "scaleY(-1)" } : undefined}
    >
      <path d="M0 0h1440v26c-120 16-240 36-360 30s-240-46-360-50-240 6-360 20S120 66 0 40z" />
    </svg>
  );
}

/** Twinkly little stars. */
function Stars({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 120" aria-hidden>
      {[
        [30, 30, 9],
        [120, 80, 6],
        [210, 20, 7],
        [300, 70, 10],
        [370, 25, 6],
      ].map(([x, y, r]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x} ${y - r}L${x + r * 0.3} ${y - r * 0.3}L${x + r} ${y}L${x + r * 0.3} ${y + r * 0.3}L${x} ${y + r}L${x - r * 0.3} ${y + r * 0.3}L${x - r} ${y}L${x - r * 0.3} ${y - r * 0.3}Z`}
        />
      ))}
    </svg>
  );
}

/** The sky behind the top of the page: a sun, fluffy clouds and stars. */
function SkyDecor() {
  const cloud = "M25 40a15 15 0 0 1 2-30 20 20 0 0 1 37-6 16 16 0 0 1 26 12 12 12 0 0 1 0 24z";
  return (
    <div className="home-sky__decor" aria-hidden>
      <span className="home-sun" />
      {["a", "b", "c"].map((k) => (
        <svg key={k} className={`home-cloud home-cloud--${k}`} viewBox="0 0 100 44">
          <path d={cloud} />
        </svg>
      ))}
      <Stars className="home-sky__stars" />
    </div>
  );
}

const INSIDE_PAGES = [
  { id: "demo-hello", caption: "Hello, world!" },
  { id: "demo-2", caption: "Your photos & words" },
  { id: "demo-firsts", caption: "My firsts" },
  { id: "demo-4", caption: "Festivals & family" },
];

const INSIDE_LIST = [
  { Icon: BookIcon, tint: "sky", title: "Their name on the cover", text: "Rainbow, space, under-the-sea or garden designs." },
  { Icon: BabyIcon, tint: "pink", title: "Hello, world!", text: "Their birth story: the time, the weight, the first visitors." },
  { Icon: StarIcon, tint: "sun", title: "All about me", text: "Favourite toys, songs and funny habits, at any age." },
  { Icon: ChecklistIcon, tint: "mint", title: "My firsts", text: "First smile, first word, first steps, ticked off with dates." },
  { Icon: CalendarIcon, tint: "lilac", title: "Month by month", text: "A page for every month, with height and weight." },
  { Icon: MailIcon, tint: "pink", title: "Letters for later", text: "Write to them now, and seal a letter until a birthday." },
  { Icon: PaletteIcon, tint: "sky", title: "Pages your way", text: "Paper colours, cute patterns and pretty frames." },
  { Icon: PrinterIcon, tint: "sun", title: "Print and keep", text: "Download a print-ready PDF whenever you like." },
];

const STEPS = [
  { title: "Add a moment", text: "A photo or four, the date (read from the photo), and a few lines.", time: "About a minute" },
  { title: "It becomes a book", text: "Polaroids, tape, your handwriting, cover colours, paper styles and month pages.", time: "Automatic" },
  { title: "Share and print", text: "Invite grandparents to view or add memories. Download a print-ready PDF.", time: "Whenever you like" },
];

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const FEATURES = [
  {
    icon: (
      <svg {...iconProps}>
        <path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
      </svg>
    ),
    title: "In your own Google Drive",
    text: "The app can only see the files it creates and the photos you choose. Nothing else in your Drive.",
  },
  {
    icon: (
      <svg {...iconProps}>
        <path d="M12 3.5l7 3v5c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9v-5z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    title: "No ads, no tracking",
    text: "Nothing sold or shared, ever. Built for India’s data protection law (DPDP Act).",
  },
  {
    icon: (
      <svg {...iconProps}>
        <circle cx="9" cy="8.5" r="3" />
        <path d="M3.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5" />
        <path d="M15.5 6a3 3 0 0 1 0 5.5M17.5 14.5c1.6.6 2.7 2.2 3 4.5" />
      </svg>
    ),
    title: "Shared only with family",
    text: "You choose who can view or add memories. Download everything or delete your account at any time.",
  },
];

const smallIcon = { ...iconProps, width: 20, height: 20 };

const HIGHLIGHTS = [
  {
    icon: (
      <svg {...smallIcon}>
        <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
        <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      </svg>
    ),
    strong: "Your Drive",
    rest: "not our servers",
  },
  {
    icon: (
      <svg {...smallIcon}>
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
      </svg>
    ),
    strong: "Free",
    rest: "to start and keep",
  },
  {
    icon: (
      <svg {...smallIcon}>
        <circle cx="12" cy="12" r="8" />
        <path d="M5 5l14 14" />
      </svg>
    ),
    strong: "Zero",
    rest: "ads or tracking",
  },
  {
    icon: (
      <svg {...smallIcon}>
        <path d="M6 9V3h12v6M6 17H4v-6h16v6h-2M7 14h10v7H7z" />
      </svg>
    ),
    strong: "Print-ready",
    rest: "PDF any time",
  },
];

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden className="rounded-full bg-white p-[2px]">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.5 5.8c4.4-4 6.8-10 6.8-17.3z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}
