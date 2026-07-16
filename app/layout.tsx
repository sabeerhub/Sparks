import type { Metadata } from "next";
import "@/styles/globals.css";
import { CallProvider } from "@/components/call/CallProvider";

export const metadata: Metadata = {
  title: "Sparks",
  description: "Private, secure, real-time messaging.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CallProvider>{children}</CallProvider>
      </body>
    </html>
  );
}
