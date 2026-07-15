import { DesktopNavRail } from "@/components/layout/DesktopNavRail";

/**
 * Wraps every screen in the (chat) group (Chats, Search, Activity) with a
 * persistent desktop nav rail. On mobile this is fully transparent — the
 * rail renders nothing and children fill the screen exactly as before.
 *
 * Composes with app/(chat)/chats/layout.tsx: on desktop, /chats routes get
 * [Rail][ChatSidebar][MainChat]; /search and /activity get [Rail][Page].
 */
export default function ChatGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex">
      <DesktopNavRail />
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
    </div>
  );
}
