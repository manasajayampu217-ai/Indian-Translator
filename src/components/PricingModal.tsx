import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { PRICING, UsageService } from "@/services/usageService";

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

const PricingModal = ({ open, onClose, onUpgrade }: PricingModalProps) => {
  const documentCount = UsageService.getDocumentCount();
  const isFirstDocument = documentCount === 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center">Document Translation</DialogTitle>
          <DialogDescription className="text-center text-lg">
            {isFirstDocument ? (
              <span className="text-green-600 font-semibold">🎉 Your first document is FREE!</span>
            ) : (
              <span>Simple pay-per-use pricing</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* First Document Free Banner */}
          {isFirstDocument && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-500 rounded-xl p-6 text-center">
              <Sparkles className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
                First Document FREE!
              </h3>
              <p className="text-green-600 dark:text-green-300">
                Try document translation at no cost. Click below to continue!
              </p>
            </div>
          )}

          {/* Pay Per Use */}
          <div className="border-2 border-accent rounded-xl p-6 bg-accent/5">
            <div className="text-center mb-4">
              <h3 className="text-2xl font-bold mb-2">Pay Per Document</h3>
              <div className="text-5xl font-bold text-accent mb-2">
                ₹{PRICING.DOCUMENT_TRANSLATION}
              </div>
              <p className="text-muted-foreground">per document</p>
            </div>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>First document is <strong>FREE</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Only ₹2 per additional document</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Layout and formatting preserved</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>PDF & Image support (up to 150MB)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>No subscription required</span>
              </li>
            </ul>

            <Button 
              className="w-full bg-accent hover:bg-accent/90 text-lg py-6" 
              onClick={onUpgrade}
            >
              {isFirstDocument ? "Continue with FREE Translation" : `Pay ₹${PRICING.DOCUMENT_TRANSLATION} & Translate`}
            </Button>
          </div>

          {/* What's Included */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">What's Included:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• High-quality OCR with AWS Textract</li>
              <li>• Accurate translation across 4 languages</li>
              <li>• Original layout and design preserved</li>
              <li>• Download as PNG image</li>
              <li>• Instant processing (10-30 seconds)</li>
            </ul>
          </div>

          {/* Already Translated */}
          {!isFirstDocument && (
            <div className="text-center text-sm text-muted-foreground">
              You've translated {documentCount} document{documentCount > 1 ? 's' : ''} so far
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PricingModal;
