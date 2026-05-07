"use client";

import { useState } from "react";

// Renders a "Copy invite link" button for a pool. Builds the invite URL
// from window.location.origin so it works in any deployment without
// hard-coding a domain. Clipboard write may fail on insecure contexts;
// falls back to selecting the text in a temporary textarea.
export function InviteLinkButton({
  poolSlug,
  variant = "primary",
}: {
  poolSlug: string;
  variant?: "primary" | "secondary";
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCopy() {
    setError(null);
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/p/${poolSlug}`
      : "";
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers / insecure contexts.
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setError(`Couldn't copy. Manually: /p/${poolSlug}`);
      }
    }
  }

  const cls = variant === "primary" ? "btn-primary" : "btn-secondary";

  return (
    <div className="inline-flex flex-col items-stretch gap-1">
      <button type="button" onClick={handleCopy} className={cls}>
        {copied ? "✓ Link copied" : "Copy invite link"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
