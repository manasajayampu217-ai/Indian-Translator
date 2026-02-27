# Indian Translator

A modern web application for translating between English and Indian languages (Hindi, Tamil, Telugu) with support for text, voice, and document translation.

## 🌟 Features

### Text Translation
- **Multi-language support**: English ↔ Hindi ↔ Tamil ↔ Telugu
- **Multiple translation providers**: AWS Translate, Google Translate, MyMemory, LibreTranslate
- **Automatic fallback**: If one provider fails, automatically tries the next
- **Romanized input support**: Type in English letters, get native script output

### Voice Translation
- **Voice input**: Speak in any supported language
- **Voice output**: Hear translations in native pronunciation
- **Browser-based**: Uses Web Speech API (works in Chrome, Edge)

### Document Translation
- **Image translation**: Upload PNG/JPG images with text
- **PDF translation**: Upload PDF documents (requires AWS)
- **Layout preservation**: Maintains original document layout
- **OCR support**: Extracts text from images using Tesseract.js or AWS Textract

### Document Conversions
- **Word ↔ PDF**: Convert between Word and PDF formats
- **Image ↔ PDF**: Convert images to PDF and vice versa
- **PDF to Word**: Extract text from PDF to editable Word (requires AWS)
- **Image to Word**: Extract text from images to Word (requires AWS)

### Translation History
- **Persistent storage**: All translations saved until manually deleted
- **User privacy**: Each user sees only their own history
- **Download support**: Download original and translated files
- **Delete functionality**: Remove individual history items

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- (Optional) AWS account for PDF translation and advanced features

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Indian-Translator
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Set up environment variables**
   
   Frontend (`.env`):
   ```env
   VITE_BACKEND_URL=http://localhost:3001
   VITE_AWS_REGION=us-east-1
   VITE_AWS_ACCESS_KEY_ID=
   VITE_AWS_SECRET_ACCESS_KEY=
   ```

   Backend (`backend/.env`):
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key_here
   AWS_SECRET_ACCESS_KEY=your_secret_key_here
   AWS_S3_BUCKET=your-bucket-name
   PORT=3001
   ```

5. **Start the application**
   
   Terminal 1 - Backend:
   ```bash
   cd backend
   npm start
   ```

   Terminal 2 - Frontend:
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:5173
   ```

## 📖 Usage

### Text Translation
1. Go to the "Text" tab
2. Select source and target languages
3. Type or paste your text
4. Click "Translate"

### Voice Translation
1. Go to the "Voice" tab
2. Select source and target languages
3. Click the microphone icon and speak
4. Click "Translate"
5. Click the speaker icon to hear the translation

### Document Translation
1. Go to the "Doc" tab
2. Select source and target languages
3. Upload an image (PNG/JPG) or PDF
4. Click "Translate"
5. Download the translated document

### View History
1. Click the "History" button in the navigation
2. View all your past translations
3. Download original or translated files
4. Delete individual items as needed

## 🔧 Configuration

### Without AWS (Basic Features)
Works out of the box:
- ✅ Text translation (all languages)
- ✅ Image translation (all languages)
- ✅ Voice translation
- ✅ History
- ✅ Word ↔ PDF conversion
- ✅ Image ↔ PDF conversion

### With AWS (Advanced Features)
Requires AWS credentials:
- ✅ PDF translation
- ✅ Image to Word conversion
- ✅ PDF to Word conversion
- ✅ S3 storage for history (optional)

### AWS Setup
1. Create AWS account at https://aws.amazon.com/
2. Create IAM user with permissions:
   - `AmazonTextractFullAccess`
   - `AmazonTranslateFullAccess`
   - `AmazonS3FullAccess` (optional, for history)
3. Generate access keys
4. Add to `backend/.env`

## 🏗️ Architecture

### Frontend
- **Framework**: React + TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui + Tailwind CSS
- **Routing**: React Router
- **State Management**: React Hooks
- **OCR**: Tesseract.js (browser-based)

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **File Upload**: Multer
- **PDF Processing**: pdf-lib
- **Word Processing**: docx, mammoth
- **AWS Services**: Textract, Translate, S3

## 📁 Project Structure

```
Indian-Translator/
├── src/                      # Frontend source
│   ├── components/          # React components
│   ├── services/            # API services
│   ├── pages/               # Page components
│   └── lib/                 # Utilities
├── backend/                 # Backend source
│   ├── server.js           # Express server
│   ├── s3Service.js        # AWS S3 integration
│   ├── history/            # User translation history
│   └── uploads/            # Temporary file uploads
├── public/                  # Static assets
└── docs/                    # Documentation
```

## 🌐 Supported Languages

| Language | Code | Native Name |
|----------|------|-------------|
| English  | en   | English     |
| Hindi    | hi   | हिन्दी      |
| Tamil    | ta   | தமிழ்       |
| Telugu   | te   | తెలుగు      |

## 🔒 Privacy & Security

- **User isolation**: Each user's history is stored separately
- **Local storage**: History stored locally by default
- **No tracking**: No analytics or tracking
- **Secure**: Environment variables for sensitive data
- **CORS enabled**: Secure cross-origin requests

## 📝 Documentation

- [AWS Setup Guide](./AWS_SETUP_GUIDE.md) - Detailed AWS configuration
- [Conversions Guide](./CONVERSIONS_GUIDE.md) - Document conversion features
- [Document Translation Guide](./DOCUMENT_TRANSLATION_GUIDE.md) - Translation features
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Pre-deployment checklist

## 🐛 Troubleshooting

### Voice not working
- Use Chrome or Edge browser
- Allow microphone permissions
- Check browser console for errors

### PDF translation failing
- Ensure AWS credentials are configured
- Check AWS Textract is enabled in your region
- Verify IAM permissions

### History not showing
- Check backend is running on port 3001
- Verify `backend/history/` directory exists
- Check browser console for errors

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- AWS for Textract and Translate services
- Tesseract.js for browser-based OCR
- shadcn/ui for beautiful UI components
- All open-source libraries used in this project

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

Made with ❤️ for Indian language translation
