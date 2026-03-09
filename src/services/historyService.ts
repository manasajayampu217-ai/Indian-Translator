// Use EC2 backend for document history (documents are stored on EC2)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL_DOCUMENTS || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface HistoryItem {
  id: string;
  timestamp: number;
  date: string;
  type: 'text' | 'document';
  fromLang: string;
  toLang: string;
  originalText?: string;
  translatedText?: string;
  originalFileName?: string;
  translatedFileName?: string;
  originalSize?: number;
  translatedSize?: number;
}

export class HistoryService {
  // Save text translation to history
  static async saveTextTranslation(
    userEmail: string,
    originalText: string,
    translatedText: string,
    fromLang: string,
    toLang: string
  ): Promise<void> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/history/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          originalText,
          translatedText,
          fromLang,
          toLang,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save text translation');
      }
    } catch (error) {
      console.error('Error saving text translation:', error);
      // Don't throw - we don't want to break the translation if history fails
    }
  }

  // Save document translation to history
  static async saveDocumentTranslation(
    userEmail: string,
    originalFile: File,
    translatedBlob: Blob,
    fromLang: string,
    toLang: string
  ): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('userEmail', userEmail);
      formData.append('originalFile', originalFile);
      formData.append('translatedFile', translatedBlob, `translated_${originalFile.name}`);
      formData.append('fromLang', fromLang);
      formData.append('toLang', toLang);

      const response = await fetch(`${BACKEND_URL}/api/history/document`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to save document translation');
      }
    } catch (error) {
      console.error('Error saving document translation:', error);
      // Don't throw - we don't want to break the translation if history fails
    }
  }

  // Get user's translation history
  static async getUserHistory(userEmail: string): Promise<HistoryItem[]> {
    try {
      console.log('🔍 Fetching history for user:', userEmail);
      console.log('🔍 Backend URL:', BACKEND_URL);
      
      const url = `${BACKEND_URL}/api/history/${encodeURIComponent(userEmail)}`;
      console.log('🔍 Full URL:', url);
      
      const response = await fetch(url);
      
      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ History fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch history: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ History data received:', data);
      
      return data.history || [];
    } catch (error) {
      console.error('❌ Error fetching history:', error);
      return [];
    }
  }

  // Delete history item
  static async deleteHistoryItem(userEmail: string, timestamp: number): Promise<void> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/history/${encodeURIComponent(userEmail)}/${timestamp}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete history item');
      }
    } catch (error) {
      console.error('Error deleting history item:', error);
      throw error;
    }
  }
}
