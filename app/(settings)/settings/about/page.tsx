"use client";
import { useRouter } from "next/navigation";
import { Info, ShieldCheck, FileText } from "lucide-react";
import { SparkWordmark } from "@/components/brand/SparkWordmark";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { SettingsHeader, SectionLabel, SettingsCard, SettingsRow, RowDivider } from "@/components/settings/settings-ui";

export default function AboutPage() {
  const router = useRouter();
  return (
    <ScreenContainer>
      <div className="app-surface flex flex-col h-full">
        <StatusBar />
        <SettingsHeader title="About Sparks" />
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-6">
          {/* Brand hero */}
          <div className="glass-card glass-sheen rounded-[28px] px-6 py-9 flex flex-col items-center text-center">
            <SparkWordmark size="medium" animate />
            <p className="text-body mt-5 leading-relaxed max-w-[260px]" style={{ color: "var(--color-gray-1)" }}>
              Private, secure, real-time messaging — one-to-one, by Spark request.
            </p>
          </div>

          <div>
            <SectionLabel>Details</SectionLabel>
            <SettingsCard>
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="glass w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,122,255,0.12)" }}>
                  <Info size={19} color="var(--color-blue)" strokeWidth={1.8} />
                </div>
                <span className="flex-1 text-body font-medium">Version</span>
                <span className="text-body" style={{ color: "var(--color-gray-1)" }}>1.3.1</span>
              </div>
              <RowDivider />
              <SettingsRow
                icon={ShieldCheck}
                tint="rgba(52,199,89,0.12)"
                iconColor="var(--color-green)"
                label="Privacy Policy"
                desc="How your data is handled"
                onClick={() => router.push("/privacy")}
              />
              <RowDivider />
              <SettingsRow
                icon={FileText}
                label="Terms of Service"
                desc="The rules for using Sparks"
                onClick={() => router.push("/terms")}
              />
            </SettingsCard>
            <p className="text-caption mt-2 px-2 text-center" style={{ color: "var(--color-gray-1)" }}>
              Messages in this version are protected by login, database rules and HTTPS.
              End-to-end encryption is planned — not built yet.
            </p>
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
}
