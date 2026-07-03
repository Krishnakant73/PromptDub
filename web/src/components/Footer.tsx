import { motion } from "framer-motion";
import { Github, Twitter, Youtube, MessageCircle, Heart, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const footerSections = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Languages", href: "#languages" },
    { label: "Chrome Extension", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  Developers: [
    { label: "Documentation", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "Self-Hosting Guide", href: "#" },
    { label: "GitHub Repo", href: "#" },
    { label: "Contributing", href: "#" },
  ],
  Resources: [
    { label: "Blog", href: "#" },
    { label: "Tutorials", href: "#" },
    { label: "Status Page", href: "#" },
    { label: "Community", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
    { label: "GDPR", href: "#" },
  ],
};

const socials = [
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Youtube, href: "#", label: "YouTube" },
  { icon: MessageCircle, href: "#", label: "Discord" },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-purple-500/10 bg-[#030308]">
      {/* Top glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 h-px w-3/4 -translate-x-1/2 bg-linear-to-r from-transparent via-purple-500/30 to-transparent" />

      <div className="mx-auto max-w-7xl px-6">
        {/* Main footer content */}
        <div className="grid gap-10 pt-14 pb-10 md:grid-cols-6 lg:grid-cols-12">
          {/* Brand + socials */}
          <div className="md:col-span-3 lg:col-span-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-purple-600 to-fuchsia-500 shadow-lg shadow-purple-500/15">
                <span className="text-sm font-extrabold text-white">P</span>
              </div>
              <span className="text-[17px] font-bold tracking-tight">
                <span className="text-purple-400">Prompt</span>
                <span className="text-white">Dub</span>
              </span>
            </Link>

            <p className="mt-4 max-w-[280px] text-[13px] leading-relaxed text-zinc-600">
              Real-time AI stream translation with emotional voice cloning.
              Hear any live stream in your language — with the streamer's own voice.
            </p>

            {/* Social icons */}
            <div className="mt-5 flex items-center gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-purple-500/10 bg-purple-500/5 text-zinc-600 transition-all hover:border-purple-500/25 hover:bg-purple-500/10 hover:text-purple-400"
                >
                  <s.icon size={15} />
                </a>
              ))}
            </div>

            {/* Install CTA */}
            <a
              href="#"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-[#ff5500] to-[#ff0055] px-5 py-2 text-[12px] font-semibold text-white shadow-lg shadow-red-500/15 transition-all hover:shadow-red-500/25"
            >
              Install Chrome Extension
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Link columns */}
          {Object.entries(footerSections).map(([category, links]) => (
            <div key={category} className="md:col-span-1 lg:col-span-2">
              <h4 className="mb-4 text-[12px] font-semibold uppercase tracking-[1.5px] text-zinc-400">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[13px] text-zinc-600 transition-colors hover:text-purple-400"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-linear-to-r from-transparent via-purple-500/10 to-transparent" />

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-between gap-4 py-6 md:flex-row"
        >
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-700">
            <span>&copy; {new Date().getFullYear()} PromptDub. All rights reserved.</span>
            <span className="hidden md:inline">•</span>
            <span>Made in India</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-700">
              Built with <Heart size={10} className="text-red-500" /> using 100% open-source AI
            </div>
            <div className="hidden h-3 w-px bg-zinc-800 md:block" />
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-700">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              All systems operational
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
