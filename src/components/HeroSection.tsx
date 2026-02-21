import { motion } from "framer-motion";
import { ArrowRight, FileText, Mic, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = ({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/90 via-primary/70 to-background" />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-24">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/20 border border-accent/30 px-4 py-1.5 text-sm font-medium text-primary-foreground mb-6">
              <Languages className="w-4 h-4" />
              AI-Powered Multimodal Translation
            </span>
          </motion.div>

          <motion.h1
            className="font-display text-5xl md:text-7xl font-bold text-primary-foreground leading-tight mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            Break Language{" "}
            <span className="text-accent">Barriers</span> Across India
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Translate text, voice, images, and documents across 20+ Indian languages — 
            with layout preservation and real-time accuracy.
          </motion.p>

          <motion.div
            className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <Button
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base px-8 py-6 rounded-xl shadow-elevated"
              onClick={onGetStarted}
            >
              Start Translating <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-base px-8 py-6 rounded-xl"
            >
              See How It Works
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="flex flex-wrap gap-10 mt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            {[
              { label: "Languages", value: "22+" },
              { label: "File Types", value: "PDF, IMG, Audio" },
              { label: "Layout Preserved", value: "100%" },
            ].map((stat) => (
              <div key={stat.label} className="text-primary-foreground">
                <div className="text-2xl font-bold font-display">{stat.value}</div>
                <div className="text-sm text-primary-foreground/60">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Floating icons */}
        <motion.div
          className="hidden lg:flex absolute right-12 top-1/2 -translate-y-1/2 flex-col gap-6"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {[FileText, Mic, Languages].map((Icon, i) => (
            <motion.div
              key={i}
              className="w-16 h-16 rounded-2xl glass-surface flex items-center justify-center text-primary-foreground"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, delay: i * 0.5, repeat: Infinity }}
            >
              <Icon className="w-7 h-7" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
