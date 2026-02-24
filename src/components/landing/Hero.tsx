import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, PlayCircle, Code, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="hero-gradient pt-28 md:pt-36 pb-24 md:pb-32 relative overflow-hidden">
      {/* Soft gradient orbs */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-accent/10 blur-3xl pointer-events-none" aria-hidden />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-primary/8 blur-3xl pointer-events-none" aria-hidden />
      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(to_right,hsl(var(--primary))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary))_1px,transparent_1px)] bg-[size:2.5rem_2.5rem]" aria-hidden />
      <div className="container text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-primary/8 text-primary px-4 py-2.5 rounded-full text-sm font-medium mb-8 border border-primary/15 shadow-sm"
        >
          <Shield className="h-4 w-4" />
          <span>Privacy-Focused • On-Device AI • Open Source</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 max-w-4xl mx-auto leading-[1.15] tracking-tight"
        >
          Early Detection for Every Child's Potential
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed"
        >
          PediScreen AI leverages Google's MedGemma model to provide accessible, private
          developmental screening for children aged 0–5, helping identify delays when
          intervention matters most.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/pediscreen">
            <Button size="lg" className="gap-2 btn-shadow rounded-xl font-medium px-8">
              <PlayCircle className="h-5 w-5" />
              Try PediScreen
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/pediscreen/learn-more">
            <Button size="lg" variant="outline" className="gap-2 rounded-xl font-medium border-2">
              <Code className="h-5 w-5" />
              Technical Details
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
