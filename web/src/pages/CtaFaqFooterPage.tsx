import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const faqData = [
  {
    question: "What is the maximum amount I can send?",
    answer:
      "Transfer limits depend on your verification level and country. You can check your limits inside your account settings.",
  },
  {
    question: "Does my recipient need an account?",
    answer:
      "No, your recipient doesn't need an account. Funds can be sent directly to their bank account or mobile wallet.",
  },
  {
    question: "Is there a mobile app available?",
    answer:
      "Yes, our mobile app is available on both iOS and Android for easy transfers on the go.",
  },
  {
    question: "Can I cancel a transfer?",
    answer:
      "Transfers can be cancelled if they have not yet been processed by the receiving bank. Check your transfer status for options.",
  },
  {
    question: "What currencies are supported?",
    answer:
      "We support over 50 currencies worldwide. You can view the full list of supported currencies in our app or website.",
  },
];

export default function CtaFaqFooterPage() {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const [email, setEmail] = useState("");
  const [buttonShadow, setButtonShadow] = useState(
    "0 10px 20px rgba(0,0,0,0.3)"
  );

  const toggleFaq = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="bg-white text-neutral-900 min-h-screen"
    >
      <main className="py-20 max-[900px]:py-[60px]">
        <div className="max-w-[1100px] w-full mx-auto px-5">
          <div className="grid grid-cols-[1.6fr_1fr] gap-[30px] items-stretch max-[900px]:grid-cols-1 max-[900px]:gap-[60px]">
            {/* Left — CTA Card */}
            <div
              className="c5-animated-gradient rounded-[24px] py-20 px-10 text-white flex flex-col justify-center items-center text-center"
              style={{ boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)" }}
            >
              <h2
                className="font-normal leading-[1.1] mb-[15px]"
                style={{ fontSize: "3.5rem", letterSpacing: "-0.03em" }}
              >
                Ready to Transfer
                <br />
                Without Borders?
              </h2>
              <p className="text-[0.9rem] mb-[30px] font-normal opacity-85">
                Send Money Worldwide at the Best Rates
              </p>
              <button
                className="bg-neutral-900 text-white font-semibold cursor-pointer border-none text-[0.95rem] transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  padding: "14px 32px",
                  borderRadius: "12px",
                  boxShadow: buttonShadow,
                }}
                onMouseEnter={() =>
                  setButtonShadow("0 14px 30px rgba(0,0,0,0.4)")
                }
                onMouseLeave={() =>
                  setButtonShadow("0 10px 20px rgba(0,0,0,0.3)")
                }
              >
                Get Started Today
              </button>
            </div>

            {/* Right — FAQ Accordion */}
            <div className="flex flex-col justify-center gap-3">
              {faqData.map((item, index) => {
                const isActive = activeIndex === index;
                return (
                  <div
                    key={index}
                    onClick={() => toggleFaq(index)}
                    className={`bg-white border rounded-[10px] py-[18px] px-5 cursor-pointer transition-all duration-200 ${
                      isActive ? "border-[#eaeaea]" : "border-[#f0f0f0]"
                    } hover:border-[#eaeaea]`}
                    style={{
                      boxShadow: isActive
                        ? "0 4px 12px rgba(0,0,0,0.04)"
                        : "0 2px 8px rgba(0,0,0,0.02)",
                    }}
                  >
                    <div className="flex justify-between items-center font-normal text-[0.9rem] text-neutral-900">
                      <span>{item.question}</span>
                      {isActive ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </div>
                    {isActive && (
                      <p className="mt-3 text-[0.9rem] text-[#666] leading-[1.6]">
                        {item.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#fafafa] pt-20 pb-5 max-[900px]:pt-[60px]">
        <div className="max-w-[1100px] w-full mx-auto px-5">
          <div className="grid grid-cols-[2fr_1fr_1fr_2fr] gap-10 mb-[50px] max-[900px]:grid-cols-2 max-[480px]:grid-cols-1">
            {/* Logo Column */}
            <div>
              <img
                src="https://pub-f170a2592d2c4a1485466404c36807be.r2.dev/Tests/logoipsum-415.svg"
                className="h-6 mb-[15px]"
                style={{ filter: "brightness(0)" }}
                alt="Logo"
              />
              <p className="text-[0.85rem] text-[#888] leading-[1.6] max-w-[220px]">
                Reliable transfers that always reach their destination on time.
              </p>
            </div>

            {/* Navigation Column */}
            <div>
              <h4 className="font-semibold mb-5 text-[0.95rem] text-neutral-900">
                Navigation
              </h4>
              <ul className="list-none p-0 m-0">
                {["Features", "Benefits", "Testimonials", "Pricing"].map(
                  (item) => (
                    <li key={item} className="mb-3">
                      <a
                        href="#"
                        className="text-[#888] no-underline text-[0.85rem] transition-colors duration-200 hover:text-neutral-900"
                      >
                        {item}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Pages Column */}
            <div>
              <h4 className="font-semibold mb-5 text-[0.95rem] text-neutral-900">
                Pages
              </h4>
              <ul className="list-none p-0 m-0">
                {["Home", "Contact", "404"].map((item) => (
                  <li key={item} className="mb-3">
                    <a
                      href="#"
                      className="text-[#888] no-underline text-[0.85rem] transition-colors duration-200 hover:text-neutral-900"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter Column */}
            <div>
              <h4 className="font-semibold mb-5 text-[0.95rem] text-neutral-900">
                Newsletter
              </h4>
              <p className="text-[0.85rem] text-[#888] mb-[15px]">
                Join our newsletter and get notified.
              </p>
              <div className="flex gap-[10px]">
                <input
                  type="email"
                  placeholder="Enter your email..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-grow border border-[#f0f0f0] bg-white outline-none transition-colors duration-200 focus:border-[#ccc] text-[0.9rem]"
                  style={{
                    padding: "12px 16px",
                    borderRadius: "10px",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.02)",
                  }}
                />
                <button
                  className="bg-neutral-900 text-white border-none font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 text-[0.9rem]"
                  style={{
                    padding: "12px 28px",
                    borderRadius: "10px",
                    boxShadow: "0 12px 24px rgba(0,0,0,0.4)",
                  }}
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-[#f0f0f0] pt-[25px] pb-[10px] flex justify-between text-[0.85rem] text-[#888] max-[480px]:flex-col max-[480px]:gap-[15px] max-[480px]:items-center">
            <span>All rights reserved. &copy; 2025</span>
            <span>Designed by Peter Design</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
