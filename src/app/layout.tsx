import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NFL Squares — Season Pool",
  description: "A season-long Super-Bowl-style squares pool.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
