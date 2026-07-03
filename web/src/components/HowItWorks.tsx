import { motion } from "framer-motion";
import { Mic, Languages, Volume2 } from "lucide-react";

const steps = [
  {
    icon: Mic,
    step: "01",
    title: "Capture Audio",
    description:
      "Our Chrome extension captures live audio directly from the browser tab — no downloads, no setup. Just click and go.",
    detail: "Uses Chrome tabCapture API with AudioWorklet for efficient processing",
    color: "from-violet-500 to-violet-600",
    glow: "violet",
  },
  {
    icon: Languages,
    step: "02",
    title: "AI Translates",
    description:
      "Faster-Whisper transcribes speech in real-time, then our LLM translates with context awareness — preserving meaning, tone, and intent.",
    detail: "Context window maintains coherence across sentences",
    color: "from-fuchsia-500 to-fuchsia-600",
    glow: "fuchsia",
  },
  {
    icon: Volume2,
    step: "03",
    title: "Voice Clone Speaks",
    description:
      "CosyVoice 2 generates speech in the streamer's cloned voice with the original emotion — happy, excited, calm — all preserved.",
    detail: "Zero-shot voice cloning from 5s reference audio",
    color: "from-pink-500 to-pink-600",
    glow: "pink",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-sm font-medium uppercase tracking-widest text-violet-400">
            How It Works
          </span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
            Three Steps to{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Universal Streaming
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            From click to translated voice — all in under 1.5 seconds.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-16 grid gap-8 md:grid-cols-3"
        >
          {steps.map((s) => (
            <motion.div
              key={s.step}
              variants={item}
              className="group relative rounded-2xl border border-white/5 bg-zinc-900/50 p-8 transition-all hover:border-white/10 hover:bg-zinc-900/80"
            >
              <div
                className={`pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b ${s.color} opacity-0 blur-xl transition-opacity group-hover:opacity-10`}
              />

              <div className="relative">
                <div className="mb-6 flex items-center justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} shadow-lg`}
                  >
                    <s.icon size={22} className="text-white" />
                  </div>
                  <span className="text-3xl font-bold text-white/5">
                    {s.step}
                  </span>
                </div>

                <h3 className="text-xl font-semibold">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {s.description}
                </p>
                <p className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-zinc-500">
                  {s.detail}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mx-auto mt-12 hidden max-w-3xl md:block"
        >
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
            <div className="flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
              Total Pipeline: 375–910ms
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-fuchsia-500/30 to-transparent" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
