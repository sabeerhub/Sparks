import { DesktopNavRail } from "@/components/layout/DesktopNavRail";

/**
 * Wraps every screen in the (profile) group (Profile, Edit Profile, public
 * profile view) with the same persistent desktop nav rail used across
 * (chat), so navigation is consistent no matter which section you're in.
 * Fully transparent on mobile.
 */
export default function ProfileGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex">
      <DesktopNavRail />
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
    </div>
  );
}
