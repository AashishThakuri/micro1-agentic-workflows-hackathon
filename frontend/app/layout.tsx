import type { Metadata } from "next";
import { Barlow_Condensed, Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-body",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Ocular — Learn in motion",
  description:
    "Turn any topic, note, or PDF into a living visual lesson you can question and reshape.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=amulya@400&display=swap"
        />
      </head>
      <body className={`${geist.variable} ${barlowCondensed.variable}`}>
        {children}
      </body>
    </html>
  );
}
