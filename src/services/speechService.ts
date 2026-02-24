export class SpeechService {
  private static synthesis = window.speechSynthesis;
  private static currentUtterance: SpeechSynthesisUtterance | null = null;
  private static currentAudio: HTMLAudioElement | null = null;

  // Language code mapping for speech synthesis
  private static languageMap: { [key: string]: string } = {
    'en': 'en-US',
    'hi': 'hi-IN',
    'ta': 'ta-IN',
    'te': 'te-IN'
  };

  // Google Translate TTS language codes
  private static googleTTSLangMap: { [key: string]: string } = {
    'en': 'en',
    'hi': 'hi',
    'ta': 'ta',
    'te': 'te'
  };

  static async speak(text: string, language: string): Promise<void> {
    try {
      console.log('=== SPEECH SYNTHESIS START ===');
      console.log('Text:', text);
      console.log('Language:', language);
      
      // Stop any ongoing speech
      this.stop();
      
      // For Telugu, Tamil, and Hindi - use Google Translate TTS (more reliable)
      if (['te', 'ta', 'hi'].includes(language)) {
        console.log(`Using Google Translate TTS for ${language}`);
        await this.speakWithGoogleTTS(text, language);
      } else {
        // For English, use browser's built-in TTS
        console.log('Using browser TTS for English');
        await this.speakWithBrowserTTS(text, language);
      }
    } catch (error) {
      console.error('❌ Speech error:', error);
      throw error;
    }
  }

  private static speakWithGoogleTTS(text: string, language: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const lang = this.googleTTSLangMap[language] || 'en';
        
        // Use backend proxy to avoid CORS issues
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const encodedText = encodeURIComponent(text);
        const audioUrl = `${BACKEND_URL}/api/tts?text=${encodedText}&lang=${lang}`;
        
        console.log('🔊 Loading Google TTS audio...');
        
        // Create audio element with preload
        const audio = new Audio();
        audio.preload = 'auto'; // Preload the audio
        this.currentAudio = audio;
        
        audio.volume = 1.0;
        
        let isLoading = true;
        const startTime = Date.now();
        
        audio.onloadstart = () => {
          console.log('⏳ Loading audio...');
        };
        
        audio.oncanplay = () => {
          const loadTime = Date.now() - startTime;
          console.log(`✅ Audio ready to play (loaded in ${loadTime}ms)`);
          isLoading = false;
          
          // Auto-play as soon as it's ready
          audio.play().catch(err => {
            console.error('❌ Auto-play error:', err);
          });
        };
        
        audio.onplay = () => {
          console.log('🔊 Audio started playing');
        };
        
        audio.onended = () => {
          console.log('✅ Audio finished playing');
          this.currentAudio = null;
          resolve();
        };
        
        audio.onerror = (e) => {
          console.error('❌ Audio error:', e);
          console.error('Audio error details:', {
            error: audio.error,
            networkState: audio.networkState,
            readyState: audio.readyState
          });
          this.currentAudio = null;
          // Fallback to browser TTS
          console.log('Falling back to browser TTS...');
          this.speakWithBrowserTTS(text, language)
            .then(resolve)
            .catch(reject);
        };
        
        // Set source and start loading
        audio.src = audioUrl;
        audio.load(); // Force immediate loading
        
        // Timeout for loading
        setTimeout(() => {
          if (isLoading) {
            console.log('⚠️ Audio taking too long to load, trying to play anyway...');
            audio.play().catch(err => {
              console.error('❌ Delayed play error:', err);
            });
          }
        }, 2000);
        
      } catch (error) {
        console.error('❌ Google TTS error:', error);
        reject(error);
      }
    });
  }

  private static speakWithBrowserTTS(text: string, language: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // CRITICAL: Cancel any ongoing speech first
        if (this.synthesis.speaking || this.synthesis.pending) {
          console.log('Cancelling previous speech...');
          this.synthesis.cancel();
          
          // Wait a bit after cancelling
          setTimeout(() => this.startSpeech(text, language, resolve, reject), 200);
        } else {
          this.startSpeech(text, language, resolve, reject);
        }
      } catch (error) {
        console.error('❌ Exception:', error);
        reject(error);
      }
    });
  }

  private static startSpeech(
    text: string, 
    language: string, 
    resolve: () => void, 
    reject: (error: Error) => void
  ): void {
    if (!text.trim()) {
      reject(new Error('No text to speak'));
      return;
    }

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;
    
    // Set language
    const lang = this.languageMap[language] || 'en-US';
    utterance.lang = lang;
    
    // CRITICAL: Set properties
    utterance.volume = 1.0;  // Maximum volume
    utterance.rate = 0.9;    // Slightly slower for clarity
    utterance.pitch = 1.0;   // Normal pitch
    
    console.log('Utterance settings:', {
      lang: utterance.lang,
      volume: utterance.volume,
      rate: utterance.rate,
      pitch: utterance.pitch,
      text: text.substring(0, 100)
    });

    // Get voices
    const voices = this.synthesis.getVoices();
    console.log(`Available voices: ${voices.length}`);
    
    if (voices.length > 0) {
      // Find best matching voice
      const matchingVoice = voices.find(v => v.lang === lang) ||
                           voices.find(v => v.lang.startsWith(lang.split('-')[0])) ||
                           voices.find(v => v.default);
      
      if (matchingVoice) {
        utterance.voice = matchingVoice;
        console.log(`✅ Selected voice: ${matchingVoice.name} (${matchingVoice.lang})`);
      } else {
        console.log('Using default voice');
      }
    }

    let hasStarted = false;
    let hasEnded = false;

    // Event handlers
    utterance.onstart = () => {
      hasStarted = true;
      console.log('🔊 SPEECH STARTED - AUDIO PLAYING!');
      console.log('Volume check: Make sure system volume is up');
    };

    utterance.onend = () => {
      if (!hasEnded) {
        hasEnded = true;
        console.log('✅ Speech ended successfully');
        resolve();
      }
    };

    utterance.onerror = (event) => {
      console.error('❌ Speech error:', event.error);
      if (!hasEnded) {
        hasEnded = true;
        if (event.error === 'interrupted' || event.error === 'cancelled') {
          console.log('Speech was interrupted/cancelled');
          resolve(); // Don't treat as error
        } else {
          reject(new Error(`Speech error: ${event.error}`));
        }
      }
    };

    // Speak
    console.log('🔊 Calling speechSynthesis.speak()...');
    this.synthesis.speak(utterance);
    
    // Force resume after a short delay (helps with some browsers)
    setTimeout(() => {
      if (this.synthesis.paused) {
        console.log('Resuming paused speech...');
        this.synthesis.resume();
      }
      
      if (!hasStarted && this.synthesis.speaking) {
        console.log('Speech is speaking but onstart did not fire');
      } else if (!hasStarted && !this.synthesis.speaking) {
        console.error('❌ Speech did not start!');
        reject(new Error('Speech failed to start'));
      }
    }, 500);

    // Safety timeout
    setTimeout(() => {
      if (!hasEnded) {
        console.log('⚠️ Speech timeout - forcing end');
        hasEnded = true;
        resolve();
      }
    }, (text.length / 10) * 1000 + 10000);
  }

  static stop(): void {
    console.log('🛑 Stopping speech...');
    
    // Stop audio if playing
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    
    // Stop browser TTS
    if (this.synthesis.speaking || this.synthesis.pending) {
      this.synthesis.cancel();
    }
  }

  static isSpeaking(): boolean {
    return this.synthesis.speaking || (this.currentAudio !== null && !this.currentAudio.paused);
  }

  static isSupported(): boolean {
    const supported = 'speechSynthesis' in window;
    console.log('Speech synthesis supported:', supported);
    return supported;
  }

  // Test function - call this to verify audio works
  static test(): void {
    console.log('=== TESTING SPEECH SYNTHESIS ===');
    this.speak('Hello, this is a test', 'en')
      .then(() => console.log('✅ Test completed'))
      .catch(err => console.error('❌ Test failed:', err));
  }
}
