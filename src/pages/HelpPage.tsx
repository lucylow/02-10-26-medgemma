import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Play, FileText, MessageCircle, ExternalLink, ClipboardList, Stethoscope } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    title: "Try the Interactive Demo",
    desc: "See the full CHW and Clinician flow with sample data.",
    path: "/pediscreen/demo",
    icon: ClipboardList,
  },
  {
    title: "Start a screening",
    desc: "Enter child age, domain, and observations; add optional visual evidence.",
    path: "/pediscreen/screening",
    icon: FileText,
  },
  {
    title: "View results & history",
    desc: "Review MedGemma reports and past screenings.",
    path: "/pediscreen/history",
    icon: BookOpen,
  },
  {
    title: "Clinician review",
    desc: "Review queue and sign off on AI suggestions (production workflow).",
    path: "/clinician/review",
    icon: Stethoscope,
  },
];

const resources = [
  { label: "CDC Learn the Signs. Act Early.", href: "https://www.cdc.gov/ncbddd/actearly/", external: true },
  { label: "ASQ-3 developmental screening", href: "https://agesandstages.com/", external: true },
  { label: "PediScreen Architecture", path: "/pediscreen/learn-more", external: false },
  { label: "FAQ", path: "/pediscreen/faq", external: false },
];

export default function HelpPage() {
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
            <MessageCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Help & support</h1>
            <p className="text-muted-foreground text-sm mt-1">Get started and find resources</p>
          </div>
        </div>
      </motion.div>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" />
          Getting started
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.path}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i }}
            >
              <Button variant="outline" className="h-auto flex flex-col items-start gap-2 p-4 text-left w-full" asChild>
                <Link to={step.path}>
                  <step.icon className="w-5 h-5 text-primary" />
                  <span className="font-medium">{step.title}</span>
                  <span className="text-xs font-normal text-muted-foreground">{step.desc}</span>
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">Resources</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {resources.map((r, i) => (
                <li key={i}>
                  {r.external ? (
                    <a
                      href={r.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1.5 text-sm"
                    >
                      {r.label}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <Link to={r.path!} className="text-primary hover:underline inline-flex items-center gap-1.5 text-sm">
                      {r.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </motion.section>

      <p className="mt-8 text-sm text-muted-foreground">
        For more questions, see our <Link to="/pediscreen/faq" className="text-primary underline hover:no-underline">FAQ</Link> and{" "}
        <Link to="/pediscreen/about" className="text-primary underline hover:no-underline">About</Link> pages.
      </p>
    </div>
  );
}
