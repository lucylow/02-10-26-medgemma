import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScreening } from '@/contexts/ScreeningContext';
import { submitScreening } from '@/services/screeningApi';
import { mapScreeningResultToMedGemmaReport } from '@/api/medgemmaAdapter';
import { enqueue } from '@/services/offlineQueue';
import ReportPreview from '@/components/pediscreen/ReportPreview';
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
import { Camera, Upload, X, Loader2, Shield, Brain, CheckCircle2, Circle, Eye, Sparkles, Scan, Info, Mic, MicOff, Pencil, ImageIcon, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import MultimodalAnalysisPreview from '@/components/pediscreen/MultimodalAnalysisPreview';
import ProgressiveHelp from '@/components/pediscreen/ProgressiveHelp';
import AccessibilityBar from '@/components/pediscreen/AccessibilityBar';
import ConsentModal, { hasStoredConsent } from '@/components/pediscreen/ConsentModal';
import { getConsent } from '@/services/consentService';
import ImageUploadConsentModal, { hasImageConsentPreference, getStoredUploadPreference } from '@/components/pediscreen/ImageUploadConsentModal';
import CapturePreviewStep from '@/components/pediscreen/CapturePreviewStep';
import DisclaimerBanner from '@/components/pediscreen/DisclaimerBanner';
import { VoiceInput } from '@/components/voice/VoiceInput';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const ASSEMBLYAI_KEY = import.meta.env.VITE_ASSEMBLYAI_KEY ?? '';

const developmentalDomains = [
  { label: 'Communication & Language', value: 'communication', emoji: '💬' },
  { label: 'Gross Motor Skills', value: 'gross_motor', emoji: '🏃' },
  { label: 'Fine Motor Skills', value: 'fine_motor', emoji: '✋' },
  { label: 'Problem Solving', value: 'cognitive', emoji: '🧩' },
  { label: 'Personal-Social', value: 'social', emoji: '👋' },
];

type InputMode = 'voice' | 'text' | 'image';

const ScreeningScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentScreening, updateScreening, clearScreening } = useScreening();
  const [consentOpen, setConsentOpen] = useState(!hasStoredConsent());
  const [imageConsentOpen, setImageConsentOpen] = useState(false);
  const [imagePendingInputId, setImagePendingInputId] = useState<string | null>(null);
  const [imagePendingPreview, setImagePendingPreview] = useState<string | null>(null);
  const [imagePendingFile, setImagePendingFile] = useState<File | null>(null);
  const [uploadPreference, setUploadPreference] = useState<"embeddings_only" | "raw_image">(getStoredUploadPreference());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [medGemmaDraft, setMedGemmaDraft] = useState<ReturnType<typeof mapScreeningResultToMedGemmaReport> | null>(null);
  const [lastResult, setLastResult] = useState<Awaited<ReturnType<typeof submitScreening>> | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const imageTabInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognitionAPI);
  }, []);

  const observationsRef = useRef(currentScreening.observations || '');
  observationsRef.current = currentScreening.observations || '';

  const startVoiceRecording = () => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast({ title: 'Voice not supported', description: 'Your browser does not support voice input. Try Chrome or Edge.', variant: 'destructive' });
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      const transcript = last[0].transcript;
      if (last.isFinal && transcript.trim()) {
        const current = observationsRef.current;
        const separator = current ? ' ' : '';
        updateScreening({ observations: current + separator + transcript });
      }
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

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

  const openImageInput = (inputId: string) => {
    if (!hasImageConsentPreference()) {
      setImagePendingInputId(inputId);
      setImageConsentOpen(true);
    } else {
      document.getElementById(inputId)?.click();
    }
  };

  const handleImageConsent = (pref: "embeddings_only" | "raw_image") => {
    setUploadPreference(pref);
    setImageConsentOpen(false);
    if (imagePendingInputId) {
      document.getElementById(imagePendingInputId)?.click();
      setImagePendingInputId(null);
    }
  };

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
        setImagePendingPreview(reader.result as string);
        setImagePendingFile(file);
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  const confirmImage = () => {
    if (imagePendingFile && imagePendingPreview) {
      updateScreening({ imageFile: imagePendingFile, imagePreview: imagePendingPreview });
      setImagePendingPreview(null);
      setImagePendingFile(null);
    }
  };

  const retakeImage = () => {
    setImagePendingPreview(null);
    setImagePendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageTabInputRef.current) imageTabInputRef.current.value = '';
  };

  const removeImage = () => {
    updateScreening({ imageFile: null, imagePreview: null });
    setImagePendingPreview(null);
    setImagePendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageTabInputRef.current) imageTabInputRef.current.value = '';
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

    // Offline-first: never block care because the model is unavailable
    if (!navigator.onLine) {
      enqueue({
        type: 'medgemma_draft',
        payload: {
          childAge: currentScreening.childAge,
          domain: currentScreening.domain,
          observations: currentScreening.observations,
          imagePreview: currentScreening.imagePreview,
          imageFile: currentScreening.imageFile
            ? { name: currentScreening.imageFile.name }
            : null,
        },
      });
      toast({
        title: 'Saved offline',
        description: 'AI draft will generate when you are back online.',
      });
      return;
    }

    setIsSubmitting(true);
    setMedGemmaDraft(null);
    
    try {
      const consent = await getConsent();
      const result = await submitScreening({
        childAge: currentScreening.childAge,
        domain: currentScreening.domain,
        observations: currentScreening.observations,
        imageFile: currentScreening.imageFile,
        consent_id: consent?.id ?? undefined,
      });
      
      if (result.success && result.report && result.screeningId) {
        const medGemmaReport = mapScreeningResultToMedGemmaReport(result, result.screeningId);
        setMedGemmaDraft(medGemmaReport);
        setLastResult(result);
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

  const handleViewFullReport = () => {
    if (!lastResult?.report || !lastResult?.screeningId) return;
    navigate('/pediscreen/results', {
      state: {
        screeningId: lastResult.screeningId,
        report: lastResult.report,
        childAge: currentScreening.childAge,
        domain: currentScreening.domain,
        imagePreview: currentScreening.imagePreview,
        confidence: lastResult.confidence,
        modelUsed: lastResult.modelUsed,
        modelParseOk: lastResult.modelParseOk,
      },
    });
    clearScreening();
    setMedGemmaDraft(null);
    setLastResult(null);
  };

  const steps = [
    { label: 'Child Info', completed: !!currentScreening.childAge && !!currentScreening.domain },
    { label: 'Observations', completed: !!currentScreening.observations },
    { label: 'Review', completed: progress === 100 },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" id="screening-content">
      <ConsentModal
        open={consentOpen}
        onOpenChange={setConsentOpen}
        onConsent={(_opts) => setConsentOpen(false)}
        screeningId={lastResult?.screeningId}
        apiKey={import.meta.env.VITE_API_KEY}
      />
      <ImageUploadConsentModal
        open={imageConsentOpen}
        onOpenChange={(open) => { setImageConsentOpen(open); if (!open) setImagePendingInputId(null); }}
        onConsent={handleImageConsent}
      />
      <DisclaimerBanner />
      {/* Header with Progress */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Developmental check-in</h2>
            <p className="text-muted-foreground mb-6">Let's look at how your child is growing and learning today.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ProgressiveHelp context="screening" />
            <AccessibilityBar readAloudTarget="#screening-content" />
          </div>
        </div>
        
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
              {/* Adaptive instruction based on mode */}
              <div className={cn(
                'rounded-xl border-l-4 p-4',
                inputMode === 'voice' && 'bg-primary/5 border-primary',
                inputMode === 'text' && 'bg-accent/5 border-accent',
                inputMode === 'image' && 'bg-primary/5 border-primary'
              )}>
                <h4 className="font-semibold text-foreground mb-1">
                  {inputMode === 'voice' && ' Speak naturally'}
                  {inputMode === 'text' && ' Type your observations'}
                  {inputMode === 'image' && ' Share a photo or video'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {inputMode === 'voice' && "Describe what you've noticed about your child's development in your own words."}
                  {inputMode === 'text' && "Write down any behaviors, milestones, or concerns you've observed."}
                  {inputMode === 'image' && "Upload a drawing, block tower, or play activity to show developmental skills."}
                </p>
              </div>

              {/* Input mode selector */}
              <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)}>
                <TabsList className="grid w-full grid-cols-3 rounded-xl">
                  <TabsTrigger value="voice" className="gap-2" disabled={!voiceSupported && !ASSEMBLYAI_KEY}>
                    <Mic className="h-4 w-4" />
                    Voice
                  </TabsTrigger>
                  <TabsTrigger value="text" className="gap-2">
                    <Pencil className="h-4 w-4" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="image" className="gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Visual
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="voice" className="mt-4">
                  <div className="space-y-4">
                    {ASSEMBLYAI_KEY ? (
                      <VoiceInput
                        apiKey={ASSEMBLYAI_KEY}
                        onTranscript={(text) => updateScreening({ observations: text })}
                        onDomainHint={(domain) => domain && updateScreening({ domain })}
                      />
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          className={cn(
                            'w-full min-h-[120px] flex flex-col gap-3 rounded-xl border-2 border-dashed transition-colors',
                            isRecording && 'border-destructive bg-destructive/10'
                          )}
                          onMouseDown={startVoiceRecording}
                          onMouseUp={stopVoiceRecording}
                          onMouseLeave={stopVoiceRecording}
                          onTouchStart={startVoiceRecording}
                          onTouchEnd={stopVoiceRecording}
                        >
                          {isRecording ? (
                            <MicOff className="h-12 w-12 text-destructive" />
                          ) : (
                            <Mic className="h-12 w-12 text-primary" />
                          )}
                          <span className="text-sm font-medium">
                            {isRecording ? 'Recording... Release to stop' : 'Hold to speak'}
                          </span>
                        </Button>
                        {currentScreening.observations && (
                          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                            <p className="text-xs font-medium text-muted-foreground mb-1">You said:</p>
                            <p className="text-sm text-foreground">{currentScreening.observations}</p>
                          </div>
                        )}
                      </>
                    )}
                    {!voiceSupported && !ASSEMBLYAI_KEY && (
                      <p className="text-xs text-muted-foreground">Voice input requires Chrome or Edge. Use Text or Visual mode instead.</p>
                    )}
                    {ASSEMBLYAI_KEY && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        HIPAA-ready streaming. No audio stored.
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="text" className="mt-4">
                  <div className="space-y-4">
                    <div className="bg-accent/5 p-3 rounded-lg border border-accent/10">
                      <p className="text-xs text-muted-foreground">
                        MedGemma works best with <strong>specific, observable actions</strong> — e.g. "can stack 4 blocks" or "points to objects when named".
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="observations" className="text-base font-medium">What have you observed? *</Label>
                      <Textarea
                        id="observations"
                        placeholder="Example: My 24-month-old points to what he wants but doesn't use words. He understands simple instructions."
                        className="min-h-[150px] text-base p-4 rounded-xl border-accent/20 focus:border-accent shadow-sm"
                        value={currentScreening.observations || ''}
                        onChange={(e) => updateScreening({ observations: e.target.value })}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="image" className="mt-4">
                  <div className="space-y-4">
                    <input
                      ref={imageTabInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="image-tab-input"
                    />
                    {imagePendingPreview ? (
                      <CapturePreviewStep
                        imagePreview={imagePendingPreview}
                        useEmbeddingsOnly={uploadPreference === "embeddings_only"}
                        onRetake={retakeImage}
                        onUseImage={confirmImage}
                      />
                    ) : (
                    <div
                      className="border-2 border-dashed border-primary/20 rounded-2xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer bg-muted/30"
                      role="button"
                      tabIndex={0}
                      onClick={() => openImageInput('image-tab-input')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openImageInput('image-tab-input');
                        }
                      }}
                    >
                      {currentScreening.imagePreview ? (
                        <div className="relative">
                          <img src={currentScreening.imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={(e) => { e.stopPropagation(); removeImage(); }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                          <p className="font-medium text-foreground">Tap to upload a drawing, photo, or short video</p>
                          <p className="text-xs text-muted-foreground mt-1">Child's drawing, block tower, or play activity</p>
                        </>
                      )}
                    </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Photo supplements your screening. Add observations in Voice or Text tab.
                    </p>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                      <Shield className="h-4 w-4 text-emerald-600" />
                      <p className="text-xs text-emerald-800">All media is processed securely for privacy</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Progress indicator - single bar */}
              <div className="flex items-center gap-2 mt-4">
                <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    className={cn(
                      "h-full rounded-full",
                      (currentScreening.observations?.length || 0) > 100 ? "bg-primary" : "bg-amber-500"
                    )} 
                    initial={false}
                    animate={{ width: `${Math.min(((currentScreening.observations?.length || 0) / 300) * 100, 100)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase whitespace-nowrap">
                  {(currentScreening.observations?.length || 0) > 100 ? '✓ Good detail' : 'Add more detail'}
                </span>
              </div>

              {/* Smart suggestions based on observation length */}
              {(currentScreening.observations?.length || 0) > 0 && (currentScreening.observations?.length || 0) < 80 && inputMode === 'text' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Try adding details about:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Words they use', 'How they play', 'Eye contact', 'Following instructions', 'Physical milestones'].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="text-xs px-2.5 py-1 rounded-full bg-background border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                        onClick={() => {
                          const current = currentScreening.observations || '';
                          const separator = current.endsWith('.') || current.endsWith(' ') || !current ? '' : '. ';
                          updateScreening({ observations: current + separator + suggestion + ': ' });
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
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
                {imagePendingPreview ? (
                  <motion.div
                    key="preview-step"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <CapturePreviewStep
                      imagePreview={imagePendingPreview}
                      useEmbeddingsOnly={uploadPreference === "embeddings_only"}
                      onRetake={retakeImage}
                      onUseImage={confirmImage}
                    />
                  </motion.div>
                ) : currentScreening.imagePreview ? (
                  <motion.div 
                    key="preview"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="space-y-4"
                  >
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
                        aria-label="Remove image"
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
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        id="gallery-input"
                      />
                      
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground" title="Embeddings-first by default">
                          Embeddings-first by default
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2 h-12 rounded-xl hover:bg-primary/5 hover:border-primary/30"
                          onClick={() => openImageInput('camera-input')}
                          aria-label="Take photo"
                        >
                          <Camera className="w-5 h-5 text-primary" />
                          Take photo
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2 h-12 rounded-xl hover:bg-primary/5 hover:border-primary/30"
                          onClick={() => openImageInput('gallery-input')}
                          aria-label="Choose from gallery"
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
                      ].map((feature, idx) => {
                        const Icon = feature.icon;
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-muted-foreground"
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-xs">{feature.label}</span>
                          </div>
                        );
                      })}
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
                      <span>MedGemma is synthesizing multimodal inputs…</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-6 h-6" />
                      <span>Analyze & Generate Report</span>
                    </>
                  )}
                </Button>
              </motion.div>
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                <Shield className="w-4 h-4 text-primary" />
                <p>Screening support only — results require clinical review.</p>
              </div>
              <p className="text-center text-xs text-muted-foreground/60 mt-2">
                Takes about 10 seconds. Your data stays private.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </form>

      {/* MedGemma draft report — inline preview (draft-first, FDA-friendly) */}
      {medGemmaDraft && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 space-y-4"
        >
          <ReportPreview report={medGemmaDraft} />
          <div className="flex justify-center">
            <Button
              onClick={handleViewFullReport}
              size="lg"
              className="gap-2 rounded-xl"
            >
              <Eye className="w-5 h-5" />
              View full report
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ScreeningScreen;
