"use client";

import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-white flex flex-col overflow-hidden">
      {/* Nav */}
      <nav className="frosted-header sticky top-0 z-10 flex items-center justify-between px-6 md:px-12 py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#007AFF] flex items-center justify-center">
            <span className="text-white text-body font-bold">⚡</span>
          </div>
          <span className="text-body font-semibold text-[#1D1D1F]">Sparks</span>
        </div>

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
      <main className="flex-1 flex items-center px-6 md:px-12">
        <div className="w-full max-w-7xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          {/* Left: copy */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center md:text-left"
          >
            <h1 className="text-display font-semibold tracking-tight text-[#1D1D1F]">
              Messaging.
              <br />
              Designed for Humans.
            </h1>
            <p className="mt-5 text-body md:text-body text-[#1D1D1F]/60 max-w-md mx-auto md:mx-0">
              Private, real-time conversations with an elegant
              Apple-inspired experience. Nobody can message you until you
              accept their Spark.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Link
                href="/signup"
                className="pressable text-body font-medium text-white bg-[#007AFF] px-7 py-4 rounded-full hover:bg-[#006AE0] transition-colors text-center"
              >
                Create Account
              </Link>
              <Link
                href="/login"
                className="pressable text-body font-medium text-[#1D1D1F] bg-[#F5F5F7] px-7 py-4 rounded-full hover:bg-[#ECECEE] transition-colors text-center"
              >
                Log In
              </Link>
            </div>
          </motion.div>

          {/* Right: iPhone mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
            className="flex justify-center"
          >
            <div className="relative w-[260px] h-[540px] md:w-[290px] md:h-[600px] bg-[#1D1D1F] rounded-[46px] p-3 shadow-2xl">
              <div className="w-full h-full bg-white rounded-[34px] overflow-hidden relative">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#1D1D1F] rounded-b-2xl z-10" />

                {/* Honest preview: the real empty state of the app, not
                    invented people or messages. Labelled as a preview. */}
                <div className="pt-10 px-4">
                  <p className="text-title font-semibold text-[#1D1D1F] mb-4">Chats</p>
                  <div className="flex items-center gap-2 rounded-2xl px-4 py-2 bg-[#F5F5F7]">
                    <span className="text-caption text-[#1D1D1F]/40">Search chats or users</span>
                  </div>
                  <div className="flex flex-col items-center justify-center pt-16 px-4 text-center">
                    <div className="w-14 h-14 rounded-3xl flex items-center justify-center mb-3 bg-[#007AFF]/10">
                      <span className="text-xl">⚡</span>
                    </div>
                    <p className="text-body font-semibold text-[#1D1D1F]">No chats yet</p>
                    <p className="text-caption text-[#1D1D1F]/50 mt-1">
                      Search for people and send a Spark Request to connect
                    </p>
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
          <h2 className="text-title font-semibold tracking-tight text-[#1D1D1F] text-center">
            What makes Sparks different
          </h2>
          <p className="mt-3 text-body text-[#1D1D1F]/60 text-center max-w-xl mx-auto">
            Not another copy of the big chat apps. Three things, done properly.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-[28px] bg-[#F5F5F7] p-6 border border-black/5 hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 bg-[#007AFF]">
                <span className="text-white text-body font-bold">⚡</span>
              </div>
              <h3 className="text-body font-semibold text-[#1D1D1F]">The Spark Request</h3>
              <p className="mt-2 text-body leading-relaxed text-[#1D1D1F]/60">
                Nobody can message you until you accept their Spark. No
                strangers in your inbox, no spam — every conversation starts
                with your yes.
              </p>
            </div>
            <div className="rounded-[28px] bg-[#F5F5F7] p-6 border border-black/5 hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 bg-[#007AFF]">
                <span className="text-white text-body font-bold">🔒</span>
              </div>
              <h3 className="text-body font-semibold text-[#1D1D1F]">Private by design</h3>
              <p className="mt-2 text-body leading-relaxed text-[#1D1D1F]/60">
                One-to-one chats only, protected by sign-in, row-level
                security, and encryption in transit and at rest. End-to-end
                encryption is on the roadmap — we will not claim it before
                it is built.
              </p>
            </div>
            <div className="rounded-[28px] bg-[#F5F5F7] p-6 border border-black/5 hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 bg-[#007AFF]">
                <span className="text-white text-body font-bold">📞</span>
              </div>
              <h3 className="text-body font-semibold text-[#1D1D1F]">Calls that feel like calls</h3>
              <p className="mt-2 text-body leading-relaxed text-[#1D1D1F]/60">
                Real voice and video calls, peer to peer, with a ringtone,
                a call history you can call back from, and a connection that
                tries to recover before it gives up on you.
              </p>
            </div>
          </div>
        </div>
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
