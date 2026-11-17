"use client";
import { useRouter } from "next/navigation";
import { Mail, FileText, ShieldCheck } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { SettingsHeader, SectionLabel, SettingsCard, SettingsRow, RowDivider } from "@/components/settings/settings-ui";

export default function HelpSupportPage() {
  const router = useRouter();
  return (
    <ScreenContainer>
      <div className="app-surface flex flex-col h-full">
        <StatusBar />
        <SettingsHeader title="Help & Support" />
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-6">
          <div>
            <SectionLabel>Contact Us</SectionLabel>
            <SettingsCard>
              <a href="mailto:support@sparkschat.app" className="pressable flex items-center gap-3 px-4 py-4">
                <span className="glass w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,122,255,0.12)" }}>
                  <Mail size={19} color="var(--color-blue)" strokeWidth={1.8} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-body font-medium">Email Support</span>
                  <span className="block text-caption mt-0.5" style={{ color: "var(--color-gray-1)" }}>support@sparkschat.app</span>
                </span>
              </a>
            </SettingsCard>
            <p className="text-caption mt-2 px-2" style={{ color: "var(--color-gray-1)" }}>
              Tell us what went wrong and what you were doing — we reply by email.
            </p>
          </div>

          <div>
            <SectionLabel>Learn More</SectionLabel>
            <SettingsCard>
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
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
}
