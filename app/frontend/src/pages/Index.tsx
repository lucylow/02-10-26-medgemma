import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { VisualAnalysisDemoSection } from "@/components/landing/VisualAnalysisDemoSection";
import { DemoSection } from "@/components/landing/DemoSection";
import { TechnologySection } from "@/components/landing/TechnologySection";
import { ImpactSection } from "@/components/landing/ImpactSection";
import { CHWWorkflowSection } from "@/components/landing/CHWWorkflowSection";
import { TeamSection } from "@/components/landing/TeamSection";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <ProblemSection />
        <VisualAnalysisDemoSection />
        <DemoSection />
        <TechnologySection />
        <ImpactSection />
        <CHWWorkflowSection />
        <TeamSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
