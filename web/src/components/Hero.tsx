import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";

const stats = [
  { value: "23+", label: "Languages" },
  { value: "<1s", label: "Latency" },
  { value: "5s", label: "Voice Clone" },
  { value: "100%", label: "Open Source" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 md:pt-44 md:pb-32">
      <div className="hero-glow" />

      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-40" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
          {/* Left - Copy */}
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#111113] px-4 py-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="caption text-[#A1A1AA]">
                Now in public beta
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="heading-1 text-balance"
            >
              Hear any stream
              <br />
              <span className="gradient-accent">in your language</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="body-lg mt-6 text-[#A1A1AA]"
            >
              Real-time AI translation with emotional voice cloning for live
              streams. The streamer speaks — you hear their voice in your
              language, with every emotion preserved.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <a href="#" className="btn-primary group">
                Install Free Extension
                <ArrowRight
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </a>
              <a href="#how-it-works" className="btn-secondary group">
                <Play size={15} className="text-[#7C3AED]" />
                Watch Demo
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="mt-12 flex items-center gap-8"
            >
              {stats.map((stat, i) => (
                <div key={stat.label} className={`stagger-${i + 1}`}>
                  <div className="text-[20px] font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="caption text-[#A1A1AA]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right - Hero visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex items-center justify-center"
          >
            <div className="relative animate-float">
              {/* Main product visualization */}
              <div className="relative glass-card rounded-[32px] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7C3AED]/20">
                    <Sparkles size={24} className="text-[#7C3AED]" />
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-white">
                      Live Translation
                    </div>
                    <div className="caption text-[#A1A1AA]">
                      Voice cloning active
                    </div>
                  </div>
                  <div className="ml-auto flex h-3 w-3 rounded-full bg-[#22C55E] animate-pulse" />
                </div>

                {/* Translation preview */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#17171B] text-[12px] font-bold text-[#A1A1AA]">
                      EN
                    </div>
                    <div className="glass-surface rounded-2xl rounded-tl-md px-4 py-3 text-[14px] text-[#A1A1AA]">
                      "This new feature is going to change everything!"
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/20 text-[12px] font-bold text-[#7C3AED]">
                      JA
                    </div>
                    <div className="glass-surface rounded-2xl rounded-tl-md px-4 py-3 text-[14px] text-white border border-[#7C3AED]/20">
                      "この新機能は全てを変えてしまう！"
                    </div>
                  </div>
                </div>

                {/* Audio wave visualization */}
                <div className="mt-6 flex items-center gap-1 h-8">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-[#7C3AED]/60"
                      style={{
                        height: `${Math.max(4, Math.sin(i * 0.5) * 16 + 12)}px`,
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Floating accent elements */}
              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-3xl bg-[#7C3AED]/10 blur-2xl animate-breathe" />
              <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-3xl bg-[#22C55E]/10 blur-2xl animate-breathe" style={{ animationDelay: '1.5s' }} />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}