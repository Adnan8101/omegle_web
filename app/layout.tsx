import type { Metadata, Viewport } from "next";
import { Manrope, Sora } from 'next/font/google';
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Providers } from "./providers";
import FrontendNavbarMount from '@/components/FrontendNavbarMount';

const displayFont = Sora({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700', '800'],
});

const bodyFont = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: "Omeglee Community - Where Connections Become Conversations",
  description: "Join the Omeglee Community - A vibrant Discord community with thousands of active members. Apply to join our professional moderation team.",
  icons: {
    icon: '/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif',
  },
  keywords: ['Omeglee', 'Discord Community', 'Online Community', 'Chat', 'Social'],
  authors: [{ name: 'Omeglee Community' }],
  openGraph: {
    title: 'Omeglee Community',
    description: 'Where connections become conversations',
    type: 'website',
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif" />
      </head>
      <body className={`${displayFont.variable} ${bodyFont.variable} font-sans`}>
        <Providers>
          <ThemeProvider>
            <FrontendNavbarMount />
            <div className="min-h-screen w-full overflow-x-clip">
              {children}
            </div>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
