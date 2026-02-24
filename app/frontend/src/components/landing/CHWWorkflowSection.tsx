import { motion } from "framer-motion";
import { Users, WifiOff, Smartphone, MapPin } from "lucide-react";

const highlights = [
  {
    icon: Smartphone,
    label: "On-device screening",
    description: "Run ASQ-3 and developmental checks offline on phones and tablets.",
  },
  {
    icon: WifiOff,
    label: "Works without connectivity",
    description: "Sync results when back in range; no dependency on live internet.",
  },
  {
    icon: MapPin,
    label: "Built for the field",
    description: "Designed for home visits, clinics, and low-resource settings.",
  },
];

export function CHWWorkflowSection() {
  return (
    <section id="chw-workflow" className="py-20 md:py-28 bg-muted/50">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="section-title">Community Health Worker Workflow</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-6">
            Explore how CHWs use PediScreen AI in field settings with limited connectivity.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center mb-12"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary" />
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {highlights.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
              className="bg-card rounded-xl p-6 card-shadow hover:card-shadow-hover transition-all duration-300 text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-primary mb-2">
                {item.label}
              </h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
