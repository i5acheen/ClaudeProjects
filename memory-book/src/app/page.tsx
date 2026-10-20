import Link from "next/link";
import { InstallApp } from "@/components/app/InstallApp";
import { SignInButton } from "@/components/app/SignInButton";
import { SiteFooter } from "@/components/legal/SiteFooter";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { CoverPage } from "@/components/book/BookPages";
import { InkFilters } from "@/components/book/Doodles";
import { demoJournal } from "@/lib/demo-data";

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

  return (
    <main className="px-5 py-10 sm:py-14">
      <InkFilters />
      <section className="mx-auto flex max-w-5xl flex-col items-center gap-10 md:flex-row md:gap-16">
        <Link
          href="/demo"
          aria-label="Open the demo book"
          className="block w-[min(68vw,300px)] shrink-0 -rotate-2 drop-shadow-[0_18px_22px_rgba(90,60,30,0.28)] transition-transform duration-500 hover:rotate-0"
        >
          <div className="aspect-[3/4] w-full [container-type:size]">
            <CoverPage settings={demoJournal.settings} />
          </div>
        </Link>

        <div className="max-w-md text-center md:text-left">
          <p className="text-sm font-semibold tracking-wide text-[var(--accent)] uppercase">Memory Book</p>
          <h1 className="ui-h1 mt-1 !text-4xl sm:!text-5xl">A keepsake journal of your baby&rsquo;s first years</h1>
          <p className="mt-4 text-lg text-ink-soft">
            Add photos and a few lines from your phone. Memory Book lays them out like a hand-made book you can flip through,
            share with family, and print.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            {signInConfigured ? (
              <SignInButton action={signInWithGoogle} className="chrome-button chrome-button--primary !h-12 w-full justify-center !px-6 !text-lg whitespace-nowrap">
                <GoogleMark /> Start your book — free
              </SignInButton>
            ) : (
              <a href="#setup-needed" className="chrome-button chrome-button--primary !h-12 justify-center !px-6 !text-lg whitespace-nowrap opacity-60">
                <GoogleMark /> Sign in with Google
              </a>
            )}
            <Link href="/demo" className="chrome-button field-button !h-12 justify-center !px-6 !text-lg whitespace-nowrap">
              Look inside a book
            </Link>
          </div>
          <p className="mt-3 text-sm text-ink-faint">Sign in with Google. Already have a book? The same button opens it.</p>

          {deleted && <p className="mt-4 rounded-2xl bg-white p-3 text-ink">Your account has been deleted. Thank you for using Memory Book.</p>}
          {error && <p className="mt-4 text-[var(--ink-terracotta)]">{ERRORS[error] ?? "Sign-in didn’t work. Please try again."}</p>}
          {!signInConfigured && (
            <div id="setup-needed" className="mt-5 rounded-lg border border-dashed border-ink-faint/60 bg-white/40 p-4 text-base text-ink-soft">
              <b className="text-ink">Sign-in is almost ready.</b> It switches on once this app&rsquo;s Google keys are added
              (a one-time, 15-minute setup — see <i>README → steps 1 and 2</i>). Until then, the demo book works without
              signing in.
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-3" aria-label="How it works">
        {[
          ["📷", "Add a moment", "A photo or four, the date (read from the photo), and a few lines. A minute a day is plenty."],
          ["📖", "It becomes a book", "Pages that look hand-made: polaroids, tape, your handwriting style, month pages and letters to your child."],
          ["👵", "Share and print", "Invite grandparents to view or add memories. Download a print-ready PDF whenever you like."],
        ].map(([icon, title, text]) => (
          <div key={title} className="sheet !p-5">
            <p className="text-2xl" aria-hidden>
              {icon}
            </p>
            <h2 className="ui-h3 mt-2">{title}</h2>
            <p className="mt-1 text-[0.95rem] text-ink-soft">{text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-6 max-w-5xl sheet" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading" className="ui-h2">
          🔒 Your photos stay in your own Google Drive
        </h2>
        <ul className="mt-3 grid gap-2 text-[0.95rem] text-ink-soft sm:grid-cols-2">
          <li>✦ Your child&rsquo;s photos, name and stories are saved in a folder in your Drive — never on our servers.</li>
          <li>✦ The app can only see the files it creates and the photos you choose. Nothing else in your Drive.</li>
          <li>✦ No ads, no tracking, nothing sold or shared. Built for India&rsquo;s data protection law.</li>
          <li>✦ Download everything or delete your account at any time.</li>
        </ul>
        <p className="mt-3 text-sm">
          <Link href="/privacy" className="text-ink underline decoration-dotted underline-offset-4">
            Read exactly how your privacy is protected →
          </Link>
        </p>
      </section>

      <section className="mx-auto mt-6 grid max-w-5xl gap-4 sm:grid-cols-2" aria-labelledby="pricing-heading">
        <h2 id="pricing-heading" className="sr-only">
          Pricing
        </h2>
        <div className="sheet !p-5">
          <p className="ui-h3">Free</p>
          <p className="mt-1 text-3xl font-bold text-ink">₹0</p>
          <ul className="mt-3 space-y-1 text-[0.95rem] text-ink-soft">
            <li>✓ Unlimited memories and photos (in your Drive)</li>
            <li>✓ Family sharing, letters, month pages</li>
            <li>✓ PDF download</li>
          </ul>
        </div>
        <div className="sheet !p-5">
          <p className="ui-h3">Premium</p>
          <p className="mt-1 text-lg font-semibold text-ink">Coming soon</p>
          <p className="mt-2 text-[0.95rem] text-ink-soft">
            Extra book designs, printed-book ready exports and reminders — paid securely by UPI. Everything free stays free.
          </p>
        </div>
      </section>

      <div className="mx-auto mt-6 max-w-md">
        <InstallApp className="text-left" />
      </div>
      <SiteFooter />
    </main>
  );
}

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
