// Translation service with multiple providers
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

export interface TranslationResult {
  translatedText: string;
  provider: string;
  success: boolean;
}

// AWS Configuration
const AWS_REGION = import.meta.env.VITE_AWS_REGION || "us-east-1";
const AWS_ACCESS_KEY_ID = import.meta.env.VITE_AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || "";

export class TranslationService {
  private static translateClient: TranslateClient | null = null;

  // Initialize AWS Translate client
  private static getAWSClient(): TranslateClient | null {
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      return null;
    }

    if (!this.translateClient) {
      this.translateClient = new TranslateClient({
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY,
        },
      });
    }

    return this.translateClient;
  }

  // Convert Romanized text to native script using Google Input Tools
  static async romanizedToNativeScript(
    text: string,
    lang: string
  ): Promise<string> {
    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${BACKEND_URL}/api/input-tools?text=${encodeURIComponent(text)}&lang=${lang}`);
      const data = await response.json();

      if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1] && data[1][0][1][0]) {
        const nativeScript = data[1][0][1][0]; // Get first suggestion
        console.log(`✅ Romanized → Native: "${text}" → "${nativeScript}"`);
        return nativeScript;
      }
    } catch (error) {
      console.error('Romanization conversion error:', error);
    }
    
    return text; // Return original if conversion fails
  }

  // Try AWS Translate (best quality for Indian languages)
  static async translateWithAWS(
    text: string,
    fromLang: string,
    toLang: string
  ): Promise<TranslationResult> {
    try {
      console.log('=== AWS Translate Attempt ===');
      
      const client = TranslationService.getAWSClient();
      
      if (!client) {
        console.log('❌ AWS credentials not configured');
        return { translatedText: '', provider: 'AWS Translate', success: false };
      }

      console.log('✅ AWS Client created');
      
      // Check if input is Romanized (English letters only)
      const isRomanScript = /^[a-zA-Z0-9\s.,!?'"]+$/.test(text);
      const isIndianLang = ['hi', 'ta', 'te'].includes(fromLang);
      
      let textToTranslate = text;
      let actualSourceLang = fromLang;
      
      // TWO-STEP TRANSLATION for Romanized input (like Google Translate)
      // Step 1: Convert Romanized → Native script
      // Step 2: Translate Native script → Target language
      if (isRomanScript && isIndianLang) {
        console.log('⚠️ Romanized input detected, converting to native script first...');
        const nativeScript = await this.romanizedToNativeScript(text, fromLang);
        
        if (nativeScript !== text && !/^[a-zA-Z0-9\s.,!?'"]+$/.test(nativeScript)) {
          // Successfully converted to native script
          console.log(`✅ Converted to native script: ${nativeScript}`);
          textToTranslate = nativeScript;
          // Keep the source language as the Indian language
        } else {
          // Conversion failed, treat as English
          console.log('⚠️ Conversion failed or returned English, treating as English');
          actualSourceLang = 'en';
        }
      }
      
      console.log(`Translating: "${textToTranslate}" from ${actualSourceLang} to ${toLang}`);
      
      const command = new TranslateTextCommand({
        Text: textToTranslate,
        SourceLanguageCode: actualSourceLang,
        TargetLanguageCode: toLang,
      });

      const response = await client.send(command);
      
      if (response.TranslatedText && response.TranslatedText.toLowerCase() !== text.toLowerCase()) {
        console.log(`✅ AWS Translate successful: "${response.TranslatedText}"`);
        return {
          translatedText: response.TranslatedText,
          provider: 'AWS Translate',
          success: true
        };
      } else {
        console.log('⚠️ AWS returned same text or empty');
      }
    } catch (error: any) {
      console.error('❌ AWS Translate error:', error.message);
    }
    
    return { translatedText: '', provider: 'AWS Translate', success: false };
  }
  
  // Try LibreTranslate API
  static async translateWithLibre(
    text: string,
    fromLang: string,
    toLang: string
  ): Promise<TranslationResult> {
    try {
      const response = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: fromLang,
          target: toLang,
          format: 'text'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.translatedText && data.translatedText.toLowerCase() !== text.toLowerCase()) {
          return {
            translatedText: data.translatedText,
            provider: 'LibreTranslate',
            success: true
          };
        }
      }
    } catch (error) {
      console.error('LibreTranslate error:', error);
    }
    
    return { translatedText: '', provider: 'LibreTranslate', success: false };
  }

  // Try MyMemory API
  static async translateWithMyMemory(
    text: string,
    fromLang: string,
    toLang: string
  ): Promise<TranslationResult> {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.responseData && data.responseData.translatedText) {
        const translated = data.responseData.translatedText;
        
        if (translated && 
            translated.toLowerCase() !== text.toLowerCase() && 
            !translated.includes('MYMEMORY WARNING') &&
            data.responseStatus === 200) {
          return {
            translatedText: translated,
            provider: 'MyMemory',
            success: true
          };
        }
      }
    } catch (error) {
      console.error('MyMemory error:', error);
    }
    
    return { translatedText: '', provider: 'MyMemory', success: false };
  }

  // Try Google Translate API with full parameter support
  static async translateWithGoogle(
    text: string,
    fromLang: string,
    toLang: string
  ): Promise<TranslationResult> {
    try {
      // Check if input is Romanized
      const isRomanScript = /^[a-zA-Z0-9\s.,!?'"]+$/.test(text);
      const isIndianLang = ['hi', 'ta', 'te'].includes(fromLang);
      
      console.log(`Google Translate: ${fromLang} → ${toLang}, Romanized: ${isRomanScript && isIndianLang}`);
      
      // Use the complete Google Translate API with all parameters
      // dt=t: translation, dt=bd: dictionary, dt=rm: romanization
      const params = new URLSearchParams({
        client: 'gtx',
        sl: fromLang,
        tl: toLang,
        hl: 'en',
        dt: 't',
        dj: '1',
        source: 'input',
        q: text
      });
      
      const url = `https://translate.googleapis.com/translate_a/single?${params.toString()}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Google Translate full response:', JSON.stringify(data).substring(0, 200));
      
      // Try to extract translation from the response
      let translated = '';
      
      // Method 1: Check sentences array
      if (data && data.sentences && Array.isArray(data.sentences)) {
        translated = data.sentences
          .map((s: any) => s.trans)
          .filter((t: any) => t)
          .join('');
      }
      
      // Method 2: Check direct array format
      if (!translated && data && data[0] && Array.isArray(data[0])) {
        translated = data[0]
          .filter((item: any) => item && item[0])
          .map((item: any) => item[0])
          .join('');
      }
      
      if (translated && translated.toLowerCase() !== text.toLowerCase()) {
        console.log(`✅ Google Translate success: ${translated}`);
        return {
          translatedText: translated,
          provider: 'Google Translate',
          success: true
        };
      }
      
      console.log('⚠️ Google Translate: No valid translation found');
    } catch (error) {
      console.error('Google Translate error:', error);
    }
    
    return { translatedText: '', provider: 'Google Translate', success: false };
  }

  // Main translation method with fallbacks
  static async translate(
    text: string,
    fromLang: string,
    toLang: string
  ): Promise<TranslationResult> {
    console.log(`🌐 Translating: ${fromLang} → ${toLang}`);
    
    // Try providers in order
    // AWS Translate first (user has it configured, best for Romanized input)
    const providers = [
      () => this.translateWithAWS(text, fromLang, toLang),         // Primary - handles Romanized input
      () => this.translateWithGoogle(text, fromLang, toLang),      // Backup
      () => this.translateWithMyMemory(text, fromLang, toLang),    // Backup
      () => this.translateWithLibre(text, fromLang, toLang),       // Last resort
    ];

    for (const provider of providers) {
      const result = await provider();
      if (result.success) {
        console.log(`✅ Success with ${result.provider}`);
        return result;
      }
    }

    // All providers failed
    console.error('❌ All translation providers failed');
    return {
      translatedText: '',
      provider: 'None',
      success: false
    };
  }
}
