import type { Metadata, Viewport } from "next";
import {
  IM_Fell_English,
  Inter,
  Orbitron,
  Press_Start_2P,
  Rye,
  VT323,
} from "next/font/google";
import "./globals.css";
import AchievementToaster from "@/components/AchievementToaster";
import FontScaleSync from "@/components/FontScaleSync";
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

// Theme-specific display faces. Loaded once; only render-active when
// the matching [data-theme] is set on <html>.
const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  display: "swap",
});

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
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
      className={`${inter.variable} ${rye.variable} ${fell.variable} ${orbitron.variable} ${pressStart.variable} ${vt323.variable} h-full`}
    >
      <body className="min-h-full bg-buck-dark text-white antialiased">
        <AuthProvider>
          <ThemeSync />
          <FontScaleSync />
          <LocalGameProvider>{children}</LocalGameProvider>
          <AchievementToaster />
        </AuthProvider>
      </body>
    </html>
  );
}
