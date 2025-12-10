# 💎 Monetization UI Components Guide

Complete guide for using the monetization UI components in NextRole.

---

## 📦 What's Included

All UI components for subscription management, billing, and tier enforcement:

1. **Subscription Widget** - Display current tier, usage stats, and upgrade buttons
2. **Billing History** - Payment transactions and invoices table
3. **Tier Enforcement** - Client-side limit checks and upgrade prompts
4. **Monetization UI** - Master integration layer
5. **Account Dashboard** - Complete demo page

---

## 🚀 Quick Start

### 1. Include the Required Files

Add to your HTML `<head>`:

```html
<!-- CSS -->
<link rel="stylesheet" href="css/subscription-widget.css">
<link rel="stylesheet" href="css/billing-history.css">
<link rel="stylesheet" href="css/upgrade-prompt.css">

<!-- JavaScript -->
<script src="js/components/subscription-widget.js"></script>
<script src="js/components/billing-history.js"></script>
<script src="js/components/tier-enforcement.js"></script>
<script src="js/monetization-ui.js"></script>
```

### 2. Add HTML Containers

```html
<!-- Subscription Widget -->
<div id="subscription-widget"></div>

<!-- Billing History -->
<div id="billing-history"></div>
```

### 3. That's It!

The components auto-initialize when the page loads.

---

## 🎯 Component Reference

### Subscription Widget

**Purpose:** Display user's subscription tier, usage stats, and upgrade options.

**HTML:**
```html
<div id="subscription-widget"></div>
```

**JavaScript:**
```javascript
// Auto-initialized, but you can also create manually:
const widget = new SubscriptionWidget('subscription-widget');

// Refresh data
await widget.refresh();
```

**Features:**
- ✅ Shows current tier with badge (Free, Pro, Enterprise)
- ✅ Usage progress bars for jobs and resumes
- ✅ Feature list with availability
- ✅ Upgrade buttons with Stripe checkout
- ✅ Manage subscription button (customer portal)

**Customization:**
The widget reads data from your API and styles itself automatically. Colors and icons are tier-specific.

---

### Billing History

**Purpose:** Display payment transactions and invoices in a sortable table.

**HTML:**
```html
<div id="billing-history"></div>
```

**JavaScript:**
```javascript
// Auto-initialized, or create manually:
const billing = new BillingHistory('billing-history');

// Refresh data
await billing.refresh();

// Export to CSV
billing.exportToCSV();
```

**Features:**
- ✅ Paginated transaction table
- ✅ Status badges (completed, pending, failed)
- ✅ Invoice links (PDF from Stripe)
- ✅ Refund tracking
- ✅ Date formatting
- ✅ Empty state for new users

---

### Tier Enforcement

**Purpose:** Check subscription limits before allowing actions.

**JavaScript:**
```javascript
// Auto-initialized globally as window.tierEnforcement

// Check if user can add a job
const jobCheck = await window.tierEnforcement.enforceLimit('addJob');
if (jobCheck) {
    // Add job
    window.tierEnforcement.updateUsage('jobs', 1);
}

// Check feature access
if (window.tierEnforcement.hasFeature('cloudSync')) {
    // Enable cloud sync
}

// Available limits:
// - 'addJob'
// - 'addResume'
// - 'cloudSync'
// - 'encryption'
// - 'aiAssistant'
// - 'apiAccess'
```

**Auto Upgrade Prompts:**
When a limit is reached, a beautiful modal automatically shows with upgrade options.

---

### Helper Functions

Global helper functions available after initialization:

```javascript
// Wrap an action with tier enforcement
await enforceAction('addJob', () => {
    // This only runs if allowed
    addJobToDatabase();
});

// Check feature access
if (hasFeatureAccess('cloudSync')) {
    // Feature available
}

// Show upgrade prompt manually
showFeatureLocked('encryption', {
    title: 'Custom Title',
    description: 'Custom description'
});

// Get tier badge HTML
const badge = getTierBadgeHTML(); // Current tier
const badge = getTierBadgeHTML('pro'); // Specific tier
```

---

## 🎨 Styling & Theming

### Color Scheme

The components use a modern, professional color scheme:

- **Primary:** `#0d6efd` (Blue)
- **Success:** `#198754` (Green)
- **Warning:** `#ffc107` (Yellow)
- **Danger:** `#dc3545` (Red)
- **Secondary:** `#6c757d` (Gray)

### Tier Colors

- **Free:** Gray (`#6c757d`)
- **Pro:** Blue (`#0d6efd`)
- **Enterprise:** Purple (`#6f42c1`)

### Dark Mode

All components support dark mode automatically via `prefers-color-scheme: dark`.

### Customization

Override CSS variables for global theme changes:

```css
:root {
    --primary-color: #your-color;
    --border-radius: 12px;
    --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

---

## 🔧 Integration Examples

### Example 1: Add Job with Limit Check

```javascript
async function addJob(jobData) {
    // Check if user can add a job
    const allowed = await window.tierEnforcement.enforceLimit('addJob');

    if (!allowed) {
        // Upgrade prompt was shown automatically
        return;
    }

    // Add job to database
    await saveJobToDatabase(jobData);

    // Update usage count
    window.tierEnforcement.updateUsage('jobs', 1);

    // Refresh widget to show updated usage
    if (window.subscriptionWidget) {
        await window.subscriptionWidget.refresh();
    }
}
```

### Example 2: Feature-Locked Button

```javascript
// Disable button if feature not available
const cloudSyncBtn = document.getElementById('cloud-sync-btn');

if (!window.tierEnforcement.hasFeature('cloudSync')) {
    cloudSyncBtn.disabled = true;
    cloudSyncBtn.title = 'Upgrade to Pro for cloud sync';
    cloudSyncBtn.onclick = () => showFeatureLocked('cloudSync');
} else {
    cloudSyncBtn.onclick = () => enableCloudSync();
}
```

### Example 3: Conditional UI Display

```javascript
// Show/hide features based on tier
const tier = window.monetizationUI.getCurrentTier();

if (tier === 'free') {
    document.getElementById('ai-features').style.display = 'none';
    document.getElementById('upgrade-banner').style.display = 'block';
} else {
    document.getElementById('ai-features').style.display = 'block';
    document.getElementById('upgrade-banner').style.display = 'none';
}
```

### Example 4: Listen for Events

```javascript
// Listen for monetization UI ready
window.addEventListener('monetization-ui-ready', () => {
    console.log('Monetization UI initialized');
    updateUIBasedOnTier();
});

// Listen for subscription changes
document.addEventListener('subscription-changed', async () => {
    await window.monetizationUI.refreshAll();
    showSuccessMessage('Subscription updated!');
});
```

---

## 📱 Responsive Design

All components are fully responsive and work on:

- ✅ Desktop (1920px+)
- ✅ Laptop (1024px+)
- ✅ Tablet (768px+)
- ✅ Mobile (320px+)

**Mobile Features:**
- Horizontal scrolling for tables
- Stacked layouts
- Touch-friendly buttons
- Optimized modal sizing

---

## ♿ Accessibility

All components follow WCAG 2.1 AA standards:

- ✅ Semantic HTML
- ✅ Keyboard navigation
- ✅ ARIA labels
- ✅ Focus indicators
- ✅ Color contrast > 4.5:1
- ✅ Screen reader friendly

---

## 🧪 Testing

### Demo Page

Open `account-dashboard.html` to test all components:

```bash
# Start the server
node server/index.js

# Open in browser
open http://localhost:3000/account-dashboard.html
```

**Demo Features:**
- View subscription widget with live data
- Browse billing history with pagination
- Test tier enforcement with various actions
- See upgrade prompts for each feature
- Refresh components dynamically

### Manual Testing Checklist

- [ ] Subscription widget loads and displays tier correctly
- [ ] Usage bars show correct percentages
- [ ] Upgrade buttons create Stripe checkout sessions
- [ ] Billing history shows transactions
- [ ] Pagination works in billing history
- [ ] Tier enforcement blocks actions when limit reached
- [ ] Upgrade prompts appear for locked features
- [ ] Responsive design works on mobile
- [ ] Dark mode styles apply correctly
- [ ] Components refresh after subscription change

---

## 🔒 Security

### Auth Token Storage

Components read auth tokens from localStorage:
```javascript
localStorage.getItem('authToken') || localStorage.getItem('token')
```

Make sure your app sets the token after login:
```javascript
localStorage.setItem('authToken', jwtToken);
```

### API Calls

All API calls use Authorization headers:
```javascript
Authorization: Bearer <token>
```

### Stripe Integration

- Checkout handled server-side (no sensitive data in client)
- Customer portal links generated server-side
- Webhook verification on backend

---

## 🐛 Troubleshooting

### Components Not Loading

**Problem:** Containers exist but components don't show.

**Solution:**
1. Check browser console for errors
2. Verify API endpoints are accessible
3. Ensure auth token is set in localStorage
4. Check that server has `USE_MONETIZATION=true`

### Upgrade Buttons Not Working

**Problem:** Clicking upgrade does nothing.

**Solution:**
1. Check that Stripe is configured in `.env`
2. Verify `STRIPE_PRICE_PRO_MONTHLY` is set
3. Check browser console for API errors
4. Ensure user is authenticated

### Usage Stats Not Updating

**Problem:** Adding jobs doesn't update the usage bar.

**Solution:**
```javascript
// After adding a job:
window.tierEnforcement.updateUsage('jobs', 1);
await window.subscriptionWidget.refresh();
```

### Styles Not Applied

**Problem:** Components render but look broken.

**Solution:**
1. Verify CSS files are included in HTML
2. Check for CSS conflicts with existing styles
3. Ensure files are served from correct paths
4. Clear browser cache

---

## 📚 API Endpoints Used

The UI components call these API endpoints:

### Subscription
- `GET /api/subscriptions/me` - Get current subscription
- `GET /api/subscriptions/usage` - Get usage stats
- `POST /api/subscriptions/cancel` - Cancel subscription

### Payments
- `POST /api/payments/create-checkout-session` - Create Stripe checkout
- `POST /api/payments/customer-portal` - Get portal URL
- `GET /api/payments/transactions` - Get payment history

### Auth
- `GET /api/auth/v2/me` - Get current user
- `GET /api/auth/v2/export-data` - Export user data

---

## 🎯 Best Practices

### 1. Initialize Early

Load monetization components on every page:
```html
<script src="js/monetization-ui.js"></script>
```

### 2. Check Limits Before Actions

Always check limits before allowing resource creation:
```javascript
const allowed = await window.tierEnforcement.enforceLimit('addJob');
if (!allowed) return;
```

### 3. Update Usage Optimistically

Update usage counts immediately for better UX:
```javascript
window.tierEnforcement.updateUsage('jobs', 1);
```

### 4. Show Visual Feedback

Show tier badges and usage stats prominently:
```javascript
document.getElementById('tier-display').innerHTML = getTierBadgeHTML();
```

### 5. Handle Stripe Redirects

Check for success/cancel parameters after Stripe redirect:
```javascript
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('success')) {
    // Show success message
    window.monetizationUI.refreshAll();
}
```

---

## 🚀 Production Deployment

Before deploying to production:

### 1. Switch to Live Stripe Keys

Update `.env`:
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Update Stripe Product IDs

Set correct price IDs in `.env`:
```env
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
```

### 3. Configure Success/Cancel URLs

Ensure your Stripe checkout success URL points to:
```
https://yourdomain.com/account-dashboard.html?success=true
```

### 4. Test End-to-End

- [ ] Complete upgrade flow
- [ ] Verify webhook processing
- [ ] Test subscription cancellation
- [ ] Confirm customer portal access
- [ ] Check billing history updates

---

## 📖 Additional Resources

- **Demo Page:** `account-dashboard.html`
- **Component Source:** `js/components/`
- **Styles:** `css/`
- **Integration:** `js/monetization-ui.js`

---

## 💡 Tips & Tricks

### Custom Upgrade Messages

```javascript
window.tierEnforcement.getUpgradeMessage('addJob').title = 'Custom Title';
```

### Disable Auto-Init

```javascript
// Prevent auto-init, initialize manually later
window.DISABLE_AUTO_INIT = true;

// Initialize when ready
window.monetizationUI = new MonetizationUI();
await window.monetizationUI.init();
```

### Custom API Base URL

```javascript
window.monetizationUI.apiBaseUrl = 'https://api.yourdomain.com';
```

---

**Ready to use!** 🎉

Open `account-dashboard.html` to see everything in action.

---

*Last Updated: December 2024*
*Status: Production Ready*
