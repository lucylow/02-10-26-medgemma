import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  HelpCircle,
  Video,
  FileText,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  Baby,
  Brain,
  MessageCircle,
  Waves,
  Mic,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Education = () => {
  const categories = [
    { title: 'Developmental Milestones', icon: Baby, count: 12 },
    { title: 'Screening Guides', icon: FileText, count: 5 },
    { title: 'Video Tutorials', icon: Video, count: 8 },
    { title: 'Clinical FAQ', icon: HelpCircle, count: 24 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-12">
          <h1 className="text-3xl font-bold mb-2">Resource Center</h1>
          <p className="text-muted-foreground text-lg">Learn more about developmental screening and how to use PediScreen AI effectively.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {categories.map((cat, i) => (
            <Card key={i} className="hover:bg-primary/5 transition-colors cursor-pointer border-none shadow-sm">
              <CardContent className="pt-6">
                <cat.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold">{cat.title}</h3>
                <p className="text-sm text-muted-foreground">{cat.count} resources</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Brain className="w-6 h-6 text-primary" />
                How it Works
              </h2>
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary">1</div>
                      <div>
                        <h4 className="font-bold mb-1">Observation Collection</h4>
                        <p className="text-sm text-muted-foreground">Parents or CHWs input text observations and upload short videos/images of the child performing specific activities.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary">2</div>
                      <div>
                        <h4 className="font-bold mb-1">Multimodal AI Analysis</h4>
                        <p className="text-sm text-muted-foreground">MedGemma and MedSigLIP analyze the combined evidence against standardized developmental milestones.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary">3</div>
                      <div>
                        <h4 className="font-bold mb-1">Clinical Support Output</h4>
                        <p className="text-sm text-muted-foreground">The system generates a structured report with explainable findings for the clinician to review.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Waves className="w-6 h-6 text-primary" />
                Smart home &amp; edge AI (optional)
              </h2>
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Some families choose to connect devices they already own — like a nursery camera,
                    video doorbell, or smart thermostat — so PediScreen can gently watch for motor and
                    communication patterns between visits.
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>
                      <strong>Edge-only analysis</strong>: Raw video and audio stay on the device.
                      Lightweight TensorFlow Lite models extract posture and sound features locally.
                    </li>
                    <li>
                      <strong>Summaries, not footage</strong>: PediScreen receives only short summaries
                      like tummy time minutes, babbling patterns, or sleep-related distress flags.
                    </li>
                    <li>
                      <strong>Clinical decision support</strong>: These signals provide developmental
                      context alongside parent reports and clinician exams, but do not replace them.
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    This aligns with FDA clinical decision support guidance:{" "}
                    <span className="font-semibold">
                      passive environmental monitoring provides context; clinical screening still
                      requires active input and clinician judgement.
                    </span>
                  </p>
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-primary" />
                Frequently Asked Questions
              </h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Is this a medical diagnosis?</AccordionTrigger>
                  <AccordionContent>
                    No. PediScreen AI is a screening tool designed to support clinical decision-making. It identifies patterns and signals that may warrant further evaluation by a qualified medical professional.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>How is my child's data protected?</AccordionTrigger>
                  <AccordionContent>
                    We use on-device AI models (Edge AI) which means your child's videos and images are processed locally on your device whenever possible. Data is encrypted and we strictly follow HIPAA and GDPR principles.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Which age groups are covered?</AccordionTrigger>
                  <AccordionContent>
                    PediScreen AI currently supports developmental screening for children aged 0 to 72 months (6 years), covering major domains like motor skills, language, and social-emotional development.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>
          </div>

          <div className="space-y-6">
            <Card className="bg-primary text-primary-foreground overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">Need Support?</CardTitle>
                <CardDescription className="text-primary-foreground/80">Our clinical team is here to help.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full gap-2 rounded-xl">
                  <MessageCircle className="w-4 h-4" /> Contact Specialist
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resources</CardTitle>
                <CardDescription>PediScreen guides and external references</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link to="/pediscreen/virtual-assistants" className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors group">
                  <div className="flex items-center gap-2 text-sm">
                    <Mic className="w-4 h-4 text-primary" />
                    <span>Virtual Assistants &amp; On-Device Voice</span>
                  </div>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <a href="#" className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors group">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span>CDC Milestones Tracker</span>
                  </div>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <a href="#" className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors group">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span>AAP Screening Guidelines</span>
                  </div>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <a href="#" className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors group">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span>WHO Early Development</span>
                  </div>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Education;
