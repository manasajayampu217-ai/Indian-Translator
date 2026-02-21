import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar = ({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-surface">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
            <Languages className="w-5 h-5 text-accent-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-foreground">BhashaAI</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#translate" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Translate</a>
          <a href="#languages" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Languages</a>
        </div>

        <Button
          size="sm"
          className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg font-medium"
          onClick={onGetStarted}
        >
          Get Started
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;
