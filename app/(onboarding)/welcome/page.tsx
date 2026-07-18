"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { Button } from "@/components/ui/Button";

const SLIDES = [
  {
    title: "Your Privacy\nComes First",
    desc: "Your data is protected with encryption at rest, row-level security, and secure HTTPS connections.",
    bg: "var(--color-blue-light)",
    iconBg: "var(--color-blue)",
    icon: "shield",
  },
  {
    title: "Real-time\nMessaging",
    desc: "Messages delivered in milliseconds. Stay connected without interruption.",
    bg: "#E8F9EF",
    iconBg: "var(--color-green)",
    icon: "bolt",
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];

  const next = () => {
    if (step < SLIDES.length - 1) setStep((s) => s + 1);
    else router.push("/onboarding/profile-setup");
  };

  if (!slide) return null;

  return (
    <ScreenContainer>
      <StatusBar />
      <div className="flex justify-end px-5 pt-2">
        <button onClick={() => router.push("/onboarding/profile-setup")} className="text-sm font-semibold" style={{ color: "var(--color-blue)" }}>
          Skip
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-32 h-32 rounded-3xl flex items-center justify-center mb-8" style={{ background: slide.bg }}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: slide.iconBg }}>
            {slide.icon === "shield" ? <ShieldIcon /> : <BoltIcon />}
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-4 whitespace-pre-line">{slide.title}</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-gray-1)" }}>{slide.desc}</p>
      </div>
      <div className="px-6 pb-10">
        <div className="flex justify-center gap-2 mb-6">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className="h-2 rounded-full transition-all"
              style={{ width: step === i ? 20 : 8, background: step === i ? "var(--color-blue)" : "var(--color-gray-3)" }}
            />
          ))}
        </div>
        <Button fullWidth onClick={next}>Next</Button>
      </div>
    </ScreenContainer>
  );
}

function ShieldIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}
function BoltIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="#fff"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
}
