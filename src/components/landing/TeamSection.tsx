import { motion } from "framer-motion";
import { Stethoscope, Code, Palette, TrendingUp } from "lucide-react";

const team = [
  {
    name: "Alex Chen",
    role: "MD/PhD Candidate",
    description:
      "Clinical domain expertise, validation dataset curation, and impact analysis.",
    icon: Stethoscope,
  },
  {
    name: "Sam Rivera",
    role: "MLOps Engineer",
    description:
      "Model fine-tuning pipeline, edge deployment architecture, and backend development.",
    icon: Code,
  },
  {
    name: "Jordan Patel",
    role: "Front-End Developer",
    description:
      "Mobile/Web application interface, interactive prototype, and user journey design.",
    icon: Palette,
  },
  {
    name: "Casey Kim",
    role: "Data Scientist",
    description:
      "Model evaluation, performance benchmarking, and quantitative impact modeling.",
    icon: TrendingUp,
  },
];

export function TeamSection() {
  return (
    <section id="team" className="py-20 md:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="section-title">The Cognita Health Team</h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {team.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card rounded-xl p-6 text-center card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-2"
            >
              <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-5">
                <member.icon className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold">{member.name}</h3>
              <p className="text-primary font-medium text-sm mb-3">{member.role}</p>
              <p className="text-sm text-muted-foreground">{member.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
