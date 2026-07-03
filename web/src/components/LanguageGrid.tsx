import { motion } from "framer-motion";

const languages = [
  { code: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "es", name: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Portuguese", native: "Português", flag: "🇧🇷" },
  { code: "fr", name: "French", native: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "ja", name: "Japanese", native: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", native: "한국어", flag: "🇰🇷" },
  { code: "zh", name: "Chinese", native: "中文", flag: "🇨🇳" },
  { code: "ar", name: "Arabic", native: "العربية", flag: "🇸🇦" },
  { code: "ru", name: "Russian", native: "Русский", flag: "🇷🇺" },
  { code: "it", name: "Italian", native: "Italiano", flag: "🇮🇹" },
  { code: "tr", name: "Turkish", native: "Türkçe", flag: "🇹🇷" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "Thai", native: "ไทย", flag: "🇹🇭" },
  { code: "id", name: "Indonesian", native: "Bahasa", flag: "🇮🇩" },
  { code: "pl", name: "Polish", native: "Polski", flag: "🇵🇱" },
  { code: "nl", name: "Dutch", native: "Nederlands", flag: "🇳🇱" },
  { code: "uk", name: "Ukrainian", native: "Українська", flag: "🇺🇦" },
  { code: "ms", name: "Malay", native: "Melayu", flag: "🇲🇾" },
  { code: "ta", name: "Tamil", native: "தமிழ்", flag: "🇮🇳" },
  { code: "bn", name: "Bengali", native: "বাংলা", flag: "🇧🇩" },
  { code: "sv", name: "Swedish", native: "Svenska", flag: "🇸🇪" },
  { code: "el", name: "Greek", native: "Ελληνικά", flag: "🇬🇷" },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const item = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};

export default function LanguageGrid() {
  return (
    <section id="languages" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-sm font-medium uppercase tracking-widest text-violet-400">
            Languages
          </span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              23 Languages
            </span>{" "}
            and Growing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
            Real-time voice-cloned translation powered by CosyVoice 2 and
            Chatterbox multilingual TTS engines.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
        >
          {languages.map((lang) => (
            <motion.div
              key={lang.code}
              variants={item}
              whileHover={{ scale: 1.05 }}
              className="group cursor-default rounded-xl border border-white/5 bg-zinc-900/50 p-4 text-center transition-all hover:border-violet-500/30 hover:bg-zinc-900/80"
            >
              <span className="text-2xl">{lang.flag}</span>
              <p className="mt-2 text-sm font-medium text-white">
                {lang.name}
              </p>
              <p className="text-xs text-zinc-500">{lang.native}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-sm text-zinc-600"
        >
          Auto-detects source language. New languages added continuously.
        </motion.p>
      </div>
    </section>
  );
}
