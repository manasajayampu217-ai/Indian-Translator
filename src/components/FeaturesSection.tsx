import { motion } from "framer-motion";
import { FileText, Mic, Image, Layout, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Document Translation",
    description: "Upload PDFs up to 150MB. We handle text-based and scanned documents with smart OCR.",
  },
  {
    icon: Mic,
    title: "Voice Translation",
    description: "Speak in any Indian language and get instant text translation with speech-to-text AI.",
  },
  {
    icon: Image,
    title: "Image & Scan Support",
    description: "Snap a photo of text, menus, signboards, or handwritten notes and translate instantly.",
  },
  {
    icon: Layout,
    title: "Layout Preservation",
    description: "Translated documents maintain original formatting, fonts, and structure — our key differentiator.",
  },
  {
    icon: Zap,
    title: "Real-Time Processing",
    description: "Small files translate instantly. Large files process asynchronously with progress tracking.",
  },
  {
    icon: Shield,
    title: "Enterprise-Ready Security",
    description: "End-to-end encryption, auto-deletion policies, and HTTPS. Your data stays private.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-background" id="features">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            More Than a <span className="text-accent">Translator</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A complete document AI platform built for India's linguistic diversity.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="group p-8 rounded-2xl bg-card shadow-card hover:shadow-elevated transition-all duration-300 border border-border"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mb-5 group-hover:bg-accent/25 transition-colors">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-display text-xl font-semibold text-card-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
