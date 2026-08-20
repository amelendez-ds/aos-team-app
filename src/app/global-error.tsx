"use client";

// Last resort: only fires when the root layout itself fails, so it must ship
// its own <html>/<body> and cannot rely on the app's fonts or CSS variables.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#14110f",
          color: "#ece6da",
          fontFamily: "Georgia, serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: "24rem", textAlign: "center" }}>
          <h1 style={{ color: "#c9a24b", letterSpacing: "0.05em" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#9b9183", fontSize: "0.875rem" }}>
            The app failed to load. Try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.25rem",
              padding: "0.5rem 1rem",
              border: "1px solid rgba(201,162,75,0.6)",
              borderRadius: "0.25rem",
              background: "transparent",
              color: "#c9a24b",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
