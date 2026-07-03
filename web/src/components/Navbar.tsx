import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

const navLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Languages", href: "#languages" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-purple-500/10 bg-[#050510]/90 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-500 shadow-lg shadow-purple-500/20">
            <span className="text-sm font-extrabold text-white">P</span>
          </div>
          <span className="text-[17px] font-bold tracking-tight">
            <span className="text-purple-400">Prompt</span>
            <span className="text-white">Dub</span>
          </span>
        </Link>

        {/* Center nav links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-zinc-400 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden items-center gap-4 md:flex">
          <a
            href="#"
            className="text-[13px] font-medium text-zinc-400 transition-colors hover:text-white"
          >
            Sign In
          </a>
          <a
            href="#"
            className="rounded-lg bg-gradient-to-r from-[#ff5500] to-[#ff0055] px-5 py-2 text-[13px] font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-red-500/30"
          >
            Install Extension
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-zinc-400 md:hidden"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-purple-500/10 md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-purple-500/10 pt-3">
                <a href="#" className="rounded-lg px-3 py-2 text-sm text-zinc-300">
                  Sign In
                </a>
                <a
                  href="#"
                  className="rounded-lg bg-gradient-to-r from-[#ff5500] to-[#ff0055] px-3 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Install Extension
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
