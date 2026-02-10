import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Baby, Home, Plus, History, ArrowLeft, Menu, Sparkles, ChevronRight, UserCircle, Settings, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { title: 'Dashboard', path: '/pediscreen', icon: Home },
  { title: 'Profiles', path: '/pediscreen/profiles', icon: UserCircle },
  { title: 'New Screening', path: '/pediscreen/screening', icon: Plus },
  { title: 'History', path: '/pediscreen/history', icon: History },
  { title: 'Education', path: '/pediscreen/education', icon: BookOpen },
  { title: 'Settings', path: '/pediscreen/settings', icon: Settings },
];

const getBreadcrumbs = (pathname: string) => {
  const crumbs = [{ label: 'PediScreen', path: '/pediscreen' }];
  if (pathname.includes('/profiles')) crumbs.push({ label: 'Profiles', path: '/pediscreen/profiles' });
  if (pathname.includes('/screening')) crumbs.push({ label: 'New Screening', path: '/pediscreen/screening' });
  if (pathname.includes('/history')) crumbs.push({ label: 'History', path: '/pediscreen/history' });
  if (pathname.includes('/education')) crumbs.push({ label: 'Education', path: '/pediscreen/education' });
  if (pathname.includes('/settings')) crumbs.push({ label: 'Settings', path: '/pediscreen/settings' });
  if (pathname.includes('/results')) crumbs.push({ label: 'Results', path: pathname });
  if (pathname.includes('/learn-more')) crumbs.push({ label: 'Architecture', path: '/pediscreen/learn-more' });
  return crumbs;
};

const NavContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();

  return (
    <nav className="flex flex-col gap-1.5 p-4">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative',
              isActive
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.title}</span>
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute left-0 w-1 h-8 bg-primary-foreground rounded-r-full"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
};

const PediScreenLayout = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground py-3 px-4 shadow-lg sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 rounded-xl">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 border-r-0">
                  <div className="flex items-center gap-3 p-5 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground">
                    <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                      <Baby className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-lg font-bold block">PediScreen AI</span>
                      <span className="text-xs text-primary-foreground/70 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Powered by MedGemma
                      </span>
                    </div>
                  </div>
                  <NavContent onNavigate={() => setSheetOpen(false)} />
                  <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-muted/30">
                    <Link to="/" onClick={() => setSheetOpen(false)}>
                      <Button variant="outline" className="w-full gap-2 rounded-xl">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Main Site
                      </Button>
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            )}
            <Link to="/pediscreen" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <Baby className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold">PediScreen AI</h1>
            </Link>
          </div>
          
          {!isMobile && (
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10 gap-2 rounded-xl">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Breadcrumb Bar */}
      <div className="bg-card/50 border-b px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.path}>
              {i > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <Link
                to={crumb.path}
                className={cn(
                  'px-2 py-1 rounded-md transition-colors',
                  i === breadcrumbs.length - 1
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {crumb.label}
              </Link>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside className="w-60 border-r bg-card/80 backdrop-blur-sm hidden lg:flex flex-col">
            <NavContent />
            <div className="mt-auto p-4 border-t">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-center">
                <Sparkles className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">AI-powered screening</p>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content with Page Transitions */}
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default PediScreenLayout;
