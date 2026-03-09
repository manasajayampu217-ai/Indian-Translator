# Deploying IndianTranslator Backend to Render

This guide will help you deploy the IndianTranslator backend to Render.com.

## Prerequisites

1. A Render account (sign up at https://render.com)
2. Your GitHub repository connected to Render
3. AWS credentials (Access Key ID and Secret Access Key)
4. AWS S3 bucket created (indiantranslator-documents)

## Step 1: Prepare Your Repository

Make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

## Step 2: Create a New Web Service on Render

1. Go to https://dashboard.render.com
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Select the repository: `Indian-Translator`

## Step 3: Configure the Web Service

### Basic Settings:
- **Name**: `indiantranslator-backend`
- **Region**: Choose closest to your users (e.g., Singapore, Oregon)
- **Branch**: `main`
- **Root Directory**: Leave empty (Render will use the root)
- **Runtime**: `Node`
- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npm start`

### Instance Type:
- **Free** (for testing) or **Starter** (for production)

## Step 4: Add Environment Variables

In the "Environment" section, add these variables:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `PORT` | `10000` | Render default port |
| `HOST` | `0.0.0.0` | Required for Render |
| `AWS_REGION` | `ap-south-1` | Your AWS region |
| `AWS_ACCESS_KEY_ID` | `your_key_here` | From AWS IAM |
| `AWS_SECRET_ACCESS_KEY` | `your_secret_here` | From AWS IAM |
| `S3_BUCKET_NAME` | `indiantranslator-documents` | Your S3 bucket |
| `CORS_ORIGIN` | `https://indian-translator-five.vercel.app` | Your frontend URL |

**Important**: Keep your AWS credentials secure. Never commit them to Git.

## Step 5: Deploy

1. Click "Create Web Service"
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Start your server
3. Wait for the deployment to complete (usually 2-5 minutes)

## Step 6: Get Your Backend URL

After deployment, Render will provide a URL like:
```
https://indiantranslator-backend.onrender.com
```

## Step 7: Update Frontend Configuration

Update your frontend `.env` file with the new backend URL:

```env
VITE_BACKEND_URL=https://indiantranslator-backend.onrender.com
```

Then redeploy your frontend on Vercel.

## Step 8: Update CORS Configuration

If you need to add more origins, update the `CORS_ORIGIN` environment variable in Render:

```
https://indian-translator-five.vercel.app,https://your-custom-domain.com
```

## Testing Your Deployment

1. Check the health endpoint:
   ```
   https://indiantranslator-backend.onrender.com/health
   ```

2. You should see:
   ```json
   {
     "status": "ok",
     "message": "IndianTranslator Backend is running"
   }
   ```

## Monitoring and Logs

- View logs in the Render dashboard under "Logs" tab
- Monitor performance under "Metrics" tab
- Set up alerts for downtime

## Important Notes

### Free Tier Limitations:
- Service spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds (cold start)
- 750 hours/month free (enough for one service)

### Upgrading to Paid Plan:
- No cold starts
- Better performance
- More memory and CPU
- Custom domains
- Starting at $7/month

## Troubleshooting

### Issue: "Module not found" errors
**Solution**: Make sure `package.json` includes all dependencies

### Issue: "Port already in use"
**Solution**: Render automatically sets PORT=10000, don't hardcode it

### Issue: "AWS credentials not configured"
**Solution**: Double-check environment variables in Render dashboard

### Issue: "CORS errors"
**Solution**: Update CORS_ORIGIN to include your frontend URL

### Issue: Cold starts on free tier
**Solution**: 
- Upgrade to paid plan, or
- Use a service like UptimeRobot to ping your backend every 5 minutes

## Automatic Deployments

Render automatically redeploys when you push to your main branch:

```bash
git add .
git commit -m "Update backend"
git push origin main
```

## Custom Domain (Optional)

1. Go to "Settings" in your Render service
2. Click "Add Custom Domain"
3. Follow instructions to configure DNS

## Backup Strategy

- AWS S3 already provides 99.999999999% durability
- Enable S3 versioning for additional protection
- Consider setting up automated backups

## Performance Optimization

1. **Enable HTTP/2**: Automatically enabled on Render
2. **Use CDN**: Render includes CDN for static assets
3. **Optimize Images**: Already implemented in your code
4. **Database Connection Pooling**: Consider if you add a database

## Security Checklist

- ✅ Environment variables stored securely in Render
- ✅ HTTPS enabled by default
- ✅ CORS configured properly
- ✅ AWS IAM permissions set to minimum required
- ✅ No sensitive data in logs
- ✅ Rate limiting implemented

## Cost Estimation

### Free Tier:
- Backend: $0/month (with cold starts)
- Total: $0/month

### Production Setup:
- Backend (Starter): $7/month
- Total: $7/month

## Support

- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com
- AWS Documentation: https://docs.aws.amazon.com

---

**Last Updated**: March 2026  
**Deployment Status**: Ready for Production
