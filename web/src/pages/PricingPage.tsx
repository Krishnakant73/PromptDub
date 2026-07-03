import { motion } from "framer-motion";
import { Check, X, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import FAQ from "../components/FAQ";
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
    highlighted: false,
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
    highlighted: false,
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
    highlighted: true,
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
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-white overflow-x-hidden">
      <Navbar />

      <section className="pt-32 pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-[#A1A1AA]/60 transition-colors duration-200 hover:text-white"
          >
            <ArrowLeft size={14} />
            Back to Home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-2xl text-center"
          >
            <h1 className="text-[40px] font-bold tracking-[-0.02em] md:text-[56px]">
              Choose your plan
            </h1>
            <p className="mt-4 text-[16px] text-[#A1A1AA]">
              Start free. Upgrade when you need more. Cancel anytime.
            </p>
          </motion.div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`relative flex flex-col rounded-2xl border p-7 ${
                  tier.highlighted
                    ? "border-[#7C3AED]/30 bg-[#7C3AED]/[0.05]"
                    : "border-white/[0.06] bg-[#111113]"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#7C3AED] px-4 py-1 text-[11px] font-semibold text-white">
                    Most Popular
                  </div>
                )}

                <h3 className="text-[14px] font-semibold text-[#A1A1AA]">
                  {tier.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-[40px] font-bold tracking-tight">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-[14px] text-[#A1A1AA]">
                      {tier.period}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[12px] text-[#A1A1AA]/60">
                  {tier.description}
                </p>

                <div className="mt-7 flex-1 space-y-3">
                  {tier.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <Check
                        size={15}
                        className="mt-0.5 shrink-0 text-[#22C55E]"
                      />
                      <span className="text-[13px] text-[#A1A1AA]">{f}</span>
                    </div>
                  ))}
                  {tier.excluded.map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <X
                        size={15}
                        className="mt-0.5 shrink-0 text-white/10"
                      />
                      <span className="text-[13px] text-white/20">{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  className={`mt-8 w-full rounded-xl py-3 text-[13px] font-semibold transition-all duration-300 ${
                    tier.highlighted
                      ? "bg-[#7C3AED] text-white hover:bg-[#6D28D9] hover:shadow-[0_0_30px_rgba(124,58,237,0.25)]"
                      : "border border-white/[0.08] bg-white/[0.03] text-[#A1A1AA] hover:border-white/[0.15] hover:text-white"
                  }`}
                >
                  {tier.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <FAQ />
      <Footer />
    </div>
  );
}
