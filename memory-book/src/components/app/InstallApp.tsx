"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Chrome offers installing only once per page load, so remember the offer app-wide.
let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

type Mode = "installed" | "prompt" | "ios" | "manual" | null;

function currentMode(): Mode {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  if (deferred) return "prompt";
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "manual";
}

/** "Add to Home Screen": opens Memory Book like an app, with its own icon. */
export function InstallApp({ className = "" }: { className?: string }) {
  const [mode, setMode] = useState<Mode>(null);
  const [showHow, setShowHow] = useState(false);

  useEffect(() => {
    const update = () => setMode(currentMode());
    update();
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  if (!mode || mode === "installed") return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    deferred = null;
    setMode(currentMode());
  }

  return (
    <div className={`install-app ${className}`}>
      <img src="/icons/icon-192.png" alt="" className="size-12 shrink-0 rounded-xl shadow-sm" />
      <div className="min-w-0 flex-1 text-ink-soft">
        <p className="ui-h3">Keep it on your home screen</p>
        <p className="text-sm">Opens like an app, full screen, with its own icon. Free, no app store needed.</p>
        {mode === "prompt" && (
          <button type="button" className="chrome-button chrome-button--primary mt-2 !h-10 !px-5" onClick={install}>
            Install Memory Book
          </button>
        )}
        {mode !== "prompt" && (
          <>
            {!showHow ? (
              <button type="button" className="mt-1 text-sm text-ink underline decoration-dotted underline-offset-4" onClick={() => setShowHow(true)}>
                How to add it
              </button>
            ) : mode === "ios" ? (
              <p className="mt-1 text-sm text-ink">
                In Safari, tap the <b>Share</b> button <span aria-hidden>(□↑)</span>, then <b>Add to Home Screen</b>.
              </p>
            ) : (
              <p className="mt-1 text-sm text-ink">
                On Android, open the browser menu <b>⋮</b> and tap <b>Add to Home screen</b> or <b>Install app</b>. On a computer, look for
                the install icon at the right end of the address bar.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
