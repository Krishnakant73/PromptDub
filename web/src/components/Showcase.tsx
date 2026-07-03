import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, Zap, Volume2, Languages } from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Real-Time Translation",
    description: "Instant speech-to-text with contextual translation across 23+ languages.",
  },
  {
    icon: Zap,
    title: "Sub-Second Pipeline",
    description: "STT → LLM → TTS completes in under 900ms on consumer hardware.",
  },
  {
    icon: Volume2,
    title: "Voice Cloning",
    description: "5-second voice profile extraction preserves emotional nuances.",
  },
  {
    icon: Languages,
    title: "Dual Subtitles",
    description: "Side-by-side original and translated text for complete understanding.",
  },
];

export default function Showcase() {
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <section className="relative section-padding overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="micro-label text-[#7C3AED]">
            Interactive Showcase
          </span>
          <h2 className="heading-2 mt-4 text-balance">
            See it in action
          </h2>
          <p className="body-md mt-5 text-[#A1A1AA]">
            Experience the full power of PromptDub's AI translation pipeline.
          </p>
        </motion.div>

        <div className="mt-16 grid items-center gap-12 lg:grid-cols-2">
          {/* Left - Feature selector */}
          <div className="space-y-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`glass-card rounded-2xl p-6 cursor-pointer transition-all duration-300 ${
                    activeFeature === i
                      ? "border-[#7C3AED]/30 bg-[#7C3AED]/5"
                      : "hover:border-white/[0.1]"
                  }`}
                  onClick={() => setActiveFeature(i)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors duration-300 ${
                        activeFeature === i
                          ? "bg-[#7C3AED] text-white"
                          : "bg-[#17171B] text-[#A1A1AA]"
                      }`}
                    >
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-semibold text-white">
                        {f.title}
                      </h3>
                      <p className="body-sm mt-1 text-[#A1A1AA]">
                        {f.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Right - Live preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex items-center justify-center"
          >
            <div className="relative w-full max-w-lg">
              <div className="glass-card rounded-[32px] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED]/20">
                    <Globe size={20} className="text-[#7C3AED]" />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-white">
                      Live Preview
                    </div>
                    <div className="caption text-[#A1A1AA]">
                      Real-time translation
                    </div>
                  </div>
                  <div className="ml-auto flex h-2.5 w-2.5 rounded-full bg-[#22C55E] animate-pulse" />
                </div>

                {/* Simulated stream */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#17171B] text-[11px] font-bold text-[#A1A1AA]">
                      EN
                    </div>
                    <div className="glass-surface rounded-2xl rounded-tl-md px-4 py-3 text-[13px] text-[#A1A1AA] leading-relaxed">
                      "This is incredible! The latency is so low, I can barely tell it's being translated."
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/20 text-[11px] font-bold text-[#7C3AED]">
                      JA
                    </div>
                    <div className="glass-surface rounded-2xl rounded-tl-md px-4 py-3 text-[13px] text-white border border-[#7C3AED]/20 leading-relaxed">
                      "信じられない！レイテンシーが本当に低くて、翻訳されているとは简直思えない。"
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F59E0B]/20 text-[11px] font-bold text-[#F59E0B]">
                      ES
                    </div>
                    <div className="glass-surface rounded-2xl rounded-tl-md px-4 py-3 text-[13px] text-white border border-[#F59E0B]/20 leading-relaxed">
                      "¡Esto es increíble! La latencia es tan baja que apenas puedo notar que se está traduciendo."
                    </div>
                  </div>
                </div>

                {/* Audio wave */}
                <div className="mt-6 flex items-center gap-1 h-8">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full"
                      style={{
                        height: `${Math.max(3, Math.sin(i * 0.4 + activeFeature) * 14 + 10)}px`,
                        backgroundColor: `rgba(124, 58, 237, ${0.3 + Math.sin(i * 0.3) * 0.3})`,
                        transition: "height 0.3s ease",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}