import { motion } from "framer-motion";

const displayLangs = [
  { code: "HI", name: "Hindi", emoji: "🇮🇳", bg: "from-orange-500/30 to-green-600/30" },
  { code: "EN", name: "English", emoji: "🇺🇸", bg: "from-blue-600/30 to-red-500/30" },
  { code: "ES", name: "Spanish", emoji: "🇪🇸", bg: "from-red-500/30 to-yellow-500/30" },
  { code: "FR", name: "French", emoji: "🇫🇷", bg: "from-blue-600/30 to-red-500/30" },
  { code: "JP", name: "Japanese", emoji: "🇯🇵", bg: "from-white/20 to-red-500/30" },
  { code: "KR", name: "Korean", emoji: "🇰🇷", bg: "from-blue-500/30 to-red-500/30" },
  { code: "PT", name: "Portuguese", emoji: "🇧🇷", bg: "from-green-500/30 to-yellow-500/30" },
  { code: "DE", name: "German", emoji: "🇩🇪", bg: "from-yellow-500/30 to-red-500/30" },
  { code: "RU", name: "Russian", emoji: "🇷🇺", bg: "from-blue-500/30 to-red-500/30" },
  { code: "ZH", name: "Chinese", emoji: "🇨🇳", bg: "from-red-500/30 to-yellow-500/30" },
];

const remaining = 13;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};

export default function LanguageGrid() {
  return (
    <section id="languages" className="relative py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-[12px] font-semibold uppercase tracking-[3px] text-purple-400">
            Languages
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-[42px]">
            <span className="bg-linear-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              23 Languages
            </span>{" "}
            and Growing
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[14px] text-zinc-500">
            Real-time voice-to-voice translation powered by CosyVoice 2 and
            ChatRouter multilingual TTS engine.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-12 flex flex-wrap items-center justify-center gap-5 md:gap-7"
        >
          {displayLangs.map((lang) => (
            <motion.div
              key={lang.code}
              variants={item}
              className="group flex flex-col items-center gap-2"
            >
              {/* Circular flag */}
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br ${lang.bg} ring-1 ring-white/10 text-2xl transition-all group-hover:ring-purple-500/30 group-hover:scale-110 md:h-[72px] md:w-[72px]`}
              >
                {lang.emoji}
              </div>
              <span className="text-[11px] font-medium text-zinc-500">
                {lang.code}
              </span>
            </motion.div>
          ))}

          {/* +13 more */}
          <motion.div variants={item} className="flex flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-purple-500/20 bg-purple-500/5 md:h-[72px] md:w-[72px]">
              <span className="text-[15px] font-bold text-purple-400">
                +{remaining}
              </span>
            </div>
            <span className="text-[11px] font-medium text-zinc-600">&nbsp;</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
