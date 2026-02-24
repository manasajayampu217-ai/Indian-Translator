# EC2 Deployment Guide for IndianTranslator

## Prerequisites

- AWS EC2 instance (Ubuntu 20.04 or later recommended)
- Node.js 18+ installed
- PM2 for process management
- Nginx for reverse proxy
- Domain name (optional, but recommended)

## Step 1: Prepare EC2 Instance

### 1.1 Connect to EC2
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 1.2 Update System
```bash
sudo apt update
sudo apt upgrade -y
```

### 1.3 Install Node.js 18+
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should be 18+
npm --version
```

### 1.4 Install PM2
```bash
sudo npm install -g pm2
```

### 1.5 Install Nginx
```bash
sudo apt install -y nginx
```

## Step 2: Clone and Setup Application

### 2.1 Clone Repository
```bash
cd /home/ubuntu
git clone your-repo-url indiantranslator
cd indiantranslator
```

### 2.2 Install Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

### 2.3 Configure Environment Variables

**Frontend `.env`:**
```bash
nano .env
```
```env
VITE_AWS_REGION=ap-south-1
VITE_AWS_ACCESS_KEY_ID=your_access_key
VITE_AWS_SECRET_ACCESS_KEY=your_secret_key
VITE_BACKEND_URL=http://your-domain.com/api
```

**Backend `backend/.env`:**
```bash
nano backend/.env
```
```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name
PORT=3001
```

### 2.4 Build Frontend
```bash
npm run build
```

This creates a `dist` folder with production-ready files.

## Step 3: Configure PM2

### 3.1 Create PM2 Ecosystem File
```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'indiantranslator-backend',
      cwd: '/home/ubuntu/indiantranslator/backend',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
```

### 3.2 Start Backend with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3.3 Check Status
```bash
pm2 status
pm2 logs indiantranslator-backend
```

## Step 4: Configure Nginx

### 4.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/indiantranslator
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or EC2 IP

    # Frontend (React build)
    location / {
        root /home/ubuntu/indiantranslator/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeouts for large file uploads
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    # Increase max body size for file uploads
    client_max_body_size 50M;
}
```

### 4.2 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/indiantranslator /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

## Step 5: Configure Firewall

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS (if using SSL)
sudo ufw enable
```

## Step 6: Setup SSL (Optional but Recommended)

### 6.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Get SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com
```

### 6.3 Auto-renewal
```bash
sudo certbot renew --dry-run
```

## Step 7: Update Backend URL in Frontend

After deployment, update the frontend `.env` to use your domain:

```env
VITE_BACKEND_URL=https://your-domain.com/api
```

Then rebuild:
```bash
npm run build
```

## Deployment Checklist

- [ ] EC2 instance running
- [ ] Node.js 18+ installed
- [ ] PM2 installed
- [ ] Nginx installed
- [ ] Repository cloned
- [ ] Dependencies installed (frontend + backend)
- [ ] Environment variables configured
- [ ] Frontend built (`npm run build`)
- [ ] Backend running with PM2
- [ ] Nginx configured and running
- [ ] Firewall configured
- [ ] SSL certificate installed (optional)
- [ ] DNS pointing to EC2 IP (if using domain)

## Useful Commands

### PM2 Management
```bash
pm2 status                    # Check status
pm2 logs indiantranslator-backend  # View logs
pm2 restart indiantranslator-backend  # Restart
pm2 stop indiantranslator-backend     # Stop
pm2 delete indiantranslator-backend   # Remove
```

### Nginx Management
```bash
sudo systemctl status nginx   # Check status
sudo systemctl restart nginx  # Restart
sudo nginx -t                 # Test config
sudo tail -f /var/log/nginx/error.log  # View errors
```

### Update Application
```bash
cd /home/ubuntu/indiantranslator
git pull
npm install
npm run build
cd backend
npm install
cd ..
pm2 restart indiantranslator-backend
```

## Troubleshooting

### Backend Not Starting
```bash
pm2 logs indiantranslator-backend
# Check for errors in environment variables or missing dependencies
```

### Frontend Not Loading
```bash
sudo tail -f /var/log/nginx/error.log
# Check Nginx configuration and file permissions
```

### API Calls Failing
- Check VITE_BACKEND_URL in frontend `.env`
- Verify Nginx proxy configuration
- Check backend logs: `pm2 logs indiantranslator-backend`

### File Upload Issues
- Check `client_max_body_size` in Nginx config
- Verify backend has write permissions for uploads folder

## Security Recommendations

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use IAM roles** instead of hardcoded AWS credentials (if possible)
3. **Enable HTTPS** with SSL certificate
4. **Keep dependencies updated**: `npm audit fix`
5. **Use strong passwords** for EC2 access
6. **Restrict security groups** to only necessary ports
7. **Regular backups** of application and database

## Performance Optimization

1. **Enable Gzip** in Nginx for faster loading
2. **Use CDN** for static assets (optional)
3. **Monitor with PM2**: `pm2 monit`
4. **Set up log rotation** to prevent disk space issues
5. **Use AWS CloudWatch** for monitoring

## Cost Optimization

- Use **t3.small** or **t3.medium** instance (sufficient for moderate traffic)
- Enable **auto-scaling** if traffic varies
- Use **S3** for document storage (already implemented)
- Monitor **AWS costs** regularly

## Support

For issues:
1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check browser console (F12)
4. Verify environment variables are correct
