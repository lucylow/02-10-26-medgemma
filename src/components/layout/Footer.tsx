import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface FooterProps {
  className?: string;
}

export default function Footer({ className }: FooterProps) {
  return (
    <footer
      className={cn(
        "py-6 px-4 border-t bg-muted/30 text-center text-sm text-muted-foreground",
        className
      )}
      role="contentinfo"
    >
      <p>
        PediScreen AI — Not a diagnostic tool. Always consult a healthcare
        provider.
      </p>
      <div className="mt-2 flex justify-center gap-4">
        <Link to="/pediscreen/learn-more" className="hover:text-foreground transition-colors">
          How It Works
        </Link>
        <Link to="/pediscreen/settings" className="hover:text-foreground transition-colors">
          Settings
        </Link>
      </div>
    </footer>
  );
}
