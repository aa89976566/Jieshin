import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CollaborationCta } from "@/components/CollaborationCta";
import { site } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jieshin Tseng — 曾潔心",
  description:
    "Fine art portfolio of Jieshin Tseng. Sculpture, installation, painting, and material research across London and Taiwan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <CollaborationCta email={site.artist.email} />
      </body>
    </html>
  );
}
