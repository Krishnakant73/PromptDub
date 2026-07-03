import { motion } from "framer-motion";
import { ArrowRight, Play, Globe, Zap } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 h-[400px] w-[400px] rounded-full bg-fuchsia-600/15 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300"
          >
            <Zap size={14} />
            <span>Real-time AI Translation &mdash; Under 1.5s Latency</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl font-extrabold leading-tight tracking-tight md:text-7xl"
          >
            Hear Any Stream{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              In Your Language
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 md:text-xl"
          >
            AI-powered live translation with emotional voice cloning for YouTube
            and Twitch. The streamer speaks — you hear their voice in your
            language, with every emotion preserved.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <a
              href="#"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-violet-500/25 transition-all hover:shadow-violet-500/40"
            >
              Install Free Extension
              <ArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </a>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-medium text-zinc-300 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10"
            >
              <Play size={18} />
              See How It Works
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mx-auto mt-12 flex max-w-lg items-center justify-center gap-8 text-sm text-zinc-500"
          >
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-violet-400" />
              <span>23+ Languages</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-fuchsia-400" />
              <span>&lt;1.5s Latency</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>100% Open Source AI</span>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative mx-auto mt-20 max-w-5xl"
        >
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 p-2 shadow-2xl">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-950">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-600/20 backdrop-blur-sm">
                    <Play size={28} className="ml-1 text-violet-400" />
                  </div>
                  <p className="text-sm text-zinc-500">
                    Live Translation Demo
                  </p>
                </div>
              </div>

              <div className="absolute right-4 bottom-16 left-4 space-y-2">
                <div className="rounded-lg bg-black/60 px-4 py-2 text-center backdrop-blur-sm">
                  <p className="text-xs text-zinc-400">
                    "Today we're going to talk about the latest features..."
                  </p>
                </div>
                <div className="rounded-lg bg-violet-600/80 px-4 py-2 text-center backdrop-blur-sm">
                  <p className="text-sm font-medium text-white">
                    "आज हम नवीनतम सुविधाओं के बारे में बात करेंगे..."
                  </p>
                </div>
              </div>

              <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <span className="text-xs font-medium text-white">LIVE</span>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-r from-violet-600/10 via-transparent to-fuchsia-600/10 blur-2xl" />
        </motion.div>
      </div>
    </section>
  );
}
