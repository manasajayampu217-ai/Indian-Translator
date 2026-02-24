// Transliteration service - converts romanized text to native script

export interface TransliterationResult {
  transliteratedText: string;
  success: boolean;
}

export class TransliterationService {
  
  // Google Input Tools API for transliteration
  static async transliterate(
    text: string,
    targetLang: string
  ): Promise<TransliterationResult> {
    try {
      // Map language codes to Google Input Tools language codes
      const langMap: { [key: string]: string } = {
        'hi': 'hi',
        'ta': 'ta',
        'te': 'te',
      };

      const googleLang = langMap[targetLang];
      
      if (!googleLang) {
        return { transliteratedText: '', success: false };
      }

      const url = `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=${googleLang}-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
        const transliterated = data[1][0][1][0];
        return {
          transliteratedText: transliterated,
          success: true
        };
      }
    } catch (error) {
      console.error('Transliteration error:', error);
    }
    
    return { transliteratedText: '', success: false };
  }

  // Check if text is in English/Roman script
  static isRomanScript(text: string): boolean {
    // Check if text contains mostly ASCII characters (English letters)
    const romanChars = text.match(/[a-zA-Z]/g);
    const totalChars = text.replace(/\s/g, '').length;
    
    if (totalChars === 0) return false;
    
    const romanRatio = romanChars ? romanChars.length / totalChars : 0;
    return romanRatio > 0.7; // If more than 70% is Roman script
  }

  // Check if text is in native script (Telugu, Tamil, Hindi)
  static isNativeScript(text: string, lang: string): boolean {
    const scriptRanges: { [key: string]: RegExp } = {
      'hi': /[\u0900-\u097F]/,  // Devanagari (Hindi)
      'ta': /[\u0B80-\u0BFF]/,  // Tamil
      'te': /[\u0C00-\u0C7F]/,  // Telugu
    };

    const regex = scriptRanges[lang];
    if (!regex) return false;

    const nativeChars = text.match(regex);
    const totalChars = text.replace(/\s/g, '').length;
    
    if (totalChars === 0) return false;
    
    const nativeRatio = nativeChars ? nativeChars.length / totalChars : 0;
    return nativeRatio > 0.5; // If more than 50% is native script
  }
}
