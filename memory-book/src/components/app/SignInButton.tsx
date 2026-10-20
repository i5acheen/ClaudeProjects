"use client";

import { useState } from "react";
import { APP_NAME } from "@/content/marketing";

/**
 * Before going to Google: a short, honest explanation of what Google is about
 * to ask, so the permission screen isn't a surprise.
 */
export function SignInButton({ action, children, className = "" }: { action: () => Promise<void>; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && (
        <div className="note-backdrop" role="dialog" aria-modal aria-label="Before you sign in" onClick={() => setOpen(false)}>
          <div className="note-sheet text-left" onClick={(e) => e.stopPropagation()}>
            <h2 className="ui-h2">Before Google asks…</h2>
            <p className="mt-2 text-ink-soft">
              Google will ask you to let {APP_NAME} <b className="text-ink">&ldquo;see, edit, create and delete only the specific Google
              Drive files you use with this app&rdquo;</b>.
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
              <li>That&rsquo;s the folder the app makes for your book — and photos you choose yourself.</li>
              <li>It can&rsquo;t see anything else in your Drive: not your other photos, documents or emails.</li>
              <li>Your book lives in your Drive, not on our servers. You can remove the app&rsquo;s access at any time.</li>
            </ul>
            <form action={action} className="mt-5 flex flex-wrap gap-3">
              <button type="submit" className="chrome-button chrome-button--primary !h-11 !px-6">
                Continue to Google
              </button>
              <button type="button" className="chrome-button" onClick={() => setOpen(false)}>
                Not now
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
