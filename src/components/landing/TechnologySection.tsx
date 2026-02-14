import { motion } from "framer-motion";
import { Bot, Smartphone, Cog, Shield } from "lucide-react";

const technologies = [
  {
    icon: Bot,
    title: "MedGemma Core",
    badge: "HAI-DEF Model",
    description:
      "Leverages MedGemma's biomedical pretraining for accurate interpretation of developmental descriptions within clinical context.",
    features: [
      "Multimodal (text + image) understanding",
      "Medical domain knowledge",
      "Open-weight for customization",
    ],
  },
  {
    icon: Smartphone,
    title: "Edge AI Deployment",
    description:
      "Quantized model runs entirely on-device using TensorFlow Lite, ensuring privacy and functionality in low-connectivity areas.",
    features: [
      "On-device inference",
      "No internet required",
      "Optimized for mobile devices",
    ],
  },
  {
    icon: Cog,
    title: "LoRA Fine-Tuning",
    description:
      "Parameter-efficient fine-tuning adapts MedGemma to developmental screening while preserving general medical knowledge.",
    features: [
      "Low computational cost",
      "Preserves base model safety",
      "Adaptable to new milestones",
    ],
  },
  {
    icon: Shield,
    title: "Privacy Architecture",
    description:
      "Data never leaves the user's device. Local processing ensures compliance with healthcare privacy regulations.",
    features: [
      "HIPAA/GDPR aligned",
      "No cloud data storage",
      "User-controlled data",
    ],
  },
];

export function TechnologySection() {
  return (
    <section id="technology" className="py-20 md:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="section-title">Powered by Google's HAI-DEF Technology</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-8">
            Our solution is built on Google's open-weight MedGemma model, fine-tuned for 
            developmental screening and optimized for edge deployment.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {technologies.map((tech, index) => (
            <motion.div
              key={tech.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card rounded-xl p-6 md:p-8 card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <tech.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-lg font-semibold text-primary flex items-center gap-3">
                    {tech.title}
                    {tech.badge && (
                      <span className="text-xs font-medium bg-gradient-to-r from-primary to-primary/70 text-primary-foreground px-3 py-1 rounded-full">
                        {tech.badge}
                      </span>
                    )}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {tech.description}
                  </p>
                  <ul className="mt-4 space-y-1">
                    {tech.features.map((feature) => (
                      <li
                        key={feature}
                        className="text-sm text-muted-foreground flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
