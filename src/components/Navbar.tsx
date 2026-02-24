import { Languages, LogOut, User as UserIcon, History as HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User } from "@/services/authService";

interface NavbarProps {
  onGetStarted: () => void;
  user?: User;
  onLogout?: () => void;
  onHistory?: () => void;
}

const Navbar = ({ onGetStarted, user, onLogout, onHistory }: NavbarProps) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-surface">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent animate-gradient flex items-center justify-center shadow-lg">
            <Languages className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl bg-gradient-to-r from-primary via-secondary to-accent animate-gradient bg-clip-text text-transparent">
            IndianTranslator
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</a>
          <a href="#translate" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Translate</a>
          <a href="#languages" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Languages</a>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
                <UserIcon className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-accent">{user.name}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-accent/20 text-accent hover:bg-accent/10"
                onClick={onHistory}
              >
                <HistoryIcon className="w-4 h-4 mr-2" />
                History
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-accent/20 text-accent hover:bg-accent/10"
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 rounded-lg font-semibold shadow-lg"
              onClick={onGetStarted}
            >
              Get Started
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
