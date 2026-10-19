"use client";

import { useEffect, useState } from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text.startsWith("/") ? location.origin + text : text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

/** Step checkbox whose state persists per browser, so a developer can come back to their progress. */
export function StepCheck({ id }: { id: string }) {
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    try {
      setChecked(localStorage.getItem(id) === "1");
    } catch {}
  }, [id]);
  return (
    <input
      type="checkbox"
      aria-label="Mark step done"
      checked={checked}
      onChange={(e) => {
        setChecked(e.target.checked);
        try {
          localStorage.setItem(id, e.target.checked ? "1" : "0");
        } catch {}
      }}
      className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
    />
  );
}
