import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "I watched a Japanese streamer for the first time in my language. The voice cloning is eerie — it's like they're actually speaking English.",
    author: "Sarah Chen",
    role: "Content Creator",
    rating: 5,
  },
  {
    quote:
      "We use PromptDub in our company to translate internal streams for global teams. The latency is incredible — it feels like real-time interpretation.",
    author: "Marcus Rivera",
    role: "Engineering Lead at StreamCo",
    rating: 5,
  },
  {
    quote:
      "As someone who's hard of hearing, this is a game-changer. The emotional nuances in the voice make content feel truly accessible.",
    author: "Emma Johansson",
    role: "Accessibility Advocate",
    rating: 5,
  },
  {
    quote:
      "The fact that it's fully open source and runs locally is huge. No data leaves my machine — that's privacy done right.",
    author: "David Park",
    role: "Security Researcher",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="relative section-padding">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="micro-label text-[#7C3AED]">
            Testimonials
          </span>
          <h2 className="heading-2 mt-4 text-balance">
            Loved by streamers and
            <br />
            teams worldwide
          </h2>
        </motion.div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: i * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="glass-card rounded-2xl p-8"
            >
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star
                    key={j}
                    size={16}
                    className="fill-[#F59E0B] text-[#F59E0B]"
                  />
                ))}
              </div>
              <p className="body-md text-white leading-relaxed">
                "{t.quote}"
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7C3AED]/20 text-[14px] font-bold text-[#7C3AED]">
                  {t.author.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-white">
                    {t.author}
                  </div>
                  <div className="caption text-[#A1A1AA]">
                    {t.role}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}