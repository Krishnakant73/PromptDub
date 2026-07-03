import { motion } from "framer-motion";
import {
  Headphones,
  Subtitles,
  Waves,
  Shield,
  Clock,
  Sparkles,
  Monitor,
  Users,
} from "lucide-react";

const features = [
  {
    icon: Headphones,
    title: "Emotional Voice Cloning",
    description:
      "Hear the streamer's own voice in your language. CosyVoice 2 captures vocal timbre and emotional nuances — excitement, laughter, whispers.",
  },
  {
    icon: Clock,
    title: "Sub-1.5s Latency",
    description:
      "Optimized pipeline with streaming at every stage. Audio chunks overlap, LLM tokens stream directly to TTS — no waiting for full sentences.",
  },
  {
    icon: Subtitles,
    title: "Dual Subtitles",
    description:
      "See both original and translated text overlaid on the video. Original in smaller text, translation in bold — context at a glance.",
  },
  {
    icon: Waves,
    title: "Smart Audio Ducking",
    description:
      "Original audio fades to 20% while translated voice plays at full volume. Smooth 150ms ramps — no jarring cuts.",
  },
  {
    icon: Shield,
    title: "100% Open Source AI",
    description:
      "Faster-Whisper, Qwen-2.5, CosyVoice 2 — no proprietary APIs, no data sent to third parties. Self-host the entire stack.",
  },
  {
    icon: Sparkles,
    title: "Context-Aware Translation",
    description:
      "Rolling context window ensures coherent translations. Slang, idioms, and cultural references are adapted — not just word-swapped.",
  },
  {
    icon: Monitor,
    title: "YouTube & Twitch",
    description:
      "Works on both platforms out of the box. Detects the player automatically and overlays subtitles in the right position.",
  },
  {
    icon: Users,
    title: "Multi-Speaker Support",
    description:
      "Voice embedding adapts to speaker changes. Each speaker gets their own cloned voice profile for natural conversations.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Features() {
  return (
    <section id="features" className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/4 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-sm font-medium uppercase tracking-widest text-fuchsia-400">
            Features
          </span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
            Everything You Need for{" "}
            <span className="bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Global Streams
            </span>
          </h2>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              className="group rounded-2xl border border-white/5 bg-zinc-900/40 p-6 transition-all hover:border-white/10 hover:bg-zinc-900/70"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-violet-400 transition-colors group-hover:text-violet-300">
                <f.icon size={20} />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {f.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
