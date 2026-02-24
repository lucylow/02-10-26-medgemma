/**
 * Clinical guidelines & references — AAP, CDC, WHO, M-CHAT, ASQ, evidence-based links.
 */
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink, FileText, Stethoscope, Baby, CheckCircle2 } from "lucide-react";

const guidelines = [
  {
    title: "CDC Developmental Milestones",
    description: "Act Early milestones tracker and parent-friendly checklists by age.",
    url: "https://www.cdc.gov/ncbddd/actearly/milestones/index.html",
    icon: Baby,
  },
  {
    title: "AAP Screening Guidelines",
    description: "American Academy of Pediatrics recommendations for developmental screening.",
    url: "https://www.aap.org/en-us/advocacy-and-policy/aap-health-initiatives/Screening/Pages/default.aspx",
    icon: Stethoscope,
  },
  {
    title: "WHO Child Growth Standards",
    description: "WHO standards for early child development and growth.",
    url: "https://www.who.int/tools/child-growth-standards",
    icon: BookOpen,
  },
  {
    title: "M-CHAT-R/F",
    description: "Modified Checklist for Autism in Toddlers, Revised with Follow-Up.",
    url: "https://mchatscreen.com/",
    icon: FileText,
  },
  {
    title: "ASQ-3 & ASQ:SE-2",
    description: "Ages & Stages Questionnaires for developmental and social-emotional screening.",
    url: "https://agesandstages.com/",
    icon: FileText,
  },
];

const GuidelinesPage = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Clinical Guidelines</h1>
          <p className="text-muted-foreground text-lg">
            Evidence-based references for developmental screening. PediScreen AI aligns with these standards; it does not replace clinical judgment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {guidelines.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.a
                key={item.title}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="block"
              >
                <Card className="border shadow-sm hover:shadow-md hover:bg-muted/20 transition-all h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {item.title}
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </CardTitle>
                        <CardDescription className="text-sm">{item.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </motion.a>
            );
          })}
        </div>

        <Card className="border border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              How PediScreen uses guidelines
            </CardTitle>
            <CardDescription>
              MedGemma and the agent pipeline (milestone, risk, confidence, guideline tools) are trained and prompted to reference
              standardized milestones and screening frameworks. Outputs are pre-diagnostic signals to support clinician decision-making, not diagnoses.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="mt-8">
          <Button variant="outline" asChild className="rounded-xl gap-2">
            <a href="https://www.cdc.gov/ncbddd/actearly/milestones/index.html" target="_blank" rel="noopener noreferrer">
              <BookOpen className="w-4 h-4" />
              CDC Milestones (opens in new tab)
            </a>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default GuidelinesPage;
