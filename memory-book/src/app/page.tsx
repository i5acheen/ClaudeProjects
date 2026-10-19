import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { CoverPage } from "@/components/book/BookPages";
import { InkFilters } from "@/components/book/Doodles";
import { demoJournal } from "@/lib/demo-data";

const ERRORS: Record<string, string> = {
  AccessDenied: "That Google account isn’t on the list of people allowed to open this book.",
  Configuration: "Google sign-in isn’t set up correctly yet — see the README.",
};

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const signInConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_SECRET);
  const session = signInConfigured ? await auth().catch(() => null) : null;
  if (session?.user) redirect("/book");

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/book" });
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6 py-12 md:flex-row md:gap-16">
      <InkFilters />
      <Link
        href="/demo"
        aria-label="Open the demo book"
        className="block w-[min(68vw,300px)] shrink-0 -rotate-2 drop-shadow-[0_18px_22px_rgba(90,60,30,0.28)] transition-transform duration-500 hover:rotate-0"
      >
        <div className="aspect-[3/4] w-full [container-type:size]">
          <CoverPage settings={demoJournal.settings} />
        </div>
      </Link>

      <div className="max-w-sm text-center md:text-left">
        <h1 className="font-serif text-5xl font-semibold text-ink">Memory Book</h1>
        <p className="mt-3 font-hand text-2xl leading-snug text-ink-soft">
          A little keepsake journal of the everyday moments — written now, to be read when she&rsquo;s grown.
        </p>
        <p className="mt-4 font-serif text-lg text-ink-soft">Your photos and words stay in your own Google Drive.</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
          {signInConfigured ? (
            <form action={signInWithGoogle}>
              <button type="submit" className="chrome-button chrome-button--primary !h-12 w-full justify-center !px-6 !text-lg whitespace-nowrap">
                <GoogleMark /> Sign in with Google
              </button>
            </form>
          ) : (
            <button className="chrome-button !h-12 justify-center !px-6 !text-lg whitespace-nowrap" disabled title="Google sign-in hasn't been set up yet">
              Sign in with Google
            </button>
          )}
          <Link href="/demo" className="chrome-button field-button !h-12 justify-center !px-6 !text-lg whitespace-nowrap">
            Open the demo book
          </Link>
        </div>

        {error && <p className="mt-4 font-serif text-[var(--ink-terracotta)]">{ERRORS[error] ?? "Sign-in didn’t work. Please try again."}</p>}
        {!signInConfigured && (
          <p className="mt-4 font-serif text-sm text-ink-faint italic">Google sign-in is not set up yet — the demo book works without it.</p>
        )}
      </div>
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
