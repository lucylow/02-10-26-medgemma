import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, History, ArrowRight, Edit2, Trash2, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { MOCK_CHILD_PROFILES } from '@/data/demoMockData';

const Profiles = () => {
  const navigate = useNavigate();
  const children = MOCK_CHILD_PROFILES;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Child Profiles</h1>
            <p className="text-muted-foreground">Manage and monitor developmental progress for each child.</p>
          </div>
          <Button className="rounded-xl gap-2 shadow-lg" onClick={() => toast.info('Add profile form coming soon')}>
            <Plus className="w-4 h-4" /> Add New Profile
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((child, index) => (
            <motion.div
              key={child.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="cursor-pointer"
              onClick={() => navigate(`/pediscreen/profiles/${child.id}`, { state: { child } })}
            >
              <Card className="overflow-hidden hover:shadow-xl transition-shadow border-none shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className={`w-14 h-14 rounded-2xl ${child.color} flex items-center justify-center text-xl font-bold`}>
                      {child.initials}
                    </div>
                    <Badge variant={child.status === 'On track' ? 'default' : 'destructive'} className="rounded-full">
                      {child.status}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 text-xl">{child.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Calendar className="w-3 h-3" /> {child.age} • {child.birthDate}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
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
                <CardFooter className="bg-muted/10 border-t p-3 flex justify-between" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => navigate(`/pediscreen/profiles/${child.id}`, { state: { child } })}
                      aria-label="Edit profile"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70" onClick={(e) => { e.stopPropagation(); toast.info('Remove profile coming soon'); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-lg"
                    onClick={() => navigate(`/pediscreen/profiles/${child.id}`, { state: { child } })}
                  >
                    View Dashboard <ArrowRight className="w-3 h-3" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}

          {/* Add Placeholder Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: children.length * 0.1 }}
          >
            <Card
              className="border-dashed border-2 bg-muted/5 flex flex-col items-center justify-center p-8 h-full min-h-[300px] cursor-pointer hover:bg-muted/10 transition-colors"
              onClick={() => toast.info('Add profile form coming soon')}
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-muted-foreground">Add another child</p>
              <p className="text-xs text-muted-foreground/60 mt-2 text-center">Track multiple children's developmental milestones separately.</p>
            </Card>
          </motion.div>
        </div>

        {/* Info Section */}
        <div className="mt-12">
          <Card className="bg-primary/5 border-none">
            <CardContent className="flex flex-col md:flex-row items-center gap-6 pt-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">Personalized Milestones</h3>
                <p className="text-muted-foreground">
                  By creating a profile, PediScreen AI tailors its screening questions and visual analysis 
                  to the child's specific age and previous developmental history.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default Profiles;
