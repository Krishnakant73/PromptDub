import { motion } from "framer-motion";
import {
  Headphones,
  Timer,
  Subtitles,
  Volume1,
  Shield,
  MonitorPlay,
} from "lucide-react";

const features = [
  {
    icon: Headphones,
    title: "Emotional Voice Cloning",
    description: "Retains the emotion, energy & vibe of original voice",
    color: "from-fuchsia-500/20 to-purple-600/20",
    ring: "ring-fuchsia-500/15",
    iconColor: "text-fuchsia-400",
  },
  {
    icon: Timer,
    title: "Sub-1s Latency",
    description: "Real-time translation under 1000ms",
    color: "from-blue-500/20 to-cyan-600/20",
    ring: "ring-blue-500/15",
    iconColor: "text-blue-400",
  },
  {
    icon: Subtitles,
    title: "Dual Subtitles",
    description: "See both original and translated text side-by-side",
    color: "from-green-500/20 to-emerald-600/20",
    ring: "ring-green-500/15",
    iconColor: "text-green-400",
  },
  {
    icon: Volume1,
    title: "Smart Audio Ducking",
    description: "Auto-lowers music & background for clear voice",
    color: "from-orange-500/20 to-amber-600/20",
    ring: "ring-orange-500/15",
    iconColor: "text-orange-400",
  },
  {
    icon: Shield,
    title: "100% Open Source AI",
    description: "Privacy-first AI models you can trust",
    color: "from-violet-500/20 to-purple-600/20",
    ring: "ring-violet-500/15",
    iconColor: "text-violet-400",
  },
  {
    icon: MonitorPlay,
    title: "YouTube & Twitch",
    description: "Works across all major streaming platforms",
    color: "from-red-500/20 to-pink-600/20",
    ring: "ring-red-500/15",
    iconColor: "text-red-400",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Features() {
  return (
    <section id="features" className="relative py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-[12px] font-semibold uppercase tracking-[3px] text-purple-400">
            Features
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-[42px]">
            Everything You Need for{" "}
            <span className="bg-linear-to-r from-[#ff5500] via-[#ff0055] to-[#cc00aa] bg-clip-text text-transparent">
              Global Streams
            </span>
          </h2>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              className="group flex flex-col items-center rounded-2xl border border-purple-500/10 bg-[#0a0a1a]/80 p-5 text-center transition-all hover:border-purple-500/20"
            >
              {/* Icon circle */}
              <div
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br ${f.color} ring-1 ${f.ring}`}
              >
                <f.icon size={22} className={f.iconColor} />
              </div>

              <h3 className="text-[13px] font-semibold leading-tight text-white">
                {f.title}
              </h3>
              <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
                {f.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
