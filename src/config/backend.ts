// Backend URL configuration for hybrid deployment
// Document translations use EC2 (heavy processing)
// Voice/text translations use Render (lightweight, always-on)

export const BACKEND_CONFIG = {
  // EC2 backend for document processing (heavy workload)
  DOCUMENTS: import.meta.env.VITE_BACKEND_URL_DOCUMENTS || import.meta.env.VITE_BACKEND_URL || 'http://35.154.52.155:3001',
  
  // Render backend for voice/text (lightweight, no cold starts needed)
  VOICE: import.meta.env.VITE_BACKEND_URL_VOICE || import.meta.env.VITE_BACKEND_URL || 'http://35.154.52.155:3001',
  
  // Default backend (fallback)
  DEFAULT: import.meta.env.VITE_BACKEND_URL || 'http://35.154.52.155:3001',
};

// Helper function to get the appropriate backend URL
export function getBackendUrl(service: 'documents' | 'voice' | 'default' = 'default'): string {
  switch (service) {
    case 'documents':
      return BACKEND_CONFIG.DOCUMENTS;
    case 'voice':
      return BACKEND_CONFIG.VOICE;
    default:
      return BACKEND_CONFIG.DEFAULT;
  }
}

// Log configuration on load (for debugging)
console.log('🔧 Backend Configuration:', {
  documents: BACKEND_CONFIG.DOCUMENTS,
  voice: BACKEND_CONFIG.VOICE,
  default: BACKEND_CONFIG.DEFAULT,
});
