import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface FooterProps {
  className?: string;
}

export default function Footer({ className }: FooterProps) {
  return (
    <footer
      className={cn(
        "py-8 px-4 border-t border-border bg-muted/30 text-center text-sm text-muted-foreground",
        className
      )}
      role="contentinfo"
    >
      <p>
        PediScreen AI — Not a diagnostic tool. Always consult a healthcare
        provider.
      </p>
      <div className="mt-3 flex justify-center gap-6">
        <Link to="/pediscreen/learn-more" className="hover:text-foreground transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          How It Works
        </Link>
        <Link to="/pediscreen/settings" className="hover:text-foreground transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          Settings
        </Link>
      </div>
    </footer>
  );
}
