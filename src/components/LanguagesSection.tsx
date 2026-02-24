import { motion } from "framer-motion";

const languages = [
  { name: "English", script: "English", speakers: "1.5B+" },
  { name: "Hindi", script: "हिन्दी", speakers: "600M+" },
  { name: "Tamil", script: "தமிழ்", speakers: "80M+" },
  { name: "Telugu", script: "తెలుగు", speakers: "85M+" },
];

const LanguagesSection = () => {
  return (
    <section className="py-24 bg-background" id="languages">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            4 Indian <span className="text-accent">Languages</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Covering over 1 billion speakers across the subcontinent.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {languages.map((lang, i) => (
            <motion.div
              key={lang.name}
              className="p-5 rounded-2xl bg-card border border-border text-center hover:shadow-card hover:border-accent/30 transition-all duration-300 group cursor-default"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <p className="text-2xl font-bold text-accent mb-1 font-display">{lang.script}</p>
              <p className="text-sm font-medium text-card-foreground">{lang.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{lang.speakers}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LanguagesSection;
