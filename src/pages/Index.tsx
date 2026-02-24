import { useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import TranslationPanel from "@/components/TranslationPanel";
import LanguagesSection from "@/components/LanguagesSection";
import Footer from "@/components/Footer";
import HistoryPage from "@/components/HistoryPage";
import { User } from "@/services/authService";

interface IndexProps {
  user: User;
  onLogout: () => void;
}

const Index = ({ user, onLogout }: IndexProps) => {
  const translateRef = useRef<HTMLDivElement>(null);
  const [showHistory, setShowHistory] = useState(false);

  const scrollToTranslate = () => {
    translateRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (showHistory) {
    return <HistoryPage user={user} onBack={() => setShowHistory(false)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        onGetStarted={scrollToTranslate} 
        user={user} 
        onLogout={onLogout}
        onHistory={() => setShowHistory(true)}
      />
      <HeroSection onGetStarted={scrollToTranslate} />
      <FeaturesSection />
      <div ref={translateRef}>
        <TranslationPanel user={user} />
      </div>
      <LanguagesSection />
      <Footer />
    </div>
  );
};

export default Index;
