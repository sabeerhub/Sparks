"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#007AFF] flex items-center justify-center">
            <span className="text-white text-sm font-bold">⚡</span>
          </div>
          <span className="text-[17px] font-semibold text-[#1D1D1F]">Spark Chat</span>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/support" className="text-[15px] text-[#1D1D1F]/70 hover:text-[#1D1D1F] transition-colors hidden sm:block">
            Support
          </Link>
          <Link href="/login" className="text-[15px] text-[#1D1D1F] font-medium hover:opacity-70 transition-opacity">
            Log In
          </Link>
          <Link
            href="/signup"
            className="text-[15px] font-medium text-white bg-[#007AFF] px-4 py-2 rounded-full hover:bg-[#006AE0] transition-colors"
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
            <h1 className="text-[40px] leading-[1.1] md:text-[56px] font-semibold tracking-tight text-[#1D1D1F]">
              Messaging.
              <br />
              Designed for Humans.
            </h1>
            <p className="mt-5 text-[17px] md:text-[19px] text-[#1D1D1F]/60 max-w-md mx-auto md:mx-0">
              Private, secure, real-time conversations with an elegant
              Apple-inspired experience.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Link
                href="/signup"
                className="text-[16px] font-medium text-white bg-[#007AFF] px-7 py-3.5 rounded-full hover:bg-[#006AE0] transition-colors text-center"
              >
                Create Account
              </Link>
              <Link
                href="/login"
                className="text-[16px] font-medium text-[#1D1D1F] bg-[#F5F5F7] px-7 py-3.5 rounded-full hover:bg-[#ECECEE] transition-colors text-center"
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

                {/* Fake chat list screen */}
                <div className="pt-10 px-4">
                  <p className="text-[22px] font-semibold text-[#1D1D1F] mb-4">Chats</p>
                  {[
                    { name: "Aisha", msg: "Sounds good, see you then!", time: "2m" },
                    { name: "Marcus", msg: "Sent the files ✓", time: "1h" },
                    { name: "Priya", msg: "Typing…", time: "3h" },
                  ].map((c) => (
                    <div key={c.name} className="flex items-center gap-3 py-2.5">
                      <div className="w-11 h-11 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#007AFF] font-medium">
                        {c.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <span className="text-[14px] font-medium text-[#1D1D1F]">{c.name}</span>
                          <span className="text-[11px] text-[#1D1D1F]/40">{c.time}</span>
                        </div>
                        <p className="text-[12px] text-[#1D1D1F]/50 truncate">{c.msg}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Fake bubble preview at bottom */}
                <div className="absolute bottom-6 left-4 right-4 flex flex-col gap-2">
                  <div className="self-start bg-[#F5F5F7] text-[#1D1D1F] text-[12px] px-3 py-2 rounded-2xl rounded-bl-sm max-w-[70%]">
                    Hey! Are we still on for later?
                  </div>
                  <div className="self-end bg-[#007AFF] text-white text-[12px] px-3 py-2 rounded-2xl rounded-br-sm max-w-[70%]">
                    Yes, 7pm works 🙌
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-[#1D1D1F]/40">
        <span>© {new Date().getFullYear()} Spark Chat</span>
        <div className="flex gap-5">
          <Link href="/privacy" className="hover:text-[#1D1D1F]/70 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[#1D1D1F]/70 transition-colors">Terms</Link>
          <Link href="/support" className="hover:text-[#1D1D1F]/70 transition-colors">Support</Link>
        </div>
      </footer>
    </div>
  );
}
