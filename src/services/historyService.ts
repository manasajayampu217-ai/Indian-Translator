const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface DocumentHistory {
  timestamp: number;
  date: string;
  original: {
    key: string;
    fileName: string;
    size: number;
    url: string;
  };
  translated: {
    key: string;
    fileName: string;
    size: number;
    url: string;
  };
}

export class HistoryService {
  static async getUserHistory(userEmail: string): Promise<DocumentHistory[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/history/${encodeURIComponent(userEmail)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      
      const data = await response.json();
      return data.documents || [];
    } catch (error) {
      console.error('Error fetching history:', error);
      throw error;
    }
  }
}
