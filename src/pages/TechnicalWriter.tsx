import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Loader2, Sparkles, GitCompare } from 'lucide-react';
import {
  generateStructuredWriting,
  saveReportRevision,
  type WritingMode,
  type Persona,
  type ReportSectionData,
} from '@/services/writingApi';
import { EditableSection } from '@/components/technical-writer/EditableSection';
import { CitationSidebar } from '@/components/technical-writer/CitationSidebar';
import { DiffView } from '@/components/technical-writer/DiffView';

const WRITING_MODES: { value: WritingMode; label: string }[] = [
  { value: 'research_longform', label: 'Research Long-form' },
  { value: 'slide_deck', label: 'Slide Deck' },
  { value: 'executive_summary', label: 'Executive Summary' },
  { value: 'judge_pitch', label: 'Judge Pitch' },
];

const PERSONAS: { value: Persona; label: string }[] = [
  { value: 'clinical', label: 'Clinician' },
  { value: 'regulatory', label: 'Regulatory / FDA' },
  { value: 'vc', label: 'Investor' },
  { value: 'technical', label: 'Engineer' },
];

const DEFAULT_KEY_POINTS = [
  'AI as clinical decision support, not diagnosis',
  'Reducing pediatric clinician burnout',
  'Multimodal reasoning using text, scores, and images',
  'Low-resource and community health settings',
  'Ethical and regulatory awareness',
];

const generateReportId = () => `report-${Date.now()}`;

const TechnicalWriter = () => {
  const [sections, setSections] = useState<ReportSectionData[]>([]);
  const [slides, setSlides] = useState<{ slide: string; content: string }[]>([]);
  const [citationPlaceholders, setCitationPlaceholders] = useState<string[]>([]);
  const [aiVersion, setAiVersion] = useState('');
  const [reportId] = useState(() => generateReportId());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<WritingMode>('research_longform');
  const [audience, setAudience] = useState('hackathon judges and clinicians');
  const [persona, setPersona] = useState<Persona>('clinical');
  const [wordCount, setWordCount] = useState(900);
  const [signedOff, setSignedOff] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const getEditedFullText = useCallback(() => {
    if (sections.length) return sections.map((s) => s.content).join('\n\n');
    if (slides.length) return slides.map((s) => `${s.slide}\n${s.content}`).join('\n\n');
    return '';
  }, [sections, slides]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateStructuredWriting({
        product_name: 'PediScreen AI',
        model_name: 'MedGemma',
        target_audience: audience,
        writing_mode: mode,
        key_points: DEFAULT_KEY_POINTS,
        constraints: [
          'Avoid medical claims',
          'Do not sound like marketing',
          'Use evidence-based language',
        ],
        word_count: wordCount,
        persona,
      });

      if (res.sections) {
        setSections(res.sections);
        setAiVersion(res.sections.map((s) => s.content).join('\n\n'));
      } else if (res.slides) {
        setSlides(res.slides);
        setAiVersion(res.slides.map((s) => `${s.slide}\n${s.content}`).join('\n\n'));
      }
      setCitationPlaceholders(res.citation_placeholders ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSectionChange = (sectionId: string, value: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, content: value } : s))
    );
  };

  const handleSlideChange = (slideTitle: string, value: string) => {
    setSlides((prev) =>
      prev.map((s) => (s.slide === slideTitle ? { ...s, content: value } : s))
    );
  };

  const handleSaveRevision = async () => {
    const edited = getEditedFullText();
    if (!edited || !aiVersion) return;
    await saveReportRevision(reportId, aiVersion, edited, 'clinician');
    setShowDiff(true);
  };

  const hasContent = sections.length > 0 || slides.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-none shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">MedGemma Technical Writer</CardTitle>
                <CardDescription>
                  Generate research-grade prose with template locking, citation placeholders, and
                  persona tuning
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Writing Mode</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as WritingMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WRITING_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Persona</Label>
                <Select value={persona} onValueChange={(v) => setPersona(v as Persona)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERSONAS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hackathon judges and clinicians">Judges & Clinicians</SelectItem>
                    <SelectItem value="engineers and developers">Engineers</SelectItem>
                    <SelectItem value="healthcare administrators">Administrators</SelectItem>
                    <SelectItem value="regulatory reviewers">Regulatory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Word Count</Label>
                <Select value={String(wordCount)} onValueChange={(v) => setWordCount(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="400">~400 words</SelectItem>
                    <SelectItem value="600">~600 words</SelectItem>
                    <SelectItem value="900">~900 words</SelectItem>
                    <SelectItem value="1200">~1200 words</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={generate} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Draft
                </>
              )}
            </Button>

            {error && (
              <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {hasContent && (
              <Tabs value={showDiff ? 'diff' : 'edit'} onValueChange={(v) => setShowDiff(v === 'diff')}>
                <TabsList>
                  <TabsTrigger value="edit">Edit Draft</TabsTrigger>
                  <TabsTrigger value="diff">AI vs Clinician Diff</TabsTrigger>
                </TabsList>
                <TabsContent value="edit" className="mt-4">
                  <div className="flex gap-4">
                    <div className="flex-1 min-w-0">
                      {sections.length > 0 && (
                        <div className="space-y-2">
                          <Label>Generated Draft (locked sections are read-only)</Label>
                          {sections.map((section) => (
                            <EditableSection
                              key={section.id}
                              section={section}
                              onChange={handleSectionChange}
                            />
                          ))}
                        </div>
                      )}
                      {slides.length > 0 && (
                        <div className="space-y-2">
                          <Label>Slide Deck</Label>
                          {slides.map((slide) => (
                            <div key={slide.slide} className="border rounded-lg p-4 mb-4 bg-card">
                              <h3 className="font-semibold mb-3">{slide.slide}</h3>
                              <Textarea
                                value={slide.content}
                                onChange={(e) => handleSlideChange(slide.slide, e.target.value)}
                                className="min-h-[80px] font-mono text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <CitationSidebar placeholders={citationPlaceholders} />
                  </div>

                  <div className="mt-6 flex flex-wrap gap-4 items-center">
                    <Button variant="outline" onClick={handleSaveRevision} className="gap-2">
                      <GitCompare className="w-4 h-4" />
                      Save Revision & View Diff
                    </Button>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="signoff"
                        checked={signedOff}
                        onCheckedChange={(c) => setSignedOff(!!c)}
                      />
                      <Label htmlFor="signoff" className="text-sm font-normal cursor-pointer">
                        I have reviewed this output before export
                      </Label>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="diff" className="mt-4">
                  <DiffView
                    aiText={aiVersion}
                    editedText={getEditedFullText()}
                    splitView={true}
                  />
                </TabsContent>
              </Tabs>
            )}

            {!hasContent && (
              <p className="text-sm text-muted-foreground">
                Click Generate Draft to create research-grade content with locked sections and
                citation placeholders.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default TechnicalWriter;
