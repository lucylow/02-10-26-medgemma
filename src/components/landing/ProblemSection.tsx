import { motion } from "framer-motion";
import { UserRound, MapPin, FileText } from "lucide-react";

const problems = [
  {
    icon: UserRound,
    title: "Specialist Shortage",
    description:
      "Developmental-behavioral pediatricians are scarce, with wait times often exceeding 6-12 months for an evaluation, missing the critical early intervention window.",
  },
  {
    icon: MapPin,
    title: "Geographic Barriers",
    description:
      "Rural and underserved communities lack access to specialized screening tools and trained professionals, creating healthcare disparities from the earliest ages.",
  },
  {
    icon: FileText,
    title: "Manual Processes",
    description:
      "Traditional screening relies on paper questionnaires that require manual scoring and interpretation, creating bottlenecks in already overburdened clinics.",
  },
];

const stats = [
  { value: "1 in 6", label: "Children have developmental delays" },
  { value: "<50%", label: "Identified before school age" },
  { value: "6-12 mo", label: "Average wait for evaluation" },
  { value: "$100k", label: "Lifetime savings with early intervention" },
];

export function ProblemSection() {
  return (
    <section id="problem" className="py-20 md:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="section-title">The Critical Window We're Missing</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-8">
            Early childhood development lays the foundation for lifetime health and learning. 
            Yet systemic gaps prevent timely identification of developmental concerns.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-12">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card rounded-2xl p-6 md:p-8 card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1 border border-border/60"
            >
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
                <problem.icon className="h-7 w-7 text-destructive" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-3">
                {problem.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">{problem.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-muted/80 rounded-2xl p-8 md:p-10 border border-border/50"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
