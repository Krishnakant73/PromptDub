import { motion } from "framer-motion";

const stacks = [
  {
    image: "/assets/speech_to_text.png",
    title: "Speech-to-Text",
    items: ["Faster Whisper", "OpenAI Whisper", "EfficientWhisper"],
  },
  {
    image: "/assets/translation_cube.png",
    title: "Translation",
    items: ["Gemma 2B/7B", "LLM", "Context Window 16k+"],
  },
  {
    image: "/assets/voice_synthesis.png",
    title: "Voice Synthesis",
    items: ["CosyVoice 2", "ChatTTS", "Emotional Transfer"],
  },
  {
    image: "/assets/infra_cube.png",
    title: "Infrastructure",
    items: ["FastAPI", "Redis + Celery", "PostgreSQL"],
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
    <section className="relative py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 bottom-0 h-100 w-100 rounded-full bg-purple-800/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-[12px] font-semibold uppercase tracking-[3px] text-purple-400">
            Tech Stack
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-[42px]">
            Built on{" "}
            <span className="bg-linear-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Open Source AI
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[14px] text-zinc-500">
            No proprietary APIs. Self-host & run on a single A100 GPU.
            Every model is open weight and production-proven.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {stacks.map((stack) => (
            <motion.div
              key={stack.title}
              variants={item}
              className="group rounded-2xl border border-purple-500/10 bg-[#0a0a1a]/80 p-6 transition-all hover:border-purple-500/20"
            >
              {/* 3D rendered icon */}
              <div className="mb-5 flex h-16 w-16 items-center justify-center">
                <img
                  src={stack.image}
                  alt={stack.title}
                  className="h-full w-full object-contain drop-shadow-[0_0_15px_rgba(147,51,234,0.25)]"
                  draggable={false}
                />
              </div>

              <h3 className="text-[15px] font-semibold text-white">
                {stack.title}
              </h3>

              <ul className="mt-4 space-y-2.5">
                {stack.items.map((tech) => (
                  <li key={tech} className="flex items-center gap-2.5 text-[13px]">
                    <div className="h-1 w-1 flex-shrink-0 rounded-full bg-purple-500/50" />
                    <span className="text-zinc-400">{tech}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        {/* VRAM footer note */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-10 rounded-xl border border-purple-500/10 bg-[#0a0a1a]/60 px-6 py-4 text-center"
        >
          <p className="text-[13px] text-zinc-500">
            All models run in under{" "}
            <span className="font-semibold text-white">120 W VRAM</span> — 160K+
            16-bit VRAM all model. Total pipeline latency:{" "}
            <span className="font-semibold text-purple-400">250–400ms</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
