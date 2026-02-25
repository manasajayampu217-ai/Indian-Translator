import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Calendar, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HistoryService, HistoryItem } from '@/services/historyService';
import { toast } from 'sonner';
import { User } from '@/services/authService';

interface HistoryPageProps {
  user: User;
  onBack: () => void;
}

export default function HistoryPage({ user, onBack }: HistoryPageProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [user.email]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const items = await HistoryService.getUserHistory(user.email);
      setHistory(items);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast.error('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (item: HistoryItem) => {
    if (!confirm('Are you sure you want to delete this translation from history?')) {
      return;
    }

    try {
      setDeletingId(item.id);
      await HistoryService.deleteHistoryItem(user.email, item.timestamp);
      
      // Remove from local state
      setHistory(prev => prev.filter(h => h.id !== item.id));
      
      toast.success('Translation deleted from history');
    } catch (error) {
      console.error('Failed to delete history item:', error);
      toast.error('Failed to delete history item');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadDocument = async (timestamp: number, type: 'original' | 'translated', filename: string) => {
    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const url = `${BACKEND_URL}/api/download/${encodeURIComponent(user.email)}/${timestamp}/${type}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      
      toast.success('File downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-secondary to-accent py-8">
        <div className="container mx-auto px-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Translator
          </Button>
          <h1 className="text-4xl font-bold text-white">Translation History</h1>
          <p className="text-white/80 mt-2">View and download your translated documents</p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : history.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-card-foreground mb-2">No History Yet</h2>
            <p className="text-muted-foreground">
              Your translated documents will appear here
            </p>
          </motion.div>
        ) : (
          <div className="space-y-8 max-w-6xl mx-auto">
            {/* All Translations Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-4 border-b border-border">
                <h2 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Translation History
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  All your translations - text and documents
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Languages
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Content
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.map((item, index) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              item.type === 'text' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                            }`}>
                              {item.type === 'text' ? (
                                <span className="text-xs font-bold">T</span>
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                            </div>
                            <span className="text-sm font-medium capitalize">
                              {item.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <span className="font-medium">{item.fromLang.toUpperCase()}</span>
                            <span className="mx-2">→</span>
                            <span className="font-medium">{item.toLang.toUpperCase()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            {item.type === 'text' ? (
                              <div>
                                <p className="text-sm text-muted-foreground truncate">
                                  "{item.originalText?.substring(0, 50)}..."
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.originalText?.length} chars
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm font-medium text-card-foreground truncate">
                                  {item.originalFileName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(item.originalSize)}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {formatDate(item.timestamp)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            {item.type === 'text' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadText(item.originalText || '', `original_${item.timestamp}.txt`)}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Original
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                                  onClick={() => downloadText(item.translatedText || '', `translated_${item.timestamp}.txt`)}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Translated
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadDocument(item.timestamp, 'original', item.originalFileName || 'original.pdf')}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Original
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                                  onClick={() => downloadDocument(item.timestamp, 'translated', item.translatedFileName || 'translated.pdf')}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Translated
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(item)}
                              disabled={deletingId === item.id}
                            >
                              {deletingId === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
