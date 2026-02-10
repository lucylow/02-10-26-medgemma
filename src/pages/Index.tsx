import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Baby, Shield, Brain, Eye, ArrowRight, Sparkles, Activity, Users, Clock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const Index = () => {
  const capabilities = [
    { icon: Brain, title: 'MedGemma AI', desc: 'Medical-grade multimodal reasoning for developmental screening' },
    { icon: Eye, title: 'Vision Analysis', desc: 'Analyze photos and videos of play, movement, and interaction' },
    { icon: Shield, title: 'Privacy-First', desc: 'On-device processing with encrypted, HIPAA-aligned workflows' },
    { icon: Activity, title: 'Evidence-Based', desc: 'Grounded in ASQ-3, M-CHAT, and WHO milestones' },
  ];

  const stats = [
    { value: '1 in 6', label: 'Children affected by developmental delays' },
    { value: '<50%', label: 'Identified before school age' },
    { value: '85%', label: 'Better outcomes with early intervention' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-card text-sm text-muted-foreground"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            Powered by Google MedGemma
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]"
          >
            <span className="block">PediScreen</span>
            <span className="block text-primary">AI</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            AI-powered developmental screening that detects delays early — 
            when intervention matters most. Built for community health workers, 
            families, and clinicians.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/pediscreen">
              <Button size="lg" className="gap-2 text-base px-8 rounded-xl shadow-lg">
                <Baby className="w-5 h-5" />
                Open PediScreen
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/pediscreen/learn-more">
              <Button variant="outline" size="lg" className="gap-2 text-base px-8 rounded-xl">
                How It Works
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-y bg-muted/30">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="text-center space-y-2"
            >
              <p className="text-4xl font-bold text-primary">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-3xl md:text-4xl font-bold text-center mb-16"
          >
            Clinical-Grade AI Screening
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {capabilities.map((cap, i) => (
              <motion.div
                key={cap.title}
                custom={i + 1}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <Card className="h-full border bg-card/50 backdrop-blur-sm hover:shadow-md transition-shadow duration-300">
                  <CardContent className="p-6 flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <cap.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{cap.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{cap.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent to-muted/30">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="max-w-2xl mx-auto text-center space-y-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold">Ready to screen?</h2>
          <p className="text-muted-foreground">
            Start a developmental screening in under 5 minutes. No account required for the demo.
          </p>
          <Link to="/pediscreen/screening">
            <Button size="lg" className="gap-2 rounded-xl shadow-lg">
              Start Screening <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t text-center text-sm text-muted-foreground">
        <p>PediScreen AI — Not a diagnostic tool. Always consult a healthcare provider.</p>
      </footer>
    </div>
  );
};

export default Index;
