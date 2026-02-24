import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, Sparkles, ClipboardList, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { listScreenings, type ScreeningListItem } from '@/services/screeningApi';

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatRiskLabel = (riskLevel?: string) => {
  const map: Record<string, string> = {
    low: 'On Track',
    medium: 'Monitor',
    high: 'Refer',
    on_track: 'On Track',
    monitor: 'Monitor',
    refer: 'Refer',
  };
  return map[riskLevel?.toLowerCase() || ''] || riskLevel || '—';
};

const ScreeningHistory = () => {
  const [screenings, setScreenings] = useState<ScreeningListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listScreenings({ limit: 50, page: 0 })
      .then(({ items }) => setScreenings(items))
      .catch(() => {
        setScreenings([]);
        toast.error("Couldn't load screening history", {
          description: "Check your connection and try again.",
        });
      })
      .finally(() => setLoading(false));
  }, []);

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

      {loading ? (
        <Card className="border-dashed border-2 bg-gradient-to-br from-card to-muted/30">
          <CardContent className="py-16 text-center">
            <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading screenings...</p>
          </CardContent>
        </Card>
      ) : screenings.length === 0 ? (
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
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <ClipboardList className="w-12 h-12 text-primary/60" />
              </motion.div>
              <h3 className="text-2xl font-semibold text-foreground mb-3">
                No Screenings Yet
              </h3>
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
        <div className="space-y-4">
          {screenings.map((screening, index) => (
            <motion.div
              key={screening.screening_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                to="/pediscreen/results"
                state={{
                  screeningId: screening.screening_id,
                  report: screening.report,
                  childAge: String(screening.child_age_months),
                  domain: screening.domain,
                  confidence: screening.report?.confidence,
                }}
              >
                <Card className="hover:shadow-lg transition-all duration-300 border-none shadow-md cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{formatDate(screening.created_at)}</CardTitle>
                      <span className="text-sm px-4 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
                        {formatRiskLabel(screening.report?.riskLevel)}
                      </span>
                    </div>
                    <CardDescription className="flex items-center gap-4">
                      <span>Age: {screening.child_age_months} months</span>
                      <span>•</span>
                      <span>Domain: {screening.domain || '—'}</span>
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
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
                  Regular screenings help identify developmental trends and ensure children receive 
                  timely support when needed.
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
