/**
 * components/layout/StatusBar.tsx
 * Purely decorative — mimics the iOS status bar for the mobile-first
 * design system. Real time-of-day isn't wired here; this is chrome, not data.
 */
export function StatusBar() {
  return (
    <div className="flex items-center justify-between px-5 py-2 text-xs font-semibold" style={{ color: "var(--color-black)" }}>
      <span>9:41</span>
      <div className="flex items-center gap-1">
        <svg width="17" height="12" viewBox="0 0 17 12" fill="var(--color-black)">
          <rect x="0" y="3" width="3" height="9" rx="1" />
          <rect x="4.5" y="2" width="3" height="10" rx="1" />
          <rect x="9" y="0" width="3" height="12" rx="1" />
          <rect x="13.5" y="0" width="3" height="12" rx="1" opacity=".3" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="var(--color-black)" strokeOpacity=".35" />
          <rect x="2" y="2" width="16" height="8" rx="2" fill="var(--color-black)" />
          <path d="M23 4.5V7.5a2 2 0 000-3z" fill="var(--color-black)" opacity=".4" />
        </svg>
      </div>
    </div>
  );
}
