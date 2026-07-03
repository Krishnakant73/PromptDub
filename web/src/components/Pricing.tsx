import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try live translation on your favorite streams",
    features: [
      { text: "30 min/day translation", included: true },
      { text: "5 languages", included: true },
      { text: "Dual subtitles", included: true },
      { text: "Voice cloning", included: false },
      { text: "Priority servers", included: false },
      { text: "API access", included: false },
    ],
    cta: "Install Free",
    popular: false,
    gradient: "",
  },
  {
    name: "Starter",
    price: "$9",
    period: "/month",
    description: "For regular viewers who want the full experience",
    features: [
      { text: "5 hours/day translation", included: true },
      { text: "All 23 languages", included: true },
      { text: "Dual subtitles", included: true },
      { text: "Voice cloning", included: true },
      { text: "Priority servers", included: false },
      { text: "API access", included: false },
    ],
    cta: "Start 7-Day Trial",
    popular: false,
    gradient: "",
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "Unlimited translation for power users and creators",
    features: [
      { text: "Unlimited translation", included: true },
      { text: "All 23 languages", included: true },
      { text: "Dual subtitles", included: true },
      { text: "Voice cloning", included: true },
      { text: "Priority servers", included: true },
      { text: "API access", included: true },
    ],
    cta: "Go Pro",
    popular: true,
    gradient: "from-violet-600 to-fuchsia-600",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Self-hosted or dedicated infrastructure for teams",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Self-hosted option", included: true },
      { text: "Dedicated GPU cluster", included: true },
      { text: "Custom model fine-tuning", included: true },
      { text: "SLA guarantee", included: true },
      { text: "Priority support", included: true },
    ],
    cta: "Contact Sales",
    popular: false,
    gradient: "",
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
    <section id="pricing" className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-sm font-medium uppercase tracking-widest text-violet-400">
            Pricing
          </span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
            Simple,{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Transparent
            </span>{" "}
            Pricing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
            Start free. Upgrade when you need more hours or voice cloning.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={item}
              className={`relative rounded-2xl border p-6 transition-all ${
                plan.popular
                  ? "border-violet-500/40 bg-zinc-900/80 shadow-xl shadow-violet-500/10"
                  : "border-white/5 bg-zinc-900/40 hover:border-white/10"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-sm text-zinc-500">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-500">
                  {plan.description}
                </p>
              </div>

              <div className="space-y-3">
                {plan.features.map((f) => (
                  <div key={f.text} className="flex items-center gap-2 text-sm">
                    {f.included ? (
                      <Check size={16} className="flex-shrink-0 text-emerald-400" />
                    ) : (
                      <X size={16} className="flex-shrink-0 text-zinc-600" />
                    )}
                    <span
                      className={f.included ? "text-zinc-300" : "text-zinc-600"}
                    >
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                to="/pricing"
                className={`mt-8 block rounded-xl py-2.5 text-center text-sm font-semibold transition-all ${
                  plan.popular
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
                    : "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
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
