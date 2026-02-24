import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Calendar, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HistoryService, DocumentHistory } from '@/services/historyService';
import { toast } from 'sonner';
import { User } from '@/services/authService';

interface HistoryPageProps {
  user: User;
  onBack: () => void;
}

export default function HistoryPage({ user, onBack }: HistoryPageProps) {
  const [history, setHistory] = useState<DocumentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const documents = await HistoryService.getUserHistory(user.email);
      setHistory(documents);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast.error('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
            {/* Input Documents Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-4 border-b border-border">
                <h2 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Input Documents
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Original documents you uploaded
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        File Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.map((doc, index) => (
                      <motion.tr
                        key={`input-${doc.timestamp}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-sm font-medium text-card-foreground">
                              {doc.original.fileName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {formatDate(doc.date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {formatFileSize(doc.original.size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(doc.original.url, '_blank')}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Output Documents Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-accent/30 rounded-xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-accent/10 to-secondary/10 px-6 py-4 border-b border-accent/30">
                <h2 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" />
                  Output Documents
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Translated documents ready to download
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-accent/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        File Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.map((doc, index) => (
                      <motion.tr
                        key={`output-${doc.timestamp}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-accent/5 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-accent" />
                            </div>
                            <span className="text-sm font-medium text-card-foreground">
                              {doc.translated.fileName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {formatDate(doc.date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {formatFileSize(doc.translated.size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            size="sm"
                            className="bg-accent text-accent-foreground hover:bg-accent/90"
                            onClick={() => window.open(doc.translated.url, '_blank')}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
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
