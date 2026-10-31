import { cn } from "@/lib/utils";

/** Small shadcn-style primitives (Tailwind, accessible defaults). */
export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50",
        variant === "primary" && "bg-brand text-brand-text hover:opacity-90",
        variant === "secondary" && "border border-border bg-surface text-text hover:bg-bg",
        variant === "danger" && "bg-danger text-white hover:opacity-90",
        variant === "ghost" && "text-text hover:bg-bg",
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("min-h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("min-h-10 rounded-md border border-border bg-surface px-2 py-2 text-sm", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("w-full rounded-md border border-border bg-surface px-3 py-2 text-sm", className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-border bg-surface p-4", className)} {...props} />;
}

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "warn" | "danger" | "brand" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "default" && "bg-bg text-muted border border-border",
        tone === "warn" && "bg-amber-50 text-warn border border-amber-300",
        tone === "danger" && "bg-red-50 text-danger border border-red-300",
        tone === "brand" && "bg-emerald-50 text-brand border border-emerald-300",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-sm font-medium text-text", className)} {...props} />;
}
