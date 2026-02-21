import { motion } from "framer-motion";

const languages = [
  { name: "Hindi", script: "हिन्दी", speakers: "600M+" },
  { name: "Bengali", script: "বাংলা", speakers: "230M+" },
  { name: "Tamil", script: "தமிழ்", speakers: "80M+" },
  { name: "Telugu", script: "తెలుగు", speakers: "85M+" },
  { name: "Marathi", script: "मराठी", speakers: "83M+" },
  { name: "Gujarati", script: "ગુજરાતી", speakers: "55M+" },
  { name: "Kannada", script: "ಕನ್ನಡ", speakers: "45M+" },
  { name: "Malayalam", script: "മലയാളം", speakers: "38M+" },
  { name: "Punjabi", script: "ਪੰਜਾਬੀ", speakers: "113M+" },
  { name: "Odia", script: "ଓଡ଼ିଆ", speakers: "35M+" },
  { name: "Urdu", script: "اردو", speakers: "70M+" },
  { name: "Assamese", script: "অসমীয়া", speakers: "15M+" },
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
            22+ Indian <span className="text-accent">Languages</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Covering over 1.4 billion speakers across the subcontinent.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
