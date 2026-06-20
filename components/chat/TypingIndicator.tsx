/**
 * components/chat/TypingIndicator.tsx
 */
interface TypingIndicatorProps {
  label?: string;
}

export function TypingIndicator({ label }: TypingIndicatorProps) {
  return (
    <div className="flex flex-col gap-1 mb-2">
      <div className="flex justify-start">
        <div className="rounded-3xl px-4 py-3 flex items-center gap-1" style={{ background: "var(--color-gray-2)" }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full animate-typing-dot"
              style={{ background: "var(--color-gray-1)", animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
      {label && (
        <p className="text-xs ml-1" style={{ color: "var(--color-gray-1)" }}>
          {label} is typing...
        </p>
      )}
    </div>
  );
}
