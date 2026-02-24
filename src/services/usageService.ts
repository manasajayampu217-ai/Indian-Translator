// Usage tracking and limits service

export interface UsageStats {
  translationsToday: number;
  documentsTotal: number; // Total documents translated (lifetime)
  lastResetDate: string;
  isPremium: boolean;
}

export const LIMITS = {
  FREE_TRANSLATIONS_PER_DAY: -1, // Unlimited - completely free
  FREE_DOCUMENTS_LIFETIME: 1, // First document is free
  PREMIUM_TRANSLATIONS_PER_DAY: -1, // Unlimited
  PREMIUM_DOCUMENTS_PER_DAY: -1, // Unlimited for premium
};

export const PRICING = {
  DOCUMENT_TRANSLATION: 2, // ₹2 per document after first free one
};

export class UsageService {
  private static STORAGE_KEY = 'translation_usage';

  // Get current usage stats
  static getUsage(): UsageStats {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      const usage: UsageStats = JSON.parse(stored);
      
      // Reset if it's a new day (but keep documentsTotal)
      const today = new Date().toDateString();
      if (usage.lastResetDate !== today) {
        return this.resetDailyUsage(usage.isPremium, usage.documentsTotal || 0);
      }
      
      return usage;
    }
    
    // Initialize new user
    return this.resetDailyUsage(false, 0);
  }

  // Reset daily counters (but keep lifetime document count)
  private static resetDailyUsage(isPremium: boolean, documentsTotal: number = 0): UsageStats {
    const usage: UsageStats = {
      translationsToday: 0,
      documentsTotal, // Keep lifetime count
      lastResetDate: new Date().toDateString(),
      isPremium,
    };
    
    this.saveUsage(usage);
    return usage;
  }

  // Save usage to localStorage
  private static saveUsage(usage: UsageStats): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usage));
  }

  // Check if user can translate
  static canTranslate(): { allowed: boolean; remaining: number; message?: string } {
    const usage = this.getUsage();
    
    if (usage.isPremium) {
      return { allowed: true, remaining: -1 }; // Unlimited
    }
    
    const remaining = LIMITS.FREE_TRANSLATIONS_PER_DAY - usage.translationsToday;
    
    if (remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        message: `Daily limit reached! Upgrade to Premium for unlimited translations.`
      };
    }
    
    return { allowed: true, remaining };
  }

  // Check if user can translate document
  static canTranslateDocument(): { allowed: boolean; isFree: boolean; message?: string } {
    const usage = this.getUsage();
    
    // Premium users get unlimited documents
    if (usage.isPremium) {
      return { allowed: true, isFree: true };
    }
    
    // First document is free
    if (usage.documentsTotal === 0) {
      return { 
        allowed: true, 
        isFree: true,
        message: "🎉 Your first document translation is FREE!"
      };
    }
    
    // After first document, pay ₹2 per document
    return {
      allowed: false,
      isFree: false,
      message: `Document translation costs ₹${PRICING.DOCUMENT_TRANSLATION} per document. Your first document was free!`
    };
  }

  // Increment translation count
  static incrementTranslation(): void {
    const usage = this.getUsage();
    usage.translationsToday++;
    this.saveUsage(usage);
  }

  // Increment document count
  static incrementDocument(): void {
    const usage = this.getUsage();
    usage.documentsTotal++;
    this.saveUsage(usage);
  }

  // Upgrade to premium
  static upgradeToPremium(): void {
    const usage = this.getUsage();
    usage.isPremium = true;
    this.saveUsage(usage);
  }

  // Check premium status
  static isPremium(): boolean {
    return this.getUsage().isPremium;
  }

  // Get usage summary
  static getUsageSummary(): string {
    const usage = this.getUsage();
    
    if (usage.isPremium) {
      return `Premium User - Unlimited documents`;
    }
    
    if (usage.documentsTotal === 0) {
      return `Free User - First document FREE!`;
    }
    
    return `Free User - ${usage.documentsTotal} document(s) translated`;
  }
  
  // Get document count
  static getDocumentCount(): number {
    return this.getUsage().documentsTotal;
  }
}
