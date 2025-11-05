import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "StudySmart AI - Intelligent Study Planner",
  description: "AI-powered study planner that learns your habits and optimizes your learning schedule",
  keywords: ["study planner", "AI", "education", "time management", "IB", "A-Level"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${spaceGrotesk.variable}`}>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
