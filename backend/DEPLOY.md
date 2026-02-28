# Backend Deployment on AWS EC2 Windows

## Quick Deploy Commands

```powershell
# 1. Install Node.js
winget install OpenJS.NodeJS.LTS --source winget

# 2. Navigate to backend
cd C:\Users\Administrator\Indian-Translator\backend

# 3. Install dependencies
npm install

# 4. Configure environment
copy .env.example .env
notepad .env

# 5. Open firewall
netsh advfirewall firewall add rule name="Backend API 3001" dir=in action=allow protocol=TCP localport=3001

# 6. Run server
node server.js
```

---

## Detailed Setup Guide

### Step 1: Install Node.js

```powershell
winget install OpenJS.NodeJS.LTS --source winget
```

Verify installation:
```powershell
node -v
npm -v
```

### Step 2: Clone/Setup Project

If using Git:
```powershell
cd C:\Users\Administrator
git clone https://github.com/manasajayampu217-ai/Indian-Translator.git
cd Indian-Translator\backend
```

Or if files are already on EC2:
```powershell
cd C:\Users\Administrator\Indian-Translator\backend
```

### Step 3: Install Dependencies

```powershell
npm install
```

This will install all required packages including:
- Express (web server)
- AWS SDK (Textract, Translate, S3)
- PDF processing libraries
- Image processing libraries

### Step 4: Configure Environment Variables

Create `.env` file from example:
```powershell
copy .env.example .env
notepad .env
```

Edit `.env` with your actual values:
```env
# Server Configuration
PORT=3001
HOST=0.0.0.0

# AWS Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=indiantranslator-documents

# Google Cloud (optional - for Text-to-Speech)
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

**Important:** Replace with your actual AWS credentials from AWS IAM Console.

### Step 5: Configure AWS Security Group

1. Go to AWS Console → EC2 → Security Groups
2. Select your instance's security group
3. Click "Edit inbound rules"
4. Add rule:
   - Type: Custom TCP
   - Port: 3001
   - Source: 0.0.0.0/0 (or restrict to specific IPs)
5. Save rules

### Step 6: Open Windows Firewall

```powershell
netsh advfirewall firewall add rule name="Backend API 3001" dir=in action=allow protocol=TCP localport=3001
```

Verify the rule:
```powershell
netsh advfirewall firewall show rule name="Backend API 3001"
```

### Step 7: Test the Server

Run the server:
```powershell
node server.js
```

You should see:
```
🚀 IndianTranslator Backend running on 0.0.0.0:3001
📝 Health check: http://localhost:3001/health
🌐 Public access: http://YOUR_PUBLIC_IP:3001/health
```

Test locally:
```powershell
curl http://localhost:3001/health
```

Expected response:
```json
{"status":"ok","message":"IndianTranslator Backend is running"}
```

### Step 8: Test External Access

Get your EC2 public IP:
```powershell
curl http://checkip.amazonaws.com
```

From your local computer (not EC2), test:
```bash
curl http://YOUR_EC2_PUBLIC_IP:3001/health
```

---

## Keep Server Running (Production)

### Option 1: NSSM (Recommended)

NSSM (Non-Sucking Service Manager) creates a Windows Service.

**Install NSSM:**
```powershell
# Using Chocolatey
choco install nssm

# Or download from https://nssm.cc/download
```

**Create Service:**
```powershell
# Install service
nssm install IndianTranslatorBackend "C:\Program Files\nodejs\node.exe" "C:\Users\Administrator\Indian-Translator\backend\server.js"

# Set working directory
nssm set IndianTranslatorBackend AppDirectory "C:\Users\Administrator\Indian-Translator\backend"

# Set environment file
nssm set IndianTranslatorBackend AppEnvironmentExtra "NODE_ENV=production"

# Start service
nssm start IndianTranslatorBackend
```

**Manage Service:**
```powershell
# Check status
nssm status IndianTranslatorBackend

# Stop service
nssm stop IndianTranslatorBackend

# Restart service
nssm restart IndianTranslatorBackend

# Remove service
nssm remove IndianTranslatorBackend confirm
```

**View Logs:**
```powershell
# Set log file location
nssm set IndianTranslatorBackend AppStdout "C:\Users\Administrator\Indian-Translator\backend\logs\output.log"
nssm set IndianTranslatorBackend AppStderr "C:\Users\Administrator\Indian-Translator\backend\logs\error.log"

# Restart to apply
nssm restart IndianTranslatorBackend

# View logs
Get-Content "C:\Users\Administrator\Indian-Translator\backend\logs\output.log" -Tail 50 -Wait
```

### Option 2: Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Name: "Indian Translator Backend"
4. Trigger: At startup
5. Action: Start a program
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `server.js`
   - Start in: `C:\Users\Administrator\Indian-Translator\backend`
6. Finish

### Option 3: PowerShell Background Job

```powershell
# Start as background job
Start-Job -ScriptBlock {
  Set-Location "C:\Users\Administrator\Indian-Translator\backend"
  node server.js
}

# Check jobs
Get-Job

# View output
Receive-Job -Id 1 -Keep

# Stop job
Stop-Job -Id 1
Remove-Job -Id 1
```

### Option 4: Start Command (Simple)

```powershell
# Run in new window
start "Backend Server" node server.js

# Or run in background (closes with terminal)
start /B node server.js
```

---

## Troubleshooting

### Server won't start

**Check Node.js:**
```powershell
node -v
npm -v
```

**Check dependencies:**
```powershell
npm install
```

**Check .env file:**
```powershell
type .env
```

### Port already in use

**Find process using port 3001:**
```powershell
netstat -ano | findstr :3001
```

**Kill process:**
```powershell
# Replace PID with actual process ID from above
taskkill /PID <PID> /F
```

### Can't access from outside

**Check Windows Firewall:**
```powershell
netsh advfirewall firewall show rule name="Backend API 3001"
```

**Check if server is listening on 0.0.0.0:**
```powershell
netstat -ano | findstr :3001
# Should show: 0.0.0.0:3001 or [::]:3001
```

**Check AWS Security Group:**
- Ensure port 3001 is open in EC2 Security Group

**Test from EC2:**
```powershell
curl http://localhost:3001/health
```

**Get public IP:**
```powershell
curl http://checkip.amazonaws.com
```

### AWS credentials not working

**Verify credentials in .env:**
```powershell
type .env
```

**Test AWS access:**
```powershell
# Install AWS CLI
winget install Amazon.AWSCLI

# Configure
aws configure

# Test
aws s3 ls
```

### Server crashes

**Check logs:**
```powershell
# If using NSSM with logs
Get-Content "C:\Users\Administrator\Indian-Translator\backend\logs\error.log" -Tail 50
```

**Run in foreground to see errors:**
```powershell
node server.js
```

---

## Update Deployment

When you need to update the code:

```powershell
# 1. Stop the server
nssm stop IndianTranslatorBackend
# Or if running manually: Ctrl+C

# 2. Pull latest changes
cd C:\Users\Administrator\Indian-Translator
git pull

# 3. Install new dependencies (if any)
cd backend
npm install

# 4. Restart server
nssm start IndianTranslatorBackend
# Or: node server.js
```

---

## Monitoring

### Check if server is running

```powershell
# Check process
Get-Process node

# Check port
netstat -ano | findstr :3001

# Test endpoint
curl http://localhost:3001/health
```

### View logs (if using NSSM)

```powershell
# Real-time logs
Get-Content "C:\Users\Administrator\Indian-Translator\backend\logs\output.log" -Tail 50 -Wait

# Error logs
Get-Content "C:\Users\Administrator\Indian-Translator\backend\logs\error.log" -Tail 50
```

### Performance monitoring

```powershell
# CPU and memory usage
Get-Process node | Select-Object CPU, WorkingSet, ProcessName

# Detailed info
Get-Process node | Format-List *
```

---

## Security Best Practices

1. **Never commit .env file** - Already in .gitignore
2. **Restrict Security Group** - Only allow necessary IPs
3. **Use IAM roles** - Instead of hardcoded credentials (advanced)
4. **Enable HTTPS** - Use reverse proxy like IIS or nginx
5. **Regular updates** - Keep Node.js and packages updated
6. **Monitor logs** - Check for suspicious activity

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 3001 | Server port |
| HOST | No | 0.0.0.0 | Server host (0.0.0.0 = all interfaces) |
| AWS_REGION | Yes | ap-south-1 | AWS region |
| AWS_ACCESS_KEY_ID | Yes | - | AWS access key |
| AWS_SECRET_ACCESS_KEY | Yes | - | AWS secret key |
| AWS_S3_BUCKET | Yes | - | S3 bucket name |
| GOOGLE_APPLICATION_CREDENTIALS | No | - | Google Cloud credentials path |

---

## API Endpoints

Once deployed, your backend will have these endpoints:

- `GET /health` - Health check
- `POST /api/translate-document` - Translate PDF/image
- `POST /api/convert-document` - Convert document formats
- `GET /api/history/:userEmail` - Get translation history
- `POST /api/history/text` - Save text translation
- `POST /api/history/document` - Save document translation
- `DELETE /api/history/:userEmail/:timestamp` - Delete history item
- `GET /api/download/:userEmail/:timestamp/:type` - Download file

---

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs
3. Verify AWS credentials and permissions
4. Ensure all ports are open (Windows Firewall + AWS Security Group)
5. Test locally first, then externally

---

## Production Checklist

- [ ] Node.js installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured with real credentials
- [ ] AWS Security Group port 3001 open
- [ ] Windows Firewall port 3001 open
- [ ] Server starts successfully (`node server.js`)
- [ ] Health check works locally (`curl http://localhost:3001/health`)
- [ ] Health check works externally (`curl http://PUBLIC_IP:3001/health`)
- [ ] NSSM service installed and running
- [ ] Logs directory created and writable
- [ ] Server auto-starts on reboot
