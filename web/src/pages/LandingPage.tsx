import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import HowItWorks from "../components/HowItWorks";
import Features from "../components/Features";
import LanguageGrid from "../components/LanguageGrid";
import TechStack from "../components/TechStack";
import Pricing from "../components/Pricing";
import Footer from "../components/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050510] text-white font-[Inter,system-ui,sans-serif] overflow-x-hidden">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <LanguageGrid />
      <TechStack />
      <Pricing />
      <Footer />
    </div>
  );
}
