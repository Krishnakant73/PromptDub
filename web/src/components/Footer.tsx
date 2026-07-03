import { motion } from "framer-motion";
import { Github, Twitter, Heart } from "lucide-react";
import { Link } from "react-router-dom";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Languages", href: "#languages" },
    { label: "Changelog", href: "#" },
  ],
  Developers: [
    { label: "Documentation", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "Self-Hosting", href: "#" },
    { label: "GitHub", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Contact", href: "#" },
    { label: "Privacy", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
                <span className="text-sm font-bold text-white">P</span>
              </div>
              <span className="text-lg font-bold tracking-tight">
                Prompt<span className="text-violet-400">Dub</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
              Real-time AI stream translation with emotional voice cloning.
              Break language barriers on YouTube and Twitch.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <a
                href="#"
                className="text-zinc-600 transition-colors hover:text-white"
              >
                <Github size={20} />
              </a>
              <a
                href="#"
                className="text-zinc-600 transition-colors hover:text-white"
              >
                <Twitter size={20} />
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="mb-4 text-sm font-semibold text-zinc-300">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-zinc-600 transition-colors hover:text-zinc-300"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 md:flex-row"
        >
          <p className="text-sm text-zinc-600">
            &copy; {new Date().getFullYear()} PromptDub. All rights reserved.
          </p>
          <p className="flex items-center gap-1 text-sm text-zinc-600">
            Built with <Heart size={14} className="text-red-500" /> using 100%
            open-source AI
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
