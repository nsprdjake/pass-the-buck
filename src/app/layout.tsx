import type { Metadata, Viewport } from "next";
import { IM_Fell_English, Inter, Rye } from "next/font/google";
import "./globals.css";
import AchievementToaster from "@/components/AchievementToaster";
import ThemeSync from "@/components/ThemeSync";
import { AuthProvider } from "@/context/AuthContext";
import { LocalGameProvider } from "@/context/LocalGameContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const rye = Rye({
  variable: "--font-rye",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const fell = IM_Fell_English({
  variable: "--font-fell",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pass the Buck",
  description: "Multiplayer party game — who's keeping theirs?",
  applicationName: "Pass the Buck",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pass the Buck",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#10B981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${rye.variable} ${fell.variable} h-full`}
    >
      <body className="min-h-full bg-buck-dark text-white antialiased">
        <AuthProvider>
          <ThemeSync />
          <LocalGameProvider>{children}</LocalGameProvider>
          <AchievementToaster />
        </AuthProvider>
      </body>
    </html>
  );
}
