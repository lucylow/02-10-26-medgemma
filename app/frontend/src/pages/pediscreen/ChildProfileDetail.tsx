/**
 * ChildProfileDetail — Single child profile dashboard (progress, screenings, actions)
 */

import React, { useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, History, Activity, Plus, FileText, Stethoscope } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MOCK_CHILDREN_BY_ID, MOCK_SCREENING_HISTORY, type MockChildProfile } from '@/data/demoMockData';

const domainLabels: Record<string, string> = {
  communication: 'Communication & Language',
  gross_motor: 'Gross Motor',
  fine_motor: 'Fine Motor',
  cognitive: 'Problem Solving',
  social: 'Personal-Social',
};

export default function ChildProfileDetail() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateChild = (location.state as { child?: MockChildProfile })?.child;
  const child = stateChild ?? (childId ? MOCK_CHILDREN_BY_ID[childId] : null);

  const recentScreenings = useMemo(() => {
    if (!childId) return [];
    return MOCK_SCREENING_HISTORY.filter((h) => h.childId === childId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [childId]);

  if (!childId || !child) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">Profile not found.</p>
        <Button variant="outline" className="mt-4 gap-2" onClick={() => navigate('/pediscreen/profiles')}>
          <ArrowLeft className="w-4 h-4" />
          Back to Profiles
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <TooltipProvider>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <Button
            variant="ghost"
            className="gap-2 -ml-2"
            onClick={() => navigate('/pediscreen/profiles')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profiles
          </Button>

          <Card className="overflow-hidden border-none shadow-md">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <motion.div
                  className={`w-16 h-16 rounded-2xl ${child.color} flex items-center justify-center text-2xl font-bold`}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  {child.initials}
                </motion.div>
                <Badge variant={child.status === 'On track' ? 'default' : 'destructive'} className="rounded-full">
                  {child.status}
                </Badge>
              </div>
              <CardTitle className="mt-4 text-2xl">{child.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4" /> {child.age} • {child.birthDate}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-xl">
                  <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
                  <TabsTrigger value="screenings" className="rounded-lg gap-1.5">
                    <FileText className="w-4 h-4" />
                    Screenings ({recentScreenings.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Developmental Progress</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-primary cursor-help underline decoration-dotted">
                            {child.progress}%
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px]">
                          <p>
                            Overall progress is based on completed screenings and milestones across domains.
                            Higher values indicate more screenings completed and milestones met.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full cursor-help">
                          <Progress value={child.progress} className="h-2" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px]">
                        <p>Hover or tap to see progress. Rescreen regularly to keep this up to date.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                    <History className="w-4 h-4 flex-shrink-0" />
                    <span>Last screening: {child.lastScreening}</span>
                  </div>
                  {child.lastDomain && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                      <Stethoscope className="w-4 h-4 flex-shrink-0" />
                      <span>Last domain: {domainLabels[child.lastDomain] || child.lastDomain}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Progress is based on completed screenings. Run a new screening to update developmental summary.
                  </p>
                </TabsContent>
                <TabsContent value="screenings" className="mt-4 space-y-3">
                  {recentScreenings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No screenings yet for this child. Start one to build history.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {recentScreenings.map((s, i) => (
                        <motion.li
                          key={s.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <button
                            type="button"
                            onClick={() => navigate('/pediscreen/history')}
                            className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-xl border bg-card hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-sm font-medium text-foreground">{s.date}</span>
                              <Badge variant="secondary" className="rounded-full text-xs shrink-0">
                                {s.riskLevel}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground truncate">{s.domainLabel}</span>
                          </button>
                        </motion.li>
                      ))}
                    </ul>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl gap-2 mt-2"
                    onClick={() => navigate('/pediscreen/history')}
                  >
                    <History className="w-4 h-4" />
                    View full screening history
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                className="w-full rounded-xl gap-2"
                onClick={() => navigate('/pediscreen/screening')}
              >
                <Plus className="w-4 h-4" />
                New Screening
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                variant="outline"
                className="w-full rounded-xl gap-2"
                onClick={() => navigate('/pediscreen/history')}
              >
                <Activity className="w-4 h-4" />
                Screening History
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </TooltipProvider>
    </div>
  );
}
