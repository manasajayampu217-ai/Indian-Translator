import { motion } from "framer-motion";
import { ArrowRight, FileText, Mic, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = ({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-accent" />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-white mb-4 sm:mb-6">
              <Languages className="w-3 h-3 sm:w-4 sm:h-4" />
              AI-Powered Multimodal Translation
            </span>
          </motion.div>

          <motion.h1
            className="font-display text-3xl sm:text-5xl md:text-7xl font-bold text-white leading-tight mb-4 sm:mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            Break Language{" "}
            <span className="text-yellow-300">Barriers</span> Across India
          </motion.h1>

          <motion.p
            className="text-base sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-10 max-w-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Translate text, voice, and documents across Indian languages with perfect layout preservation.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 font-semibold text-sm sm:text-base px-6 sm:px-8 py-5 sm:py-6 rounded-xl shadow-elevated w-full sm:w-auto"
              onClick={onGetStarted}
            >
              Start Translating <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/40 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 text-sm sm:text-base px-6 sm:px-8 py-5 sm:py-6 rounded-xl w-full sm:w-auto"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See How It Works
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="flex flex-wrap gap-6 sm:gap-10 mt-10 sm:mt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            {[
              { label: "Languages", value: "4" },
              { label: "File Types", value: "PDF, Images" },
              { label: "Layout Preserved", value: "100%" },
            ].map((stat) => (
              <div key={stat.label} className="text-white">
                <div className="text-xl sm:text-2xl font-bold font-display">{stat.value}</div>
                <div className="text-xs sm:text-sm text-white/70">{stat.label}</div>
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
              className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white"
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
