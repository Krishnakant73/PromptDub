import { motion } from "framer-motion";
import { Check, X, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try live translation on your favorite streams",
    features: [
      "30 min/day translation",
      "5 target languages",
      "Dual subtitles overlay",
      "Basic audio ducking",
    ],
    excluded: [
      "Voice cloning",
      "Priority servers",
      "API access",
      "Session history",
    ],
    cta: "Install Free",
    popular: false,
  },
  {
    name: "Starter",
    price: "$9",
    period: "/month",
    description: "For regular viewers who want the full experience",
    features: [
      "5 hours/day translation",
      "All 23 languages",
      "Dual subtitles overlay",
      "Voice cloning",
      "Smart audio ducking",
      "Session history (30 days)",
    ],
    excluded: ["Priority servers", "API access"],
    cta: "Start 7-Day Trial",
    popular: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "Unlimited translation for power users and creators",
    features: [
      "Unlimited translation",
      "All 23 languages",
      "Dual subtitles overlay",
      "Voice cloning",
      "Smart audio ducking",
      "Session history (unlimited)",
      "Priority GPU servers",
      "REST API access",
      "Multi-stream support",
    ],
    excluded: [],
    cta: "Go Pro",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Self-hosted or dedicated infrastructure for teams",
    features: [
      "Everything in Pro",
      "Self-hosted deployment",
      "Dedicated GPU cluster",
      "Custom model fine-tuning",
      "99.9% SLA guarantee",
      "Priority support",
      "Custom integrations",
      "Volume discounts",
    ],
    excluded: [],
    cta: "Contact Sales",
    popular: false,
  },
];

const faqs = [
  {
    q: "How does the free plan work?",
    a: "Install the Chrome extension and get 30 minutes of live translation daily. No credit card required. Translation uses shared GPU servers with best-effort latency.",
  },
  {
    q: "What is voice cloning?",
    a: "Voice cloning recreates the streamer's voice in your target language. The AI captures their vocal characteristics from a 5-second sample and generates speech that sounds like them — with their original emotions preserved.",
  },
  {
    q: "Can I self-host PromptDub?",
    a: "Yes! The entire AI stack is open source. Enterprise plans include deployment support, but you can also self-host the community edition with Docker Compose and a single NVIDIA GPU (A10G or better).",
  },
  {
    q: "Which languages are supported?",
    a: "We support 23 languages including Hindi, Spanish, Portuguese, French, German, Japanese, Korean, Chinese, Arabic, Russian, and more. Source language is auto-detected.",
  },
  {
    q: "What's the actual latency?",
    a: "Our pipeline runs in 375-910ms end-to-end: ~30ms for speech recognition, ~85ms for translation, and ~150ms for voice synthesis. Total is always under 1.5 seconds.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#050510] text-white font-[Inter,system-ui,sans-serif]">
      <Navbar />

      <section className="pt-32 pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-1 text-sm text-zinc-600 transition-colors hover:text-white"
          >
            <ArrowLeft size={14} />
            Back to Home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Choose Your{" "}
              <span className="bg-linear-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                Plan
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[15px] text-zinc-500">
              Start free. Upgrade when you need more. Cancel anytime.
            </p>
          </motion.div>

          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  tier.popular
                    ? "border-purple-500/30 bg-[#0f0a20] shadow-xl shadow-purple-500/10"
                    : "border-purple-500/10 bg-[#0a0a1a]/80"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-linear-to-r from-[#ff5500] to-[#ff0055] px-4 py-1 text-[11px] font-semibold text-white">
                    Most Popular
                  </div>
                )}

                <h3 className="text-[15px] font-semibold text-zinc-300">{tier.name}</h3>
                <div className="mt-2 flex items-baseline gap-0.5">
                  <span className="text-[36px] font-bold">{tier.price}</span>
                  <span className="text-[14px] text-zinc-500">{tier.period}</span>
                </div>
                <p className="mt-1.5 text-[12px] text-zinc-600">{tier.description}</p>

                <div className="mt-6 flex-1 space-y-2.5">
                  {tier.features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-[13px]">
                      <Check size={14} className="shrink-0 text-emerald-400" />
                      <span className="text-zinc-400">{f}</span>
                    </div>
                  ))}
                  {tier.excluded.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-[13px]">
                      <X size={14} className="shrink-0 text-zinc-700" />
                      <span className="text-zinc-700">{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  className={`mt-7 w-full rounded-xl py-2.5 text-[13px] font-semibold transition-all ${
                    tier.popular
                      ? "bg-linear-to-r from-[#ff5500] to-[#ff0055] text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30"
                      : "border border-purple-500/15 bg-purple-500/5 text-zinc-300 hover:border-purple-500/30 hover:bg-purple-500/10"
                  }`}
                >
                  {tier.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-purple-500/10 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center text-3xl font-bold"
          >
            Frequently Asked Questions
          </motion.h2>

          <div className="space-y-5">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-purple-500/10 bg-[#0a0a1a]/80 p-6"
              >
                <h3 className="text-[15px] font-semibold">{faq.q}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
