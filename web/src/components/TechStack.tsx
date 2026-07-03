import { motion } from "framer-motion";
import { Cpu, Database, Server, Code2 } from "lucide-react";

const stacks = [
  {
    category: "Speech-to-Text",
    icon: Cpu,
    items: [
      { name: "Faster-Whisper", detail: "large-v3-turbo INT8" },
      { name: "Silero VAD", detail: "Voice Activity Detection" },
      { name: "CTranslate2", detail: "Optimized inference" },
    ],
    latency: "~30ms",
  },
  {
    category: "Translation",
    icon: Code2,
    items: [
      { name: "Qwen-2.5-7B", detail: "AWQ INT4 quantized" },
      { name: "vLLM", detail: "Streaming token generation" },
      { name: "Context Window", detail: "Rolling 5-sentence context" },
    ],
    latency: "~85ms",
  },
  {
    category: "Voice Synthesis",
    icon: Server,
    items: [
      { name: "CosyVoice 2", detail: "Multilingual voice cloning" },
      { name: "Chatterbox", detail: "English TTS (75ms)" },
      { name: "Emotion Transfer", detail: "6 emotion categories" },
    ],
    latency: "~150ms",
  },
  {
    category: "Infrastructure",
    icon: Database,
    items: [
      { name: "FastAPI", detail: "WebSocket gateway" },
      { name: "Redis / Valkey", detail: "Session state & caching" },
      { name: "PostgreSQL", detail: "Users & analytics" },
    ],
    latency: "< 5ms",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function TechStack() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-1/4 bottom-0 h-[400px] w-[400px] rounded-full bg-fuchsia-600/10 blur-[120px]" />
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
            Tech Stack
          </span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
            Built on{" "}
            <span className="bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Open Source AI
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            No proprietary APIs. Self-host the entire pipeline on a single A10G
            GPU. Every model is open-weight and production-proven.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {stacks.map((stack) => (
            <motion.div
              key={stack.category}
              variants={item}
              className="group rounded-2xl border border-white/5 bg-zinc-900/40 p-6 transition-all hover:border-white/10"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20">
                  <stack.icon size={20} className="text-fuchsia-400" />
                </div>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  {stack.latency}
                </span>
              </div>

              <h3 className="text-base font-semibold">{stack.category}</h3>

              <div className="mt-4 space-y-3">
                {stack.items.map((tech) => (
                  <div
                    key={tech.name}
                    className="flex items-start gap-2 text-sm"
                  >
                    <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-600" />
                    <div>
                      <span className="font-medium text-zinc-300">
                        {tech.name}
                      </span>
                      <span className="ml-1 text-zinc-600">{tech.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 rounded-2xl border border-white/5 bg-zinc-900/30 p-6 text-center"
        >
          <p className="text-sm text-zinc-400">
            All 3 AI models run on a{" "}
            <span className="font-medium text-white">single NVIDIA A10G</span>{" "}
            — 16GB of 24GB VRAM utilized. Total pipeline latency:{" "}
            <span className="font-medium text-emerald-400">375–910ms</span>.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
