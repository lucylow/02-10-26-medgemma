import { motion } from "framer-motion";
import { ImageIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VisualAnalysisDemoSection() {
  return (
    <section id="visual-demo" className="py-16 md:py-20 bg-primary/5 border-y border-primary/10">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-6">
            <ImageIcon className="h-7 w-7" />
          </div>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
            MedGemma Visual Analysis Demo
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            See how MedGemma's multimodal capabilities analyze visual developmental evidence.
          </p>
          <a href="#demo">
            <Button variant="default" size="lg" className="gap-2 rounded-xl">
              Try the demo
              <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
