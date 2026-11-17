"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import { ShieldCheck, Phone, UserPlus } from "lucide-react";
import { SparkWordmark } from "@/components/brand/SparkWordmark";
import { SparkSplash } from "@/components/brand/SparkSplash";

const spring = { type: "spring" as const, stiffness: 110, damping: 16 };

const FEATURES = [
  {
    icon: UserPlus,
    title: "The Spark Request",
    body: "Nobody can message you until you accept their Spark. No strangers in your inbox, no spam — every conversation starts with your yes.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "One-to-one chats only, protected by sign-in, row-level security, and encryption in transit and at rest. End-to-end encryption is on the roadmap — we will not claim it before it is built.",
  },
  {
    icon: Phone,
    title: "Calls that feel like calls",
    body: "Real voice and video calls, peer to peer, with a ringtone, a call history you can call back from, and a connection that tries to recover before it gives up on you.",
  },
];

export default function LandingPage() {
  // Intro splash, once per browser session — tap anywhere to skip.
  const [showSplash, setShowSplash] = useState(false);
  useEffect(() => {
    try {
      if (!window.sessionStorage.getItem("sparks-splash-seen")) {
        setShowSplash(true);
        window.sessionStorage.setItem("sparks-splash-seen", "1");
      }
    } catch {
      setShowSplash(true);
    }
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      {showSplash && <SparkSplash onDone={() => setShowSplash(false)} />}

      <div className="app-surface min-h-screen flex flex-col overflow-hidden">
        {/* Sticky glass nav */}
        <nav className="frosted-header sticky top-0 z-10 flex items-center justify-between px-6 md:px-12 py-3">
          <Link href="/" className="pressable" aria-label="Sparks home">
            <SparkWordmark size="small" />
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/support" className="pressable text-body text-[#1D1D1F]/70 hover:text-[#1D1D1F] transition-colors hidden sm:block">
              Support
            </Link>
            <Link href="/login" className="pressable text-body text-[#1D1D1F] font-medium hover:opacity-70 transition-opacity">
              Log In
            </Link>
            <Link
              href="/signup"
              className="pressable text-body font-medium text-white bg-[#007AFF] px-4 py-2 rounded-full hover:bg-[#006AE0] transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <main className="flex-1 flex items-center px-6 md:px-12 pt-10 pb-16">
          <div className="w-full max-w-7xl mx-auto grid md:grid-cols-2 gap-10 items-center">
            {/* Left: wordmark + copy */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.05 }}
              className="text-center md:text-left"
            >
              <SparkWordmark size="hero" animate />
              <h1 className="text-display font-semibold tracking-tight text-[#1D1D1F] mt-4">
                Messaging.
                <br />
                Designed for Humans.
              </h1>
              <p className="mt-5 text-body text-[#1D1D1F]/60 max-w-md mx-auto md:mx-0">
                Private, real-time conversations with an elegant
                Apple-inspired experience. Nobody can message you until you
                accept their Spark.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Link
                  href="/signup"
                  className="pressable text-body font-medium text-white bg-[#007AFF] px-7 py-4 rounded-full hover:bg-[#006AE0] transition-colors text-center"
                  style={{ boxShadow: "0 8px 24px rgba(0,122,255,0.35)" }}
                >
                  Create Account
                </Link>
                <Link
                  href="/login"
                  className="pressable glass text-body font-medium text-[#1D1D1F] px-7 py-4 rounded-full text-center"
                >
                  Log In
                </Link>
              </div>
            </motion.div>

            {/* Right: glass phone mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ ...spring, delay: 0.15 }}
              className="flex justify-center"
            >
              <div className="relative w-[260px] h-[540px] md:w-[290px] md:h-[600px] rounded-[46px] p-3 glass-strong" style={{ background: "rgba(29,29,31,0.92)" }}>
                <div className="w-full h-full bg-white rounded-[34px] overflow-hidden relative">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#1D1D1F] rounded-b-2xl z-10" />

                  {/* Honest preview: the real empty state of the app, not
                      invented people or messages. Labelled as a preview. */}
                  <div className="pt-10 px-4">
                    <div className="flex justify-center mb-4">
                      <SparkWordmark size="small" />
                    </div>
                    <div className="glass-input flex items-center gap-2 rounded-full px-4 py-2">
                      <span className="text-caption text-[#1D1D1F]/40">Search chats or users</span>
                    </div>
                    <div className="flex flex-col items-center justify-center pt-12 px-4 text-center">
                      <div className="glass-card rounded-[24px] px-5 py-6 flex flex-col items-center w-full">
                        <SparkWordmark size="medium" />
                        <p className="text-body font-semibold text-[#1D1D1F] mt-3">No chats yet</p>
                        <p className="text-caption text-[#1D1D1F]/50 mt-1">
                          Search for people and send a Spark Request to connect
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-6 left-4 right-4 text-center">
                    <span className="text-caption font-medium text-[#1D1D1F]/40">Preview of the real app</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </main>

        {/* What makes Sparks different — only real features, no invented claims */}
        <section className="px-6 md:px-12 pb-16">
          <div className="w-full max-w-7xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={spring}
              className="text-title font-semibold tracking-tight text-[#1D1D1F] text-center"
            >
              What makes Sparks different
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ ...spring, delay: 0.08 }}
              className="mt-3 text-body text-[#1D1D1F]/60 text-center max-w-xl mx-auto"
            >
              Not another copy of the big chat apps. Three things, done properly.
            </motion.p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {FEATURES.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ ...spring, delay: i * 0.1 }}
                  whileHover={{ y: -4 }}
                  className="glass-card glass-sheen rounded-[28px] p-6"
                >
                  <div className="glass w-11 h-11 rounded-2xl flex items-center justify-center mb-4">
                    <feature.icon size={20} color="var(--color-blue)" strokeWidth={1.8} />
                  </div>
                  <h3 className="text-body font-semibold text-[#1D1D1F]">{feature.title}</h3>
                  <p className="mt-2 text-body leading-relaxed text-[#1D1D1F]/60">{feature.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing wordmark */}
        <section className="px-6 md:px-12 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={spring}
            className="w-full max-w-7xl mx-auto glass-card rounded-[32px] px-6 py-10 flex flex-col items-center text-center"
          >
            <SparkWordmark size="large" />
            <p className="text-body text-[#1D1D1F]/60 mt-3 max-w-md">
              Your people, your yes. Start a conversation that starts with you.
            </p>
            <Link
              href="/signup"
              className="pressable mt-6 text-body font-medium text-white bg-[#007AFF] px-7 py-4 rounded-full hover:bg-[#006AE0] transition-colors"
            >
              Create Account — it&apos;s free
            </Link>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="px-6 md:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-caption text-[#1D1D1F]/40">
          <span>© {new Date().getFullYear()} Sparks</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-[#1D1D1F]/70 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#1D1D1F]/70 transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-[#1D1D1F]/70 transition-colors">Support</Link>
          </div>
        </footer>

      </div>
    </MotionConfig>
  );
}
