"use client";

import { useEffect, useState } from "react";
import type { Journal, Memory } from "@/lib/types";
import { GUIDED_NOTE_LIMIT, GUIDED_TEMPLATES, guidedAnswers, type GuidedTemplate } from "@/lib/guided";
import { useJournal } from "@/components/journal/JournalProvider";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const today = () => new Date().toISOString().slice(0, 10);

/** Pick a guided page ("Hello, world!", "All about me"…). */
export function GuidedChooser({ onChoose }: { onChoose: (template: GuidedTemplate) => void }) {
  return (
    <div className="guided-choices">
      {Object.values(GUIDED_TEMPLATES).map((t) => (
        <button key={t.id} type="button" className={`guided-choice guided-choice--${t.accent}`} onClick={() => onChoose(t.id)}>
          <span className="guided-choice__emoji" aria-hidden>
            {t.emoji}
          </span>
          <span className="min-w-0">
            <span className="block font-bold text-ink">{t.title}</span>
            <span className="block text-sm text-ink-soft">{t.blurb}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Fill in a guided page. Every answer is optional; the page shows whatever
 * is filled in, and can be completed later.
 */
export function GuidedSheet({
  journal,
  memory,
  template: startTemplate,
  onClose,
  onSaved,
}: {
  journal: Journal;
  /** The page being edited; leave out for a new one. */
  memory?: Memory;
  /** For a new page: which one (otherwise you choose first). */
  template?: GuidedTemplate;
  onClose: () => void;
  onSaved: (memoryId: string) => void;
}) {
  const { saveMemory, deleteMemory } = useJournal();
  const [template, setTemplate] = useState<GuidedTemplate | undefined>(memory?.template ?? startTemplate);
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    memory?.template ? guidedAnswers(memory.template, memory.fields) : {},
  );
  const [date, setDate] = useState(memory?.date ?? today());
  const [note, setNote] = useState(memory?.text ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const info = template ? GUIDED_TEMPLATES[template] : undefined;
  const name = journal.settings.childName || "your little one";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    if (!info) return;
    const id = memory?.id ?? newId();
    setError(null);
    setStatus("Saving…");
    try {
      await saveMemory(
        {
          id,
          // "Hello, world!" belongs on the day they were born.
          date: info.id === "hello" ? journal.settings.dateOfBirth : date,
          title: info.title,
          text: note.trim(),
          tags: memory?.tags ?? [],
          photos: memory?.photos.map((ref) => ({ kind: "existing" as const, ref })) ?? [],
          kind: "guided",
          template: info.id,
          fields: guidedAnswers(info.id, answers),
          paper: memory?.paper,
        },
        setStatus,
      );
      onSaved(id);
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "Couldn't save the page.");
    }
  }

  async function remove() {
    if (!memory) return;
    setStatus("Removing…");
    try {
      await deleteMemory(memory.id);
      onClose();
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "Couldn't remove the page.");
    }
  }

  return (
    <div className="note-backdrop" role="dialog" aria-modal aria-label={info ? info.title : "Add a guided page"} onClick={onClose}>
      <div className="note-sheet" onClick={(e) => e.stopPropagation()}>
        {!info ? (
          <>
            <h2 className="ui-h2">Add a guided page</h2>
            <p className="mt-1 text-ink-soft">Ready-made pages to fill in, like a printed baby book. Every question is optional.</p>
            <div className="mt-5">
              <GuidedChooser onChoose={setTemplate} />
            </div>
            <div className="mt-5">
              <button type="button" className="chrome-button" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="ui-h2">
              <span aria-hidden>{info.emoji}</span> {info.title}
            </h2>
            <p className="mt-1 text-ink-soft">Fill in what you know — you can come back and add more any time.</p>

            {info.id !== "hello" && (
              <>
                <label className="field-label mt-5" htmlFor="guided-date">
                  {info.id === "firsts" ? "Put this page in the book on" : "As of"}
                </label>
                <input id="guided-date" type="date" className="text-field !w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
              </>
            )}

            <div className="mt-5 grid gap-4">
              {info.fields.map((f) => (
                <div key={f.id}>
                  <label className="field-label" htmlFor={`guided-${f.id}`}>
                    {f.label}
                  </label>
                  <input
                    id={`guided-${f.id}`}
                    type={f.type === "date" ? "date" : "text"}
                    className={`text-field ${f.type === "date" ? "!w-auto" : ""}`}
                    maxLength={120}
                    placeholder={f.hint ? `e.g. ${f.hint}` : undefined}
                    value={answers[f.id] ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [f.id]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="field-label" htmlFor="guided-note">
                  A few more words <span className="font-normal text-ink-faint">(optional)</span>
                </label>
                <textarea
                  id="guided-note"
                  className="text-field hand-field min-h-24"
                  maxLength={GUIDED_NOTE_LIMIT}
                  placeholder={`Anything else about ${name}…`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" className="chrome-button chrome-button--primary !h-11 !px-6" onClick={save} disabled={status !== null}>
                {status ?? (memory ? "Save page" : "Add page to journal")}
              </button>
              <button type="button" className="chrome-button" onClick={memory || startTemplate ? onClose : () => setTemplate(undefined)}>
                {memory || startTemplate ? "Cancel" : "Back"}
              </button>
              <span className="flex-1" />
              {memory &&
                (confirmRemove ? (
                  <span className="flex items-center gap-2 text-sm">
                    Remove this page?
                    <button type="button" className="chrome-button danger-button !h-9 !px-3 !text-sm" onClick={remove}>
                      Remove
                    </button>
                    <button type="button" className="chrome-button !h-9 !px-3 !text-sm" onClick={() => setConfirmRemove(false)}>
                      Keep
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="text-sm text-[var(--ink-terracotta)] underline decoration-dotted underline-offset-4"
                    onClick={() => setConfirmRemove(true)}
                  >
                    Remove page
                  </button>
                ))}
            </div>
            {error && <p className="mt-2 text-sm text-[var(--ink-terracotta)]">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
