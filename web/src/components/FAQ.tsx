import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    question: "How does voice cloning work?",
    answer:
      "PromptDub listens to 5 seconds of the speaker's voice during a stream and builds a voice profile using CosyVoice 2. This profile captures the speaker's tone, pitch, and speaking style. The cloned voice is then used to translate and speak the content in your chosen language, preserving emotional nuances.",
  },
  {
    question: "What languages are supported?",
    answer:
      "We currently support 23+ languages including English, Spanish, French, German, Japanese, Korean, Chinese, Portuguese, Italian, Russian, and more. New languages are added regularly through community contributions and model updates.",
  },
  {
    question: "Is my data private?",
    answer:
      "Yes, absolutely. PromptDub is fully open source and runs locally on your machine. Audio is processed in real-time and never stored or transmitted to external servers. The voice cloning happens entirely on your device — no data leaves your computer.",
  },
  {
    question: "What's the latency like?",
    answer:
      "End-to-end latency is typically under 1 second. The full pipeline — speech recognition (Faster-Whisper), translation (Qwen-2.5), and voice synthesis (CosyVoice 2) — completes in approximately 375-910ms, well under our 1500ms target.",
  },
  {
    question: "Can I self-host PromptDub?",
    answer:
      "Yes. PromptDub is 100% open source. You can self-host the entire stack using Docker Compose. We provide production-ready configurations for GPU-enabled servers with NVIDIA A10G, T4, or RTX 4090.",
  },
  {
    question: "Does it work with Twitch too?",
    answer:
      "Yes. PromptDub works with any live streaming platform that plays audio in your browser, including YouTube, Twitch, and other platforms. The Chrome extension captures audio from any active tab.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="relative section-padding">
      <div className="mx-auto max-w-3xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <span className="micro-label text-[#7C3AED]">
            FAQ
          </span>
          <h2 className="heading-2 mt-4 text-balance">
            Frequently asked questions
          </h2>
        </motion.div>

        <div className="mt-12 space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={faq.question}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: i * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="glass-card rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-inset rounded-2xl"
                aria-expanded={openIndex === i}
                aria-controls={`faq-answer-${i}`}
              >
                <span className="text-[15px] font-semibold text-white pr-4">
                  {faq.question}
                </span>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 ${
                    openIndex === i
                      ? "bg-[#7C3AED]/10 text-[#7C3AED]"
                      : "bg-[#17171B] text-[#A1A1AA]"
                  }`}
                >
                  {openIndex === i ? <Minus size={16} /> : <Plus size={16} />}
                </div>
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    id={`faq-answer-${i}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6">
                      <p className="body-md text-[#A1A1AA] leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}