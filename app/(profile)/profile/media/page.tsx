"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SettingsHeader, SectionLabel } from "@/components/settings/settings-ui";
import { getRecentMediaThumbnails, getMediaUrl } from "@/services/media-service";

export default function SharedMediaPage() {
  const router = useRouter();
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const items = await getRecentMediaThumbnails(30);
      const urls = await Promise.all(items.map((t) => getMediaUrl(t.mediaPath)));
      setThumbs(urls.filter((u): u is string => !!u));
      setLoading(false);
    })();
  }, []);

  return (
    <ScreenContainer>
      <StatusBar />
      <div className="app-surface flex flex-col h-full">
        <SettingsHeader title="Shared Media" />
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
          {loading ? (
            <div className="grid grid-cols-3 gap-2.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-[20px] animate-pulse" style={{ aspectRatio: "1 / 1", background: "var(--color-gray-3)" }} />
              ))}
            </div>
          ) : thumbs.length === 0 ? (
            <EmptyState title="No media yet" subtitle="Photos you share in your chats will appear here." />
          ) : (
            <>
              <SectionLabel>{thumbs.length} {thumbs.length === 1 ? "photo" : "photos"}</SectionLabel>
              <div className="grid grid-cols-3 gap-2.5">
                {thumbs.map((url) => (
                  <div key={url} className="glass rounded-[20px] overflow-hidden p-[3px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      className="w-full object-cover rounded-2xl"
                      style={{ aspectRatio: "1 / 1" }}
                      onError={() => setThumbs((prev) => prev.filter((u) => u !== url))}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </ScreenContainer>
  );
}
