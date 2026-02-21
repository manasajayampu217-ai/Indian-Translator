import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftRight, Upload, Mic, Type, FileText, X, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi (हिन्दी)" },
  { code: "bn", name: "Bengali (বাংলা)" },
  { code: "ta", name: "Tamil (தமிழ்)" },
  { code: "te", name: "Telugu (తెలుగు)" },
  { code: "mr", name: "Marathi (मराठी)" },
  { code: "gu", name: "Gujarati (ગુજરાતી)" },
  { code: "kn", name: "Kannada (ಕನ್ನಡ)" },
  { code: "ml", name: "Malayalam (മലയാളം)" },
  { code: "pa", name: "Punjabi (ਪੰਜਾਬੀ)" },
  { code: "or", name: "Odia (ଓଡ଼ିଆ)" },
  { code: "ur", name: "Urdu (اردو)" },
];

const TranslationPanel = () => {
  const [fromLang, setFromLang] = useState("en");
  const [toLang, setToLang] = useState("hi");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const swapLanguages = () => {
    setFromLang(toLang);
    setToLang(fromLang);
    setInputText(outputText);
    setOutputText(inputText);
  };

  const handleTranslate = () => {
    if (!inputText.trim()) return;
    setIsTranslating(true);
    // Simulate translation
    setTimeout(() => {
      setOutputText(`[Translated from ${LANGUAGES.find(l => l.code === fromLang)?.name} to ${LANGUAGES.find(l => l.code === toLang)?.name}]\n\n${inputText}`);
      setIsTranslating(false);
      toast.success("Translation complete!");
    }, 1500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast.info(`File "${file.name}" uploaded. Click Translate to process.`);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast.info("Listening... Speak now.");
      setTimeout(() => {
        setInputText("यह एक उदाहरण वाक्य है।");
        setIsRecording(false);
        toast.success("Voice captured!");
      }, 3000);
    }
  };

  return (
    <section className="py-24 bg-secondary/30" id="translate">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Try It <span className="text-accent">Now</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Translate text, upload documents, or use your voice.
          </p>
        </motion.div>

        <motion.div
          className="max-w-5xl mx-auto bg-card rounded-3xl shadow-elevated border border-border overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Tabs defaultValue="text" className="w-full">
            <div className="border-b border-border px-6 pt-4">
              <TabsList className="bg-transparent gap-1 h-auto p-0">
                <TabsTrigger value="text" className="data-[state=active]:bg-accent/15 data-[state=active]:text-accent-foreground rounded-t-lg rounded-b-none border-b-2 data-[state=active]:border-accent border-transparent px-6 py-3 gap-2 font-medium">
                  <Type className="w-4 h-4" /> Text
                </TabsTrigger>
                <TabsTrigger value="document" className="data-[state=active]:bg-accent/15 data-[state=active]:text-accent-foreground rounded-t-lg rounded-b-none border-b-2 data-[state=active]:border-accent border-transparent px-6 py-3 gap-2 font-medium">
                  <FileText className="w-4 h-4" /> Document
                </TabsTrigger>
                <TabsTrigger value="voice" className="data-[state=active]:bg-accent/15 data-[state=active]:text-accent-foreground rounded-t-lg rounded-b-none border-b-2 data-[state=active]:border-accent border-transparent px-6 py-3 gap-2 font-medium">
                  <Mic className="w-4 h-4" /> Voice
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Language selectors */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
              <Select value={fromLang} onValueChange={setFromLang}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(l => (
                    <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="ghost" size="icon" onClick={swapLanguages} className="rounded-full hover:bg-accent/15">
                <ArrowLeftRight className="w-4 h-4" />
              </Button>

              <Select value={toLang} onValueChange={setToLang}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(l => (
                    <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Text tab */}
            <TabsContent value="text" className="m-0">
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                <div className="p-6">
                  <Textarea
                    placeholder="Enter text to translate..."
                    className="min-h-[200px] border-0 resize-none text-base focus-visible:ring-0 p-0"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                </div>
                <div className="p-6 bg-muted/30 relative">
                  <AnimatePresence mode="wait">
                    {isTranslating ? (
                      <motion.div
                        key="loading"
                        className="flex items-center justify-center min-h-[200px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <p className="min-h-[200px] text-base text-card-foreground whitespace-pre-wrap">
                          {outputText || <span className="text-muted-foreground">Translation will appear here...</span>}
                        </p>
                        {outputText && (
                          <Button variant="ghost" size="sm" className="absolute top-4 right-4" onClick={handleCopy}>
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </TabsContent>

            {/* Document tab */}
            <TabsContent value="document" className="m-0">
              <div className="p-8">
                <div
                  className="border-2 border-dashed border-border rounded-2xl p-12 text-center hover:border-accent/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleFileUpload}
                  />
                  {uploadedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-8 h-8 text-accent" />
                      <div className="text-left">
                        <p className="font-medium text-card-foreground">{uploadedFile.name}</p>
                        <p className="text-sm text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                      <p className="font-medium text-card-foreground mb-1">Drop your file here or click to browse</p>
                      <p className="text-sm text-muted-foreground">PDF, Images, Word — up to 150MB</p>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Voice tab */}
            <TabsContent value="voice" className="m-0">
              <div className="p-12 text-center">
                <motion.button
                  className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-colors ${
                    isRecording ? "bg-destructive text-destructive-foreground" : "bg-accent text-accent-foreground"
                  }`}
                  onClick={toggleRecording}
                  animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1, repeat: isRecording ? Infinity : 0 }}
                >
                  <Mic className="w-10 h-10" />
                </motion.button>
                <p className="mt-6 text-muted-foreground">
                  {isRecording ? "Listening... Tap to stop" : "Tap to start speaking"}
                </p>
                {inputText && !isRecording && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-xl text-left max-w-md mx-auto">
                    <p className="text-sm text-muted-foreground mb-1">Captured text:</p>
                    <p className="text-card-foreground">{inputText}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Translate button */}
            <div className="px-6 py-4 border-t border-border flex justify-end">
              <Button
                onClick={handleTranslate}
                disabled={isTranslating || (!inputText.trim() && !uploadedFile)}
                className="bg-accent text-accent-foreground hover:bg-accent/90 px-8 rounded-xl font-semibold"
              >
                {isTranslating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Translating...</>
                ) : (
                  "Translate"
                )}
              </Button>
            </div>
          </Tabs>
        </motion.div>
      </div>
    </section>
  );
};

export default TranslationPanel;
