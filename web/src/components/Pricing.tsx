import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    description: "For casual viewers",
    price: { monthly: 0, annual: 0 },
    features: [
      "60 minutes per month",
      "1 concurrent session",
      "5 languages",
      "Basic voice cloning",
      "Chrome extension",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Starter",
    description: "For regular viewers",
    price: { monthly: 9.99, annual: 7.99 },
    features: [
      "300 minutes per month",
      "2 concurrent sessions",
      "10 languages",
      "Enhanced voice cloning",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Pro",
    description: "For power users & streamers",
    price: { monthly: 19.99, annual: 15.99 },
    features: [
      "Unlimited minutes",
      "5 concurrent sessions",
      "23+ languages",
      "Advanced voice cloning",
      "API access",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For teams & organizations",
    price: { monthly: null, annual: null },
    features: [
      "Custom minutes",
      "Unlimited sessions",
      "23+ languages",
      "Custom voice models",
      "Dedicated infrastructure",
      "SLA & support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="relative section-padding">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="micro-label text-[#7C3AED]">
            Pricing
          </span>
          <h2 className="heading-2 mt-4 text-balance">
            Simple pricing for
            <br />
            every viewer
          </h2>
          <p className="body-md mt-5 text-[#A1A1AA]">
            Start free. Upgrade when you need more minutes, languages, or
            concurrent sessions.
          </p>
        </motion.div>

        {/* Toggle */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <span
            className={`text-[14px] font-medium transition-colors ${
              !annual ? "text-white" : "text-[#A1A1AA]"
            }`}
          >
            Monthly
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className="relative h-7 w-12 rounded-full bg-[#17171B] border border-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]"
            aria-label={`Switch to ${annual ? "monthly" : "annual"} billing`}
          >
            <motion.div
              className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white"
              animate={{ x: annual ? 20 : 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            />
          </button>
          <span
            className={`text-[14px] font-medium transition-colors ${
              annual ? "text-white" : "text-[#A1A1AA]"
            }`}
          >
            Annual
          </span>
          {annual && (
            <span className="ml-2 rounded-full bg-[#22C55E]/10 px-3 py-1 text-[12px] font-semibold text-[#22C55E]">
              Save 20%
            </span>
          )}
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: i * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`glass-card rounded-2xl p-6 ${
                plan.popular
                  ? "border-[#7C3AED]/30 bg-[#7C3AED]/5 shadow-[0_0_40px_rgba(124,58,237,0.1)]"
                  : ""
              }`}
            >
              {plan.popular && (
                <div className="mb-4 inline-flex rounded-full bg-[#7C3AED] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  Most Popular
                </div>
              )}

              <h3 className="text-[16px] font-semibold text-white">
                {plan.name}
              </h3>
              <p className="caption mt-1 text-[#A1A1AA]">
                {plan.description}
              </p>

              <div className="mt-6 mb-6">
                {plan.price.monthly !== null ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-[36px] font-bold text-white">
                      ${annual ? plan.price.annual : plan.price.monthly}
                    </span>
                    <span className="body-sm text-[#A1A1AA]">/mo</span>
                  </div>
                ) : (
                  <div className="text-[36px] font-bold text-white">Custom</div>
                )}
              </div>

              <ul className="mb-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <Check size={16} className="shrink-0 text-[#22C55E]" />
                    <span className="body-sm text-[#A1A1AA]">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#"
                className={`magnetic-btn block w-full rounded-xl py-3 text-center text-[14px] font-semibold transition-all duration-300 ${
                  plan.popular
                    ? "btn-primary"
                    : "btn-secondary"
                }`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}