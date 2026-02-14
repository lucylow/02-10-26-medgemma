import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScreening } from '@/contexts/ScreeningContext';
import { submitScreening } from '@/services/screeningApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Camera, Upload, X, Loader2, Shield, Brain, CheckCircle2, Circle, Eye, Sparkles, Scan, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import MultimodalAnalysisPreview from '@/components/pediscreen/MultimodalAnalysisPreview';

const developmentalDomains = [
  { label: 'Communication & Language', value: 'communication', emoji: '💬' },
  { label: 'Gross Motor Skills', value: 'gross_motor', emoji: '🏃' },
  { label: 'Fine Motor Skills', value: 'fine_motor', emoji: '✋' },
  { label: 'Problem Solving', value: 'cognitive', emoji: '🧩' },
  { label: 'Personal-Social', value: 'social', emoji: '👋' },
];

const ScreeningScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentScreening, updateScreening, clearScreening } = useScreening();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate form progress
  const getProgress = () => {
    let completed = 0;
    if (currentScreening.childAge) completed += 25;
    if (currentScreening.domain) completed += 25;
    if (currentScreening.observations) completed += 25;
    if (currentScreening.imageFile) completed += 25;
    return completed;
  };

  const progress = getProgress();

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image under 10MB.',
          variant: 'destructive',
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        updateScreening({ 
          imageFile: file, 
          imagePreview: reader.result as string 
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    updateScreening({ imageFile: null, imagePreview: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentScreening.childAge || !currentScreening.observations) {
      toast({
        title: 'Incomplete Form',
        description: 'Please provide child age and observations.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    // We utilize MedGemma's multimodal capabilities to analyze both 
    // clinical text observations and visual evidence (e.g., drawings, pointing).
    // The reasoning is performed on-device to ensure maximum privacy 
    // and zero latency for front-line health workers.
    try {
      const result = await submitScreening({
        childAge: currentScreening.childAge,
        domain: currentScreening.domain,
        observations: currentScreening.observations,
        imageFile: currentScreening.imageFile,
      });
      
      if (result.success && result.report) {
        navigate('/pediscreen/results', { 
          state: { 
            screeningId: result.screeningId,
            inferenceId: result.inferenceId,
            feedbackAllowed: result.feedbackAllowed ?? true,
            feedbackUrl: result.feedbackUrl,
            report: result.report,
            childAge: currentScreening.childAge,
            domain: currentScreening.domain,
            imagePreview: currentScreening.imagePreview,
            confidence: result.confidence,
          }
        });
        clearScreening();
      } else {
        toast({
          title: 'Analysis Failed',
          description: result.message || 'Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: 'Error',
        description: 'Could not connect to analysis service.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { label: 'Child Info', completed: !!currentScreening.childAge && !!currentScreening.domain },
    { label: 'Observations', completed: !!currentScreening.observations },
    { label: 'Review', completed: progress === 100 },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header with Progress */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Developmental check-in</h2>
        <p className="text-muted-foreground mb-6">Let's look at how your child is growing and learning today.</p>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                step.completed ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  'w-8 sm:w-16 h-0.5 mx-2',
                  step.completed ? 'bg-primary' : 'bg-muted'
                )} />
              )}
            </div>
          ))}
        </div>
        
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2 text-right">{progress}% complete</p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Child Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-lg border-none overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-primary flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    Evidence Collection
                  </CardTitle>
                  <CardDescription>Enter age and select primary domain for MedGemma analysis</CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  <Brain className="w-3 h-3 mr-1" />
                  Clinical Context
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="childAge" className="text-base font-medium">Child's Age (months) *</Label>
                  <Input
                    id="childAge"
                    type="number"
                    placeholder="e.g., 24"
                    min="0"
                    max="72"
                    value={currentScreening.childAge || ''}
                    onChange={(e) => updateScreening({ childAge: e.target.value })}
                    className="h-12 text-lg rounded-xl border-primary/20 focus:border-primary shadow-sm"
                  />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Standard range: 0-72 months</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domain" className="text-base font-medium">Screening Domain *</Label>
                  <Select
                    value={currentScreening.domain || ''}
                    onValueChange={(value) => updateScreening({ domain: value })}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-primary/20 focus:border-primary shadow-sm">
                      <SelectValue placeholder="Select a domain..." />
                    </SelectTrigger>
                    <SelectContent>
                      {developmentalDomains.map((domain) => (
                        <SelectItem key={domain.value} value={domain.value}>
                          <span className="flex items-center gap-2">
                            <span>{domain.emoji}</span>
                            {domain.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Influences LoRA adapter selection</p>
                </div>
              </div>
              
              <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Shield className="w-3 h-3 text-primary" />
                  Privacy Guard: All analysis is performed on-device using MedGemma.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Observations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-lg border-none overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-accent/10 to-transparent">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-accent flex items-center gap-2">
                    <span className="text-2xl">📝</span>
                    Behavioral Observations
                  </CardTitle>
                  <CardDescription>Detailed descriptions of the child's typical behaviors</CardDescription>
                </div>
                <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Evidence Grounding
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-4">
                <div className="bg-accent/5 p-3 rounded-lg border border-accent/10 mb-2">
                  <h4 className="text-sm font-semibold text-accent mb-1 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Tip for high-quality screening:
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    MedGemma works best when you describe <strong>specific, observable actions</strong>. 
                    Instead of "they play well", try "they can stack 4 blocks" or "they point to objects when named".
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observations" className="text-base font-medium">What have you observed? *</Label>
                  <Textarea
                    id="observations"
                    placeholder="Describe behaviors, concerns, or milestones observed. Example: 'The child responds to their name and can follow simple instructions. They are beginning to form two-word phrases but have limited vocabulary compared to peers...'"
                    className="min-h-[150px] text-base p-4 rounded-xl border-accent/20 focus:border-accent shadow-sm"
                    value={currentScreening.observations || ''}
                    onChange={(e) => updateScreening({ observations: e.target.value })}
                  />
                </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-300",
                      (currentScreening.observations?.length || 0) > 100 ? "bg-emerald-500" : "bg-amber-500"
                    )} 
                    style={{ width: `${Math.min(((currentScreening.observations?.length || 0) / 300) * 100, 100)}%` }} 
                  />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase whitespace-nowrap">
                  MedGemma Density: {(currentScreening.observations?.length || 0) > 100 ? 'Optimal' : 'Needs Detail'}
                </span>
              </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Visual Evidence - Enhanced Multimodal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-lg border-none overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-primary flex items-center gap-2">
                    <span className="text-2xl">📸</span>
                    Show us how your child plays
                    <Badge variant="secondary" className="ml-2 text-xs">
                      <Eye className="w-3 h-3 mr-1" />
                      Multimodal
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Ask your child to complete an activity as they normally would. There's no right or wrong result.
                  </CardDescription>
                </div>
                {currentScreening.imagePreview && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-accent/10 rounded-full">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs font-medium text-accent">MedSigLIP Ready</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <AnimatePresence mode="wait">
                {currentScreening.imagePreview ? (
                  <motion.div 
                    key="preview"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="space-y-4"
                  >
                    {/* Enhanced multimodal preview */}
                    <div className="relative">
                      <MultimodalAnalysisPreview
                        imagePreview={currentScreening.imagePreview}
                        isAnalyzing={isSubmitting}
                        analysisComplete={false}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 gap-1.5 rounded-full shadow-lg"
                        onClick={removeImage}
                      >
                        <X className="w-4 h-4" />
                        Remove
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="buttons"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    {/* Upload area with enhanced styling */}
                    <div className="border-2 border-dashed border-primary/20 rounded-2xl p-8 text-center hover:border-primary/40 transition-colors bg-gradient-to-br from-primary/5 to-accent/5">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                        <Scan className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="font-medium text-foreground mb-2">Technical Analysis: Visual Evidence</h3>
                      <div className="text-sm text-muted-foreground mb-4 space-y-1">
                        <p>MedGemma processes images for:</p>
                        <p>• Fine motor control (pincer grasp, pencil pressure)</p>
                        <p>• Cognitive milestones (geometric shape reproduction)</p>
                        <p>• Spatial reasoning (stacking, alignment)</p>
                        <p className="pt-2 text-xs italic">MedSigLIP embeddings are used for clinical visual analysis.</p>
                      </div>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageSelect}
                        className="hidden"
                        id="camera-input"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        id="gallery-input"
                      />
                      
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2 h-12 rounded-xl hover:bg-primary/5 hover:border-primary/30"
                          onClick={() => document.getElementById('camera-input')?.click()}
                        >
                          <Camera className="w-5 h-5 text-primary" />
                          Take photo
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2 h-12 rounded-xl hover:bg-primary/5 hover:border-primary/30"
                          onClick={() => document.getElementById('gallery-input')?.click()}
                        >
                          <Upload className="w-5 h-5 text-primary" />
                          Choose from gallery
                        </Button>
                      </div>
                    </div>

                    {/* Multimodal features info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { icon: Eye, label: 'Visual Encoding' },
                        { icon: Scan, label: 'Pattern Detection' },
                        { icon: Brain, label: 'Clinical Reasoning' },
                        { icon: Sparkles, label: 'Multimodal Fusion' },
                      ].map((feature, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-muted-foreground"
                        >
                          <feature.icon className="w-4 h-4" />
                          <span className="text-xs">{feature.label}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Privacy First:</strong> Images are processed securely. 
                  Visual features are extracted locally before analysis. No raw images are stored externally.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-lg border-none overflow-hidden bg-gradient-to-br from-card to-primary/5">
            <CardContent className="pt-6 pb-6">
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full gap-3 h-14 rounded-xl text-lg shadow-lg hover:shadow-xl transition-shadow"
                  disabled={isSubmitting || progress < 67}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Reviewing the activity...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-6 h-6" />
                      <span>Analyze & Generate Report</span>
                    </>
                  )}
                </Button>
              </motion.div>
              <p className="text-center text-sm text-muted-foreground mt-4 italic">
                ⚕️ This tool provides screening support only. Results require clinical review.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </form>
    </div>
  );
};

export default ScreeningScreen;
