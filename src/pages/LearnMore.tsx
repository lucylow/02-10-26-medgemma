import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Brain, Activity, Stethoscope, CheckCircle2, AlertCircle, Info, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const LearnMore = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-12">
      {/* Header */}
      <section className="text-center space-y-4">
        <motion.h1 
          className="text-3xl sm:text-4xl font-bold text-foreground"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Clinical Decision Support Architecture
        </motion.h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          PediScreen AI is a clinical decision support system that facilitates, but does not automate, diagnosis.
        </p>
      </section>

      {/* Workflow Diagram */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">PediScreen AI Diagnostic Support Workflow</h2>
        </div>
        
        <div className="relative p-6 bg-muted/30 rounded-3xl border border-dashed border-muted-foreground/30">
          <div className="flex flex-col items-center space-y-8">
            {/* Stage 1 */}
            <motion.div 
              className="w-full max-w-sm"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
            >
              <Card className="border-none shadow-md bg-white">
                <CardHeader className="py-3 bg-primary/5 rounded-t-xl">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">1</span>
                    Child Activity / Caregiver Input
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-3 text-xs text-muted-foreground">
                  Caregivers provide structured observations and upload child-generated content (drawings, play videos).
                </CardContent>
              </Card>
            </motion.div>

            <ArrowRight className="w-6 h-6 text-muted-foreground rotate-90" />

            {/* Stage 2 */}
            <motion.div 
              className="w-full max-w-sm"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
            >
              <Card className="border-primary shadow-md bg-white ring-2 ring-primary/20">
                <CardHeader className="py-3 bg-primary/10 rounded-t-xl">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">2</span>
                    Developmental Screening (AI)
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-3 text-xs text-muted-foreground space-y-2">
                  <p>MedGemma reasoning engine processes inputs against standardized milestone data.</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[9px]">Structured questions</Badge>
                    <Badge variant="secondary" className="text-[9px]">Visual analysis</Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <ArrowRight className="w-6 h-6 text-muted-foreground rotate-90" />

            {/* Stage 3 */}
            <motion.div 
              className="w-full max-w-sm"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
            >
              <Card className="border-none shadow-md bg-white">
                <CardHeader className="py-3 bg-accent/5 rounded-t-xl">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-[10px]">3</span>
                    Pattern Highlighting
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-3 text-xs text-muted-foreground space-y-1">
                  <p>• Domain-level signals</p>
                  <p>• Confidence ranges</p>
                  <p>• Non-diagnostic summaries</p>
                </CardContent>
              </Card>
            </motion.div>

            <ArrowRight className="w-6 h-6 text-muted-foreground rotate-90" />

            {/* Stage 4 */}
            <motion.div 
              className="w-full max-w-sm"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
            >
              <Card className="border-success/50 shadow-md bg-success/5">
                <CardHeader className="py-3 bg-success/10 rounded-t-xl">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-success-foreground">
                    <span className="w-6 h-6 rounded-full bg-success text-white flex items-center justify-center text-[10px]">4</span>
                    Clinical Evaluation (Human)
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-3 text-xs text-muted-foreground">
                  Qualified healthcare professional reviews patterns alongside history, physical exam, and clinical judgment.
                </CardContent>
              </Card>
            </motion.div>

            <ArrowRight className="w-6 h-6 text-muted-foreground rotate-90" />

            {/* Stage 5 */}
            <motion.div 
              className="w-full max-w-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <Card className="border-none shadow-lg bg-primary text-primary-foreground">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Diagnostic Decision
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-3 text-xs">
                  Clinician decides: Monitor, Refer, or Diagnose.
                </CardContent>
              </Card>
            </motion.div>
          </div>
          
          <div className="mt-8 p-4 bg-background/50 rounded-xl border border-dashed text-center">
            <p className="text-[10px] text-muted-foreground">
              <Info className="inline w-3 h-3 mr-1" />
              <strong>Key Annotation:</strong> PediScreen AI supports the screening and evaluation stages and does not perform diagnostic decisions.
            </p>
          </div>
        </div>
      </section>

      {/* Regulatory Framing */}
      <section className="grid md:grid-cols-2 gap-6">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Intended Use
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            PediScreen AI is intended to assist healthcare professionals by organizing and presenting developmental screening information. The software does not provide diagnoses, treatment recommendations, or autonomous clinical decisions.
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              Clinical Disclosure
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            The basis for the software’s outputs is provided to the user, allowing independent clinical review. Users can review observable features, confidence indicators, and contextual explanations prior to making clinical decisions.
          </CardContent>
        </Card>
      </section>

      {/* Safety Notice */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="py-4 flex items-center gap-4">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>In-App Safety Notice:</strong> PediScreen AI is a screening support tool. Results must be reviewed and interpreted by a qualified healthcare professional.
          </p>
        </CardContent>
      </Card>

      {/* Regulatory Context */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Regulatory Framework Alignment</h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="p-4 bg-muted/20 rounded-xl">
            <h4 className="text-sm font-bold mb-1">FDA CDS Guidance Aligned</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Designed as a clinical decision support (CDS) system where the clinician remains in the loop, maintaining independent judgment before any clinical action is taken.
            </p>
          </div>
          <div className="p-4 bg-muted/20 rounded-xl">
            <h4 className="text-sm font-bold mb-1">CE / MDR-aligned Description</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Provides decision support by highlighting patterns in caregiver-provided screening inputs. It does not replace professional judgment and is intended to be used as part of a broader clinical evaluation.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LearnMore;