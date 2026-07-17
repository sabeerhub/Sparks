import type { Metadata } from "next";
import "@/styles/globals.css";
import { CallProvider } from "@/components/call/CallProvider";
import { AppearanceApplier } from "@/components/appearance/AppearanceApplier";

export const metadata: Metadata = {
  title: "Sparks",
  description: "Private, secure, real-time messaging.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppearanceApplier />
        <CallProvider>{children}</CallProvider>
      </body>
    </html>
  );
}
