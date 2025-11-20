# Job-Tool Sync API - Quick Reference

## Base URL
- HTTP: `http://localhost:3000`
- HTTPS: `https://localhost:3443`

## Authentication

All sync endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## 🔑 Auth Endpoints

### Create Anonymous Session
```bash
POST /api/auth/anonymous
Content-Type: application/json

{
  "deviceName": "My Laptop" // optional
}

Response:
{
  "success": true,
  "userId": "anon_uuid",
  "token": "jwt-token",
  "isAnonymous": true
}
```

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password",
  "displayName": "John Doe" // optional
}

Response:
{
  "success": true,
  "userId": "user_uuid",
  "token": "jwt-token",
  "isAnonymous": false
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}

Response:
{
  "success": true,
  "userId": "user_uuid",
  "token": "jwt-token"
}
```

### Convert Anonymous to Authenticated
```bash
POST /api/auth/convert
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}

Response:
{
  "success": true,
  "token": "new-jwt-token",
  "isAnonymous": false,
  "message": "All data preserved"
}
```

### Get Auth Status
```bash
GET /api/auth/status
Authorization: Bearer <token>

Response:
{
  "success": true,
  "userId": "anon_uuid",
  "email": null,
  "isAnonymous": true,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "lastLogin": "2025-01-15T10:00:00.000Z"
}
```

### Refresh Token
```bash
POST /api/auth/refresh
Authorization: Bearer <old-token>

Response:
{
  "success": true,
  "token": "new-jwt-token"
}
```

---

## 🔄 Sync Endpoints

### Get Sync Status
```bash
GET /api/sync/status
Authorization: Bearer <token>
x-device-id: browser-uuid

Response:
{
  "success": true,
  "userId": "anon_uuid",
  "deviceId": "browser-uuid",
  "lastSync": "2025-01-15T10:00:00.000Z",
  "sessions": [{
    "deviceId": "browser-uuid",
    "deviceName": "Chrome on MacBook",
    "lastSync": "2025-01-15T10:00:00.000Z",
    "syncCount": 42
  }],
  "stats": {
    "jobs": 15,
    "resumes": 5,
    "cover_letters": 8,
    "logs": 100,
    "ai_history": 25
  }
}
```

### Push Changes
```bash
POST /api/sync/push
Authorization: Bearer <token>
x-device-id: browser-uuid
Content-Type: application/json

{
  "entities": {
    "jobs": [{
      "id": "job_123",
      "data": { /* full job object */ },
      "version": 1,
      "deleted": 0,
      "last_modified": "2025-01-15T10:00:00.000Z"
    }],
    "resumes": [/* ... */],
    "coverLetters": [/* ... */],
    "settings": { /* ... */ }
  },
  "lastSync": "2025-01-15T09:00:00.000Z"
}

Response:
{
  "success": true,
  "results": {
    "jobs": { "success": 5, "failed": 0 },
    "resumes": { "success": 3, "failed": 0 },
    "coverLetters": { "success": 2, "failed": 0 },
    "settings": { "success": 1, "failed": 0 },
    "errors": []
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Pull Changes
```bash
POST /api/sync/pull
Authorization: Bearer <token>
Content-Type: application/json

{
  "lastSync": "2025-01-15T09:00:00.000Z",
  "entities": ["jobs", "resumes", "coverLetters", "settings"] // optional
}

Response:
{
  "success": true,
  "data": {
    "jobs": [{
      "id": "job_123",
      "data": { /* full job object */ },
      "version": 1,
      "last_modified": "2025-01-15T10:00:00.000Z",
      "deleted": 0
    }],
    "resumes": [/* ... */],
    "coverLetters": [/* ... */],
    "settings": { /* ... */ }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Full Sync (Push + Pull)
```bash
POST /api/sync/full
Authorization: Bearer <token>
x-device-id: browser-uuid
Content-Type: application/json

{
  "entities": {
    "jobs": [/* local changes */],
    "resumes": [/* ... */],
    "coverLetters": [/* ... */]
  },
  "lastSync": "2025-01-15T09:00:00.000Z"
}

Response:
{
  "success": true,
  "push": {
    "jobs": { "success": 5, "failed": 0 },
    "resumes": { "success": 3, "failed": 0 },
    "errors": []
  },
  "pull": {
    "data": {
      "jobs": [/* server changes */],
      "resumes": [/* ... */],
      "coverLetters": [/* ... */],
      "settings": { /* ... */ }
    },
    "conflicts": [{
      "entityType": "job",
      "entityId": "job_123",
      "clientVersion": 2,
      "serverVersion": 2,
      "clientModified": "2025-01-15T10:00:00.000Z",
      "serverModified": "2025-01-15T10:05:00.000Z"
    }]
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Export All Data
```bash
GET /api/sync/export
Authorization: Bearer <token>

Response:
{
  "version": "1.0.0",
  "exportedAt": "2025-01-15T10:30:00.000Z",
  "userId": "anon_uuid",
  "data": {
    "jobs": [/* all jobs */],
    "resumes": [/* all resumes */],
    "coverLetters": [/* all cover letters */],
    "settings": { /* settings */ }
  }
}
```

### Import Data
```bash
POST /api/sync/import
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "jobs": [/* jobs to import */],
    "resumes": [/* resumes to import */],
    "coverLetters": [/* cover letters to import */],
    "settings": { /* settings to import */ }
  }
}

Response:
{
  "success": true,
  "results": {
    "jobs": { "success": 10, "failed": 0 },
    "resumes": { "success": 5, "failed": 0 },
    "coverLetters": { "success": 3, "failed": 0 },
    "settings": { "success": 1, "failed": 0 },
    "errors": []
  }
}
```

### Reset All Data (⚠️ Destructive)
```bash
POST /api/sync/reset
Authorization: Bearer <token>
Content-Type: application/json

{
  "confirm": "DELETE_ALL_DATA"
}

Response:
{
  "success": true,
  "message": "All data deleted successfully"
}
```

---

## 📦 Entity Structure

### Job Entity
```json
{
  "id": "job_timestamp_random",
  "data": {
    "id": "job_timestamp_random",
    "title": "Software Engineer",
    "company": "Tech Corp",
    "status": "saved", // saved|applied|interviewing|offered|rejected|accepted|declined
    "location": "San Francisco, CA",
    "url": "https://example.com/job",
    "description": "Job description...",
    "dateCreated": "2025-01-15T10:00:00.000Z",
    "dateUpdated": "2025-01-15T10:00:00.000Z",
    "dateApplied": null,
    "resumeId": "resume_123",
    "contactName": "John Recruiter",
    "contactEmail": "recruiter@example.com",
    "notes": "Applied via LinkedIn",
    "statusHistory": [{
      "from": "saved",
      "to": "applied",
      "date": "2025-01-16T10:00:00.000Z",
      "notes": "Submitted application"
    }]
  },
  "version": 1,
  "deleted": 0,
  "last_modified": "2025-01-15T10:00:00.000Z"
}
```

### Resume Entity
```json
{
  "id": "resume_timestamp_random",
  "data": {
    "id": "resume_timestamp_random",
    "name": "Software Engineer Resume",
    "basics": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "555-1234",
      "summary": "Experienced software engineer...",
      "location": {
        "city": "San Francisco",
        "region": "CA"
      }
    },
    "work": [{
      "name": "Tech Corp",
      "position": "Senior Engineer",
      "startDate": "2020-01-01",
      "endDate": "2023-12-31",
      "highlights": ["Led team of 5", "Built scalable systems"]
    }],
    "education": [/* ... */],
    "skills": [/* ... */],
    "projects": [/* ... */],
    "meta": {
      "theme": "modern",
      "lastModified": "2025-01-15T10:00:00.000Z"
    }
  },
  "version": 1,
  "deleted": 0,
  "last_modified": "2025-01-15T10:00:00.000Z"
}
```

### Cover Letter Entity
```json
{
  "id": "cover_timestamp_random",
  "data": {
    "id": "cover_timestamp_random",
    "name": "Tech Corp Cover Letter",
    "type": "cover_letter", // cover_letter|thank_you|follow_up|networking
    "content": "Dear Hiring Manager...",
    "jobId": "job_123",
    "resumeId": "resume_123",
    "dateCreated": "2025-01-15T10:00:00.000Z"
  },
  "version": 1,
  "deleted": 0,
  "last_modified": "2025-01-15T10:00:00.000Z"
}
```

---

## 🔍 Query Parameters

### Device Identification
Optional headers for tracking devices:
```
x-device-id: browser-uuid-12345
x-device-name: Chrome on MacBook Pro
```

### Authentication
```
Authorization: Bearer <jwt-token>
```

Or via query parameter (less secure):
```
?token=<jwt-token>
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields",
  "message": "Email and password are required"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "message": "No token provided. Please login or create an anonymous session."
}
```

### 403 Forbidden
```json
{
  "error": "Invalid token",
  "message": "Token is invalid or expired. Please login again."
}
```

### 409 Conflict
```json
{
  "error": "Email already registered",
  "message": "An account with this email already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "Sync push failed",
  "message": "Error details here"
}
```

---

## 💡 Tips

### Testing with curl
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/anonymous | jq -r '.token')

# Use token
curl -X GET http://localhost:3000/api/sync/status \
  -H "Authorization: Bearer $TOKEN"
```

### Testing with JavaScript (Browser Console)
```javascript
// Create anonymous session
const authResponse = await fetch('http://localhost:3000/api/auth/anonymous', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
const { token } = await authResponse.json();

// Get sync status
const statusResponse = await fetch('http://localhost:3000/api/sync/status', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const status = await statusResponse.json();
console.log(status);
```

---

## 🎯 Common Workflows

### Initial Sync (Upload All Local Data)
1. Create anonymous session → get token
2. Call `/api/sync/push` with all local entities
3. Call `/api/sync/status` to verify

### Regular Sync (Download Changes)
1. Use stored token
2. Call `/api/sync/pull` with last sync timestamp
3. Merge server changes into IndexedDB
4. Handle any conflicts

### Bidirectional Sync
1. Use stored token
2. Call `/api/sync/full` with local changes and last sync time
3. Process push results and pull data
4. Resolve any conflicts

### Convert to Authenticated
1. Use anonymous token
2. Call `/api/auth/convert` with email/password
3. Store new token
4. All data is preserved under new account

---

_Last Updated: 2025-11-20_
_Server Version: 1.0.0_
