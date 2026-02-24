import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, Sparkles, ClipboardList, ArrowRight, Search, ChevronDown, ChevronUp, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MOCK_SCREENING_HISTORY, MOCK_CHILDREN_BY_ID } from '@/data/demoMockData';

type SortOption = 'newest' | 'oldest';
type RiskFilter = 'all' | string;

const ScreeningHistory = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [sort, setSort] = useState<SortOption>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const screenings = useMemo(() => {
    let list = MOCK_SCREENING_HISTORY.map((h) => ({
      id: h.id,
      date: h.date,
      childAge: h.childName,
      domain: h.domainLabel,
      riskLevel: h.riskLevel,
      summary: h.summary,
      childId: h.childId,
    }));

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.childAge.toLowerCase().includes(q) ||
          s.domain.toLowerCase().includes(q) ||
          (s.summary && s.summary.toLowerCase().includes(q))
      );
    }

    if (riskFilter !== 'all') {
      list = list.filter((s) => s.riskLevel.toLowerCase() === riskFilter.toLowerCase());
    }

    list = [...list].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sort === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return list;
  }, [search, riskFilter, sort]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Screening History</h2>
        <p className="text-muted-foreground">View and track past developmental screenings</p>
      </motion.div>

      {MOCK_SCREENING_HISTORY.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-dashed border-2 bg-gradient-to-br from-card to-muted/30">
            <CardContent className="py-16 text-center">
              <motion.div
                className="w-24 h-24 mx-auto bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl flex items-center justify-center mb-6"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ClipboardList className="w-12 h-12 text-primary/60" />
              </motion.div>
              <h3 className="text-2xl font-semibold text-foreground mb-3">No Screenings Yet</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Start your first developmental screening to begin tracking a child's progress over time.
              </p>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link to="/pediscreen/screening">
                  <Button size="lg" className="gap-2 rounded-xl shadow-lg px-8">
                    <Sparkles className="w-5 h-5" />
                    Start First Screening
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
          {/* Search, filter, sort bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row gap-3 mb-6"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by child, domain, or summary..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>
            <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as RiskFilter)}>
              <SelectTrigger className="w-full sm:w-[160px] rounded-xl">
                <SelectValue placeholder="Risk level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All risk levels</SelectItem>
                <SelectItem value="on track">On track</SelectItem>
                <SelectItem value="monitor">Monitor</SelectItem>
                <SelectItem value="refer">Refer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="w-full sm:w-[160px] rounded-xl">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {screenings.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-12 text-muted-foreground"
                >
                  No screenings match your filters. Try adjusting search or risk level.
                </motion.div>
              ) : (
                screenings.map((screening, index) => (
                  <motion.div
                    key={screening.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Collapsible
                      open={expandedId === screening.id}
                      onOpenChange={(open) => setExpandedId(open ? screening.id : null)}
                    >
                      <Card className="hover:shadow-lg transition-all duration-300 border-none shadow-md overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{screening.date}</CardTitle>
                              <span className="text-sm px-4 py-1.5 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-2">
                                {screening.riskLevel}
                                {screening.summary ? (
                                  expandedId === screening.id ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )
                                ) : null}
                              </span>
                            </div>
                            <CardDescription className="flex items-center gap-4 flex-wrap">
                              <span className="flex items-center gap-1.5">
                                <User className="w-4 h-4" />
                                {screening.childAge}
                              </span>
                              <span>•</span>
                              <span>{screening.domain}</span>
                            </CardDescription>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0 pb-4">
                            {screening.summary && (
                              <p className="text-sm text-muted-foreground pl-1">{screening.summary}</p>
                            )}
                            <div className="flex gap-2 mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-lg gap-1.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const child = screening.childId ? MOCK_CHILDREN_BY_ID[screening.childId] : null;
                                  navigate(`/pediscreen/profiles/${screening.childId}`, {
                                    state: child ? { child } : undefined,
                                  });
                                }}
                              >
                                <User className="w-3.5 h-3.5" />
                                View child profile
                              </Button>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8"
      >
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="py-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Track Development Over Time</h4>
                <p className="text-sm text-muted-foreground">
                  Regular screenings help identify developmental trends and ensure children receive timely support when
                  needed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ScreeningHistory;
