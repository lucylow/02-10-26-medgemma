import { motion } from "framer-motion";

const outcomes = [
  { value: "320", label: "Additional children identified early" },
  { value: "$9.6M+", label: "Potential lifetime cost savings" },
  { value: "6-12 mo", label: "Earlier intervention access" },
  { value: "50%", label: "Reduction in unnecessary referrals" },
];

export function ImpactSection() {
  return (
    <section id="impact" className="py-20 md:py-28 bg-muted/50">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="section-title">Measurable Impact Potential</h2>
        </motion.div>

        {/* Impact Meter */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-16"
        >
          <div className="relative w-64 h-64 md:w-80 md:h-80">
            {/* Outer Ring */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="hsl(var(--success))"
                strokeWidth="6"
                strokeDasharray="52.78 211.12"
                strokeLinecap="round"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="hsl(var(--warning))"
                strokeWidth="6"
                strokeDasharray="79.17 184.73"
                strokeDashoffset="-52.78"
                strokeLinecap="round"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="hsl(var(--destructive))"
                strokeWidth="6"
                strokeDasharray="131.95 131.95"
                strokeDashoffset="-131.95"
                strokeLinecap="round"
              />
            </svg>
            
            {/* Center Content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 md:w-52 md:h-52 bg-card rounded-full shadow-lg flex flex-col items-center justify-center text-center">
                <span className="text-4xl md:text-5xl font-bold text-foreground">20%</span>
                <span className="text-sm text-muted-foreground mt-1">
                  Increase in early<br />identification
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Outcomes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h3 className="font-heading text-xl md:text-2xl font-semibold mb-10">
            Projected Outcomes in a Pilot Community (10,000 children)
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {outcomes.map((outcome, index) => (
              <motion.div
                key={outcome.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                className="text-center"
              >
                <div className="text-2xl md:text-3xl font-bold text-primary mb-2">
                  {outcome.value}
                </div>
                <div className="text-sm text-muted-foreground">{outcome.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
