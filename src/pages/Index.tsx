import { useRef } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import TranslationPanel from "@/components/TranslationPanel";
import LanguagesSection from "@/components/LanguagesSection";
import Footer from "@/components/Footer";

const Index = () => {
  const translateRef = useRef<HTMLDivElement>(null);

  const scrollToTranslate = () => {
    translateRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onGetStarted={scrollToTranslate} />
      <HeroSection onGetStarted={scrollToTranslate} />
      <FeaturesSection />
      <div ref={translateRef}>
        <TranslationPanel />
      </div>
      <LanguagesSection />
      <Footer />
    </div>
  );
};

export default Index;
