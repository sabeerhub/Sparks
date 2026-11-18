"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { ShieldCheck, MessageCircle } from "lucide-react";
import { SparkWordmark } from "@/components/brand/SparkWordmark";
import { Button } from "@/components/ui/Button";

/**
 * app/(onboarding)/welcome/page.tsx
 * v1.11.0 — Snapchat-style rebuild: no card, one clear step per
 * screen on the calm app surface. The wordmark sits at the top, the
 * step icon lives in a soft blue-tinted circle, one big friendly
 * headline, one primary action. Progress is dots + "Step X of 3"
 * (the two slides here are steps 1–2; profile setup is step 3).
 * Same two slides, same copy, same Skip / Next / Set Up Profile
 * behaviour — look only, zero logic change.
 */
const SLIDES = [
  {
    title: "Your Privacy\nComes First",
    desc: "Your data is protected with encryption at rest, row-level security, and secure HTTPS connections.",
    icon: ShieldCheck,
  },
  {
    title: "Real-time\nMessaging",
    desc: "Messages delivered in milliseconds. Stay connected without interruption.",
    icon: MessageCircle,
  },
];

const spring = { type: "spring" as const, stiffness: 120, damping: 16 };

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];

  const next = () => {
    if (step < SLIDES.length - 1) setStep((s) => s + 1);
    else router.push("/onboarding/profile-setup");
  };

  if (!slide) return null;

  const Icon = slide.icon;

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-surface min-h-screen flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={spring}
          className="w-full max-w-[380px]"
        >
          <div className="flex justify-center mb-8">
            <SparkWordmark size="large" animate />
          </div>

          <div className="flex justify-end mb-2">
            <button onClick={() => router.push("/onboarding/profile-setup")} className="pressable text-caption font-semibold" style={{ color: "var(--color-blue)" }}>
              Skip
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={spring}
              className="flex flex-col items-center text-center"
            >
              <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: "var(--color-blue-light)" }}>
                <Icon size={40} color="var(--color-blue)" strokeWidth={1.8} />
              </div>
              {/* v1.11.0 — no big headlines: the wordmark above is the
                  only large element. Headline and body stay small. */}
              <h2 className="text-body font-bold mb-3 whitespace-pre-line">{slide.title}</h2>
              <p className="text-caption leading-relaxed" style={{ color: "var(--color-gray-1)" }}>{slide.desc}</p>
            </motion.div>
          </AnimatePresence>

          <p className="text-caption font-semibold text-center mt-8 mb-3" style={{ color: "var(--color-blue)" }}>
            Step {step + 1} of 3
          </p>
          <div className="flex justify-center gap-2 mb-6">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="h-2 rounded-full transition-all pressable"
                style={{ width: step === i ? 20 : 8, background: step === i ? "var(--color-blue)" : "var(--color-gray-3)" }}
              />
            ))}
          </div>
          <Button fullWidth shape="rounded" onClick={next}>
            {step < SLIDES.length - 1 ? "Next" : "Set Up Profile"}
          </Button>
        </motion.div>
      </div>
    </MotionConfig>
  );
}
