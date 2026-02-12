import React from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2, Plus, CheckCircle, AlertTriangle, AlertCircle, HelpCircle, Printer, Calendar, Lightbulb, Target, TrendingUp, Clock, Users, Eye, Sparkles, Shield, Info, ClipboardCheck, MessageSquare, ExternalLink, Stethoscope, Brain, UsersRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import VisualEvidenceCard from '@/components/pediscreen/VisualEvidenceCard';
import ConfidenceIndicator from '@/components/pediscreen/ConfidenceIndicator';
import ExplainabilityPanel from '@/components/pediscreen/ExplainabilityPanel';
import EmotionalSupportBanner from '@/components/pediscreen/EmotionalSupportBanner';
import VisualMilestoneTimeline from '@/components/pediscreen/VisualMilestoneTimeline';
import ProgressiveHelp from '@/components/pediscreen/ProgressiveHelp';
import AccessibilityBar from '@/components/pediscreen/AccessibilityBar';
import ClinicianReview from '@/components/pediscreen/ClinicianReview';

type RiskLevel = 'on_track' | 'low' | 'monitor' | 'medium' | 'refer' | 'high';

const ResultsScreen = () => {
  const location = useLocation();
  const { toast } = useToast();
  const { screeningId, report, childAge, domain, confidence, imagePreview } = location.state || {};
  const [activeTab, setActiveTab] = React.useState<'caregiver' | 'clinician'>('caregiver');

  if (!report || !screeningId) {
    return <Navigate to="/pediscreen" replace />;
  }

  const getRiskConfig = (riskLevel: string) => {
    const level = riskLevel?.toLowerCase() as RiskLevel;
    switch (level) {
      case 'low':
      case 'on_track':
        return { 
          bgClass: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200', 
          textClass: 'text-emerald-700',
          badgeClass: 'bg-emerald-500',
          icon: CheckCircle,
          iconClass: 'text-emerald-500',
          label: 'On Track',
          description: 'Children develop at different rates. This screening shows your child is developing typically for their age.'
        };
      case 'medium':
      case 'monitor':
        return { 
          bgClass: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200', 
          textClass: 'text-amber-700',
          badgeClass: 'bg-amber-500',
          icon: AlertTriangle,
          iconClass: 'text-amber-500',
          label: 'Some areas may benefit from a closer look',
          description: 'Based on this screening, your child may benefit from extra support in some areas.'
        };
      case 'high':
      case 'refer':
        return { 
          bgClass: 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200', 
          textClass: 'text-red-700',
          badgeClass: 'bg-red-500',
          icon: AlertCircle,
          iconClass: 'text-red-500',
          label: 'May benefit from follow-up',
          description: 'This screening suggests it may be helpful to check in with a specialist or pediatrician.'
        };
      default:
        return { 
          bgClass: 'bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200', 
          textClass: 'text-gray-700',
          badgeClass: 'bg-gray-500',
          icon: HelpCircle,
          iconClass: 'text-gray-500',
          label: 'Unknown',
          description: 'Unable to determine risk level'
        };
    }
  };

  const riskConfig = getRiskConfig(report.riskLevel);
  const RiskIcon = riskConfig.icon;

  const handleShare = async () => {
    const shareContent = `PediScreen AI Developmental Summary Report\n\nResult: ${riskConfig.label}\nScreening ID: ${screeningId}\n\nSummary: ${report.summary}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PediScreen AI Report',
          text: shareContent,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          fallbackCopy(shareContent);
        }
      }
    } else {
      fallbackCopy(shareContent);
    }
  };

  const fallbackCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'Report summary has been copied.',
    });
  };

  const getDomainLabel = (value: string) => {
    const domains: Record<string, string> = {
      communication: 'Communication & Language',
      gross_motor: 'Gross Motor Skills',
      fine_motor: 'Fine Motor Skills',
      cognitive: 'Problem Solving',
      social: 'Personal-Social',
    };
    return domains[value] || value;
  };

  const profile = report.developmentalProfile || report.developmentalAnalysis;
  const evidence = report.supportingEvidence;
  const followUp = report.followUp;
  const referral = report.referralGuidance;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6" id="results-content">
      {/* Report Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-2 relative"
      >
        <div className="absolute top-0 right-0 flex items-center gap-2">
          <ProgressiveHelp context="results" />
          <AccessibilityBar readAloudTarget="#results-content" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">PediScreen AI Developmental Summary Report</h1>
        <p className="text-sm text-muted-foreground mt-1">Generated by MedGemma Multimodal Analysis</p>
      </motion.div>

      {/* Role-based view selection */}
      <div className="flex flex-col items-center gap-2 mb-4">
        <div className="bg-muted p-1 rounded-xl flex gap-1">
          <Button 
            variant={activeTab === 'caregiver' ? 'secondary' : 'ghost'} 
            size="sm" 
            className="rounded-lg"
            onClick={() => setActiveTab('caregiver')}
          >
            Caregiver View
          </Button>
          <Button 
            variant={activeTab === 'clinician' ? 'secondary' : 'ghost'} 
            size="sm" 
            className="rounded-lg"
            onClick={() => setActiveTab('clinician')}
          >
            Clinician View
          </Button>
        </div>
        {activeTab === 'clinician' && (
          <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
            <Info className="w-3 h-3" />
            This screening tool provides decision support only and does not make diagnoses.
          </p>
        )}
      </div>

      {/* Risk Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className={cn('border-2 overflow-hidden', riskConfig.bgClass)}>
          <CardContent className="py-8 text-center relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-block"
            >
              <div className={cn('w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 bg-background shadow-lg')}>
                <RiskIcon className={cn('w-10 h-10', riskConfig.iconClass)} />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className={cn('inline-block px-4 py-1 rounded-full text-white text-sm font-medium mb-2', riskConfig.badgeClass)}>
                {activeTab === 'clinician' ? 'Risk Stratification' : 'What this screening suggests'}
              </div>
              <h2 className={cn('text-3xl font-bold mb-1', riskConfig.textClass)}>
                {activeTab === 'clinician' ? (
                   report.riskLevel?.toLowerCase() === 'refer' || report.riskLevel?.toLowerCase() === 'high'
                   ? 'Referral Recommended'
                   : riskConfig.label
                ) : (
                  report.riskLevel?.toLowerCase() === 'refer' || report.riskLevel?.toLowerCase() === 'high'
                    ? 'Your child may benefit from extra support'
                    : riskConfig.label
                )}
              </h2>
              <p className="text-muted-foreground text-sm mb-3 font-medium">MedGemma Pediatric Reasoning Engine</p>
              <div className="text-muted-foreground text-sm mb-3 max-w-md mx-auto">
                {activeTab === 'clinician' ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">Domain: {getDomainLabel(domain)}</p>
                    <p>{report.riskLevel?.toLowerCase() === 'on_track' || report.riskLevel?.toLowerCase() === 'low' 
                      ? 'Child demonstrates age-appropriate coordination. Patterns align with typical developmental trajectories.'
                      : 'Patterns suggest further observation may be helpful. Findings should be interpreted as screening evidence, not a formal diagnosis.'}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p>{riskConfig.description}</p>
                    {report.riskLevel?.toLowerCase() === 'refer' || report.riskLevel?.toLowerCase() === 'high' ? (
                      <p className="text-xs font-medium text-red-600/80">Early action is a powerful way to support your child's natural strengths.</p>
                    ) : null}
                  </div>
                )}
              </div>
              {confidence && (
                <div className="flex flex-col items-center mb-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Model Confidence</p>
                  <ConfidenceIndicator 
                    confidence={confidence} 
                    size="md" 
                    showTooltip={true}
                  />
                </div>
              )}
              <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                <span className="px-3 py-1 bg-background/80 rounded-full flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  ID: {screeningId}
                </span>
                {childAge && <span className="px-3 py-1 bg-background/80 rounded-full">Age: {childAge} months</span>}
                {domain && <span className="px-3 py-1 bg-background/80 rounded-full">{getDomainLabel(domain)}</span>}
                <span className="px-3 py-1 bg-background/80 rounded-full text-primary font-medium">On-Device Processing</span>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Emotional Support Banner */}
      <EmotionalSupportBanner
        riskLevel={report.riskLevel?.toLowerCase() === 'on_track' || report.riskLevel?.toLowerCase() === 'low' 
          ? 'on_track' 
          : report.riskLevel?.toLowerCase() === 'refer' || report.riskLevel?.toLowerCase() === 'high'
            ? 'refer'
            : 'monitor'}
        tone="reassuring"
        showActions={true}
      />

      {/* Explainability Panel - "See the Evidence" */}
      {evidence && (
        <ExplainabilityPanel
          evidenceItems={[
            ...(evidence.fromParentReport?.map((item: string) => ({
              source: 'text' as const,
              content: item,
              impact: 'high' as const,
            })) || []),
            ...(evidence.fromVisualAnalysis?.map((item: string) => ({
              source: 'image' as const,
              content: item,
              impact: 'medium' as const,
            })) || []),
            ...(evidence.fromAssessmentScores?.map((item: string) => ({
              source: 'questionnaire' as const,
              content: item,
              impact: 'high' as const,
            })) || []),
          ]}
          reasoningSteps={[
            `Analyzed parent observations for ${getDomainLabel(domain || '')} domain`,
            `Applied conservative bias for high sensitivity screening`,
            `Compared developmental markers against age-expected milestones for ${childAge} months`,
            evidence?.fromVisualAnalysis?.length ? 'Processed visual evidence through MedSigLIP encoder' : null,
            'Applied multimodal fusion to synthesize text and visual findings',
            `Generated risk stratification: ${riskConfig.label}`,
          ].filter(Boolean) as string[]}
        />
      )}

      {/* Clinical Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="shadow-lg border-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-primary flex items-center gap-2 text-lg">
              <span className="text-xl">📋</span>
              {activeTab === 'clinician' ? 'Clinical Summary' : 'What we noticed'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTab === 'caregiver' ? (
              <div className="space-y-4">
                <div className="text-foreground leading-relaxed text-lg italic border-l-4 border-primary/20 pl-4 py-1">
                  {report.parentFriendlyExplanation ? (
                    <div className="space-y-2">
                       <p className="text-xs font-bold text-primary/60 uppercase tracking-widest mb-1 flex items-center gap-1">
                         <Sparkles className="w-3 h-3" /> Gemma 3 Generative Layer
                       </p>
                       <p>{report.parentFriendlyExplanation}</p>
                    </div>
                  ) : (
                    <p>
                      {report.summary?.replace(/fine motor delay/gi, "developing hand coordination")
                        .replace(/SD/g, "variation")
                        .replace(/refer/gi, "talk with a specialist") || 'No summary available.'}
                    </p>
                  )}
                </div>
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <p className="text-sm text-primary font-medium flex items-center gap-2 mb-1">
                    <Lightbulb className="w-4 h-4" />
                    The Power of Early Action
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Early identification is a necessary paradigm shift. By starting now, you are taking advantage 
                    of the most critical window for brain development. This screening helps you move past uncertainty 
                    into proactive, evidence-based care.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-foreground leading-relaxed">
                  {report.summary || 'No summary available.'}
                </p>
                {report.riskRationale && (
                  <div className="mt-4 p-4 border-l-4 border-primary/30 bg-muted/30 rounded-r-lg">
                    <p className="text-sm text-foreground flex items-center gap-2 mb-2 font-semibold">
                      <Brain className="w-4 h-4 text-primary" />
                      Clinical Reasoning (MedGemma)
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                      "{report.riskRationale}"
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Visual Evidence Analysis - NEW Enhanced Section */}
      {evidence?.fromVisualAnalysis?.length > 0 && (
        <div className="space-y-2">
          {activeTab === 'clinician' && (
            <div className="px-1 flex items-center gap-2">
               <Eye className="w-4 h-4 text-primary" />
               <span className="text-sm font-semibold text-primary uppercase tracking-wider">Image / Activity Insight Panel</span>
            </div>
          )}
          <VisualEvidenceCard
            findings={evidence.fromVisualAnalysis}
            imagePreview={imagePreview}
            domain={domain}
          />
          {activeTab === 'clinician' && (
            <p className="text-[10px] text-muted-foreground italic px-1">
              The highlighted regions indicate features the model identified as relevant to {getDomainLabel(domain).toLowerCase()}, such as line continuity and shape control. These observations are not diagnostic findings.
            </p>
          )}
        </div>
      )}

      {/* Supporting Evidence */}
      {evidence && (evidence.fromParentReport?.length > 0 || evidence.fromAssessmentScores?.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-primary flex items-center gap-2 text-lg">
                <Target className="w-5 h-5" />
                Supporting Evidence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {evidence.fromParentReport?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">From Parent Report</h4>
                  <ul className="space-y-1">
                    {evidence.fromParentReport.map((item: string, idx: number) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {evidence.fromAssessmentScores?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">From Assessment Scores</h4>
                  <ul className="space-y-1">
                    {evidence.fromAssessmentScores.map((item: string, idx: number) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Developmental Profile */}
      {profile && (profile.strengths?.length > 0 || profile.concerns?.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-primary flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5" />
                Developmental Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {profile.strengths?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-600 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Strengths
                    </h4>
                    <ul className="space-y-2">
                      {profile.strengths.map((item: string, idx: number) => (
                        <li key={idx} className="text-sm p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {profile.concerns?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-amber-600 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {activeTab === 'clinician' ? 'Areas of Concern' : 'Areas to watch'}
                    </h4>
                    <ul className="space-y-2">
                      {profile.concerns.map((item: string, idx: number) => (
                        <li key={idx} className="text-sm p-2 bg-amber-50 rounded-lg border border-amber-100">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Milestones - Enhanced Visual Timeline */}
              {(profile.milestonesMet?.length > 0 || profile.milestonesEmerging?.length > 0 || profile.milestonesNotObserved?.length > 0) && childAge && (
                <div className="mt-6 pt-4 border-t">
                  <VisualMilestoneTimeline
                    childAge={parseInt(childAge) || 24}
                    milestones={[
                      ...(profile.milestonesMet?.map((m: string) => ({
                        name: m,
                        expectedAge: parseInt(childAge) - 2 || 22,
                        status: 'achieved' as const,
                        domain: domain,
                      })) || []),
                      ...(profile.milestonesEmerging?.map((m: string) => ({
                        name: m,
                        expectedAge: parseInt(childAge) || 24,
                        status: 'emerging' as const,
                        domain: domain,
                      })) || []),
                      ...(profile.milestonesNotObserved?.map((m: string) => ({
                        name: m,
                        expectedAge: parseInt(childAge) + 2 || 26,
                        status: 'not_observed' as const,
                        domain: domain,
                      })) || []),
                    ]}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="shadow-lg border-none bg-gradient-to-br from-card to-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-primary flex items-center gap-2 text-lg">
                <Lightbulb className="w-5 h-5" />
                {activeTab === 'clinician' ? 'Clinical Considerations' : 'Suggested next steps'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeTab === 'clinician' && (
                  <div className="mb-4 text-sm text-foreground space-y-2 bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <p className="font-semibold flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-primary" />
                      Clinical Interpretation Prompt
                    </p>
                    <p className="text-muted-foreground italic">You may wish to:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Ask follow-up questions about daily activities</li>
                      <li>Monitor progress over time</li>
                      <li>Consider referral if concerns persist or increase</li>
                    </ul>
                    <p className="text-[10px] text-muted-foreground mt-2 border-t pt-2">No action is required solely based on this screening.</p>
                  </div>
                )}
                <ol className="space-y-3">
                  {report.recommendations.map((rec: string, index: number) => (
                    <motion.li 
                      key={index} 
                      className="flex items-start gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                    >
                      <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-sm font-bold shadow-sm">
                        {index + 1}
                      </span>
                      <span className="text-foreground pt-1 leading-relaxed">
                        {activeTab === 'caregiver' ? rec.replace(/refer/gi, "talk with a specialist")
                          .replace(/evaluate/gi, "check in with")
                          .replace(/clinical/gi, "expert") : rec}
                      </span>
                    </motion.li>
                  ))}
                </ol>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Parent-Friendly Tips */}
      {report.parentFriendlyTips && report.parentFriendlyTips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-lg border-none bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-700 flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                Activities for Home
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {report.parentFriendlyTips.map((tip: string, index: number) => (
                  <li key={index} className="flex items-start gap-3 p-3 bg-white/60 rounded-xl">
                    <span className="text-xl">💡</span>
                    <span className="text-foreground">{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Referral Guidance */}
      {referral?.needed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card className="shadow-lg border-2 border-red-200 bg-red-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-700 flex items-center gap-2 text-lg">
                <AlertCircle className="w-5 h-5" />
                {activeTab === 'clinician' ? 'Referral Support (optional)' : 'Referral Recommended'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="capitalize">
                    {referral.urgency} Priority
                  </Badge>
                </div>
                {referral.reason && (
                  <p className="text-sm text-foreground">{referral.reason}</p>
                )}
                {referral.specialties?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Recommended Specialists:</p>
                    <div className="flex flex-wrap gap-2">
                      {referral.specialties.map((spec: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="border-red-300">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {activeTab === 'clinician' && (
                  <p className="text-[10px] text-muted-foreground italic border-t pt-2">
                    Based on screening patterns, occupational therapy may be an appropriate consideration if concerns persist. Final referral decisions remain at clinician discretion.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Follow-Up Schedule */}
      {followUp && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-primary flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5" />
                Follow-Up Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-xl text-center">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold text-foreground">{followUp.rescreenIntervalDays}</p>
                  <p className="text-xs text-muted-foreground">Days until next screening</p>
                </div>
                {followUp.monitoringFocus?.length > 0 && (
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-sm font-medium mb-2">Monitor</p>
                    <ul className="text-sm text-muted-foreground">
                      {followUp.monitoringFocus.map((item: string, idx: number) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {followUp.redFlagsToWatch?.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                    <p className="text-sm font-medium text-red-700 mb-2">⚠️ Red Flags</p>
                    <ul className="text-sm text-red-600">
                      {followUp.redFlagsToWatch.map((item: string, idx: number) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div 
        className="flex flex-col gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        {activeTab === 'clinician' && (
          <>
            <Link to={`/pediscreen/review-collab/${screeningId}`}>
              <Button variant="outline" className="w-full gap-2 h-12 rounded-xl mb-3">
                <UsersRound className="w-4 h-4" />
                Open collaborative review (CHW + clinician)
              </Button>
            </Link>
            <ClinicianReview
              reportId={screeningId}
              apiKey={import.meta.env.VITE_API_KEY}
              onDone={() => {
                toast({ title: 'Report signed', description: 'Clinician review completed.' });
              }}
            />
            <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-primary" />
                Documentation Helper (Copy-to-EHR)
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-[10px] gap-1"
                onClick={() => fallbackCopy(`“Developmental screening performed using PediScreen AI. Screening suggests emerging ${getDomainLabel(domain).toLowerCase()}. Findings are non-diagnostic and will be monitored over time in conjunction with clinical assessment.”`)}
              >
                <Plus className="w-3 h-3" /> Copy Text
              </Button>
            </CardHeader>
            <CardContent className="py-2 px-4">
              <div className="p-3 bg-background rounded-lg border border-primary/10 text-xs font-mono text-muted-foreground leading-relaxed">
                “Developmental screening performed using PediScreen AI. Screening suggests emerging {getDomainLabel(domain).toLowerCase()}. Findings are non-diagnostic and will be monitored over time in conjunction with clinical assessment.”
              </div>
            </CardContent>
          </Card>
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="gap-2 h-12 rounded-xl"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4" />
            {activeTab === 'caregiver' ? 'Share with doctor' : 'Share Report'}
          </Button>
          <Button
            variant="outline"
            className="gap-2 h-12 rounded-xl"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" />
            {activeTab === 'caregiver' ? 'Print summary' : 'Print Report'}
          </Button>
          <Link to="/pediscreen/screening" className="w-full">
            <Button className="w-full gap-2 h-12 rounded-xl">
              <Plus className="w-4 h-4" />
              {activeTab === 'caregiver' ? 'Start screening' : 'New Screening'}
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-5 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              <strong>Privacy First:</strong> Your child’s screening is private. Results are only shared if you choose to share them. This is not a diagnosis.
            </p>
          </CardContent>
        </Card>
      </motion.div>
      {/* Clinical Disclaimer */}
      <motion.div 
        className="mt-8 p-4 bg-muted/30 border border-muted/50 rounded-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Clinical Decision Support Tool</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This report is generated by PediScreen AI (Cognita Health) using the MedGemma 2B model. It is intended for educational purposes and as a decision-support aid for Community Health Workers. This is NOT a medical diagnosis. All screening results must be reviewed by a licensed pediatric professional.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResultsScreen;
