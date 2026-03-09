# Quick Start: Deploy to Render in 5 Minutes

## Step 1: Push to GitHub (if not already done)

```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

## Step 2: Create Render Account

Go to https://render.com and sign up (free)

## Step 3: Create New Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub account
3. Select repository: `Indian-Translator`
4. Click "Connect"

## Step 4: Configure Service

**Basic Settings:**
- Name: `indiantranslator-backend`
- Region: `Singapore` (or closest to you)
- Branch: `main`
- Build Command: `cd backend && npm install`
- Start Command: `cd backend && npm start`

**Environment Variables** (click "Add Environment Variable"):

```
NODE_ENV=production
PORT=10000
HOST=0.0.0.0
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<your-aws-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret>
S3_BUCKET_NAME=indiantranslator-documents
CORS_ORIGIN=https://indian-translator-five.vercel.app
```

## Step 5: Deploy

Click "Create Web Service" and wait 2-5 minutes.

## Step 6: Get Your URL

After deployment, copy your URL:
```
https://indiantranslator-backend.onrender.com
```

## Step 7: Update Frontend

Update `.env` in your frontend:
```env
VITE_BACKEND_URL=https://indiantranslator-backend.onrender.com
```

Redeploy frontend on Vercel.

## Step 8: Test

Visit: `https://indiantranslator-backend.onrender.com/health`

You should see:
```json
{"status":"ok","message":"IndianTranslator Backend is running"}
```

## Done! 🎉

Your backend is now live on Render!

---

**Note**: Free tier has cold starts (30-60s first request after 15min inactivity).  
Upgrade to Starter ($7/mo) for always-on service.

**Full Guide**: See `backend/RENDER_DEPLOY.md` for detailed instructions.
