import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, User, Calendar, History, ArrowRight, Baby, Edit2, Trash2, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type ChildProfile = {
  id: string;
  name: string;
  age: string;
  birthDate: string;
  lastScreening: string;
  status: string;
  progress: number;
  initials: string;
  color: string;
};

const BADGE_COLORS = ['bg-blue-100 text-blue-600', 'bg-amber-100 text-amber-600', 'bg-emerald-100 text-emerald-600', 'bg-violet-100 text-violet-600', 'bg-rose-100 text-rose-600'] as const;

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatAgeFromBirthDate(birthDateStr: string): string {
  const birth = new Date(birthDateStr);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 12) return `${months} months`;
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return remainder === 0 ? `${years} ${years === 1 ? 'year' : 'years'}` : `${years}y ${remainder}mo`;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const DEFAULT_CHILDREN: ChildProfile[] = [
  {
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
  {
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
];

const Profiles = () => {
  const navigate = useNavigate();
  const [children, setChildren] = React.useState<ChildProfile[]>(DEFAULT_CHILDREN);
  const [addOpen, setAddOpen] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newBirthDate, setNewBirthDate] = React.useState('');

  const handleOpenAdd = () => {
    setNewName('');
    setNewBirthDate('');
    setAddOpen(true);
  };

  const handleAddProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      toast.error('Please enter the child\'s name.');
      return;
    }
    const birthDate = newBirthDate.trim();
    if (!birthDate) {
      toast.error('Please enter the birth date.');
      return;
    }
    const date = new Date(birthDate);
    if (isNaN(date.getTime())) {
      toast.error('Please enter a valid birth date.');
      return;
    }
    const id = String(Date.now());
    const colorIndex = children.length % BADGE_COLORS.length;
    const profile: ChildProfile = {
      id,
      name,
      age: formatAgeFromBirthDate(birthDate),
      birthDate: formatDisplayDate(birthDate),
      lastScreening: 'No screening yet',
      status: 'On track',
      progress: 0,
      initials: getInitials(name),
      color: BADGE_COLORS[colorIndex],
    };
    setChildren((prev) => [...prev, profile]);
    setAddOpen(false);
    toast.success(`Profile for ${name} added.`);
  };

  const handleDelete = (id: string, name: string) => {
    setChildren((prev) => prev.filter((c) => c.id !== id));
    toast.success(`Profile for ${name} removed.`);
  };

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
          <Button className="rounded-xl gap-2 shadow-lg" onClick={handleOpenAdd}>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70" onClick={() => handleDelete(child.id, child.name)}>
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
              onClick={handleOpenAdd}
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

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add new profile</DialogTitle>
              <DialogDescription>
                Add a child to track their developmental milestones. You can run screenings from their profile later.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Child's name</Label>
                <Input
                  id="profile-name"
                  placeholder="e.g. Maya Johnson"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-birthdate">Birth date</Label>
                <Input
                  id="profile-birthdate"
                  type="date"
                  value={newBirthDate}
                  onChange={(e) => setNewBirthDate(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="gap-2">
                  <Plus className="w-4 h-4" /> Add profile
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
};

export default Profiles;
