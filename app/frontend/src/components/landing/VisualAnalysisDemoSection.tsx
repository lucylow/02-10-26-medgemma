import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, ArrowRight, Layers, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_VISUAL_SAMPLES } from "@/data/demoMockData";

export function VisualAnalysisDemoSection() {
  const [showSample, setShowSample] = useState(false);
  const [sampleIndex, setSampleIndex] = useState(0);
  const sample = MOCK_VISUAL_SAMPLES[sampleIndex];

  const cycleSample = () => {
    setSampleIndex((i) => (i + 1) % MOCK_VISUAL_SAMPLES.length);
  };

  return (
    <section id="visual-demo" className="py-16 md:py-20 bg-primary/5 border-y border-primary/10">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-6">
              <ImageIcon className="h-7 w-7" />
            </div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
              MedGemma Visual Analysis Demo
            </h2>
            <p className="text-muted-foreground text-lg mb-6">
              See how MedGemma's multimodal capabilities analyze visual developmental evidence — block towers, drawings, and play activities.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a href="#demo">
                <Button variant="default" size="lg" className="gap-2 rounded-xl">
                  Try the full demo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <Button
                variant="outline"
                size="lg"
                className="gap-2 rounded-xl"
                onClick={() => setShowSample(!showSample)}
              >
                <Layers className="h-4 w-4" />
                {showSample ? "Hide sample result" : "Try a sample result"}
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {showSample && sample && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border-2 border-primary/20 bg-card p-6 shadow-lg">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
                      <Layers className="h-5 w-5 text-primary" />
                      Sample: {sample.label}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={cycleSample}>
                      Next sample
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{sample.description}</p>
                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">MedGemma findings</p>
                    <ul className="space-y-1.5">
                      {sample.findings.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Badge variant={sample.riskLevel === "on_track" ? "default" : "secondary"}>
                      {sample.riskLevel === "on_track" ? "On track" : sample.riskLevel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Confidence: {Math.round(sample.confidence * 100)}%</span>
                  </div>
                  <p className="text-sm">
                    <strong>Recommendation:</strong> {sample.recommendation}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
