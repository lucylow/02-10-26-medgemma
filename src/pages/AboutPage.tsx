import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Baby, Shield, Brain, HeartHandshake, ArrowLeft, Users, Target } from "lucide-react";
import { motion } from "framer-motion";

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
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
        className="text-center mb-12"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
          <Baby className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">About PediScreen AI</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          MedGemma-powered pediatric developmental screening for community health workers and clinicians.
        </p>
      </motion.div>

      <div className="space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Our mission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                PediScreen AI organizes, contextualizes, and communicates screening evidence so clinicians can make
                more informed decisions. We focus on the critical window of early childhood development—when
                identification and support matter most.
              </p>
              <p>
                One in six children has a developmental delay, yet fewer than half are identified before school age.
                We aim to bridge resource gaps and support equitable access to quality developmental surveillance.
              </p>
            </CardContent>
          </Card>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-foreground mb-4">What we do</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: Brain,
                title: "Clinical decision support",
                desc: "MedGemma provides structured risk summaries, key findings, and recommendations—not diagnoses. Clinicians remain in charge.",
              },
              {
                icon: Shield,
                title: "Privacy-first design",
                desc: "On-device and edge-friendly options keep sensitive data local. We support HIPAA-aware workflows and consent.",
              },
              {
                icon: Users,
                title: "CHW and clinician workflows",
                desc: "Built for community health workers in the field and clinicians in the clinic, with offline-capable screening and review queues.",
              },
              {
                icon: HeartHandshake,
                title: "Family-centered",
                desc: "Plain-language summaries and transparent evidence help families understand results and next steps.",
              },
            ].map((item, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <item.icon className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center">
                <strong className="text-foreground">Created by Lucy Low</strong>
                <br />
                A submission for the MedGemma Impact Challenge by Kaggle & Google Research.
              </p>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </div>
  );
}
