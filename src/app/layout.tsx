import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/app/common/context/AuthContext";
import { PlayerProvider } from "@/app/common/context/PlayerContext";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ThemeScript from "@/app/common/components/theme/themeScript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ever Givin Pod",
  description: "Basic podcast management app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The theme script sets data-theme before React loads, which React would otherwise report
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <PlayerProvider>
            {children}
            <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar />
          </PlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
