# Hybrid Deployment Guide: EC2 + Render

## Architecture Overview

Your IndianTranslator app now uses a **hybrid backend architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vercel)                     │
│         https://indian-translator-five.vercel.app        │
└──────────────────┬──────────────────┬───────────────────┘
                   │                  │
        ┌──────────▼────────┐  ┌─────▼──────────┐
        │   EC2 Backend     │  │ Render Backend │
        │  (Heavy Tasks)    │  │ (Light Tasks)  │
        └───────────────────┘  └────────────────┘
```

### Why Hybrid?

| Feature | Backend | Reason |
|---------|---------|--------|
| **Document Translation** | EC2 | Heavy processing (OCR, PDF generation) |
| **Document History** | EC2 | Files stored on EC2 S3 |
| **Voice Translation** | Render | Lightweight, needs to be always-on |
| **Text Translation** | Render | Lightweight, fast response needed |

## Backend Endpoints

### EC2 Backend (http://35.154.52.155:3001)
- `/api/translate-document` - Document translation
- `/api/convert-document` - Document conversion
- `/api/history/:email` - Get user history
- `/api/history/:email/:timestamp` - Delete history item
- `/api/download/:email/:timestamp/:type` - Download files

### Render Backend (https://indiantranslator-backend.onrender.com)
- `/api/tts` - Text-to-speech (voice)
- `/api/input-tools` - Transliteration
- `/health` - Health check

## Environment Variables

### Frontend (.env)

```env
# AWS Configuration
VITE_AWS_REGION=ap-south-1
VITE_AWS_ACCESS_KEY_ID=<your-key>
VITE_AWS_SECRET_ACCESS_KEY=<your-secret>

# Backend URLs - Hybrid Setup
# Document translations use EC2 (heavy processing)
VITE_BACKEND_URL_DOCUMENTS=http://35.154.52.155:3001
# Voice/text translations use Render (lightweight)
VITE_BACKEND_URL_VOICE=https://indiantranslator-backend.onrender.com
# Default backend (for backward compatibility)
VITE_BACKEND_URL=http://35.154.52.155:3001

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_Z2VuZXJvdXMtbWl0ZS02Ny5jbGVyay5hY2NvdW50cy5kZXYk
```

### Backend - EC2 (backend/.env)

```env
# AWS Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
S3_BUCKET_NAME=indiantranslator-documents

# Server Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=production

# CORS Configuration
CORS_ORIGIN=https://indian-translator-five.vercel.app,https://indiantranslator-backend.onrender.com
```

### Backend - Render (Environment Variables in Dashboard)

```
NODE_ENV=production
PORT=10000
HOST=0.0.0.0
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
S3_BUCKET_NAME=indiantranslator-documents
CORS_ORIGIN=https://indian-translator-five.vercel.app,http://35.154.52.155:3001
```

## Deployment Steps

### Step 1: Deploy Render Backend (Voice/Text)

1. Follow `RENDER_QUICKSTART.md`
2. Deploy to Render
3. Get your Render URL: `https://indiantranslator-backend.onrender.com`
4. Test health endpoint: `https://indiantranslator-backend.onrender.com/health`

### Step 2: Update Frontend Environment

Update `.env`:
```env
VITE_BACKEND_URL_DOCUMENTS=http://35.154.52.155:3001
VITE_BACKEND_URL_VOICE=https://indiantranslator-backend.onrender.com
VITE_BACKEND_URL=http://35.154.52.155:3001
```

### Step 3: Update CORS on Both Backends

**EC2 backend/.env:**
```env
CORS_ORIGIN=https://indian-translator-five.vercel.app,https://indiantranslator-backend.onrender.com
```

**Render Environment Variables:**
```
CORS_ORIGIN=https://indian-translator-five.vercel.app,http://35.154.52.155:3001
```

### Step 4: Deploy Frontend

```bash
git add .
git commit -m "Configure hybrid backend deployment"
git push origin main
```

Vercel will auto-deploy.

### Step 5: Test Everything

#### Test Document Translation (EC2):
1. Go to https://indian-translator-five.vercel.app
2. Upload a document
3. Translate it
4. Check browser console - should show EC2 URL

#### Test Voice Translation (Render):
1. Click microphone icon
2. Speak something
3. Check browser console - should show Render URL

#### Test History (EC2):
1. Go to History page
2. Should load from EC2
3. Download/delete should work

## Service Mapping

### Frontend Services Updated:

1. **`src/services/historyService.ts`**
   - Uses: `VITE_BACKEND_URL_DOCUMENTS` (EC2)
   - Reason: History stored on EC2 S3

2. **`src/services/speechService.ts`**
   - Uses: `VITE_BACKEND_URL_VOICE` (Render)
   - Reason: Lightweight, needs always-on

3. **`src/services/translationService.ts`**
   - Uses: `VITE_BACKEND_URL_VOICE` (Render)
   - Reason: Text operations are lightweight

4. **`src/services/documentService.ts`**
   - Uses: Default (EC2 via backend API)
   - Reason: Heavy document processing

## Benefits of Hybrid Approach

### EC2 for Documents:
✅ Heavy processing power for OCR  
✅ Large file handling  
✅ S3 storage integration  
✅ No cold starts for document processing  

### Render for Voice/Text:
✅ Always-on (no cold starts)  
✅ Free tier available  
✅ Auto-scaling  
✅ HTTPS by default  
✅ Easy deployment  

## Cost Analysis

### Current Setup:
- EC2: ~$30/month (or free tier)
- Render Free: $0/month (with cold starts)
- **Total: ~$30/month**

### Recommended Setup:
- EC2: ~$30/month (or free tier)
- Render Starter: $7/month (no cold starts)
- **Total: ~$37/month**

### Benefits:
- Voice features always responsive
- No cold start delays for text translation
- Document processing stays on powerful EC2
- Better user experience overall

## Monitoring

### Check EC2 Status:
```bash
curl http://35.154.52.155:3001/health
```

### Check Render Status:
```bash
curl https://indiantranslator-backend.onrender.com/health
```

### Frontend Logs:
- Open browser console
- Look for backend URL logs
- Verify correct backend is being used

## Troubleshooting

### Issue: Voice not working
**Check:**
1. Render backend is running
2. `VITE_BACKEND_URL_VOICE` is set correctly
3. CORS includes frontend URL

### Issue: Document translation not working
**Check:**
1. EC2 backend is running
2. `VITE_BACKEND_URL_DOCUMENTS` is set correctly
3. AWS credentials are valid

### Issue: History not loading
**Check:**
1. EC2 backend is running
2. S3 bucket is accessible
3. User email is correct

### Issue: CORS errors
**Solution:**
Add all URLs to CORS_ORIGIN on both backends:
```
CORS_ORIGIN=https://indian-translator-five.vercel.app,https://indiantranslator-backend.onrender.com,http://35.154.52.155:3001
```

## Rollback Plan

If issues occur:

1. **Immediate**: Set all backend URLs to EC2:
   ```env
   VITE_BACKEND_URL_DOCUMENTS=http://35.154.52.155:3001
   VITE_BACKEND_URL_VOICE=http://35.154.52.155:3001
   VITE_BACKEND_URL=http://35.154.52.155:3001
   ```

2. **Redeploy**: Push to GitHub, Vercel auto-deploys

3. **Investigate**: Check Render logs for issues

4. **Fix**: Update code and redeploy

## Future Improvements

1. **Add Load Balancer**: Distribute EC2 load
2. **Add Redis Cache**: Cache translations
3. **Add CDN**: Faster static asset delivery
4. **Add Monitoring**: Uptime monitoring for both backends
5. **Add Backup**: Automated S3 backups

## Support

- **EC2 Issues**: Check AWS Console, CloudWatch logs
- **Render Issues**: Check Render Dashboard logs
- **Frontend Issues**: Check browser console
- **CORS Issues**: Verify CORS_ORIGIN on both backends

---

**Status**: Ready for Deployment  
**Last Updated**: March 2026  
**Architecture**: Hybrid (EC2 + Render)
