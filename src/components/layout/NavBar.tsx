import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Baby, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@/services/auth";

interface NavBarProps {
  user?: User | null;
  className?: string;
}

export default function NavBar({ user, className }: NavBarProps) {
  return (
    <nav
      className={cn(
        "flex items-center justify-between h-14 px-4 border-b bg-card sticky top-0 z-50",
        className
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <Link to="/" className="flex items-center gap-2 font-bold text-lg">
        <Baby className="w-6 h-6 text-primary" />
        <span>PediScreen AI</span>
      </Link>

      <ul className="flex items-center gap-2 md:gap-4">
        <li>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md"
          >
            Dashboard
          </Link>
        </li>
        {user ? (
          <>
            <li>
              <Link
                to="/cases"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md"
              >
                Cases
              </Link>
            </li>
            <li>
              <Link
                to="/profile"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md"
              >
                Account
              </Link>
            </li>
            <li>
              <Button variant="ghost" size="sm" className="gap-2" aria-label="Log out">
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
