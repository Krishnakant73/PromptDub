import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    description: "Try live translation on your favorite streams",
    features: [
      "30 min/day translation",
      "2 languages",
      "Basic subtitles",
      "Public pipeline",
    ],
    cta: "Install Free",
    popular: false,
  },
  {
    name: "Starter",
    price: "$9",
    period: "/mo",
    description: "For regular viewers who want more",
    features: [
      "30 hrs/month",
      "All 23 languages",
      "Dual subtitles",
      "Priority servers",
    ],
    cta: "Start 7-Day Trial",
    popular: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    description: "Unlimited translation for power users & creators",
    features: [
      "Unlimited translation",
      "All 23 languages",
      "Voice cloning",
      "Priority servers",
      "All features",
    ],
    cta: "Go Pro",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For teams or dedicated deployments",
    features: [
      "Everything in Pro",
      "Self-hosted option",
      "Dedicated GPU cluster",
      "Custom model fine-tuning",
      "SLA & premium support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Pricing() {
  return (
    <section id="pricing" className="relative py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 h-150 w-150 -translate-x-1/2 rounded-full bg-purple-800/10 blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-[12px] font-semibold uppercase tracking-[3px] text-purple-400">
            Pricing
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-[42px]">
            Simple,{" "}
            <span className="text-white">Transparent</span>{" "}
            Pricing
          </h2>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={item}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                plan.popular
                  ? "border-purple-500/30 bg-[#0f0a20] shadow-xl shadow-purple-500/10"
                  : "border-purple-500/10 bg-[#0a0a1a]/80 hover:border-purple-500/20"
              }`}
            >
              {/* Most Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-linear-to-r from-[#ff5500] to-[#ff0055] px-4 py-1 text-[11px] font-semibold text-white">
                  Most Popular
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-[15px] font-semibold text-zinc-300">
                  {plan.name}
                </h3>
                <div className="mt-2 flex items-baseline gap-0.5">
                  <span className="text-[36px] font-bold text-white">
                    {plan.price}
                  </span>
                  <span className="text-[14px] text-zinc-500">{plan.period}</span>
                </div>
                <p className="mt-1.5 text-[12px] text-zinc-600">
                  {plan.description}
                </p>
              </div>

              {/* Feature list */}
              <div className="flex-1 space-y-3">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-[13px]">
                    <Check size={14} className="shrink-0 text-emerald-400" />
                    <span className="text-zinc-400">{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA button */}
              <Link
                to="/pricing"
                className={`mt-7 block rounded-xl py-2.5 text-center text-[13px] font-semibold transition-all ${
                  plan.popular
                    ? "bg-linear-to-r from-[#ff5500] to-[#ff0055] text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30"
                    : "border border-purple-500/15 bg-purple-500/5 text-zinc-300 hover:border-purple-500/30 hover:bg-purple-500/10"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
