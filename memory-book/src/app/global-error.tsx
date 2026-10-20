"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/monitoring/report";

/** Last resort, if even the page frame breaks: plain and self-contained. */
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => reportError(error), [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f7f5f2", color: "#1c1917", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 26 }}>Something went wrong</h1>
          <p>Your memories are safe in your Google Drive. Please try again.</p>
          <button onClick={reset} style={{ marginTop: 12, padding: "10px 20px", borderRadius: 999, border: 0, background: "#d0705c", color: "#fff", fontSize: 16 }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
