import { motion } from "framer-motion";
import { Heart } from "lucide-react";

export function TeamSection() {
  return (
    <section id="team" className="py-20 md:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="section-title">Creator</h2>
          <p className="text-muted-foreground mt-4 flex items-center justify-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Lucy Low
          </p>
        </motion.div>
      </div>
    </section>
  );
}
