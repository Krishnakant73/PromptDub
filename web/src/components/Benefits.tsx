import { motion } from "framer-motion";
import { Shield, Cpu, Globe, Lock, BarChart3, Headphones } from "lucide-react";

const benefits = [
  {
    icon: Shield,
    title: "Enterprise-Grade Security",
    description:
      "End-to-end encryption for all audio streams. Your data never leaves your device unless you choose to share it.",
  },
  {
    icon: Cpu,
    title: "GPU-Accelerated Pipeline",
    description:
      "Powered by Faster-Whisper, Qwen-2.5, and CosyVoice 2 — all optimized for real-time inference on consumer GPUs.",
  },
  {
    icon: Globe,
    title: "23+ Languages",
    description:
      "From English to Japanese, Korean to Portuguese — translate streams in real time across dozens of languages.",
  },
  {
    icon: Lock,
    title: "Zero Data Collection",
    description:
      "Fully open source. No analytics, no tracking, no data harvesting. Your voice is your own.",
  },
  {
    icon: BarChart3,
    title: "Sub-Second Latency",
    description:
      "End-to-end pipeline in under 1500ms. Speech-to-text, translation, and voice synthesis in one seamless flow.",
  },
  {
    icon: Headphones,
    title: "Emotional Voice Cloning",
    description:
      "Preserves tone, pitch, energy, and emotion. The translated voice sounds like the original speaker.",
  },
];

export default function Benefits() {
  return (
    <section id="benefits" className="relative section-padding">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-start gap-16 lg:grid-cols-2">
          {/* Left - Editorial heading */}
          <div className="sticky top-32">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="micro-label text-[#7C3AED]">
                Benefits
              </span>
              <h2 className="heading-2 mt-4 text-balance">
                Built for speed,
                <br />
                designed for trust
              </h2>
              <p className="body-lg mt-6 text-[#A1A1AA]">
                Every decision in PromptDub's architecture prioritizes latency,
                accuracy, and user privacy. We believe translation should be
                invisible — fast enough that you forget it's happening.
              </p>
            </motion.div>
          </div>

          {/* Right - Benefits list */}
          <div className="space-y-4">
            {benefits.map((benefit, i) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="glass-card-hover rounded-2xl p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#7C3AED]/10">
                      <Icon size={24} className="text-[#7C3AED]" />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-semibold text-white">
                        {benefit.title}
                      </h3>
                      <p className="body-sm mt-2 text-[#A1A1AA]">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}