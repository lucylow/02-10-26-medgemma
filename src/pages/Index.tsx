import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { DemoSection } from "@/components/landing/DemoSection";
import { TechnologySection } from "@/components/landing/TechnologySection";
import { ImpactSection } from "@/components/landing/ImpactSection";
import { TeamSection } from "@/components/landing/TeamSection";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <ProblemSection />
        <DemoSection />
        <TechnologySection />
        <ImpactSection />
        <TeamSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
