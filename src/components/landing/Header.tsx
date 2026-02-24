import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Baby, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "The Problem", href: "#problem" },
  { label: "Our Solution", href: "#demo" },
  { label: "Technology", href: "#technology" },
  { label: "Impact", href: "#impact" },
  { label: "CHW Workflow", href: "#chw-workflow" },
  { label: "Creator", href: "#team" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/80 shadow-[var(--shadow-header)]">
      <div className="container">
        <nav className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 rounded-xl py-2 px-2 -ml-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors hover:bg-muted/50">
            <Baby className="h-8 w-8 text-primary" />
            <span className="font-heading text-xl font-bold text-foreground">
              PediScreen AI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    const target = document.querySelector(link.href);
                    if (target) {
                      target.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer rounded-lg px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Link to="/pediscreen">
                <Button size="sm" className="gap-2 rounded-xl">
                  <Sparkles className="h-4 w-4" />
                  Try PediScreen
                </Button>
              </Link>
            </li>
          </ul>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link to="/pediscreen">
              <Button size="sm" variant="secondary" className="gap-1.5 rounded-xl">
                <Sparkles className="h-4 w-4" />
                Try
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </nav>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 animate-fade-in">
            <ul className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="block py-2.5 px-4 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      const target = document.querySelector(link.href);
                      if (target) {
                        setTimeout(() => {
                          target.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 100);
                      }
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  to="/pediscreen"
                  className="flex items-center gap-2 py-2.5 px-4 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Sparkles className="h-4 w-4" />
                  Try PediScreen
                </Link>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
