import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, PlayCircle, Code } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="hero-gradient pt-28 md:pt-36 pb-20 md:pb-28">
      <div className="container text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6"
        >
          <Shield className="h-4 w-4" />
          <span>Privacy-Focused • On-Device AI • Open Source</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 max-w-4xl mx-auto leading-tight"
        >
          Early Detection for Every Child's Potential
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10"
        >
          PediScreen AI leverages Google's MedGemma model to provide accessible, private 
          developmental screening for children aged 0-5, helping identify delays when 
          intervention matters most.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/pediscreen">
            <Button size="lg" className="gap-2 btn-shadow">
              <PlayCircle className="h-5 w-5" />
              Try Interactive Demo
            </Button>
          </Link>
          <Link to="/pediscreen/learn-more">
            <Button size="lg" variant="outline" className="gap-2">
              <Code className="h-5 w-5" />
              View Technical Details
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
