import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import "./globals.css";
import { getLocale, getTheme } from "@/lib/locale-server";
import { LocaleProvider } from "@/components/locale-provider";
import { ThemeScript } from "@/components/theme-script";
import { Toaster } from "@/components/toaster";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DriveDesk — File Manager for Google Drive",
    template: "%s · DriveDesk",
  },
  description:
    "Professional Google Drive file management: upload, preview, print, download, and organize files.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const theme = await getTheme();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${cairo.variable} ${inter.variable} h-full`}
    >
      <head>
        <ThemeScript initial={theme} />
      </head>
      <body className="min-h-dvh antialiased">
        <LocaleProvider locale={locale}>
          {children}
          <Toaster />
        </LocaleProvider>
      </body>
    </html>
  );
}
