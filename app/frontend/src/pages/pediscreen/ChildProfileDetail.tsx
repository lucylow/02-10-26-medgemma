/**
 * ChildProfileDetail — Single child profile dashboard (progress, screenings, actions)
 */

import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, History, Activity, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const MOCK_CHILDREN: Record<string, {
  id: string;
  name: string;
  age: string;
  birthDate: string;
  lastScreening: string;
  status: string;
  progress: number;
  initials: string;
  color: string;
}> = {
  '1': {
    id: '1',
    name: 'Maya Johnson',
    age: '18 months',
    birthDate: 'August 12, 2024',
    lastScreening: 'Jan 15, 2026',
    status: 'On track',
    progress: 85,
    initials: 'MJ',
    color: 'bg-blue-100 text-blue-600',
  },
  '2': {
    id: '2',
    name: 'Leo Smith',
    age: '36 months',
    birthDate: 'Feb 5, 2023',
    lastScreening: 'Dec 10, 2025',
    status: 'Needs follow-up',
    progress: 60,
    initials: 'LS',
    color: 'bg-amber-100 text-amber-600',
  },
};

export default function ChildProfileDetail() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateChild = (location.state as { child?: (typeof MOCK_CHILDREN)['1'] })?.child;
  const child = stateChild ?? (childId ? MOCK_CHILDREN[childId] : null);

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
              <div className={`w-16 h-16 rounded-2xl ${child.color} flex items-center justify-center text-2xl font-bold`}>
                {child.initials}
              </div>
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
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Developmental Progress</span>
                <span>{child.progress}%</span>
              </div>
              <Progress value={child.progress} className="h-2" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
              <History className="w-4 h-4" />
              <span>Last screening: {child.lastScreening}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            className="flex-1 rounded-xl gap-2"
            onClick={() => navigate('/pediscreen/screening')}
          >
            <Plus className="w-4 h-4" />
            New Screening
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-xl gap-2"
            onClick={() => navigate('/pediscreen/history')}
          >
            <Activity className="w-4 h-4" />
            Screening History
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
