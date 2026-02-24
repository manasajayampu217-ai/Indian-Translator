# Pre-Deployment Checklist

## ✅ Code Ready
- [x] All features implemented
- [x] Translation service working (English, Hindi, Tamil, Telugu)
- [x] Voice translation working
- [x] Document translation working
- [x] Conversions feature working
- [x] History feature with S3 storage
- [x] No console errors
- [x] All test files removed
- [x] Documentation cleaned up

## ✅ Configuration Ready
- [x] `.env.example` files present
- [x] `.gitignore` updated (excludes .env files)
- [x] Build scripts configured
- [x] Backend server configured
- [x] PM2 ecosystem file ready

## ⚠️ Before Deployment - YOU MUST DO

### 1. Remove Actual .env Files from Git
```bash
# Make sure .env files are not tracked
git rm --cached .env
git rm --cached backend/.env
git commit -m "Remove .env files from tracking"
```

### 2. Update .env.example Files
Make sure `.env.example` and `backend/.env.example` have placeholder values, not real credentials.

### 3. Create Production Environment Variables
On EC2, create new `.env` files with production values:
- Production AWS credentials
- Production S3 bucket
- Production backend URL (your domain)

### 4. Update Backend URL
In frontend `.env` on EC2:
```env
VITE_BACKEND_URL=https://your-domain.com/api
```

## 📋 Deployment Steps

1. **Setup EC2 Instance**
   - Ubuntu 20.04+
   - Node.js 18+
   - PM2 installed
   - Nginx installed

2. **Clone Repository**
   ```bash
   git clone your-repo-url
   cd indiantranslator
   ```

3. **Install Dependencies**
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

4. **Configure Environment**
   - Create `.env` with production values
   - Create `backend/.env` with production values

5. **Build Frontend**
   ```bash
   npm run build
   ```

6. **Start Backend**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   ```

7. **Configure Nginx**
   - Copy config from DEPLOYMENT.md
   - Enable site
   - Restart Nginx

8. **Setup SSL (Optional)**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

## 🔒 Security Checklist

- [ ] .env files NOT in git repository
- [ ] AWS credentials are production credentials (not development)
- [ ] S3 bucket has proper permissions
- [ ] EC2 security group allows only ports 22, 80, 443
- [ ] SSH key is secure
- [ ] Nginx configured with proper headers
- [ ] SSL certificate installed (recommended)

## 🧪 Testing After Deployment

1. **Frontend Loads**
   - Visit http://your-domain.com
   - Check all pages load

2. **Text Translation Works**
   - Test English → Telugu
   - Test Tamil → Telugu (Romanized)
   - Test Hindi → English

3. **Voice Translation Works**
   - Test speaking in English
   - Test speaking in Tamil/Telugu

4. **Document Translation Works**
   - Upload a test PDF
   - Verify translation completes

5. **Conversions Work**
   - Test PDF → Word
   - Test Image → PDF

## 📊 Monitoring

After deployment, monitor:
- PM2 status: `pm2 status`
- Backend logs: `pm2 logs indiantranslator-backend`
- Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- AWS costs (Translate, Transcribe, Textract, S3)

## 🚀 Ready to Deploy?

If all checkboxes above are checked, you're ready to deploy!

Follow the detailed steps in `DEPLOYMENT.md`.

## ⚠️ CRITICAL: Before Git Push

**DO NOT PUSH .env FILES TO GIT!**

Check what will be committed:
```bash
git status
```

If you see `.env` or `backend/.env`, remove them:
```bash
git rm --cached .env
git rm --cached backend/.env
```

Then commit and push:
```bash
git add .
git commit -m "Ready for deployment"
git push
```
