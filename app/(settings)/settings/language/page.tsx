"use client";
import { useRouter } from "next/navigation";
import { Check, Globe } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { SettingsHeader, SectionLabel, SettingsCard, RowIcon } from "@/components/settings/settings-ui";

export default function LanguageSettingsPage() {
  const router = useRouter();
  return (
    <ScreenContainer>
      <div className="app-surface flex flex-col h-full">
        <StatusBar />
        <SettingsHeader title="Language" />
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-6">
          <div>
            <SectionLabel>App Language</SectionLabel>
            <SettingsCard>
              <div className="flex items-center gap-3 px-4 py-4">
                <RowIcon icon={Globe} />
                <div className="flex-1">
                  <div className="text-body font-medium">English</div>
                  <div className="text-caption mt-0.5" style={{ color: "var(--color-gray-1)" }}>The language Sparks is shown in.</div>
                </div>
                <Check size={19} color="var(--color-blue)" strokeWidth={2.4} className="flex-shrink-0" />
              </div>
            </SettingsCard>
            <p className="text-caption mt-2 px-2" style={{ color: "var(--color-gray-1)" }}>
              Sparks is available in English.
            </p>
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
}
