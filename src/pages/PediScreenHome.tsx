import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Baby, ClipboardList, Shield, Brain, ArrowRight, History, Sparkles, CheckCircle2, Users, HeartHandshake, Stethoscope } from 'lucide-react';
import { motion } from 'framer-motion';

const PediScreenHome = () => {
  const features = [
    {
      icon: Brain,
      title: 'MedGemma Core',
      description: 'Leveraging Google\'s open-weight MedGemma model fine-tuned for developmental milestones.',
      color: 'from-primary/20 to-primary/5',
    },
    {
      icon: Shield,
      title: 'Privacy-First Edge AI',
      description: 'On-device inference ensures sensitive child data never leaves the user\'s device.',
      color: 'from-success/20 to-success/5',
    },
    {
      icon: Users,
      title: 'Health Equity & Access',
      description: 'Bridging the gap for underserved communities with standardized, always-available screening.',
      color: 'from-accent/20 to-accent/5',
    },
  ];

  const team = [
    { name: 'Alex Chen, MD/PhD Cand.', role: 'Clinical Domain Expert' },
    { name: 'Sam Rivera', role: 'Technical Lead' },
    { name: 'Jordan Patel', role: 'UI/UX Lead' },
    { name: 'Casey Kim', role: 'Data Scientist' },
  ];

  const stats = [
    { value: '5', label: 'Developmental Domains', icon: CheckCircle2 },
    { value: '0-72', label: 'Months Coverage', icon: Baby },
    { value: '100%', label: 'Privacy Protected', icon: Shield },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Hero Section */}
      <motion.div 
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl mb-6 shadow-lg"
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Baby className="w-12 h-12 text-primary" />
        </motion.div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
          Every child deserves a 
          <span className="text-primary block sm:inline"> strong start</span>
          <span className="block text-primary mt-2 text-2xl sm:text-3xl font-medium text-muted-foreground">A communication bridge for caregivers and clinicians</span>
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
          PediScreen AI facilitates diagnostic workflows by organizing, contextualizing, and communicating screening evidence so clinicians can make more informed diagnostic decisions.
        </p>
        
        {/* New core framing points */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12 text-left">
          <Card className="bg-muted/30 border-none">
            <CardContent className="pt-6">
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                Pre-diagnostic signal
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Collects structured screening data and captures real-world behaviors before the visit.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30 border-none">
            <CardContent className="pt-6">
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Pattern highlighting
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Flags patterns associated with developmental domains without issuing conclusions.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30 border-none">
            <CardContent className="pt-6">
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Longitudinal context
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Stores past screenings to show trends over time, supporting evidence-based decisions.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30 border-none">
            <CardContent className="pt-6">
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Reducing bias
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Anchors discussion in observable data to help counter cognitive and diagnostic bias.
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link to="/pediscreen/screening">
              <Button size="lg" className="gap-2 w-full sm:w-auto rounded-xl shadow-lg hover:shadow-xl transition-shadow px-8">
                <Sparkles className="w-5 h-5" />
                Start Evidence Collection
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link to="/pediscreen/learn-more">
              <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto rounded-xl">
                <Shield className="w-4 h-4" />
                Clinical Decision Support Architecture
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
            <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 + 0.2 }}
          >
            <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 h-full overflow-hidden group">
              <CardHeader className="pb-2">
                <motion.div 
                  className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-7 h-7 text-primary" />
                </motion.div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          </motion.div>
            );
          })}
      </div>

      {/* Mission & Equity Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mb-12"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
              <Stethoscope className="w-3 h-3" /> The Clinical Need
            </div>
            <h3 className="text-2xl font-bold mb-4">A critical window is closing for millions</h3>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Developmental delays affect <span className="text-foreground font-semibold">1 in 6 children</span>, 
              yet fewer than half are identified before school age. This late identification misses the optimal 
              period for intervention, leading to poorer long-term outcomes.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              For families in underserved areas or with limited specialist access, wait times can reach 6-12 months. 
              PediScreen AI is designed to scale quality support and provide a standardized tool that helps bridge these resource gaps.
            </p>
          </div>
          <Card className="bg-primary/5 border-none shadow-none">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <HeartHandshake className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Complementary Resource</h4>
                    <p className="text-sm text-muted-foreground">AI handles quantitative scoring and risk stratification, freeing clinicians for qualitative relational work.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Explainable Insights</h4>
                    <p className="text-sm text-muted-foreground">Unlike "black box" systems, our model provides clear reasons for suggested risk levels, building trust.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] bg-[size:24px_24px]" />
          <CardContent className="py-10 relative">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              {stats.map((stat, index) => (
                <motion.div 
                  key={index}
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <stat.icon className="w-8 h-8 mb-3 text-primary-foreground/80" />
                  <p className="text-4xl sm:text-5xl font-bold mb-2">{stat.value}</p>
                  <p className="text-primary-foreground/80 text-sm">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Team & Mission */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mb-12"
      >
        <Card className="border-dashed border-2 bg-muted/5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground text-center">
              Developed by Cognita Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {team.map((member, idx) => (
                <div key={idx} className="text-center">
                  <p className="font-medium text-sm">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Disclaimer */}
      <motion.div 
        className="mt-12 p-5 sm:p-6 bg-warning/10 border border-warning/30 rounded-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <p className="text-sm text-warning-foreground">
          <strong className="text-foreground">🛡️ Privacy & Reassurance:</strong> Your child’s screening is private. 
          Results are only shared if you choose to share them. This is not a diagnosis. 
          It’s a way to spot areas where extra support might be helpful.
        </p>
      </motion.div>
    </div>
  );
};

export default PediScreenHome;
