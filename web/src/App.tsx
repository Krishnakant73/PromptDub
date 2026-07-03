import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import PricingPage from "./pages/PricingPage";
import CtaFaqFooterPage from "./pages/CtaFaqFooterPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/cta-faq" element={<CtaFaqFooterPage />} />
      </Routes>
    </BrowserRouter>
  );
}
