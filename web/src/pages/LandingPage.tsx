import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import TrustedBy from "../components/TrustedBy";
import Features from "../components/Features";
import Showcase from "../components/Showcase";
import HowItWorks from "../components/HowItWorks";
import Benefits from "../components/Benefits";
import Testimonials from "../components/Testimonials";
import Pricing from "../components/Pricing";
import FAQ from "../components/FAQ";
import Footer from "../components/Footer";
import { AnimeNavBar } from "../components/ui/anime-navbar";
import { Home, FileText, CreditCard, Info } from "lucide-react";

const navItems = [
  { name: "Home", url: "/", icon: Home },
  { name: "Features", url: "/#features", icon: FileText },
  { name: "Pricing", url: "/pricing", icon: CreditCard },
  { name: "About", url: "/#about", icon: Info },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-white overflow-x-hidden">
      <AnimeNavBar items={navItems} defaultActive="Home" />
      <Hero />
      <TrustedBy />
      <Features />
      <Showcase />
      <HowItWorks />
      <Benefits />
      <Testimonials />
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  );
}