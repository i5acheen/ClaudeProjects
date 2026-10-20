import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-12">
      <div className="sheet max-w-md text-center">
        <h1 className="ui-h1">This page isn&rsquo;t here</h1>
        <p className="mt-3 text-ink-soft">The link may be old. Your book is just a tap away.</p>
        <Link href="/book" className="chrome-button chrome-button--primary mt-6">
          Open the journal
        </Link>
      </div>
    </main>
  );
}
