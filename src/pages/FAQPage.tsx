import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ArrowLeft, ChevronDown, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

const faqItems = [
  {
    q: "What is PediScreen AI?",
    a: "PediScreen AI is a clinical decision support tool that helps community health workers and clinicians with pediatric developmental screening. It uses Google's MedGemma model to analyze observations and provide structured risk summaries, key findings, and recommendations. It is not a diagnostic device—results always require review by a qualified clinician.",
  },
  {
    q: "Who can use it?",
    a: "The app is designed for CHWs (community health workers) conducting screenings in the field and for clinicians reviewing cases in clinic. Caregivers may provide observations, but interpretation and next steps should be guided by trained staff.",
  },
  {
    q: "Is my data private?",
    a: "We are built with privacy in mind. Screening data can be processed on-device or via secure backends. We do not use your data for advertising. See our Privacy page for full details.",
  },
  {
    q: "What developmental areas are covered?",
    a: "Screening can focus on communication and language, gross motor, fine motor, problem-solving (cognitive), and personal-social development. You can select a primary domain; the model considers all input when generating insights.",
  },
  {
    q: "What age range is supported?",
    a: "Typical screenings are for children between 6 and 60 months (5 years). The tool is age-aware and adjusts expectations and recommendations accordingly.",
  },
  {
    q: "What if I'm offline?",
    a: "When possible, screenings can be saved locally and synced when you're back online. The interactive demo can run with a smart mock when the backend is unavailable.",
  },
  {
    q: "How do I interpret \"risk\" or \"monitor\"?",
    a: "Risk levels (e.g. on track, monitor, discuss/refer) are screening signals, not diagnoses. They help prioritize which children may benefit from further evaluation or follow-up. A clinician should confirm any concerns.",
  },
];

export default function FAQPage() {
  const [openId, setOpenId] = useState<string | null>("0");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground">
          <Link to="/pediscreen">
            <ArrowLeft className="w-4 h-4" />
            Back to PediScreen
          </Link>
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
            <HelpCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Frequently asked questions</h1>
            <p className="text-muted-foreground text-sm mt-1">For caregivers, CHWs, and clinicians</p>
          </div>
        </div>
      </motion.div>

      <div className="space-y-2">
        {faqItems.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
          >
            <Collapsible
              open={openId === String(i)}
              onOpenChange={(open) => setOpenId(open ? String(i) : null)}
            >
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-muted/50 transition-colors">
                    <span className="font-medium text-foreground">{item.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform ${
                        openId === String(i) ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 px-4 text-muted-foreground text-sm border-t border-border/50">
                    {item.a}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </motion.div>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        More help? <Link to="/pediscreen/help" className="text-primary underline hover:no-underline">See Help & support</Link> or{" "}
        <Link to="/pediscreen" className="text-primary underline hover:no-underline">return to PediScreen Home</Link>.
      </p>
    </div>
  );
}
