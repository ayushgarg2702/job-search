import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"] });
const body = Instrument_Sans({ variable: "--font-body", subsets: ["latin"] });
const code = JetBrains_Mono({ variable: "--font-code", subsets: ["latin"] });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Career OS",
  description: "Your job search, run from one place. Find roles in India, approve drafts, track every application.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable} ${code.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider>
          <AppShell>{children}</AppShell>
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
