import Link from "next/link";

export const metadata = { title: "Memory Book — privacy" };

/** Plain-language privacy page (also used as the privacy policy link on Google's sign-in screen). */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="sheet font-serif text-lg leading-relaxed text-ink-soft">
        <h1 className="font-hand text-5xl font-bold text-ink">Your memories stay yours</h1>
        <p className="mt-4">
          Memory Book has <b className="text-ink">no database and no storage of its own</b>. Everything you put into
          it lives in <b className="text-ink">your own Google Drive</b>, in a folder you can open, move, download or
          delete at any time.
        </p>

        <h2 className="mt-8 font-hand text-3xl font-bold text-ink">What is saved, and where</h2>
        <ul className="mt-2 list-disc space-y-2 pl-6">
          <li>
            <b className="text-ink">Your child&rsquo;s name, date of birth, the book title and your note</b> — in{" "}
            <code>journal.json</code> inside the <i>Memory Book</i> folder in your Drive.
          </li>
          <li>
            <b className="text-ink">Every memory&rsquo;s words, dates and tags</b> — in the same <code>journal.json</code>.
          </li>
          <li>
            <b className="text-ink">Photos</b> — in the <code>photos</code> folder next to it.
          </li>
          <li>
            <b className="text-ink">On your own phone or computer</b>, the browser keeps a copy of the book and small
            versions of the photos so it opens quickly and works with a bad connection. That copy never leaves your
            device, and <i>Sign out</i> deletes it.
          </li>
        </ul>

        <h2 className="mt-8 font-hand text-3xl font-bold text-ink">What we never do</h2>
        <ul className="mt-2 list-disc space-y-2 pl-6">
          <li>We don&rsquo;t keep a copy of your photos, words or your child&rsquo;s details — anywhere.</li>
          <li>
            Photos and words travel straight between your browser and Google Drive. They don&rsquo;t pass through our
            server.
          </li>
          <li>No ads, no tracking, no analytics, no selling or sharing of anything.</li>
        </ul>

        <h2 className="mt-8 font-hand text-3xl font-bold text-ink">The Google permissions we ask for</h2>
        <ul className="mt-2 list-disc space-y-2 pl-6">
          <li>
            <b className="text-ink">Your name and email</b> — only to know it&rsquo;s you. They&rsquo;re kept in an
            encrypted sign-in cookie in your own browser, not on our side.
          </li>
          <li>
            <b className="text-ink">Files this app creates</b> (<code>drive.file</code>) — to save the book. The app
            can&rsquo;t see any other file in your Drive with this permission.
          </li>
          <li>
            <b className="text-ink">Read your Drive</b> (<code>drive.readonly</code>) —{" "}
            <i>only if you switch on &ldquo;Photos from Google Drive&rdquo;</i>. It&rsquo;s used solely to look for new
            photos in the one folder you choose, so they can be copied into your book. Your originals are never changed.
          </li>
        </ul>
        <p className="mt-4">
          You can remove Memory Book&rsquo;s access at any time at{" "}
          <a href="https://myaccount.google.com/permissions" className="text-ink underline decoration-dotted underline-offset-4">
            myaccount.google.com/permissions
          </a>
          . Your book stays in your Drive.
        </p>

        <p className="mt-10">
          <Link href="/" className="text-ink underline decoration-dotted underline-offset-4">
            ← Back
          </Link>
        </p>
      </div>
    </main>
  );
}
