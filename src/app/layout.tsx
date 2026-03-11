import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mission — Audio Embeddings",
  description:
    "Audio-first playlist exploration with Gemini multimodal embeddings and Convex.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-surface-0 text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
