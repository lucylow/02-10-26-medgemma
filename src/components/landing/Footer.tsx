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
    <footer className="bg-foreground/95 text-background py-20">
      <div className="container">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-14">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <Baby className="h-8 w-8 text-accent" />
              <span className="font-heading text-xl font-bold">PediScreen AI</span>
            </div>
            <p className="text-background/75 text-sm leading-relaxed mb-6">
              A submission for The MedGemma Impact Challenge by Kaggle & Google Research.
            </p>
            <div className="inline-flex items-center gap-2 bg-background/10 backdrop-blur-sm px-4 py-2.5 rounded-xl text-sm border border-background/10">
              <Trophy className="h-4 w-4" />
              <span>MedGemma Impact Challenge 2026</span>
            </div>
          </div>

          {/* Submission Links */}
          <div>
            <h4 className="font-heading font-semibold mb-5 text-background">Submission Links</h4>
            <ul className="space-y-3.5">
              {submissionLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-background/70 hover:text-background transition-colors text-sm flex items-center gap-2 rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/50 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
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
            <h4 className="font-heading font-semibold mb-5 text-background">Technology</h4>
            <ul className="space-y-3.5">
              {technologyLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-background/70 hover:text-background transition-colors text-sm rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/50 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-heading font-semibold mb-5 text-background">Project Resources</h4>
            <ul className="space-y-3.5">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-background/70 hover:text-background transition-colors text-sm rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/50 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 pt-10 text-center">
          <p className="text-background/60 text-sm">
            © 2026 Lucy Low | The MedGemma Impact Challenge Submission
          </p>
          <p className="text-background/50 text-xs mt-2 max-w-xl mx-auto">
            Medical Disclaimer: PediScreen AI is a screening aid, not a diagnostic tool.
            Always consult healthcare professionals for medical decisions.
          </p>
        </div>
      </div>
    </footer>
  );
}
