import { DesktopSidebar } from "@/components/chat/DesktopSidebar";

/**
 * Desktop (md+): WhatsApp Web-style two-column layout — persistent chat
 * list sidebar on the left, active chat/page content on the right. The
 * sidebar stays mounted across navigations between chats since this
 * layout wraps both /chats and /chats/[chatId].
 *
 * Mobile (<md): this layout is fully transparent — the sidebar is hidden
 * and children render exactly as they did before (single full-screen
 * column per route), so mobile behavior is unchanged.
 */
export default function ChatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex">
      <aside
        className="hidden md:flex md:flex-col md:w-[380px] lg:w-[400px] flex-shrink-0 border-r relative"
        style={{ borderColor: "var(--color-gray-2)" }}
      >
        <DesktopSidebar />
      </aside>
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
    </div>
  );
}
