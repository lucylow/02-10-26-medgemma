import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { PARENT_ONE_LINER } from '@/constants/disclaimers';
import { Baby, Home, Plus, History, ArrowLeft, Menu, Sparkles, ChevronRight, UserCircle, Settings, BookOpen, Scan, FileText, FlaskConical, Mic, Lock, Wallet, Link2, Puzzle, BookMarked } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectWalletButton } from '@/components/blockchain';

const mainNavItems = [
  { title: 'Home', path: '/pediscreen', icon: Home },
  { title: 'New Screening', path: '/pediscreen/screening', icon: Plus },
  { title: 'Dashboard', path: '/pediscreen/dashboard', icon: Sparkles },
  { title: 'History', path: '/pediscreen/history', icon: History },
  { title: 'Profiles', path: '/pediscreen/profiles', icon: UserCircle },
];

const toolsNavItems = [
  { title: 'Voice', path: '/pediscreen/voice', icon: Mic },
  { title: 'Agent Pipeline', path: '/pediscreen/agent-pipeline', icon: Sparkles },
  { title: 'Education', path: '/pediscreen/education', icon: BookOpen },
  { title: 'Guidelines', path: '/pediscreen/guidelines', icon: BookMarked },
  { title: 'Integrations', path: '/pediscreen/integrations', icon: Puzzle },
  { title: 'Blockchain', path: '/pediscreen/blockchain', icon: Wallet },
  { title: 'Federated Learning', path: '/pediscreen/federated', icon: Lock },
  { title: 'HealthChain', path: '/pediscreen/healthchain', icon: Link2 },
  { title: 'Settings', path: '/pediscreen/settings', icon: Settings },
  { title: 'Radiology', path: '/pediscreen/radiology', icon: Scan },
  { title: 'Technical Writer', path: '/pediscreen/technical-writer', icon: FileText },
  { title: 'End2End Demo', path: '/pediscreen/end2end-demo', icon: FlaskConical },
];

const getBreadcrumbs = (pathname: string) => {
  const crumbs = [{ label: 'PediScreen', path: '/pediscreen' }];
  if (pathname.includes('/dashboard')) crumbs.push({ label: 'Dashboard', path: '/pediscreen/dashboard' });
  if (pathname.includes('/voice')) crumbs.push({ label: 'Voice', path: '/pediscreen/voice' });
  if (pathname.includes('/agent-pipeline')) crumbs.push({ label: 'AI Agent Pipeline', path: '/pediscreen/agent-pipeline' });
  if (pathname.includes('/profiles')) crumbs.push({ label: 'Profiles', path: '/pediscreen/profiles' });
  if (pathname.includes('/screening')) crumbs.push({ label: 'New Screening', path: '/pediscreen/screening' });
  if (pathname.includes('/history')) crumbs.push({ label: 'History', path: '/pediscreen/history' });
  if (pathname.includes('/education')) crumbs.push({ label: 'Education', path: '/pediscreen/education' });
  if (pathname.includes('/settings')) crumbs.push({ label: 'Settings', path: '/pediscreen/settings' });
  if (pathname.includes('/radiology')) crumbs.push({ label: 'Radiology Worklist', path: '/pediscreen/radiology' });
  if (pathname.includes('/technical-writer')) crumbs.push({ label: 'Technical Writer', path: '/pediscreen/technical-writer' });
  if (pathname.includes('/end2end-demo')) crumbs.push({ label: 'End2End Demo', path: '/pediscreen/end2end-demo' });
  if (pathname.includes('/federated')) crumbs.push({ label: 'Federated Learning', path: '/pediscreen/federated' });
  if (pathname.includes('/blockchain')) crumbs.push({ label: 'Blockchain', path: '/pediscreen/blockchain' });
  if (pathname.includes('/healthchain')) crumbs.push({ label: 'HealthChain POC', path: '/pediscreen/healthchain' });
  if (pathname.includes('/integrations')) crumbs.push({ label: 'Integrations', path: '/pediscreen/integrations' });
  if (pathname.includes('/guidelines')) crumbs.push({ label: 'Guidelines', path: '/pediscreen/guidelines' });
  if (pathname.includes('/results')) crumbs.push({ label: 'Results', path: pathname });
  if (pathname.includes('/case/')) crumbs.push({ label: 'Case Detail', path: pathname });
  if (pathname.includes('/learn-more')) crumbs.push({ label: 'Architecture', path: '/pediscreen/learn-more' });
  return crumbs;
};

const NavContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();

  const renderNavLink = (item: (typeof mainNavItems)[0]) => {
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
        <item.icon className="w-5 h-5 shrink-0" />
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
  };

  return (
    <nav className="flex flex-col gap-1.5 p-4">
      <div className="space-y-1">
        {mainNavItems.map(renderNavLink)}
      </div>
      <div className="pt-3 mt-2 border-t border-border">
        <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Tools
        </p>
        <div className="space-y-1">
          {toolsNavItems.map(renderNavLink)}
        </div>
      </div>
    </nav>
  );
};

const PediScreenLayout = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/[0.03] to-accent/[0.04] flex flex-col">
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
                <SheetContent side="left" className="w-72 p-0 border-r-0 rounded-r-2xl">
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
            <Link to="/pediscreen" className="flex items-center gap-3 rounded-xl p-1 -ml-1 hover:bg-primary-foreground/10 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <Baby className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold">PediScreen AI</h1>
            </Link>
          </div>
          
          {!isMobile && (
            <div className="flex items-center gap-3">
              <ConnectWalletButton />
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10 gap-2 rounded-xl">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Breadcrumb Bar */}
      <div className="bg-card/60 backdrop-blur-sm border-b border-border/80 px-4 py-2.5">
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
          <aside className="w-60 border-r border-border/80 bg-card/70 backdrop-blur-sm hidden lg:flex flex-col">
            <NavContent />
            <div className="mt-auto p-4 border-t border-border/80">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-center border border-primary/10">
                <Sparkles className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">AI-powered screening</p>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content with Page Transitions */}
        <main id="main-content" className="flex-1 overflow-auto flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
          {/* FDA-aligned footer — regulatory-aware UI language */}
          <footer className="text-xs text-muted-foreground mt-8 py-5 px-4 border-t border-border/60 bg-muted/20 text-center">
            {PARENT_ONE_LINER}
          </footer>
        </main>
      </div>
    </div>
  );
};

export default PediScreenLayout;
