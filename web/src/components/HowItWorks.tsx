import { motion } from "framer-motion";
import { Mic, Languages, Volume2 } from "lucide-react";

const steps = [
  {
    icon: Mic,
    step: "01",
    title: "Capture Audio",
    description:
      "Our Chrome extension captures the audio directly from any stream or video — no downloads, no setup. Just click and go.",
  },
  {
    icon: Languages,
    step: "02",
    title: "AI Translates",
    description:
      "Faster and more accurate speech translation in real-time, with context, tone, and emotion fully preserved.",
  },
  {
    icon: Volume2,
    step: "03",
    title: "Voice Clone Speaks",
    description:
      "Our AI voice clone speaks in the streamer's voice in your language, exactly as they intended.",
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

function Waveform() {
  return (
    <div className="flex h-12 items-end justify-center gap-[3px]">
      {Array.from({ length: 40 }).map((_, i) => {
        const height = Math.sin(i * 0.4) * 30 + 10 + Math.random() * 8;
        return (
          <div
            key={i}
            className="w-[2px] rounded-full bg-linear-to-t from-purple-600/40 to-purple-400/60"
            style={{
              height: `${height}%`,
              animation: `wave ${1.5 + Math.random()}s ease-in-out infinite`,
              animationDelay: `${i * 0.05}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-[12px] font-semibold uppercase tracking-[3px] text-purple-400">
            How It Works
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-[42px]">
            Three Steps to{" "}
            <span className="text-white">Universal Streaming</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] text-zinc-500">
            From click to translated voice — all in under 1s seconds.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-14 grid gap-6 md:grid-cols-3"
        >
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              variants={item}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-purple-500/10 bg-[#0a0a1a]/80 transition-all hover:border-purple-500/20"
            >
              <div className="flex-1 p-7">
                {/* Icon + Step number row */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-purple-600/30 to-purple-800/30 ring-1 ring-purple-500/20">
                    <s.icon size={20} className="text-purple-400" />
                  </div>
                  <span className="text-[28px] font-bold text-white/[0.04]">
                    {s.step}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2.5 text-[13px] leading-relaxed text-zinc-500">
                  {s.description}
                </p>
              </div>

              {/* Waveform visualization at bottom */}
              <div className="border-t border-purple-500/5 px-4 py-3">
                <Waveform />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Pipeline latency pill */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 flex justify-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/15 bg-[#0a0a1a]/80 px-5 py-2 text-[13px]">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
            <span className="text-zinc-400">Total Pipeline:</span>
            <span className="font-semibold text-white">&lt; 700ms</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
