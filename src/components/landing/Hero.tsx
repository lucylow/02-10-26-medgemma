import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, ArrowRight, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section
      className="min-h-[90vh] bg-gradient-to-b from-primary/[0.06] via-background to-background flex items-center justify-center pt-20"
      aria-label="PediScreen AI — Early detection for every child"
    >
      <div className="container mx-auto px-4 sm:px-6 text-center max-w-3xl space-y-8">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-sm font-medium text-muted-foreground shadow-sm"
        >
          <Shield className="h-4 w-4 text-primary" />
          Privacy-Focused · On-Device AI · Open Source
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]"
        >
          Early Detection for Every Child's Potential
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          PediScreen AI leverages Google's MedGemma model to provide accessible, private
          developmental screening for children aged 0–5, helping identify delays when
          intervention matters most.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-4 justify-center pt-2"
        >
          <Link to="/pediscreen">
            <Button size="lg" className="gap-2 rounded-xl text-base px-8 py-6">
              <Shield className="h-4 w-4" />
              Try PediScreen
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/pediscreen/learn-more">
            <Button variant="outline" size="lg" className="gap-2 rounded-xl text-base px-8 py-6">
              <Code2 className="h-4 w-4" />
              Technical Details
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
