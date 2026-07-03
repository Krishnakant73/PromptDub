import { motion } from "framer-motion";

const companies = [
  "YouTube",
  "Twitch",
  "Discord",
  "Spotify",
  "Netflix",
  "Amazon",
];

export default function TrustedBy() {
  return (
    <section className="relative border-y border-white/[0.04] py-16">
      <div className="mx-auto max-w-7xl px-6">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="micro-label mb-10 text-center text-[#A1A1AA]/60"
        >
          Trusted by creators and teams worldwide
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-x-16 gap-y-6"
        >
          {companies.map((name) => (
            <span
              key={name}
              className="text-[16px] font-semibold tracking-tight text-white/20 transition-colors duration-300 hover:text-white/40"
            >
              {name}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}