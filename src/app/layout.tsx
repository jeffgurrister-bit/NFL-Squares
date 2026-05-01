import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NFL Squares — Season Pool",
  description: "A season-long Super-Bowl-style squares pool.",
};

// Every page in this app reads live data from Postgres, so opt out of
// static prerendering at build time. Without this, `next build` tries to
// hit the DB during build and fails when DATABASE_URL is set lazily.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
