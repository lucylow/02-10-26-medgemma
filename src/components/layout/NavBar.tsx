import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Baby, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

interface NavBarProps {
  user?: { id: string; email: string; name?: string } | null;
  className?: string;
}

export default function NavBar({ user, className }: NavBarProps) {
  const { signOut, isConfigured } = useSupabaseAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    if (isConfigured) navigate("/");
  };
  return (
    <nav
      className={cn(
        "flex items-center justify-between h-14 px-4 md:px-6 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-[var(--shadow-header)]",
        className
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <Link to="/" className="flex items-center gap-2.5 font-bold text-lg rounded-lg py-2 px-2 -ml-2 hover:bg-muted/50 transition-colors">
        <Baby className="w-6 h-6 text-primary" />
        <span>PediScreen AI</span>
      </Link>

      <ul className="flex items-center gap-1 md:gap-2">
        <li>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg"
          >
            Dashboard
          </Link>
        </li>
        {user ? (
          <>
            <li>
              <Link
                to="/cases"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg"
              >
                Cases
              </Link>
            </li>
            <li>
              <Link
                to="/profile"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg"
              >
                Account
              </Link>
            </li>
            <li>
              <Button variant="ghost" size="sm" className="gap-2" aria-label="Log out" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/auth/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
            </li>
            <li>
              <Link to="/auth/signup">
                <Button size="sm">Sign Up</Button>
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
