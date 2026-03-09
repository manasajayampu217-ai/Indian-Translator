# Render Deployment Checklist

Use this checklist to ensure a smooth deployment to Render.

## Pre-Deployment

- [ ] AWS credentials ready (Access Key ID and Secret Key)
- [ ] S3 bucket exists: `indiantranslator-documents`
- [ ] Code pushed to GitHub main branch
- [ ] All environment variables documented

## Render Setup

- [ ] Created Render account at https://render.com
- [ ] Connected GitHub account to Render
- [ ] Repository access granted to Render

## Service Configuration

- [ ] Created new Web Service
- [ ] Selected correct repository: `Indian-Translator`
- [ ] Set Name: `indiantranslator-backend`
- [ ] Set Region: (your choice, e.g., Singapore)
- [ ] Set Branch: `main`
- [ ] Set Build Command: `cd backend && npm install`
- [ ] Set Start Command: `cd backend && npm start`

## Environment Variables

Add these in Render dashboard:

- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `10000`
- [ ] `HOST` = `0.0.0.0`
- [ ] `AWS_REGION` = `ap-south-1`
- [ ] `AWS_ACCESS_KEY_ID` = `<your-key>`
- [ ] `AWS_SECRET_ACCESS_KEY` = `<your-secret>`
- [ ] `S3_BUCKET_NAME` = `indiantranslator-documents`
- [ ] `CORS_ORIGIN` = `https://indian-translator-five.vercel.app`

## Deployment

- [ ] Clicked "Create Web Service"
- [ ] Waited for build to complete (2-5 minutes)
- [ ] Deployment successful (green checkmark)
- [ ] Copied Render URL: `https://indiantranslator-backend.onrender.com`

## Testing

Test each endpoint:

- [ ] Health check: `https://your-app.onrender.com/health`
  - Expected: `{"status":"ok","message":"IndianTranslator Backend is running"}`

- [ ] Text translation works
- [ ] Document upload works
- [ ] History retrieval works
- [ ] File download works
- [ ] File delete works

## Frontend Update

- [ ] Updated `.env` with new backend URL:
  ```env
  VITE_BACKEND_URL=https://indiantranslator-backend.onrender.com
  ```
- [ ] Committed changes to Git
- [ ] Pushed to GitHub
- [ ] Vercel auto-deployed frontend
- [ ] Tested frontend with new backend

## Verification

- [ ] Frontend can connect to backend
- [ ] No CORS errors in browser console
- [ ] Translation features work end-to-end
- [ ] Document upload and download work
- [ ] History page loads correctly
- [ ] No errors in Render logs

## Post-Deployment

- [ ] Monitored logs for 1 hour
- [ ] Tested from different devices
- [ ] Verified AWS charges (should be minimal)
- [ ] Updated documentation with new URL
- [ ] Notified team/users of new backend

## Optional: EC2 Cleanup

After 1 week of stable operation:

- [ ] Verified Render is working perfectly
- [ ] No issues reported
- [ ] Stopped EC2 instance (don't terminate yet)
- [ ] Monitored for 1 more week
- [ ] If all good, terminate EC2 instance
- [ ] Released Elastic IP (if any)
- [ ] Updated all documentation

## Troubleshooting

If issues occur:

- [ ] Check Render logs in dashboard
- [ ] Verify environment variables are set correctly
- [ ] Test AWS credentials locally
- [ ] Check CORS configuration
- [ ] Review error messages
- [ ] Consult `backend/RENDER_DEPLOY.md`

## Rollback (If Needed)

- [ ] Change frontend `.env` back to EC2 URL
- [ ] Redeploy frontend on Vercel
- [ ] Investigate Render issues
- [ ] Fix and retry deployment

---

## Quick Reference

**Render Dashboard**: https://dashboard.render.com  
**Your Service**: https://dashboard.render.com/web/[your-service-id]  
**Logs**: Click "Logs" tab in your service  
**Metrics**: Click "Metrics" tab in your service  

**Frontend URL**: https://indian-translator-five.vercel.app  
**Backend URL (EC2)**: http://35.154.52.155:3001  
**Backend URL (Render)**: https://indiantranslator-backend.onrender.com  

---

**Status**: [ ] Not Started | [ ] In Progress | [ ] Completed  
**Date Started**: _______________  
**Date Completed**: _______________  
**Deployed By**: _______________
