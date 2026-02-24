import { Languages } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 bg-gradient-to-br from-primary via-secondary to-accent text-white">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <Languages className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-2xl text-white tracking-tight">
              IndianTranslator
            </span>
          </div>
          <p className="text-sm text-white/80 font-medium">
            © 2026 IndianTranslator — AI Translation for Indian Languages
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
