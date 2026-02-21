import { Languages } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 bg-primary text-primary-foreground">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Languages className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="font-display font-bold text-lg">BhashaAI</span>
          </div>
          <p className="text-sm text-primary-foreground/60">
            © 2026 BhashaAI — Multimodal AI Translation for India
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
