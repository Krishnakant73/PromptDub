import { motion } from "framer-motion";
import { ArrowRight, Play, Globe, Zap, Mic } from "lucide-react";

const floatingLabels = [
  { text: "العربية", top: "8%", right: "15%", delay: 0 },
  { text: "हिन्दी", top: "12%", right: "-5%", delay: 0.3 },
  { text: "Español", top: "35%", left: "5%", delay: 0.5 },
  { text: "Français", top: "30%", right: "-12%", delay: 0.7 },
  { text: "العربیة", bottom: "35%", left: "0%", delay: 0.4 },
  { text: "日本語", bottom: "20%", right: "-8%", delay: 0.6 },
  { text: "Português", bottom: "12%", left: "15%", delay: 0.8 },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 h-[700px] w-[900px] -translate-x-1/2 rounded-full bg-purple-900/20 blur-[150px]" />
        <div className="absolute top-20 right-0 h-[400px] w-[400px] rounded-full bg-fuchsia-900/15 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-purple-800/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left side - Text content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-[13px] text-purple-300"
            >
              <Zap size={13} className="text-yellow-400" />
              <span>Real-time AI Translation &middot; Under 1s Latency</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-[42px] font-extrabold leading-[1.1] tracking-tight md:text-[56px]"
            >
              Hear Any Stream
              <br />
              <span className="bg-linear-to-r from-[#ff5500] via-[#ff0055] to-[#cc00aa] bg-clip-text text-transparent">
                In Your Language
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-5 max-w-lg text-[15px] leading-relaxed text-zinc-400"
            >
              AI-powered live translation with emotional voice cloning
              for YouTube and Twitch. The streamer speaks — you
              hear their voice in your language, with every emotion
              preserved.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <a
                href="#"
                className="group flex items-center gap-2 rounded-xl bg-linear-to-r from-[#ff5500] to-[#ff0055] px-7 py-3 text-[14px] font-semibold text-white shadow-xl shadow-red-500/20 transition-all hover:shadow-red-500/30"
              >
                Install Free Extension
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </a>
              <a
                href="#how-it-works"
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-3 text-[14px] font-medium text-zinc-300 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10"
              >
                <Play size={16} fill="currentColor" />
                See How It Works
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 flex items-center gap-6 text-[13px] text-zinc-500"
            >
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-purple-400" />
                <span>23+ Languages</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-yellow-400" />
                <span>&lt;1s Latency</span>
              </div>
              <div className="flex items-center gap-2">
                <Mic size={14} className="text-fuchsia-400" />
                <span>100% Voice Match AI</span>
              </div>
            </motion.div>
          </div>

          {/* Right side - Hero image with floating labels */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative flex items-center justify-center"
          >
            {/* Glowing circle behind headphones */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-purple-600/20 blur-[60px]" />
              <div className="relative flex h-[340px] w-[340px] items-center justify-center rounded-full border border-purple-500/10 bg-linear-to-b from-purple-900/30 to-transparent md:h-[420px] md:w-[420px]">
                {/* Inner circle */}
                <div className="flex h-[220px] w-[220px] items-center justify-center rounded-full border border-purple-500/15 bg-linear-to-b from-purple-800/20 to-purple-900/10 md:h-[280px] md:w-[280px]">
                  {/* Headphone icon */}
                  <div className="relative">
                    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="md:h-[160px] md:w-[160px]">
                      <path d="M20 65C20 43.46 37.46 26 59 26h2c21.54 0 39 17.46 39 39v20c0 5.52-4.48 10-10 10h-6c-3.31 0-6-2.69-6-6V75c0-3.31 2.69-6 6-6h6v-4c0-16.02-12.98-29-29-29h-2c-16.02 0-29 12.98-29 29v4h6c3.31 0 6 2.69 6 6v14c0 3.31-2.69 6-6 6h-6c-5.52 0-10-4.48-10-10V65z" fill="url(#headphone-grad)" />
                      <defs>
                        <linearGradient id="headphone-grad" x1="20" y1="26" x2="100" y2="95" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#a855f7" />
                          <stop offset="1" stopColor="#7c3aed" />
                        </linearGradient>
                      </defs>
                    </svg>
                    {/* Glow around headphones */}
                    <div className="absolute -inset-4 rounded-full bg-purple-500/10 blur-xl" />
                  </div>
                </div>

                {/* Circular track lines */}
                <div className="absolute inset-2 rounded-full border border-purple-500/5" />
                <div className="absolute inset-6 rounded-full border border-purple-500/5" />
              </div>

              {/* Floating language labels */}
              {floatingLabels.map((label, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 + label.delay }}
                  style={{
                    position: "absolute",
                    top: label.top,
                    right: label.right,
                    bottom: label.bottom,
                    left: label.left,
                    animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
                    animationDelay: `${label.delay}s`,
                  }}
                  className="rounded-lg border border-purple-500/20 bg-[#0c0c1e]/90 px-3 py-1.5 text-[12px] font-medium text-purple-200 shadow-lg shadow-purple-500/5 backdrop-blur-sm"
                >
                  {label.text}
                </motion.div>
              ))}
            </div>

            {/* Platform glow base */}
            <div className="absolute -bottom-8 left-1/2 h-4 w-3/4 -translate-x-1/2 rounded-full bg-purple-600/20 blur-2xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
