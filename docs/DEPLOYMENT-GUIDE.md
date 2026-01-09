# 🚀 Deployment Guide

Complete guide for deploying NextRole to production.

---

## 📋 Prerequisites

Before deploying, ensure you have:

- ✅ MySQL 8.0+ database (cloud or self-hosted)
- ✅ Domain name with DNS access
- ✅ SSL certificate (Let's Encrypt recommended)
- ✅ Stripe account (live mode)
- ✅ OAuth apps configured (Google, GitHub, LinkedIn)
- ✅ Email service (SendGrid or SMTP)
- ✅ Server with Docker and Docker Compose installed

---

## 🐳 Option 1: Docker Deployment (Recommended)

### Step 1: Clone and Configure

```bash
# On your server
git clone https://github.com/chrisrobison/nextrole.git
cd nextrole

# Copy environment file
cp .env.example .env

# Edit .env with production values
nano .env
```

### Step 2: Required Environment Variables

```env
# Critical Production Settings
NODE_ENV=production
USE_MONETIZATION=true
APP_URL=https://yourdomain.com

# Database
MYSQL_HOST=your-mysql-host
MYSQL_USER=your-mysql-user
MYSQL_PASSWORD=your-secure-password
MYSQL_DATABASE=nextrole

# Stripe (LIVE keys!)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...

# JWT (Generate secure secret!)
JWT_SECRET=$(openssl rand -base64 32)

# OAuth Production URLs
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/oauth/google/callback
GITHUB_CALLBACK_URL=https://yourdomain.com/api/oauth/github/callback
LINKEDIN_CALLBACK_URL=https://yourdomain.com/api/oauth/linkedin/callback
OAUTH_SUCCESS_REDIRECT=https://yourdomain.com/dashboard

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your-key
EMAIL_FROM=noreply@yourdomain.com

# Admin
ADMIN_EMAIL=your@email.com
```

### Step 3: Initialize Database

```bash
# Import schema
mysql -h your-mysql-host -u user -p nextrole < server/db/mysql-schema.sql

# Verify
mysql -h your-mysql-host -u user -p nextrole -e "SHOW TABLES;"
```

### Step 4: Build and Start Services

```bash
# Build Docker images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Verify health
curl https://yourdomain.com/health
```

### Step 5: Setup Nginx Reverse Proxy (Optional)

Create `/etc/nginx/sites-available/jobtool`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Marketing site
    location /marketing {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static files cache
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/jobtool /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## ☁️ Option 2: Cloud Platform Deployment

### Heroku

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create jobtool-prod

# Add MySQL addon
heroku addons:create jawsdb:kitefin

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set USE_MONETIZATION=true
heroku config:set STRIPE_SECRET_KEY=sk_live_...
# ... set all other vars

# Deploy
git push heroku main

# Run migrations
heroku run node server/scripts/migrate-sqlite-to-mysql.js

# Open app
heroku open
```

### DigitalOcean App Platform

1. **Create App:**
   - Go to App Platform
   - Connect your GitHub repository
   - Select branch: `main`

2. **Configure Build:**
   - Build Command: `npm install && npm run build`
   - Run Command: `node server/index.js`

3. **Add Environment Variables:**
   - Add all variables from `.env.example`
   - Use DigitalOcean Managed MySQL for database

4. **Deploy:**
   - Click "Deploy"
   - Monitor deployment logs

### AWS ECS (Elastic Container Service)

1. **Push images to ECR:**
```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com

docker build -t jobtool .
docker tag jobtool:latest your-account.dkr.ecr.us-east-1.amazonaws.com/jobtool:latest
docker push your-account.dkr.ecr.us-east-1.amazonaws.com/jobtool:latest
```

2. **Create ECS Task Definition:**
   - Container: `jobtool`
   - Image: ECR image URI
   - Port mappings: 3000
   - Environment variables: From `.env`

3. **Create ECS Service:**
   - Cluster: Create or use existing
   - Service type: Application Load Balancer
   - Configure auto-scaling

---

## 🔒 SSL Certificate Setup

### Let's Encrypt (Free)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already set up by certbot)
sudo certbot renew --dry-run
```

---

## 📊 Monitoring Setup

### Sentry Error Tracking

1. Create Sentry account: https://sentry.io
2. Create new project
3. Copy DSN
4. Add to `.env`:
```env
SENTRY_DSN=https://...@sentry.io/...
```

### Health Checks

Set up uptime monitoring (UptimeRobot, Pingdom, etc.):

- Endpoint: `https://yourdomain.com/health`
- Interval: 5 minutes
- Alert: Email/SMS

---

## 🔄 Continuous Deployment

Our GitHub Actions workflow automatically deploys on push to `main`.

### Required Secrets

Add to GitHub repository secrets:

```
PRODUCTION_HOST=your.server.ip
PRODUCTION_USER=deploy
PRODUCTION_SSH_KEY=<private key>
MYSQL_HOST=your-mysql-host
MYSQL_USER=your-mysql-user
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=jobtool
```

### Manual Deployment

```bash
# On server
cd /opt/jobtool
git pull origin main
docker-compose down
docker-compose build
docker-compose up -d
docker-compose logs -f
```

---

## 🧪 Post-Deployment Testing

### 1. Health Check

```bash
curl https://yourdomain.com/health
# Should return: {"status":"healthy","timestamp":"..."}
```

### 2. API Status

```bash
curl https://yourdomain.com/api/status
# Should show: {"monetization":true,"features":{...}}
```

### 3. Test Registration

```bash
curl -X POST https://yourdomain.com/api/auth/v2/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!","displayName":"Test User"}'
```

### 4. Test OAuth (Browser)

- Visit: `https://yourdomain.com/api/oauth/google`
- Should redirect to Google login

### 5. Test Stripe Checkout

```bash
curl -X POST https://yourdomain.com/api/payments/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"tier":"pro","billingCycle":"monthly"}'
```

### 6. Stripe Webhook Test

```bash
stripe listen --forward-to https://yourdomain.com/api/payments/webhooks
```

---

## 🔧 Troubleshooting

### Database Connection Issues

```bash
# Test connection
mysql -h your-mysql-host -u user -p -e "SELECT 1;"

# Check logs
docker-compose logs app | grep -i mysql
```

### Stripe Webhooks Not Working

1. Check webhook URL in Stripe dashboard
2. Verify webhook secret in `.env`
3. Test with Stripe CLI:
```bash
stripe trigger checkout.session.completed
```

### OAuth Redirect Errors

1. Verify callback URLs in provider dashboards match `.env`
2. Ensure HTTPS (OAuth requires secure callbacks)
3. Check logs: `docker-compose logs app | grep -i oauth`

### Email Not Sending

```bash
# Test email configuration
docker-compose exec app node -e "
const EmailService = require('./server/services/email-service');
const service = new EmailService();
service.initialize().then(() => console.log('Email OK'));
"
```

---

## 🔐 Security Checklist

Before going live:

- [ ] Change all default passwords
- [ ] Generate new JWT secret
- [ ] Switch Stripe to live mode
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall (only 80, 443, 22)
- [ ] Set up database backups
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Review admin access controls
- [ ] Set up monitoring/alerts
- [ ] Test disaster recovery

---

## 📦 Backup Strategy

### Database Backups

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD jobtool > backup_$DATE.sql
gzip backup_$DATE.sql
aws s3 cp backup_$DATE.sql.gz s3://your-backup-bucket/
```

Add to crontab:
```bash
0 2 * * * /opt/scripts/backup-db.sh
```

### Application Backups

```bash
# Backup user uploaded files
tar -czf app-data-$(date +%Y%m%d).tar.gz /app/data
aws s3 cp app-data-*.tar.gz s3://your-backup-bucket/
```

---

## 🎉 Launch Checklist

Final checks before public launch:

**Technical:**
- [ ] All tests passing
- [ ] Database migrated successfully
- [ ] Stripe live mode configured
- [ ] Webhooks working
- [ ] OAuth flows tested
- [ ] Email sending working
- [ ] SSL certificate valid
- [ ] Monitoring active
- [ ] Backups configured
- [ ] DNS configured correctly

**Business:**
- [ ] Privacy Policy published
- [ ] Terms of Service published
- [ ] Refund policy clear
- [ ] Support email set up
- [ ] Pricing finalized
- [ ] Marketing site live

**Soft Launch (Friends & Family):**
- [ ] Send invites to 10-20 people
- [ ] Offer lifetime discount
- [ ] Collect feedback
- [ ] Monitor for errors
- [ ] Fix critical issues

**Public Launch:**
- [ ] Post on Product Hunt
- [ ] Share on social media
- [ ] Email waitlist (if any)
- [ ] Monitor closely for 48 hours

---

## 📞 Support

If you need help with deployment:

- Check logs: `docker-compose logs -f`
- Review docs: [INTEGRATION-GUIDE.md](./INTEGRATION-GUIDE.md)
- Email: support@jobtool.app

---

**You're ready to deploy!** 🚀
