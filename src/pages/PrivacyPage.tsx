import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Lock, Server, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyPage() {
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
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Privacy & data</h1>
            <p className="text-muted-foreground text-sm mt-1">How we handle your information</p>
          </div>
        </div>
      </motion.div>

      <div className="space-y-6">
        {[
          {
            icon: Lock,
            title: "Clinical decision support, not surveillance",
            body: "PediScreen AI is designed to support developmental screening by clinicians and CHWs. We do not use screening data for advertising, and we do not sell personal health information.",
          },
          {
            icon: Server,
            title: "Where data is processed",
            body: "Depending on configuration, screening can run on your device (on-device / edge), or be sent to a secure backend you or your organization controls. When a backend is used, data is transmitted over encrypted connections.",
          },
          {
            icon: FileText,
            title: "What we store",
            body: "If you use a backend or cloud features, we may store screening results, report drafts, and audit logs as needed for care and compliance. Consent and data retention follow your organization's policies and applicable law (e.g. HIPAA where applicable).",
          },
        ].map((section, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
          >
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <section.icon className="w-4 h-4 text-primary" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        This page summarizes our approach to privacy. For deployment-specific policies (e.g. HIPAA BAA, data processing agreements), contact your administrator or the deployment owner.
      </p>

      <div className="mt-6">
        <Button variant="outline" size="sm" asChild>
          <Link to="/pediscreen">Return to PediScreen</Link>
        </Button>
      </div>
    </div>
  );
}
