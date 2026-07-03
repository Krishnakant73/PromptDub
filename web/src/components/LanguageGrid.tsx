import { motion } from "framer-motion";

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

        {/* Language flags from reference design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 flex justify-center"
        >
          <img
            src="/assets/language_flags.png"
            alt="Supported languages: Hindi, English, Spanish, French, Japanese, Korean, Portuguese, German, Russian, Chinese and 13 more"
            className="w-full max-w-4xl object-contain"
            draggable={false}
          />
        </motion.div>
      </div>
    </section>
  );
}
