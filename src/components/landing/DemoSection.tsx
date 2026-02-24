import { useState } from "react";
import CaptureFlow, { type CaptureFlowResult } from "@/components/pediscreen/CaptureFlow";
import { motion } from "framer-motion";
import {
  Keyboard,
  Image,
  Cog,
  BarChart3,
  Lightbulb,
  Shield,
  CloudUpload,
  Search,
  CheckCircle,
  AlertTriangle,
  Camera,
  Eye,
  Heart,
  Info,
  Smartphone,
  WifiOff,
  MapPin,
  Sparkles,
  Brain,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

const modelSteps = [
  { icon: Keyboard, label: "Text Input" },
  { icon: Image, label: "Image Analysis" },
  { icon: Cog, label: "MedGemma Inference" },
  { icon: BarChart3, label: "Risk Assessment" },
  { icon: Lightbulb, label: "Recommendations" },
];

const recommendationsData = {
  medium: [
    { strong: "Formal screening:", text: "Complete ASQ-3 or M-CHAT-R for comprehensive assessment" },
    { strong: "Language-rich environment:", text: "Increase interactive reading and narrate daily activities" },
    { strong: "Professional consultation:", text: "Schedule evaluation within 1-2 months" },
    { strong: "Follow-up:", text: "Rescreen in 4-6 weeks to monitor progress" },
  ],
  low: [
    { strong: "Continue monitoring:", text: "Track milestones using CDC's 'Learn the Signs. Act Early.' materials" },
    { strong: "Engage in play:", text: "Provide age-appropriate activities for language, motor, and social skills" },
    { strong: "Routine check-ups:", text: "Continue regular well-child visits for ongoing surveillance" },
    { strong: "Parent education:", text: "Access evidence-based resources on child development" },
  ],
};

// Emotional support messages based on risk level
const supportMessages = {
  medium: {
    title: "We're here to support you 💙",
    message: "Some areas may benefit from a little extra attention. Early awareness means you can help more effectively.",
  },
  low: {
    title: "Your child is doing great! 🌟",
    message: "Development appears healthy. Keep doing what you're doing — your engagement matters!",
  },
};

export function DemoSection() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [age, setAge] = useState("24");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium">("medium");
  const [confidence, setConfidence] = useState(0.78);
  const [observation, setObservation] = useState(
    "My 2-year-old says only about 10 words and doesn't seem to combine them. He points to things he wants but doesn't use words. He understands simple instructions like \"come here\" or \"give me the ball.\""
  );
  const [showCaptureFlow, setShowCaptureFlow] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const handleCaptureComplete = (result: CaptureFlowResult) => {
    setCapturedImage(result.dataUrl);
    setShowCaptureFlow(false);
    toast.success(`Image added (${result.preference === "embeddings_only" ? "embeddings only" : "raw upload"})`, { duration: 3000 });
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setShowResults(false);
    setActiveStep(0);

    // Animate through steps
    const stepInterval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= modelSteps.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 350);

    // Determine risk level and confidence based on input
    const hasDelayIndicators = observation.toLowerCase().includes("only about 10 words") || 
                               observation.toLowerCase().includes("doesn't combine");
    const newRiskLevel = age === "24" && hasDelayIndicators ? "medium" : "low";
    const newConfidence = hasDelayIndicators ? 0.82 : 0.91;
    
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
      setRiskLevel(newRiskLevel);
      setConfidence(newConfidence);
      setActiveStep(-1);
    }, 2000);
  };

  // Confidence level indicator config
  const getConfidenceConfig = (conf: number) => {
    if (conf >= 0.85) return { label: 'High Confidence', color: 'text-emerald-500', bg: 'bg-emerald-500' };
    if (conf >= 0.65) return { label: 'Moderate Confidence', color: 'text-amber-500', bg: 'bg-amber-500' };
    return { label: 'Lower Confidence', color: 'text-orange-500', bg: 'bg-orange-500' };
  };

  const confidenceConfig = getConfidenceConfig(confidence);

  return (
    <section id="demo" className="py-20 md:py-28 bg-muted/50">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="section-title">Interactive Screening Demo</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-8">
            Experience how PediScreen AI works in practice. This simulation shows how 
            MedGemma processes multimodal inputs to provide developmental insights.
          </p>
          <div className="mt-6">
            <Button asChild variant="outline" size="lg" className="gap-2 rounded-xl">
              <Link to="/pediscreen/demo">
                <Sparkles className="h-4 w-4" />
                Open full CHW + Clinician demo in app
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </motion.div>

        <Tabs defaultValue="screening" className="max-w-5xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-card">
            <TabsTrigger value="screening">Developmental Screening</TabsTrigger>
            <TabsTrigger value="visual">Visual Analysis</TabsTrigger>
            <TabsTrigger value="workflow">CHW Workflow</TabsTrigger>
          </TabsList>

          <TabsContent value="screening">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-card rounded-2xl p-6 md:p-10 card-shadow"
            >
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                {/* Input Section */}
                <div className="space-y-6">
                  <h3 className="font-heading text-xl font-semibold">
                    Child Information & Observations
                  </h3>

                  <div className="space-y-2">
                    <Label>Child's Age</Label>
                    <Select value={age} onValueChange={setAge}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border border-border z-50">
                        <SelectItem value="18">18 months</SelectItem>
                        <SelectItem value="24">24 months</SelectItem>
                        <SelectItem value="36">36 months</SelectItem>
                        <SelectItem value="48">48 months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Developmental Domain</Label>
                    <Select defaultValue="language">
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border border-border z-50">
                        <SelectItem value="language">Language & Communication</SelectItem>
                        <SelectItem value="motor">Motor Skills</SelectItem>
                        <SelectItem value="social">Social & Emotional</SelectItem>
                        <SelectItem value="cognitive">Cognitive Skills</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Parent's Observations</Label>
                    <Textarea
                      value={observation}
                      onChange={(e) => setObservation(e.target.value)}
                      placeholder="Describe your child's behavior..."
                      className="min-h-[120px] bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Visual Evidence (Optional)</Label>
                    {showCaptureFlow ? (
                      <CaptureFlow
                        onComplete={handleCaptureComplete}
                        onCancel={() => setShowCaptureFlow(false)}
                      />
                    ) : capturedImage ? (
                      <div className="relative rounded-xl border border-border overflow-hidden">
                        <img src={capturedImage} alt="Captured" className="w-full max-h-48 object-contain bg-muted/30" />
                        <button
                          onClick={() => { setCapturedImage(null); setShowCaptureFlow(true); }}
                          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                          aria-label="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setShowCaptureFlow(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setShowCaptureFlow(true);
                          }
                        }}
                        className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                      >
                        <div className="relative">
                          <CloudUpload className="h-10 w-10 text-muted-foreground mx-auto mb-3 group-hover:scale-110 transition-transform" />
                          <Camera className="h-4 w-4 text-primary absolute -right-1 -bottom-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-muted-foreground">
                          Take a photo or upload from gallery
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          e.g., child's drawing, block tower, play activity
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        Analyze with MedGemma
                      </>
                    )}
                  </Button>

                  {/* Model Flow Visualization */}
                  <div className="bg-muted rounded-xl p-6 mt-6">
                    <h4 className="font-heading text-sm font-semibold mb-4 flex items-center gap-2">
                      <Cog className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      On-Device MedGemma Processing
                    </h4>
                    <div className="flex justify-between relative">
                      <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-border" />
                      {/* Animated progress line */}
                      <div 
                        className="absolute top-6 left-[10%] h-0.5 bg-primary transition-all duration-300"
                        style={{ width: activeStep >= 0 ? `${(activeStep / (modelSteps.length - 1)) * 80}%` : '0%' }}
                      />
                      {modelSteps.map((step, index) => (
                        <div key={step.label} className="flex flex-col items-center z-10">
                          <div 
                            className={`w-12 h-12 bg-card rounded-full flex items-center justify-center shadow-md mb-2 transition-all duration-300 ${
                              index <= activeStep ? 'ring-2 ring-primary scale-110' : ''
                            }`}
                          >
                            <step.icon className={`h-5 w-5 transition-colors duration-300 ${
                              index <= activeStep ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                          </div>
                          <span className={`text-xs text-center transition-colors duration-300 ${
                            index <= activeStep ? 'text-primary font-medium' : 'text-muted-foreground'
                          }`}>
                            {step.label}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4 text-success" />
                      <span>
                        <strong>Privacy First:</strong> All processing happens locally on the device.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Output Section — Research & Analytics style */}
                <div className="lg:border-l lg:pl-12 border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading text-xl font-semibold text-foreground">
                        MedGemma Analysis Results
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Sparkles className="w-3 h-3" />
                        AI research outputs · XAI transparency
                      </p>
                    </div>
                  </div>
                  <div className="h-px bg-gradient-to-r from-primary/20 to-transparent mb-6" />

                  {!showResults ? (
                    <div className="h-64 bg-muted rounded-xl flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Click "Analyze with MedGemma" to see results</p>
                      </div>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Risk Indicator with Confidence */}
                      <div className={`rounded-xl p-4 ${
                        riskLevel === "medium" ? "bg-warning/10" : "bg-success/10"
                      }`}>
                        <div className="flex items-start gap-3">
                          {riskLevel === "medium" ? (
                            <AlertTriangle className="h-6 w-6 text-warning shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle className="h-6 w-6 text-success shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">
                              {riskLevel === "medium" ? "Monitor - Some Concerns" : "On Track - Developing Well"}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              Based on analysis of developmental markers for {age}-month-old child
                            </p>
                            
                            {/* Confidence Indicator */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex items-center gap-2 cursor-help">
                                    <Info className={`h-4 w-4 ${confidenceConfig.color}`} />
                                    <span className={`text-xs font-medium ${confidenceConfig.color}`}>
                                      {confidenceConfig.label}
                                    </span>
                                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${confidence * 100}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        className={`h-full rounded-full ${confidenceConfig.bg}`}
                                      />
                                    </div>
                                    <span className={`text-xs font-bold ${confidenceConfig.color}`}>
                                      {Math.round(confidence * 100)}%
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-sm">
                                    {confidence >= 0.85 
                                      ? "Strong evidence supports this assessment."
                                      : "Reasonably supported. Additional information may help confirm."}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>

                      {/* Emotional Support Message */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className={`rounded-xl p-4 border-2 ${
                          riskLevel === "medium" 
                            ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100" 
                            : "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Heart className={`h-5 w-5 shrink-0 mt-0.5 ${
                            riskLevel === "medium" ? "text-amber-500" : "text-emerald-500"
                          }`} />
                          <div>
                            <h4 className="font-semibold text-foreground text-sm">
                              {supportMessages[riskLevel].title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {supportMessages[riskLevel].message}
                            </p>
                          </div>
                        </div>
                      </motion.div>

                      {/* Clinical Interpretation — Analytics block */}
                      <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="h-4 w-4 text-primary" />
                          <h4 className="font-heading text-sm font-semibold">
                            Clinical Interpretation
                          </h4>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 border-primary/30 text-primary">
                            <Eye className="h-3 w-3" />
                            XAI
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          The reported language development for a 24-month-old shows potential
                          delays. While receptive language (understanding) appears within expected
                          range, expressive vocabulary is below the typical 50+ words expected at
                          this age.
                        </p>
                      </div>

                      {/* Developmental Markers — graph-style list */}
                      <div className="rounded-xl border border-border/80 bg-card p-4">
                        <h4 className="font-heading text-sm font-semibold mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          Key Developmental Markers Checked
                        </h4>
                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                          <li className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                            <CheckCircle className={`h-4 w-4 shrink-0 mt-0.5 ${riskLevel === "medium" ? "text-warning" : "text-success"}`} />
                            <span>Vocabulary size (~10 words, expected: 50+ at {age} months)</span>
                          </li>
                          <li className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                            <CheckCircle className={`h-4 w-4 shrink-0 mt-0.5 ${riskLevel === "medium" ? "text-warning" : "text-success"}`} />
                            <span>Word combinations ({riskLevel === "medium" ? "none" : "emerging"}, expected: emerging at 18-24 months)</span>
                          </li>
                          <li className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                            <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                            <span>Following simple instructions (yes, expected: yes)</span>
                          </li>
                          <li className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                            <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                            <span>Pointing to communicate (yes, expected: established)</span>
                          </li>
                        </ul>
                      </div>

                      {/* Recommendations */}
                      <div className="bg-primary/5 rounded-xl p-4">
                        <h4 className="font-heading text-sm font-semibold mb-3">
                          Recommended Next Steps
                        </h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {recommendationsData[riskLevel].map((rec, idx) => (
                            <motion.li 
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                            >
                              <strong>{rec.strong}</strong> {rec.text}
                            </motion.li>
                          ))}
                        </ul>
                      </div>

                      <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
                        <strong>Note:</strong> This is a screening tool, not a diagnostic assessment. 
                        Always consult with a healthcare provider for formal evaluation.
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="visual">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-card rounded-2xl p-6 md:p-10 card-shadow"
            >
              <div className="text-center mb-8">
                <h3 className="font-heading text-xl font-semibold mb-4">
                  MedGemma Visual Analysis Demo
                </h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  See how MedGemma's multimodal capabilities analyze visual developmental evidence — block towers, drawings, and play activities.
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                {[
                  {
                    icon: Image,
                    title: "Block towers",
                    desc: "Stacking and construction reveal fine motor and cognitive planning.",
                  },
                  {
                    icon: Camera,
                    title: "Drawings",
                    desc: "Scribbles and shapes inform visual-motor and symbolic development.",
                  },
                  {
                    icon: Eye,
                    title: "Play activities",
                    desc: "Structured play clips show social, language, and motor skills.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="bg-muted/50 rounded-xl p-5 text-center border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="font-heading font-semibold text-sm mb-1">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground mt-6">
                In the full app, upload images or short clips to get MedGemma analysis and risk insights. Use the <strong>Developmental Screening</strong> tab to run the interactive demo.
              </p>
            </motion.div>
          </TabsContent>

          <TabsContent value="workflow">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-card rounded-2xl p-6 md:p-10 card-shadow"
            >
              <div className="text-center mb-8">
                <h3 className="font-heading text-xl font-semibold mb-4">
                  Community Health Worker Workflow
                </h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Explore how CHWs use PediScreen AI in field settings with limited connectivity.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {[
                  {
                    icon: "Smartphone",
                    label: "On-device screening",
                    description: "Run ASQ-3 and developmental checks offline on phones and tablets.",
                  },
                  {
                    icon: "WifiOff",
                    label: "Works without connectivity",
                    description: "Sync results when back in range; no dependency on live internet.",
                  },
                  {
                    icon: "MapPin",
                    label: "Built for the field",
                    description: "Designed for home visits, clinics, and low-resource settings.",
                  },
                ].map((item) => {
                  const Icon =
                    item.icon === "Smartphone"
                      ? Smartphone
                      : item.icon === "WifiOff"
                        ? WifiOff
                        : MapPin;
                  return (
                    <div
                      key={item.label}
                      className="bg-muted/50 rounded-xl p-6 text-center border border-border/50"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h4 className="font-heading font-semibold text-primary mb-2">
                        {item.label}
                      </h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-sm text-muted-foreground mt-6">
                For more on the CHW workflow, see the <a href="#chw-workflow" className="text-primary underline hover:no-underline">CHW Workflow</a> section on this page.
              </p>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
