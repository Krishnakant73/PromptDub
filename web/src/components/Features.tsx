import { motion } from "framer-motion";
import { Mic, Zap, Languages, Volume2, Globe, Play } from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Emotional Voice Cloning",
    description:
      "Preserves tone, energy, and emotion of the original speaker across languages.",
    color: "#7C3AED",
  },
  {
    icon: Zap,
    title: "Sub-Second Latency",
    description:
      "Full pipeline — speech recognition, translation, and synthesis — in under one second.",
    color: "#F59E0B",
  },
  {
    icon: Languages,
    title: "Dual Subtitles",
    description:
      "See both the original transcript and translation side-by-side on screen.",
    color: "#3B82F6",
  },
  {
    icon: Volume2,
    title: "Smart Audio Ducking",
    description:
      "Automatically lowers music and background noise for crystal-clear translated voice.",
    color: "#10B981",
  },
  {
    icon: Globe,
    title: "100% Open Source",
    description:
      "Every model is open weight. Self-host on your own infrastructure with full control.",
    color: "#EC4899",
  },
  {
    icon: Play,
    title: "YouTube & Twitch",
    description:
      "One Chrome extension that works across all major live streaming platforms.",
    color: "#8B5CF6",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative section-padding">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="micro-label text-[#7C3AED]">
            Features
          </span>
          <h2 className="heading-2 mt-4 text-balance">
            Everything you need for
            <br />
            global streaming
          </h2>
          <p className="body-md mt-5 text-[#A1A1AA]">
            A complete AI pipeline that captures, translates, and speaks — all
            in real time, all in one extension.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group glass-card-hover card-3d rounded-2xl p-8"
              >
                <div
                  className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${f.color}15` }}
                >
                  <Icon
                    size={28}
                    style={{ color: f.color }}
                    className="transition-transform duration-300 group-hover:scale-110"
                  />
                </div>

                <h3 className="text-[16px] font-semibold tracking-tight text-white">
                  {f.title}
                </h3>
                <p className="body-sm mt-2.5 text-[#A1A1AA]">
                  {f.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}