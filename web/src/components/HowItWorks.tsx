import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Install Extension",
    description:
      "Add PromptDub to Chrome in one click. No setup required — it's ready to go.",
  },
  {
    number: "02",
    title: "Select Language",
    description:
      "Choose your target language and the stream you want to translate.",
  },
  {
    number: "03",
    title: "Clone Voice",
    description:
      "PromptDub listens for 5 seconds to build a voice profile of the speaker.",
  },
  {
    number: "04",
    title: "Hear Translation",
    description:
      "Get real-time translated audio in the speaker's cloned voice with full emotion.",
  },
];

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how-it-works" className="relative section-padding">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Left - Steps */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="micro-label text-[#7C3AED]">
                How It Works
              </span>
              <h2 className="heading-2 mt-4 text-balance">
                Four simple steps to
                <br />
                global understanding
              </h2>
            </motion.div>

            <div className="mt-12 space-y-4">
              {steps.map((step, i) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`glass-card rounded-2xl p-6 cursor-pointer transition-all duration-300 ${
                    activeStep === i
                      ? "border-[#7C3AED]/30 bg-[#7C3AED]/5"
                      : "hover:border-white/[0.1]"
                  }`}
                  onClick={() => setActiveStep(i)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold transition-colors duration-300 ${
                        activeStep === i
                          ? "bg-[#7C3AED] text-white"
                          : "bg-[#17171B] text-[#A1A1AA]"
                      }`}
                    >
                      {activeStep > i ? (
                        <Check size={16} />
                      ) : (
                        step.number
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[15px] font-semibold text-white">
                          {step.title}
                        </h3>
                        <ChevronDown
                          size={16}
                          className={`text-[#A1A1AA] transition-transform duration-300 ${
                            activeStep === i ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                      <p
                        className={`body-sm mt-1.5 text-[#A1A1AA] transition-all duration-300 ${
                          activeStep === i
                            ? "max-h-40 opacity-100"
                            : "max-h-0 opacity-0 overflow-hidden"
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right - Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex items-center justify-center"
          >
            <div className="relative w-full max-w-lg">
              <div className="glass-card rounded-[32px] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                {/* Step visualization */}
                <div className="space-y-6">
                  {steps.map((step, i) => (
                    <div
                      key={step.number}
                      className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 ${
                        activeStep === i
                          ? "bg-[#7C3AED]/10 border border-[#7C3AED]/20"
                          : "opacity-40"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold ${
                          activeStep >= i
                            ? "bg-[#7C3AED] text-white"
                            : "bg-[#17171B] text-[#A1A1AA]"
                        }`}
                      >
                        {activeStep > i ? (
                          <Check size={16} />
                        ) : (
                          step.number
                        )}
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-white">
                          {step.title}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress indicator */}
                <div className="mt-8 h-1 rounded-full bg-[#17171B] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-[#7C3AED]"
                    initial={{ width: "0%" }}
                    animate={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}