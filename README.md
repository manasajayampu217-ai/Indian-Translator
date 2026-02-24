# Translation App - Multi-Language Document & Voice Translation

A modern web application for translating text, documents, and voice across 4 Indian languages with smart transliteration and layout preservation.

## 🌟 Features

### ✅ Implemented & Working
- **Text Translation** (FREE - Unlimited)
  - English, Hindi, Tamil, Telugu
  - Smart transliteration (Roman → Native script)
  - Multi-provider fallback system
  
- **Voice Translation** (FREE - Unlimited)
  - Browser speech recognition
  - Amazon Transcribe integration (optional)
  - Real-time transcription
  
- **Document Translation** (PAID - Requires AWS)
  - PDF and image support
  - Layout preservation
  - AWS Textract integration
  - Premium: ₹149/month (10 docs/day)
  - Pay-per-use: ₹299/document

### 🎯 Smart Features
- **Transliteration**: Type in English letters, get native script
  - Example: "namaste" → "नमस्ते" (Hindi)
- **Same Language Detection**: Automatically handles same source/target
- **Multi-Provider Fallback**: Google Translate → LibreTranslate → MyMemory
- **Usage Tracking**: LocalStorage-based limits and tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- AWS Account (for document translation)
- Razorpay Account (for payments - optional)

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Create .env file (see .env.example)
cp .env.example .env

# Add your AWS credentials to .env
# VITE_AWS_REGION=ap-south-1
# VITE_AWS_ACCESS_KEY_ID=your_key
# VITE_AWS_SECRET_ACCESS_KEY=your_secret

# Start development server
npm run dev
```

### Verify Setup

```bash
# Run setup verification
node test-setup.js
```

## 📋 Current Status

| Feature | Status | Notes |
|---------|--------|-------|
| Text Translation | ✅ Working | Free, unlimited |
| Voice Translation | ✅ Working | Free, unlimited (HTTPS required) |
| Document Translation | ⚠️ Needs AWS | Requires AWS Textract activation |
| Transliteration | ✅ Working | Roman → Native script |
| Usage Tracking | ✅ Working | LocalStorage-based |
| Pricing Modal | ✅ Working | UI complete |
| Payment Gateway | ⚠️ Not integrated | Needs Razorpay setup |

## 🔧 AWS Setup Required

### 1. Activate AWS Services

#### AWS Textract (Required for documents)
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Search "Amazon Textract"
3. Click "Get Started"

#### AWS Translate (Optional - better quality)
1. Search "Amazon Translate"
2. Click "Get Started"

### 2. Add IAM Permissions
1. Go to IAM → Users → Your user
2. Add policies:
   - `TranslateFullAccess`
   - `AmazonTextractFullAccess`
   - `AmazonTranscribeFullAccess` (optional)

### 3. Test
```bash
npm run dev
# Try uploading a document in the Document tab
```

## 💳 Payment Integration (Optional)

### Razorpay Setup
1. Sign up at https://razorpay.com/
2. Get API keys
3. Add to `.env`:
   ```env
   VITE_RAZORPAY_KEY_ID=your_key_id
   VITE_RAZORPAY_KEY_SECRET=your_secret
   ```
4. Add script to `index.html`:
   ```html
   <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
   ```

## 📚 Documentation

- **[COMPLETE_SETUP_GUIDE.md](./COMPLETE_SETUP_GUIDE.md)** - Detailed setup instructions
- **[AWS_SETUP.md](./AWS_SETUP.md)** - AWS configuration guide
- **[MONETIZATION_IMPLEMENTATION.md](./MONETIZATION_IMPLEMENTATION.md)** - Pricing strategy
- **[DOCUMENT_TRANSLATION_GUIDE.md](./DOCUMENT_TRANSLATION_GUIDE.md)** - Document feature details
- **[TRANSLATION_GUIDE.md](./TRANSLATION_GUIDE.md)** - Translation service details
- **[USAGE_GUIDE.md](./USAGE_GUIDE.md)** - Usage tracking system

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui, Framer Motion
- **Translation**: Google Translate API, LibreTranslate, MyMemory
- **AWS Services**: Translate, Textract, Transcribe
- **Payment**: Razorpay (to be integrated)
- **State**: React Hooks, LocalStorage

## 📦 Project Structure

```
src/
├── components/
│   ├── TranslationPanel.tsx    # Main translation interface
│   ├── PricingModal.tsx         # Pricing UI
│   ├── HeroSection.tsx          # Landing page hero
│   ├── FeaturesSection.tsx      # Features showcase
│   └── ui/                      # shadcn/ui components
├── services/
│   ├── translationService.ts    # Multi-provider translation
│   ├── documentService.ts       # Document translation
│   ├── transcribeService.ts     # Voice recognition
│   ├── transliterationService.ts # Roman → Native script
│   └── usageService.ts          # Usage tracking & limits
└── pages/
    └── Index.tsx                # Main page
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Push to GitHub
git push origin main

# Deploy on Vercel
# 1. Import repository
# 2. Add environment variables
# 3. Deploy
```

### Netlify
```bash
# Push to GitHub
git push origin main

# Deploy on Netlify
# 1. Import repository
# 2. Add environment variables
# 3. Deploy
```

## 🐛 Troubleshooting

### "SubscriptionRequiredException"
- **Cause**: AWS Translate not activated
- **Fix**: Activate in AWS Console

### "No text found in document"
- **Cause**: AWS Textract not configured
- **Fix**: Activate AWS Textract and add IAM permissions

### Voice not capturing
- **Cause**: Browser requires HTTPS
- **Fix**: Deploy to HTTPS hosting or use localhost

### Document pricing modal appears
- **Cause**: User not premium
- **Fix**: Click "Upgrade to Premium" (currently simulated)

## 📝 Next Steps

1. ✅ Activate AWS Textract
2. ✅ Test document translation
3. ⚠️ Set up Razorpay for payments
4. ⚠️ Deploy to Vercel/Netlify
5. ⚠️ Activate AWS Translate (optional)

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

## 📄 License

Private - All rights reserved

---

**Built with ❤️ using React, TypeScript, and AWS**
