"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, MotionConfig } from "framer-motion";
import { ShieldCheck, Phone, UserPlus, MessageCircle, Check } from "lucide-react";
import { SparkWordmark } from "@/components/brand/SparkWordmark";
import { SparkSplash } from "@/components/brand/SparkSplash";
import { LANDING_CHARACTERS } from "@/lib/landing-characters";

const spring = { type: "spring" as const, stiffness: 110, damping: 16 };

const FEATURES = [
  {
    icon: UserPlus,
    title: "The Spark Request",
    body: "Nobody can message you until you accept their Spark. No strangers in your inbox, no spam — every conversation starts with your yes.",
    points: ["Accept or decline every request", "No strangers in your inbox", "Block anyone, any time"],
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "One-to-one chats only, protected by sign-in, row-level security, and encryption in transit and at rest. End-to-end encryption is on the roadmap — we will not claim it before it is built.",
    points: ["One-to-one chats only", "Sign-in and row-level security", "Encrypted in transit and at rest"],
  },
  {
    icon: Phone,
    title: "Calls that feel like calls",
    body: "Real voice and video calls, peer to peer, with a ringtone, a call history you can call back from, and a connection that tries to recover before it gives up on you.",
    points: ["Ringtone and call history", "Tap any call to call back", "Reconnects before it drops"],
  },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Send a Spark", body: "Find someone and send a Spark Request." },
  { step: "2", title: "They say yes", body: "They accept — and only then can you message." },
  { step: "3", title: "Chat & call", body: "Message, share media, and call — voice or video." },
];

const HERO_DETAILS = [
  { icon: UserPlus, label: "Spark Request first" },
  { icon: MessageCircle, label: "1-to-1 chats only" },
  { icon: Phone, label: "Voice & video calls" },
];

// The four cartoon characters on the landing page — inlined as data URIs
// from lib/landing-characters.ts (the GitHub snapshot push route only
// carries UTF-8 text, so binary image files cannot be pushed that way).
// They are decoration, not users: no names, no claims, no counts.

/**
 * One calm row of the four characters — overlapping circles with a thin
 * white ring, so they read premium, not crowded. Desktop hero only:
 * on mobile the landing is the animation alone, with nothing else.
 */
function CharacterRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-row items-center gap-3 ${className}`}>
      <div className="flex items-center">
        {LANDING_CHARACTERS.map((character, index) => (
          <span
            key={character.src}
            className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-full shadow-[0_2px_10px_rgba(29,29,31,0.14)] ring-2 ring-white sm:h-11 sm:w-11 ${
              index > 0 ? "-ml-2.5" : ""
            }`}
          >
            <Image
              src={character.src}
              alt={character.alt}
              width={96}
              height={96}
              className="h-full w-full object-cover"
            />
          </span>
        ))}
      </div>
      <span className="text-caption font-medium text-[#1D1D1F]/50">
        Made for real conversations
      </span>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  // Mobile vs desktop decides the flow: on mobile the landing IS the
  // animation, then login/signup; on desktop it is the full hero page.
  // null until mounted, so the hero never flashes on a phone (and the
  // splash never flashes on desktop). Logged-in users never reach this
  // component at all — the middleware sends them to /chats.
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  // Intro splash, once per browser session on desktop — tap to skip.
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia("(max-width: 767px)").matches);
  }, []);

  useEffect(() => {
    if (isMobile !== false) return;
    try {
      if (!window.sessionStorage.getItem("sparks-splash-seen")) {
        setShowSplash(true);
        window.sessionStorage.setItem("sparks-splash-seen", "1");
      }
    } catch {
      setShowSplash(true);
    }
  }, [isMobile]);

  if (isMobile === null) {
    return <div className="min-h-screen bg-white" aria-hidden="true" />;
  }

  // MOBILE FLOW: the landing page is the animation ONLY. When it ends
  // — or the user taps to skip — go straight to the login page (which
  // links to signup). The splash shows on every mobile visit, because
  // on mobile the animation IS the landing. Nothing else on this
  // screen: no characters, no extra lines, no cards.
  if (isMobile) {
    return (
      <MotionConfig reducedMotion="user">
        <SparkSplash onDone={() => router.replace("/login")} />
      </MotionConfig>
    );
  }

  // DESKTOP (PC): the full premium hero landing.
  return (
    <MotionConfig reducedMotion="user">
      {showSplash && <SparkSplash onDone={() => setShowSplash(false)} />}

      <div className="app-surface relative min-h-screen flex flex-col overflow-hidden">
        {/* Rich aurora behind everything — this is what makes the glass
            visible. Frosted panels over a uniform pale grey looked like
            flat white; over these soft blue-grey tones the blur, the
            hairline edge and the sheen actually show. */}
        <div aria-hidden="true" className="landing-aurora" />

        <div className="relative z-10 flex min-h-screen flex-col">
          {/* Sticky glass nav — blurs the aurora scrolling beneath it */}
          <nav className="frosted-header sticky top-0 z-10 flex items-center justify-between px-6 md:px-12 py-3">
            <Link href="/" className="pressable" aria-label="Sparks home">
              <SparkWordmark size="small" />
            </Link>

            <div className="flex items-center gap-6">
              <Link href="#how-it-works" className="pressable text-body text-[#1D1D1F]/70 hover:text-[#1D1D1F] transition-colors hidden md:block">
                How it works
              </Link>
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

          {/* Hero — big, premium, detailed */}
          <main className="flex-1 flex items-center px-6 md:px-12 pt-14 pb-20 lg:pt-20 lg:pb-28">
            <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
              {/* Left: wordmark + headline + detail */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.05 }}
                className="text-center lg:text-left"
              >
                <SparkWordmark size="display" animate />
                <h1 className="font-semibold tracking-tight text-[#1D1D1F] mt-6 text-[44px] leading-[1.05] md:text-[60px] lg:text-[68px]">
                  Messaging.
                  <br />
                  Designed for humans.
                </h1>
                <p className="mt-6 text-body md:text-[18px] md:leading-[28px] text-[#1D1D1F]/60 max-w-lg mx-auto lg:mx-0">
                  Private, real-time conversations with an elegant
                  Apple-inspired experience. Nobody can message you until you
                  accept their Spark — every chat starts with your yes.
                </p>

                <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
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

                {/* Detail strip — real features only */}
                <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 justify-center lg:justify-start">
                  {HERO_DETAILS.map((detail) => (
                    <span key={detail.label} className="inline-flex items-center gap-2 text-caption font-medium text-[#1D1D1F]/60">
                      <span className="glass w-7 h-7 rounded-full flex items-center justify-center">
                        <detail.icon size={14} color="var(--color-blue)" strokeWidth={2} />
                      </span>
                      {detail.label}
                    </span>
                  ))}
                </div>

                {/* People — the four cartoon characters, calm and few */}
                <CharacterRow className="mt-9 justify-center lg:justify-start" />
              </motion.div>

              {/* Right: bigger glass phone mockup + floating cards */}
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ ...spring, delay: 0.15 }}
                className="flex justify-center"
              >
                <div className="relative">
                  {/* Floating card: a Spark was accepted — real flow, no invented person */}
                  <div className="hidden lg:flex glass rounded-[20px] px-4 py-3 items-center gap-3 absolute -left-24 top-24 z-10">
                    <span className="glass w-10 h-10 rounded-2xl flex items-center justify-center">
                      <UserPlus size={18} color="var(--color-blue)" strokeWidth={1.8} />
                    </span>
                    <span>
                      <span className="block text-body font-semibold text-[#1D1D1F]">Spark accepted</span>
                      <span className="block text-caption text-[#1D1D1F]/50">You can now message each other</span>
                    </span>
                  </div>
                  {/* Floating pill: a real voice call */}
                  <div className="hidden lg:flex glass rounded-full px-4 py-2.5 items-center gap-2 absolute -right-10 bottom-28 z-10">
                    <Phone size={15} color="var(--color-blue)" strokeWidth={2} />
                    <span className="text-caption font-medium text-[#1D1D1F]">Voice call · 04:32</span>
                  </div>

                  <div className="relative w-[280px] h-[580px] lg:w-[330px] lg:h-[680px] rounded-[46px] p-3 glass-strong" style={{ background: "rgba(29,29,31,0.92)" }}>
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
                </div>
              </motion.div>
            </div>
          </main>

          {/* How it works */}
          <section id="how-it-works" className="px-6 md:px-12 pb-16">
            <div className="w-full max-w-7xl mx-auto">
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={spring}
                className="text-title font-semibold tracking-tight text-[#1D1D1F] text-center"
              >
                How Sparks works
              </motion.h2>
              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {HOW_IT_WORKS.map((step, i) => (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ ...spring, delay: i * 0.1 }}
                    className="glass-card glass-sheen rounded-[28px] p-6 flex gap-4"
                  >
                    <span className="shrink-0 w-10 h-10 rounded-full bg-[#007AFF] text-white text-body font-semibold flex items-center justify-center">
                      {step.step}
                    </span>
                    <span>
                      <span className="block text-body font-semibold text-[#1D1D1F]">{step.title}</span>
                      <span className="block mt-1 text-body leading-relaxed text-[#1D1D1F]/60">{step.body}</span>
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

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
                    <ul className="mt-4 space-y-2">
                      {feature.points.map((point) => (
                        <li key={point} className="flex items-start gap-2 text-body text-[#1D1D1F]/70">
                          <Check size={16} color="var(--color-blue)" strokeWidth={2.5} className="shrink-0 mt-0.5" />
                          {point}
                        </li>
                      ))}
                    </ul>
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
      </div>
    </MotionConfig>
  );
}
