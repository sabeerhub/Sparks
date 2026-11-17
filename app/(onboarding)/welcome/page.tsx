"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { ShieldCheck, MessageCircle } from "lucide-react";
import { SparkWordmark } from "@/components/brand/SparkWordmark";
import { Button } from "@/components/ui/Button";

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
          className="w-full max-w-sm"
        >
          <div className="flex justify-center mb-6">
            <SparkWordmark size="large" animate />
          </div>

          <div className="glass-card glass-sheen rounded-[28px] px-6 py-8">
            <div className="flex justify-end -mt-2 mb-2">
              <button onClick={() => router.push("/onboarding/profile-setup")} className="pressable text-body font-semibold" style={{ color: "var(--color-blue)" }}>
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
                <div className="glass w-24 h-24 rounded-[28px] flex items-center justify-center mb-6">
                  <Icon size={40} color="var(--color-blue)" strokeWidth={1.8} />
                </div>
                <h2 className="text-title font-bold mb-4 whitespace-pre-line">{slide.title}</h2>
                <p className="text-body leading-relaxed" style={{ color: "var(--color-gray-1)" }}>{slide.desc}</p>
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-center gap-2 mt-8 mb-6">
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
            <Button fullWidth onClick={next}>
              {step < SLIDES.length - 1 ? "Next" : "Set Up Profile"}
            </Button>
          </div>
        </motion.div>
      </div>
    </MotionConfig>
  );
}
