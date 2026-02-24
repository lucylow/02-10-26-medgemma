import { Baby, Video, Github, FileText, Trophy } from "lucide-react";

const submissionLinks = [
  { icon: Video, label: "3-Minute Video Demo", href: "#" },
  { icon: Github, label: "GitHub Repository", href: "#" },
  { icon: FileText, label: "Technical Write-up", href: "#" },
];

const technologyLinks = [
  { label: "MedGemma", href: "#" },
  { label: "HAI-DEF", href: "#" },
  { label: "TensorFlow Lite", href: "#" },
  { label: "LoRA Fine-tuning", href: "#" },
];

const resourceLinks = [
  { label: "Research Methodology", href: "#" },
  { label: "Validation Dataset", href: "#" },
  { label: "Deployment Guide", href: "#" },
  { label: "Impact Calculator", href: "#" },
];

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Baby className="h-7 w-7 text-accent" />
              <span className="font-heading text-xl font-bold">PediScreen AI</span>
            </div>
            <p className="text-background/70 text-sm mb-5">
              A submission for The MedGemma Impact Challenge by Kaggle & Google Research.
            </p>
            <div className="inline-flex items-center gap-2 bg-background/10 px-4 py-2 rounded-lg text-sm">
              <Trophy className="h-4 w-4" />
              <span>MedGemma Impact Challenge 2026</span>
            </div>
          </div>

          {/* Submission Links */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Submission Links</h4>
            <ul className="space-y-3">
              {submissionLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-background/70 hover:text-background transition-colors text-sm flex items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/50 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                  >
                    <link.icon className="h-4 w-4 shrink-0" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Technology */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Technology</h4>
            <ul className="space-y-3">
              {technologyLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-background/70 hover:text-background transition-colors text-sm rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/50 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Project Resources</h4>
            <ul className="space-y-3">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-background/70 hover:text-background transition-colors text-sm rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/50 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 pt-8 text-center">
          <p className="text-background/60 text-sm">
            © 2026 Lucy Low | The MedGemma Impact Challenge Submission
          </p>
          <p className="text-background/50 text-xs mt-2">
            Medical Disclaimer: PediScreen AI is a screening aid, not a diagnostic tool. 
            Always consult healthcare professionals for medical decisions.
          </p>
        </div>
      </div>
    </footer>
  );
}
