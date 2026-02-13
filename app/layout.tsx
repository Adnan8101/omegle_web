import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";

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
      <body className="font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
