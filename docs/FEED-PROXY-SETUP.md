# Feed Proxy Setup & Documentation

## Problem Solved

**Issue**: hnrss.org and many RSS/JSON feeds don't support CORS requests from browsers, causing direct fetch requests to fail.

**Solution**: Server-side PHP proxy that handles feed requests and adds proper CORS headers.

## Files Created

### 1. `feed-proxy.php` - Main Proxy Server
- **Purpose**: Proxy RSS/JSON feed requests to bypass CORS
- **Location**: `/job-tool/feed-proxy.php`
- **Permissions**: 644 (rw-r--r--)

### 2. `test-feed-proxy.php` - Test Script
- **Purpose**: Validate proxy functionality
- **Usage**: `php test-feed-proxy.php`
- **Permissions**: 644 (rw-r--r--)

## Architecture

```
Browser → feed-proxy.php → External Feed Source (hnrss.org)
          ↓
       [Cache]
          ↓
       JSON Response → Browser
```

## Security Features

### 1. Host Whitelist
Only these domains are allowed:
- `hnrss.org` - Hacker News RSS
- `news.ycombinator.com` - Hacker News
- `api.github.com` - GitHub Jobs
- `feeds.feedburner.com` - Generic RSS
- `rss.app` - RSS aggregator

### 2. SSRF Protection
- Validates all URLs before fetching
- Blocks private IP ranges (10.x.x.x, 192.168.x.x, etc.)
- Prevents DNS rebinding attacks

### 3. Rate Limiting
- 30 requests per minute per IP address
- Temporary file-based tracking
- Automatic cleanup of old requests

### 4. Response Caching
- 5-minute cache duration
- Reduces load on external APIs
- Stored in system temp directory

## Usage

### From JavaScript (HN Jobs Adapter)

```javascript
// Build feed URL
const feedUrl = 'https://hnrss.org/whoishiring/jobs.jsonfeed?count=50';

// Route through proxy
const proxyUrl = `/job-tool/feed-proxy.php?url=${encodeURIComponent(feedUrl)}`;

// Fetch
const response = await fetch(proxyUrl);
const data = await response.json();

if (data.success) {
    const feedData = data.data;
    const cached = data.cached; // true if from cache
}
```

### Direct HTTP Requests

```bash
# GET request
curl "https://cdr2.com/job-tool/feed-proxy.php?url=https%3A%2F%2Fhnrss.org%2Fwhoishiring%2Fjobs.jsonfeed%3Fcount%3D5"

# POST request
curl -X POST https://cdr2.com/job-tool/feed-proxy.php \
  -H "Content-Type: application/json" \
  -d '{"url":"https://hnrss.org/whoishiring/jobs.jsonfeed?count=5"}'
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* feed data */ },
  "cached": false,
  "source": "live",
  "contentType": "application/json"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": 403
}
```

## Testing

### Method 1: PHP Test Script
```bash
cd /home/cdr/domains/cdr2.com/www/job-tool
php test-feed-proxy.php
```

Expected output:
```
Test 1: Fetching HN Jobs feed
✓ SUCCESS: Retrieved feed data
  Cached: no
  Items: 5

Test 2: Testing security (blocked host)
✓ SUCCESS: Blocked unauthorized host

Test 3: Testing cache
✓ SUCCESS: Cache is working
```

### Method 2: Browser Test
Open in browser:
```
https://cdr2.com/job-tool/test-job-feeds.html
```

Click the test buttons to verify proxy functionality.

### Method 3: Direct cURL Test
```bash
curl "https://cdr2.com/job-tool/feed-proxy.php?url=https%3A%2F%2Fhnrss.org%2Fwhoishiring%2Fjobs.jsonfeed%3Fcount%3D5" | json_pp
```

## Configuration

### Adding New Allowed Hosts

Edit `feed-proxy.php`:

```php
const ALLOWED_HOSTS = [
    'hnrss.org',
    'news.ycombinator.com',
    'api.github.com',
    'your-new-feed.com',  // Add new host here
];
```

### Adjusting Rate Limits

```php
const MAX_REQUESTS_PER_MINUTE = 30;  // Change this value
```

### Cache Duration

```php
const CACHE_DURATION = 300;  // Seconds (5 minutes)
```

### Request Timeout

```php
const REQUEST_TIMEOUT = 15;  // Seconds
```

## Troubleshooting

### Issue: "Access to this host is not allowed"
**Solution**: Add the host to `ALLOWED_HOSTS` in `feed-proxy.php`

### Issue: "Rate limit exceeded"
**Solution**: Wait 1 minute or increase `MAX_REQUESTS_PER_MINUTE`

### Issue: "Failed to fetch feed"
**Possible causes**:
- External feed is down
- Network connectivity issues
- Invalid feed URL
- Timeout (request taking > 15 seconds)

**Check**:
```bash
# Test external feed directly
curl -I https://hnrss.org/whoishiring/jobs.jsonfeed
```

### Issue: Cache not clearing
**Solution**: Clear temp cache files
```bash
rm /tmp/feed_cache_*
```

## Performance

- **First request**: 1-3 seconds (fetches from external source)
- **Cached requests**: <50ms (served from cache)
- **Cache TTL**: 5 minutes
- **Memory usage**: Minimal (~1-2MB per cached feed)
- **Disk usage**: ~50KB per cached feed

## Logs & Debugging

The proxy doesn't log by default for privacy. To add logging:

```php
// Add to feed-proxy.php
file_put_contents('/tmp/feed-proxy.log',
    date('Y-m-d H:i:s') . " - $url\n",
    FILE_APPEND
);
```

## CORS Headers

The proxy sets these headers:
```
Access-Control-Allow-Origin: https://cdr2.com (or matching origin)
Vary: Origin
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-Requested-With
Access-Control-Max-Age: 600
```

## Security Considerations

1. **Never expose internal services** - Use the host whitelist
2. **Monitor rate limits** - Adjust if abuse is detected
3. **Keep PHP updated** - Security patches are important
4. **Review logs regularly** - Check for unusual patterns
5. **Use HTTPS only** - Encrypt all traffic

## Future Enhancements

Potential improvements:
- [ ] Redis/Memcached for distributed caching
- [ ] Database logging for analytics
- [ ] Per-user rate limiting (authenticated users)
- [ ] Webhook support for real-time updates
- [ ] Feed validation and sanitization
- [ ] RSS/Atom to JSON conversion

## Integration with Other Adapters

To use the proxy in a new feed adapter:

```javascript
class MyFeedAdapter extends FeedAdapter {
    constructor(config = {}) {
        super({ name: 'My Feed', ...config });
        this.proxyUrl = config.proxyUrl || '/job-tool/feed-proxy.php';
    }

    async fetchJobs(params) {
        const feedUrl = this.buildFeedUrl(params);
        const proxyUrl = `${this.proxyUrl}?url=${encodeURIComponent(feedUrl)}`;

        const response = await fetch(proxyUrl);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error);
        }

        return this.parseJobs(result.data);
    }
}
```

## Maintenance

### Regular Tasks

1. **Weekly**: Check disk space in `/tmp/` directory
2. **Monthly**: Review rate limit settings
3. **Quarterly**: Update allowed hosts list
4. **As needed**: Clear old cache files

### Monitoring

Monitor these metrics:
- Request count per hour
- Cache hit ratio
- Error rate
- Response times
- Blocked requests (security events)

---

**Last Updated**: January 17, 2025
**Version**: 1.0
**Maintainer**: Job Hunt Manager Team
