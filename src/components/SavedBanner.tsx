"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

// Confirmation that a save landed. Dismissing strips the ?saved flag so a
// refresh or a back-navigation does not resurrect the banner.
export default function SavedBanner({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [shown, setShown] = useState(true);

  if (!shown) return null;

  return (
    <p
      role="status"
      className={`flex items-center justify-between gap-3 rounded border border-win/40 bg-win/10 px-3 py-2 text-sm text-win ${className}`}
    >
      {message}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          setShown(false);
          router.replace(pathname);
        }}
        className="shrink-0 px-1 leading-none transition-opacity hover:opacity-70"
      >
        ×
      </button>
    </p>
  );
}
