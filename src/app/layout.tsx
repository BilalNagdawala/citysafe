import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/ThemeProvider";
import { ShakeSOSProvider } from "@/providers/ShakeSOSProvider";
import { RoleProvider } from "@/providers/RoleProvider";
import { ActiveJourneyProvider } from "@/providers/ActiveJourneyProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CitySafe AI",
  description: "The time-aware, safety-aware route recommendation system.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="h-[100dvh] flex flex-col md:flex-row overflow-hidden bg-[--background]">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <RoleProvider>
            <ShakeSOSProvider>
              <ActiveJourneyProvider>
                {children}
              </ActiveJourneyProvider>
            </ShakeSOSProvider>
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
