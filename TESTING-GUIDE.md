# 🧪 NextRole Testing Guide

## Quick Start Testing

### 1. **Prerequisites**

Ensure you have:
- Node.js 14+ installed
- MySQL 8.0+ running
- npm packages installed

```bash
# Install dependencies
npm install
cd server && npm install
```

### 2. **Configure Environment**

```bash
# Copy environment template
cp server/.env.example server/.env

# Edit with your values (minimum required)
nano server/.env
```

**Minimum Required Configuration:**
```env
USE_MONETIZATION=true
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=jobtool
JWT_SECRET=your_secret_key_here
```

**Generate JWT Secret:**
```bash
openssl rand -base64 32
```

### 3. **Setup Database**

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS jobtool;"

# Import schema
mysql -u root -p jobtool < server/db/mysql-schema.sql

# Verify tables created
mysql -u root -p jobtool -e "SHOW TABLES;"
```

### 4. **Start Server**

```bash
# Start with monetization enabled
cd server
USE_MONETIZATION=true npm start

# Expected output:
# ✅ MySQL database connected
# ✅ Stripe service initialized
# ✅ Email service initialized
# ✅ OAuth service initialized
# 🚀 Server running on http://localhost:3000
```

### 5. **Run Tests**

Open your browser:
- **Interactive Testing**: http://localhost:3000/test-monetization.html
- **Main App**: http://localhost:3000/app.html

---

## Manual Testing Checklist

### ✅ **Backend API Tests**

1. **Health Check**
   ```bash
   curl http://localhost:3000/health
   ```
   Expected: `{"status": "healthy", "services": {...}}`

2. **API Status**
   ```bash
   curl http://localhost:3000/api/status
   ```
   Expected: `{"monetization": true, "features": {...}}`

3. **Register User**
   ```bash
   curl -X POST http://localhost:3000/api/auth/v2/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "TestPassword123!",
       "displayName": "Test User"
     }'
   ```

4. **Login**
   ```bash
   curl -X POST http://localhost:3000/api/auth/v2/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "TestPassword123!"
     }'
   ```
   Save the returned `token` for next requests.

5. **Get Subscription**
   ```bash
   curl http://localhost:3000/api/subscriptions/me \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

6. **Get Usage Stats**
   ```bash
   curl http://localhost:3000/api/subscriptions/usage \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

### ✅ **Frontend UI Tests**

1. **Load Test Page**
   - Navigate to: http://localhost:3000/test-monetization.html
   - Verify all status badges show "Connected" or "Initialized"

2. **Run Quick Tests**
   - Click "Quick Test" button
   - Verify tests pass (green checkmarks)

3. **Test Authentication**
   - Click "Register" button
   - Fill in form with valid data
   - Submit and verify success message
   - Click "Login" button
   - Login with credentials
   - Verify redirect or success

4. **Test Account Dashboard**
   - After login, verify account dashboard appears
   - Check Overview tab shows stats
   - Check Subscription tab shows tiers
   - Check Usage Stats tab shows progress bars

### ✅ **Stripe Integration Tests**

**Note:** These require Stripe Test Mode configured

1. **Create Checkout Session**
   ```bash
   curl -X POST http://localhost:3000/api/payments/create-checkout-session \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"tier": "pro"}'
   ```
   Expected: Returns Stripe checkout URL

2. **Test Stripe Checkout (Manual)**
   - Click "Upgrade to Pro" in UI
   - Should redirect to Stripe checkout
   - Use test card: `4242 4242 4242 4242`
   - Complete payment
   - Verify subscription upgraded

3. **Test Stripe Webhooks**
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe

   # Login
   stripe login

   # Forward webhooks to local server
   stripe listen --forward-to localhost:3000/api/payments/webhooks
   ```

---

## Automated Testing

### Cypress E2E Tests

1. **Run Cypress Tests**
   ```bash
   # Start server first
   cd server && npm start

   # In another terminal, run tests
   npm run test

   # Or with UI
   npm run test:open
   ```

2. **Run Specific Test Suite**
   ```bash
   npx cypress run --spec "cypress/e2e/monetization.cy.js"
   ```

3. **Run with Chrome**
   ```bash
   npm run test:chrome
   ```

### Test Coverage

The Cypress test suite (`cypress/e2e/monetization.cy.js`) includes:

- ✅ Health & status checks
- ✅ User registration (valid, invalid, duplicates)
- ✅ User login (valid, invalid)
- ✅ JWT token verification
- ✅ Subscription tier retrieval
- ✅ Current subscription info
- ✅ Usage statistics
- ✅ Resource limit checking
- ✅ Billing history
- ✅ Stripe checkout session creation
- ✅ Stripe customer portal
- ✅ Authentication security
- ✅ Rate limiting
- ✅ Error handling
- ✅ Data validation
- ✅ Frontend UI components

---

## Troubleshooting

### Server Won't Start

**Error: MySQL connection failed**
```
Solution:
1. Check MySQL is running: mysql.server start
2. Verify credentials in .env file
3. Ensure database exists: mysql -u root -p -e "CREATE DATABASE jobtool;"
```

**Error: Missing environment variables**
```
Solution:
1. Copy .env.example to .env
2. Fill in required values (at minimum: JWT_SECRET, MYSQL_*)
```

**Error: Port 3000 already in use**
```
Solution:
1. Find process: lsof -ti:3000
2. Kill process: kill $(lsof -ti:3000)
3. Or change PORT in .env
```

### Tests Failing

**Registration tests fail with "Email already exists"**
```
Solution:
- Tests create users with timestamp-based emails
- If running repeatedly, clear database:
  mysql -u root -p jobtool -e "TRUNCATE TABLE users;"
```

**Authentication tests fail with 401/403**
```
Solution:
- JWT secret might be wrong or changed
- Clear any cached tokens
- Restart server
```

**Stripe tests fail**
```
Solution:
- Verify STRIPE_SECRET_KEY is set in .env
- Ensure using test mode key (starts with sk_test_)
- Check Stripe dashboard for API errors
```

### Database Issues

**Tables not found**
```
Solution:
mysql -u root -p jobtool < server/db/mysql-schema.sql
```

**Permission denied**
```
Solution:
GRANT ALL PRIVILEGES ON jobtool.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## Test Data

### Valid Test User
```json
{
  "email": "test@example.com",
  "password": "TestPassword123!",
  "displayName": "Test User"
}
```

### Invalid Test Cases
```javascript
// Weak password
{ password: "123" }

// Invalid email
{ email: "not-an-email" }

// Missing required fields
{ email: "test@example.com" }  // no password
```

### Stripe Test Cards

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Insufficient funds**: `4000 0000 0000 9995`
- **3D Secure**: `4000 0025 0000 3155`

---

## Performance Testing

### Load Testing with k6

```bash
# Install k6
brew install k6

# Run load test
k6 run scripts/load-test.js
```

### Expected Performance

- **Health endpoint**: < 50ms
- **Login**: < 200ms
- **Registration**: < 300ms
- **Subscription queries**: < 100ms

---

## Security Testing

### Manual Security Checks

1. **SQL Injection**
   ```bash
   curl -X POST http://localhost:3000/api/auth/v2/login \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "' OR '1'='1"}'
   ```
   Expected: Should fail, not allow injection

2. **XSS Attempts**
   ```bash
   curl -X POST http://localhost:3000/api/auth/v2/register \
     -H "Content-Type: application/json" \
     -d '{"email": "<script>alert(1)</script>@example.com", "password": "test", "displayName": "XSS"}'
   ```
   Expected: Should sanitize or reject

3. **Rate Limiting**
   ```bash
   # Make 10 rapid requests
   for i in {1..10}; do
     curl -X POST http://localhost:3000/api/auth/v2/login \
       -H "Content-Type: application/json" \
       -d '{"email": "test@example.com", "password": "wrong"}' &
   done
   wait
   ```
   Expected: Should see 429 (Too Many Requests) after 5 attempts

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test
          MYSQL_DATABASE: jobtool
        ports:
          - 3306:3306

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'

      - run: npm install
      - run: npm run test:ci
```

---

## Success Criteria

### ✅ All Tests Must Pass

- [ ] Health check returns 200
- [ ] API status shows monetization enabled
- [ ] User registration works
- [ ] Login returns valid JWT
- [ ] Subscription endpoints return correct data
- [ ] Stripe integration creates checkout sessions
- [ ] UI components render correctly
- [ ] Authentication security works (rate limiting, invalid tokens)
- [ ] Error handling returns proper error messages

### 📊 Performance Benchmarks

- [ ] Response times under expected thresholds
- [ ] No memory leaks after 1000+ requests
- [ ] Database connections properly pooled
- [ ] Stripe API calls complete successfully

---

## Next Steps

After successful testing:

1. **Deploy to Staging**
   - Use Docker Compose
   - Configure production .env
   - Run tests against staging

2. **Beta Testing**
   - Invite 10-20 beta users
   - Collect feedback
   - Monitor error logs

3. **Production Launch**
   - Switch to live Stripe keys
   - Enable monitoring (Sentry)
   - Set up backups
   - Launch! 🚀

---

## Resources

- **Stripe Test Mode**: https://stripe.com/docs/testing
- **MySQL Documentation**: https://dev.mysql.com/doc/
- **Cypress Docs**: https://docs.cypress.io/
- **Node.js Best Practices**: https://github.com/goldbergyoni/nodebestpractices

---

**Ready to test?** Start with the interactive test page: http://localhost:3000/test-monetization.html
