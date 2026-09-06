import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

const robotoMono = Roboto_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
  title: "ChordPH",
  description: "ChordPH web application",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${robotoMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
