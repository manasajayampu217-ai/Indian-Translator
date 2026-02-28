import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftRight, Upload, Mic, Type, FileText, X, Copy, Check, Loader2, Crown, Download, Volume2, VolumeX, History } from "lucide-react";
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
import { TranscribeService } from "@/services/transcribeService";
import { TranslationService } from "@/services/translationService";
import { TransliterationService } from "@/services/transliterationService";
import { UsageService } from "@/services/usageService";
import { DocumentService } from "@/services/documentService";
import { SpeechService } from "@/services/speechService";
import { User } from "@/services/authService";
import { HistoryService } from "@/services/historyService";
import PricingModal from "./PricingModal";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi (हिन्दी)" },
  { code: "ta", name: "Tamil (தமிழ்)" },
  { code: "te", name: "Telugu (తెలుగు)" },
];

interface TranslationPanelProps {
  user: User;
}

const TranslationPanel = ({ user }: TranslationPanelProps) => {
  const [fromLang, setFromLang] = useState("en");
  const [toLang, setToLang] = useState("hi");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcribeServiceRef = useRef<TranscribeService | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [usageInfo, setUsageInfo] = useState(UsageService.getUsageSummary());
  const [translatedDocumentUrl, setTranslatedDocumentUrl] = useState<string>("");
  const [documentProgress, setDocumentProgress] = useState<string>("");
  const [outputFormat, setOutputFormat] = useState<"image" | "pdf">("image");
  const [activeTab, setActiveTab] = useState<string>("text");
  const [selectedConversion, setSelectedConversion] = useState<string>("");

  const swapLanguages = () => {
    setFromLang(toLang);
    setToLang(fromLang);
    setInputText(outputText);
    setOutputText(inputText);
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
  };

  const handleTranslate = async () => {
    // In Conversions tab, process the selected conversion
    if (activeTab === 'word') {
      if (!selectedConversion) {
        toast.error('Please select a conversion option first (PDF to Word, Image to PDF, etc.)');
        return;
      }
      await processConversion();
      return;
    }
    
    // Check if document is uploaded
    if (uploadedFile) {
      await handleDocumentTranslate();
      return;
    }
    
    if (!inputText.trim()) {
      toast.error("Please enter some text to translate.");
      return;
    }
    
    // If source and target languages are the same, just copy the text
    if (fromLang === toLang) {
      setOutputText(inputText);
      toast.success("✅ Same language - text copied as-is");
      return;
    }
    
    setIsTranslating(true);
    
    try {
      console.log('Translating from', fromLang, 'to', toLang);
      console.log('Input text:', inputText);
      
      let finalText = '';
      let usedService = '';
      
      // Simple and direct: Just translate with Google
      // Google Translate's auto-detect will handle Romanized input
      console.log('🌐 Using Google Translate with smart detection');
      const result = await TranslationService.translate(inputText, fromLang, toLang);
      
      if (result.success && result.translatedText) {
        finalText = result.translatedText;
        usedService = result.provider;
        console.log(`✅ Translation successful via ${result.provider}:`, finalText);
      } else {
        throw new Error("All translation services failed");
      }
      
      if (!finalText) {
        throw new Error("Translation failed");
      }
      
      console.log('=== TRANSLATION COMPLETE ===');
      console.log('Final text:', finalText);
      console.log('Final text length:', finalText.length);
      console.log('Final text type:', typeof finalText);
      console.log('Setting output text...');
      
      // Clean up the text - remove extra whitespace and normalize
      const cleanedText = finalText.trim().replace(/\s+/g, ' ');
      setOutputText(cleanedText);
      
      console.log('Output text set successfully');
      toast.success(`✅ ${usedService}`);
      console.log(`Success via ${usedService}:`, finalText);
      
    } catch (error) {
      console.error('Translation error:', error);
      toast.error("❌ Translation failed. Please check your internet connection and try again.");
      setOutputText("Translation service unavailable. Please try again later.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDocumentTranslate = async () => {
    if (!uploadedFile) return;
    
    const isPDF = uploadedFile.type === 'application/pdf';
    
    // Validate language selection
    if (fromLang === toLang) {
      toast.error('Please select different source and target languages');
      return;
    }
    
    console.log(`📄 Document Translation: ${fromLang} → ${toLang}`);
    console.log(`File: ${uploadedFile.name}, Type: ${uploadedFile.type}`);
    
    setIsTranslating(true);
    setTranslatedDocumentUrl("");
    setDocumentProgress("Starting... (0%)");
    
    try {
      // Check if backend is available
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      
      // For PDFs, use backend API
      if (isPDF) {
        console.log('Using backend API for PDF translation...');
        console.log(`Languages: ${fromLang} → ${toLang}`);
        setDocumentProgress("Uploading to server... (10%)");
        
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('fromLang', fromLang);
        formData.append('toLang', toLang);
        formData.append('userEmail', user.email); // Add user email for S3 storage
        
        console.log('FormData prepared:', {
          fileName: uploadedFile.name,
          fromLang,
          toLang,
          userEmail: user.email
        });
        
        await new Promise(resolve => setTimeout(resolve, 300));
        setDocumentProgress("Extracting text... (30%)");
        
        const responsePromise = fetch(`${BACKEND_URL}/api/translate-document`, {
          method: 'POST',
          body: formData,
        });
        
        // Simulate progress while waiting
        await new Promise(resolve => setTimeout(resolve, 500));
        setDocumentProgress("Translating... (60%)");
        
        const response = await responsePromise;
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Backend error:', errorData);
          
          if (errorData.error === 'AWS not configured') {
            throw new Error(
              '⚠️ PDF translation requires AWS setup.\n\n' +
              '📋 Quick Solutions:\n' +
              '1. Use IMAGE files (PNG/JPG) instead - they work without AWS!\n' +
              '2. Or set up AWS credentials in backend/.env\n\n' +
              '💡 Images work perfectly for all languages!'
            );
          }
          
          throw new Error('Backend translation failed: ' + (errorData.message || errorData.error));
        }
        
        setDocumentProgress("Creating PDF... (85%)");
        
        // Get the PDF blob
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        setDocumentProgress("Complete! (100%)");
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setTranslatedDocumentUrl(url);
        setDocumentProgress("");
        
        const langNames: { [key: string]: string } = {
          'en': 'English',
          'hi': 'Hindi',
          'ta': 'Tamil',
          'te': 'Telugu'
        };
        
        toast.success(`✅ PDF translated from ${langNames[fromLang]} to ${langNames[toLang]}!`);
        console.log('✅ PDF translation complete');
        
        return;
      }
      
      // For images, use client-side translation
      // For images, use client-side translation
      console.log('Using client-side translation for image...');
      console.log(`Languages: ${fromLang} → ${toLang}`);
      
      const result = await DocumentService.translateDocument(
        uploadedFile,
        fromLang,
        toLang,
        'image',
        (stage, progress) => {
          const progressPercent = Math.round(progress);
          setDocumentProgress(`${stage} (${progressPercent}%)`);
          console.log(`Progress: ${stage} - ${progressPercent}%`);
        }
      );
      
      if (result.success && result.documentData) {
        setDocumentProgress("Complete! (100%)");
        console.log('✅ Translation successful, document data length:', result.documentData.length);
        
        // Save to history (for images)
        try {
          setDocumentProgress("Saving to history... (95%)");
          
          // Convert data URL to blob for translated image
          const response = await fetch(result.documentData);
          const translatedBlob = await response.blob();
          
          HistoryService.saveDocumentTranslation(
            user.email,
            uploadedFile,
            translatedBlob,
            fromLang,
            toLang
          );
          
          console.log('✅ Saved to history');
        } catch (historyError) {
          console.warn('⚠️ Failed to save to history:', historyError);
          // Don't fail the whole process if history save fails
        }
        
        setTimeout(() => {
          setTranslatedDocumentUrl(result.documentData);
          setDocumentProgress("");
          console.log('✅ Document URL set, should display now');
          
          const langNames: { [key: string]: string } = {
            'en': 'English',
            'hi': 'Hindi',
            'ta': 'Tamil',
            'te': 'Telugu'
          };
          
          toast.success(`✅ Image translated from ${langNames[fromLang]} to ${langNames[toLang]}!`);
        }, 500);
      } else {
        console.error('❌ Translation failed:', result.error);
        throw new Error(result.error || "Document translation failed");
      }
    } catch (error) {
      console.error('Document translation error:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Check if it's an AWS configuration issue
      if (errorMessage.includes('AWS') || errorMessage.includes('Textract') || errorMessage.includes('subscription')) {
        toast.error(
          "⚠️ AWS Textract not configured. Please:\n" +
          "1. Activate AWS Textract in AWS Console\n" +
          "2. Add payment method to AWS account\n" +
          "3. Add IAM permissions\n\n" +
          "See AWS_SETUP.md for details",
          { duration: 8000 }
        );
      } else {
        toast.error("❌ Document translation failed. " + errorMessage);
      }
    } finally {
      setIsTranslating(false);
      setDocumentProgress("");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast.info(`File "${file.name}" uploaded. Click Translate to process.`);
    }
  };

  const handleConversion = async (conversionType: string) => {
    if (!uploadedFile) {
      toast.error('Please upload a file first');
      return;
    }

    // Just select the conversion type, don't process yet
    setSelectedConversion(conversionType);
    toast.success(`✓ ${conversionType.replace(/-/g, ' ').toUpperCase()} selected. Click Translate to process.`);
  };

  const processConversion = async () => {
    if (!uploadedFile || !selectedConversion) {
      return;
    }

    setIsTranslating(true);
    setTranslatedDocumentUrl("");
    setDocumentProgress("Starting conversion... (0%)");

    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('conversionType', selectedConversion);
      formData.append('fromLang', fromLang);
      formData.append('toLang', toLang);

      setDocumentProgress("Processing... (30%)");

      const response = await fetch(`${BACKEND_URL}/api/convert-document`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Conversion failed');
      }

      setDocumentProgress("Finalizing... (90%)");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setDocumentProgress("Complete! (100%)");
      await new Promise(resolve => setTimeout(resolve, 500));

      setTranslatedDocumentUrl(url);
      setDocumentProgress("");
      toast.success('✅ Conversion complete!');
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error('❌ Conversion failed');
    } finally {
      setIsTranslating(false);
      setDocumentProgress("");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  const handleSpeak = async () => {
    if (!outputText.trim()) {
      toast.error("No text to speak");
      return;
    }

    if (isSpeaking) {
      // Stop speaking
      SpeechService.stop();
      setIsSpeaking(false);
      toast.info("Speech stopped");
      return;
    }

    try {
      setIsSpeaking(true);
      const langName = toLang === 'en' ? 'English' : toLang === 'hi' ? 'Hindi' : toLang === 'ta' ? 'Tamil' : 'Telugu';
      
      // Show loading message for Indian languages
      if (['hi', 'ta', 'te'].includes(toLang)) {
        toast.info(`⏳ Loading ${langName} audio...`);
      } else {
        toast.info(`🔊 Speaking in ${langName}...`);
      }
      
      // Use SpeechService for all languages
      await SpeechService.speak(outputText, toLang);
      
      setIsSpeaking(false);
      toast.success("✅ Speech finished");
      
    } catch (error: any) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
      toast.error(`Speech failed: ${error.message || 'Unknown error'}`);
    }
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        // Always use browser speech recognition for simplicity
        toast.info("🎤 Starting voice recognition...");
        startBrowserSpeechRecognition();
      } catch (error) {
        console.error('Recording error:', error);
        setIsRecording(false);
        toast.error("Could not start recording. Please try again.");
      }
    } else {
      // Stop recording
      if (transcribeServiceRef.current) {
        transcribeServiceRef.current.stopTranscription();
        transcribeServiceRef.current = null;
      }
      if (recognitionRef.current) {
        if ((recognitionRef.current as any).manualStop) {
          (recognitionRef.current as any).manualStop();
        } else {
          recognitionRef.current.stop();
        }
      }
      setIsRecording(false);
      toast.success("Recording stopped");
    }
  };

  const startBrowserSpeechRecognition = async () => {
    try {
      console.log('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone access granted');
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.error('❌ Speech recognition not supported');
        toast.error("Speech recognition not supported in this browser. Please use Chrome or Edge.");
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      console.log('✅ Speech recognition available');
      
      setInputText("");
      setOutputText("");
      
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      
      // Map language codes to speech recognition language codes
      const langMap: { [key: string]: string } = {
        'en': 'en-US',
        'hi': 'hi-IN',
        'ta': 'ta-IN',
        'te': 'te-IN'
      };
      
      recognition.lang = langMap[fromLang] || 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      
      console.log(`🎤 Starting speech recognition for language: ${recognition.lang}`);
      
      let fullTranscript = '';
      let isManualStop = false;
      let hasReceivedResults = false;
      
      recognition.onstart = () => {
        console.log('✅ Speech recognition started');
        setIsRecording(true);
        const langName = fromLang === 'en' ? 'English' : fromLang === 'hi' ? 'Hindi' : fromLang === 'ta' ? 'Tamil' : 'Telugu';
        toast.success(`🎤 Recording in ${langName}! Speak now...`);
      };
      
      recognition.onresult = (event: any) => {
        hasReceivedResults = true;
        let interimTranscript = '';
        
        console.log('📝 Received speech results, processing...');
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          if (event.results[i].isFinal) {
            fullTranscript += transcript + ' ';
            console.log(`✅ Final transcript (confidence: ${confidence}):`, transcript);
          } else {
            interimTranscript += transcript;
            console.log('⏳ Interim transcript:', transcript);
          }
        }
        
        const displayText = (fullTranscript + interimTranscript).trim();
        setInputText(displayText);
        console.log('📄 Current display text:', displayText);
      };
      
      recognition.onspeechstart = () => {
        console.log('🗣️ Speech detected');
      };
      
      recognition.onspeechend = () => {
        console.log('🔇 Speech ended');
      };
      
      recognition.onaudiostart = () => {
        console.log('🎵 Audio capture started');
      };
      
      recognition.onaudioend = () => {
        console.log('🔇 Audio capture ended');
      };
      
      recognition.onerror = (event: any) => {
        console.error('❌ Speech recognition error:', event.error);
        console.error('Error details:', event);
        
        if (event.error === 'no-speech') {
          if (!hasReceivedResults) {
            toast.warning("No speech detected. Please speak louder and closer to the microphone.");
          }
          return;
        }
        
        if (event.error === 'aborted') {
          console.log('Recognition aborted');
          return;
        }
        
        if (event.error === 'audio-capture') {
          toast.error("Could not capture audio. Please check your microphone.");
          setIsRecording(false);
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        if (event.error === 'network' && !isManualStop) {
          console.log('Network error, attempting to reconnect...');
          setTimeout(() => {
            if (recognitionRef.current && !isManualStop) {
              try {
                recognitionRef.current.start();
                toast.info("Reconnecting...");
              } catch (e) {
                console.error('Reconnection failed:', e);
                setIsRecording(false);
                stream.getTracks().forEach(track => track.stop());
                toast.error("Connection lost. Please try again.");
              }
            }
          }, 1000);
          return;
        }
        
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
        
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          toast.error("Microphone access denied. Please allow microphone access in your browser settings.");
        } else if (event.error === 'language-not-supported') {
          toast.error(`Language ${recognition.lang} not supported. Try English.`);
        } else {
          toast.error(`Voice recognition error: ${event.error}. Please try again.`);
        }
      };
      
      recognition.onend = () => {
        console.log('🛑 Speech recognition ended');
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
        
        if (fullTranscript.trim()) {
          toast.success("✅ Voice captured successfully!");
          console.log('✅ Final captured text:', fullTranscript.trim());
        } else if (!isManualStop && !hasReceivedResults) {
          toast.info("No speech captured. Please try again and speak clearly.");
        }
      };
      
      (recognition as any).manualStop = () => {
        console.log('🛑 Manual stop requested');
        isManualStop = true;
        recognition.stop();
      };
      
      try {
        recognition.start();
        console.log('🎤 Recognition start() called');
      } catch (e) {
        console.error('❌ Failed to start recognition:', e);
        toast.error("Failed to start voice recognition. Please try again.");
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.error('❌ Microphone access error:', error);
      toast.error("Could not access microphone. Please allow microphone access in your browser.");
      setIsRecording(false);
    }
  };

  const handleUpgrade = () => {
    // TODO: Integrate Razorpay payment gateway
    // For now, simulate payment for ₹2
    const documentCount = UsageService.getDocumentCount();
    
    if (documentCount === 0) {
      // First document is free - just close modal and let them translate
      setShowPricing(false);
      toast.success("🎉 Your first document is FREE! Click Translate to continue.");
    } else {
      // Simulate payment of ₹2
      // In production, this will open Razorpay payment gateway
      toast.success("💳 Payment of ₹2 successful! You can now translate your document.");
      setShowPricing(false);
      
      // After successful payment, user can translate
      // The actual translation will happen when they click Translate button again
    }
    
    setUsageInfo(UsageService.getUsageSummary());
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

        {/* PRICING MODAL DISABLED - Will enable when you're ready */}
        {/* <PricingModal 
          open={showPricing} 
          onClose={() => setShowPricing(false)} 
          onUpgrade={handleUpgrade}
        /> */}

        <motion.div
          className="max-w-5xl mx-auto bg-card rounded-3xl shadow-elevated border border-border overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Tabs defaultValue="text" className="w-full" onValueChange={(value) => setActiveTab(value)}>
            <div className="border-b border-border px-6 pt-4">
              <TabsList className="bg-transparent gap-1 h-auto p-0">
                <TabsTrigger value="text" className="data-[state=active]:bg-accent/15 data-[state=active]:text-accent-foreground rounded-t-lg rounded-b-none border-b-2 data-[state=active]:border-accent border-transparent px-6 py-3 gap-2 font-medium">
                  <Type className="w-4 h-4" /> Text
                </TabsTrigger>
                <TabsTrigger value="document" className="data-[state=active]:bg-accent/15 data-[state=active]:text-accent-foreground rounded-t-lg rounded-b-none border-b-2 data-[state=active]:border-accent border-transparent px-6 py-3 gap-2 font-medium">
                  <FileText className="w-4 h-4" /> Doc
                </TabsTrigger>
                <TabsTrigger value="voice" className="data-[state=active]:bg-accent/15 data-[state=active]:text-accent-foreground rounded-t-lg rounded-b-none border-b-2 data-[state=active]:border-accent border-transparent px-6 py-3 gap-2 font-medium">
                  <Mic className="w-4 h-4" /> Voice
                </TabsTrigger>
                <TabsTrigger value="word" className="data-[state=active]:bg-accent/15 data-[state=active]:text-accent-foreground rounded-t-lg rounded-b-none border-b-2 data-[state=active]:border-accent border-transparent px-6 py-3 gap-2 font-medium">
                  <ArrowLeftRight className="w-4 h-4" /> Conversions
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
                <div className="p-6 relative">
                  <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      💡 Tip: Type in English or Romanized Tamil/Telugu (e.g., "Did you eat?" or "saaptiya")
                    </p>
                  </div>
                  <Textarea
                    placeholder="Type in any language... (e.g., 'Did you eat?' or 'saaptiya')"
                    className="min-h-[200px] border-0 resize-none text-base focus-visible:ring-0 p-0"
                    value={inputText}
                    onChange={(e) => handleInputChange(e.target.value)}
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
                        <p className="min-h-[200px] text-base text-card-foreground break-words">
                          {outputText || <span className="text-muted-foreground">Translation will appear here...</span>}
                        </p>
                        {outputText && (
                          <div className="absolute top-4 right-4">
                            <Button variant="ghost" size="sm" onClick={handleCopy} title="Copy to clipboard">
                              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
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
                {/* Info banner */}
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Document Translation</h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        ✅ Supports all languages: English ↔ Hindi ↔ Tamil ↔ Telugu
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        📄 PDFs: Require AWS setup | 🖼️ Images (PNG/JPG): Work without AWS
                      </p>
                    </div>
                  </div>
                </div>
                
                {!translatedDocumentUrl ? (
                  <div
                    className="border-2 border-dashed border-border rounded-2xl p-12 text-center hover:border-accent/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileUpload}
                    />
                    {uploadedFile ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-accent" />
                          <div className="text-left">
                            <p className="font-medium text-card-foreground">{uploadedFile.name}</p>
                            <p className="text-sm text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setUploadedFile(null); 
                              setTranslatedDocumentUrl(""); 
                              setDocumentProgress("");
                            }}
                            disabled={isTranslating}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        {(documentProgress || isTranslating) && (
                          <div className="w-full max-w-md mt-6">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-card-foreground">
                                {documentProgress ? documentProgress.split('(')[0].trim() : 'Processing...'}
                              </p>
                              <p className="text-sm font-bold text-accent">
                                {documentProgress ? (documentProgress.match(/\((\d+)%\)/)?.[1] || '0') : '0'}%
                              </p>
                            </div>
                            <div className="w-full bg-muted rounded-full h-3 overflow-hidden shadow-inner">
                              <div 
                                className="bg-gradient-to-r from-primary via-secondary to-accent h-3 rounded-full transition-all duration-300 ease-out shadow-lg"
                                style={{ 
                                  width: `${documentProgress ? (parseInt(documentProgress.match(/\((\d+)%\)/)?.[1] || '0')) : 0}%` 
                                }}
                              ></div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                              {isTranslating ? 'Please wait...' : ''}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                        <p className="font-medium text-card-foreground mb-1">Drop your file here or click to browse</p>
                        <p className="text-sm text-muted-foreground">PDF, Images (JPG, PNG) — up to 150MB</p>
                        <p className="text-xs text-muted-foreground mt-2">Layout and formatting will be preserved</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Translated Document</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setTranslatedDocumentUrl("");
                            setUploadedFile(null);
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Clear
                        </Button>
                        <Button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = translatedDocumentUrl;
                            const originalName = uploadedFile?.name.replace(/\.[^/.]+$/, '') || 'document';
                            const isPDFInput = uploadedFile?.type === 'application/pdf';
                            
                            // Backend returns PDF blobs, check if it's a blob URL or data URL
                            const isPDFOutput = translatedDocumentUrl.startsWith('blob:') || translatedDocumentUrl.startsWith('data:application/pdf');
                            const ext = (isPDFInput && isPDFOutput) ? 'pdf' : (uploadedFile?.name.split('.').pop() || 'png');
                            
                            link.download = `translated_${originalName}.${ext}`;
                            link.click();
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                    <div className="border-2 border-border rounded-xl overflow-hidden">
                      {uploadedFile?.type === 'application/pdf' ? (
                        <embed src={translatedDocumentUrl} type="application/pdf" className="w-full h-[600px]" />
                      ) : (
                        <img src={translatedDocumentUrl} alt="Translated document" className="w-full" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Voice tab */}
            <TabsContent value="voice" className="m-0">
              <div className="p-8">
                <div className="max-w-2xl mx-auto mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    🎤 Using browser speech recognition for voice input
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {/* Input Section */}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Input</h3>
                    <motion.button
                      className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-colors shadow-lg mb-4 ${
                        isRecording ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white animate-pulse shadow-green-500/50" : "bg-accent text-accent-foreground hover:bg-accent/90"
                      }`}
                      onClick={toggleRecording}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Mic className="w-10 h-10" />
                    </motion.button>
                    <p className="text-sm text-muted-foreground font-medium mb-4">
                      {isRecording ? "🎙️ Recording... Click to stop" : "Click to speak"}
                    </p>
                    
                    <div className="p-4 bg-muted/50 rounded-xl border-2 border-dashed border-muted-foreground/20">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Input text:</p>
                      <Textarea
                        placeholder="Speak or type your text here..."
                        className="min-h-[150px] border-0 resize-none text-base focus-visible:ring-0 p-0 bg-transparent"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* Output Section */}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-4 text-accent">Output</h3>
                    <motion.button
                      className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-colors shadow-lg mb-4 ${
                        isSpeaking 
                          ? "bg-gradient-to-br from-blue-400 to-indigo-500 text-white animate-pulse shadow-blue-500/50" 
                          : outputText 
                            ? "bg-gradient-to-br from-accent via-secondary to-primary text-white hover:opacity-90" 
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                      }`}
                      onClick={handleSpeak}
                      disabled={!outputText}
                      whileTap={outputText ? { scale: 0.95 } : {}}
                    >
                      <Volume2 className="w-10 h-10" />
                    </motion.button>
                    <p className="text-sm text-muted-foreground font-medium mb-4">
                      {isSpeaking ? "🔊 Speaking... Click to stop" : outputText ? "Click to hear translation" : "Translate first"}
                    </p>
                    
                    <div className="p-4 bg-accent/10 rounded-xl border-2 border-accent/20 relative">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Translated text:</p>
                      {isTranslating ? (
                        <div className="flex items-center justify-center min-h-[150px]">
                          <Loader2 className="w-6 h-6 animate-spin text-accent" />
                        </div>
                      ) : (
                        <>
                          <p className="text-card-foreground min-h-[150px] break-words text-base">
                            {outputText ? outputText : <span className="text-muted-foreground italic">Translation will appear here...</span>}
                          </p>
                          {outputText && (
                            <div className="absolute top-4 right-4 flex gap-2">
                              <Button variant="ghost" size="sm" onClick={handleCopy} title="Copy to clipboard">
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Conversions tab */}
            <TabsContent value="word" className="m-0">
              <div className="p-8">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl text-center">
                    <h3 className="text-lg font-semibold text-card-foreground mb-2">Document Conversions</h3>
                    <p className="text-sm text-muted-foreground">
                      Convert your documents between different formats with translation support
                    </p>
                  </div>

                  {/* File upload area */}
                  <div className="mb-6 border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-card-foreground font-medium mb-2">
                      {uploadedFile ? uploadedFile.name : "Click to upload document"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports: PDF, Images (PNG, JPG), Word documents
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Conversion options grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <Button
                      variant="outline"
                      className={`h-24 flex-col gap-2 hover:bg-accent/10 hover:border-accent ${selectedConversion === 'pdf-to-word' ? 'bg-accent/20 border-accent' : ''}`}
                      disabled={!uploadedFile}
                      onClick={() => handleConversion('pdf-to-word')}
                    >
                      <FileText className="w-6 h-6 text-accent" />
                      <span className="text-sm font-medium">PDF to Word</span>
                    </Button>

                    <Button
                      variant="outline"
                      className={`h-24 flex-col gap-2 hover:bg-accent/10 hover:border-accent ${selectedConversion === 'word-to-pdf' ? 'bg-accent/20 border-accent' : ''}`}
                      disabled={!uploadedFile}
                      onClick={() => handleConversion('word-to-pdf')}
                    >
                      <FileText className="w-6 h-6 text-accent" />
                      <span className="text-sm font-medium">Word to PDF</span>
                    </Button>

                    <Button
                      variant="outline"
                      className={`h-24 flex-col gap-2 hover:bg-accent/10 hover:border-accent ${selectedConversion === 'pdf-to-image' ? 'bg-accent/20 border-accent' : ''}`}
                      disabled={!uploadedFile}
                      onClick={() => handleConversion('pdf-to-image')}
                    >
                      <FileText className="w-6 h-6 text-accent" />
                      <span className="text-sm font-medium">PDF to Image</span>
                    </Button>

                    <Button
                      variant="outline"
                      className={`h-24 flex-col gap-2 hover:bg-accent/10 hover:border-accent ${selectedConversion === 'image-to-pdf' ? 'bg-accent/20 border-accent' : ''}`}
                      disabled={!uploadedFile}
                      onClick={() => handleConversion('image-to-pdf')}
                    >
                      <FileText className="w-6 h-6 text-accent" />
                      <span className="text-sm font-medium">Image to PDF</span>
                    </Button>

                    <Button
                      variant="outline"
                      className={`h-24 flex-col gap-2 hover:bg-accent/10 hover:border-accent ${selectedConversion === 'image-to-word' ? 'bg-accent/20 border-accent' : ''}`}
                      disabled={!uploadedFile}
                      onClick={() => handleConversion('image-to-word')}
                    >
                      <FileText className="w-6 h-6 text-accent" />
                      <span className="text-sm font-medium">Image to Word</span>
                    </Button>
                  </div>

                  {/* Progress */}
                  {documentProgress && (
                    <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Loader2 className="w-5 h-5 animate-spin text-accent" />
                        <span className="text-sm font-medium text-card-foreground">{documentProgress}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-primary via-secondary to-accent h-2 rounded-full transition-all duration-300"
                          style={{ width: documentProgress.match(/\((\d+)%\)/)?.[1] + '%' || '0%' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Converted document */}
                  {translatedDocumentUrl && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-accent/10 border border-accent/20 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-accent" />
                          </div>
                          <div>
                            <p className="font-medium text-card-foreground">Conversion Complete!</p>
                            <p className="text-sm text-muted-foreground">Your document is ready to download</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setTranslatedDocumentUrl("");
                              setUploadedFile(null);
                            }}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Clear
                          </Button>
                          <Button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = translatedDocumentUrl;
                              const originalName = uploadedFile?.name.replace(/\.[^/.]+$/, '') || 'document';
                              link.download = `converted_${originalName}`;
                              link.click();
                            }}
                            className="bg-accent text-accent-foreground hover:bg-accent/90"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
