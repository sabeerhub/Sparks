/**
 * components/ui/Avatar.tsx
 */
import Image from "next/image";
import { getInitials, colorFromString } from "@/utils/helpers";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  online?: boolean;
}

export function Avatar({ name, src, size = 44, online = false }: AvatarProps) {
  const bg = colorFromString(name);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          className="rounded-full object-cover w-full h-full"
        />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-white font-semibold"
          style={{ background: bg, fontSize: size * 0.38 }}
        >
          {getInitials(name)}
        </div>
      )}

      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-white"
          style={{ width: size * 0.28, height: size * 0.28, background: "var(--color-green)" }}
        />
      )}
    </div>
  );
}
