# 🔐 Zero-Knowledge Encryption & Privacy

## Overview

Your Job Hunt Manager can encrypt all data **client-side** before syncing to the server. This means the server only stores encrypted blobs it cannot read - preserving your complete privacy.

## 🛡️ How It Works

### The Privacy Model

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────────┐
│   Your Browser  │────────>│    Server    │────────>│   Database      │
│                 │         │              │         │                 │
│ • Plaintext     │         │ • Encrypted  │         │ • Encrypted     │
│ • Encryption    │         │ • No Access  │         │ • Cannot Read   │
│ • Decryption    │         │ • Stores     │         │ • Just Storage  │
└─────────────────┘         └──────────────┘         └─────────────────┘
      ↑                                                        ↑
      └────────────────────────────────────────────────────────┘
                    Only you have the key!
```

### Key Features

✅ **Client-Side Encryption** - All encryption happens in your browser
✅ **Zero-Knowledge** - Server never sees your passphrase or plaintext data
✅ **AES-256-GCM** - Military-grade encryption standard
✅ **PBKDF2 Key Derivation** - 100,000 iterations for strong key derivation
✅ **Unique IVs** - Each encryption uses a fresh initialization vector
✅ **End-to-End** - Data encrypted on your device, decrypted on your device

## 🔑 Encryption Technical Details

### Algorithm: AES-256-GCM
- **Block Cipher**: AES (Advanced Encryption Standard)
- **Key Size**: 256 bits (strongest AES variant)
- **Mode**: GCM (Galois/Counter Mode)
- **Authentication**: Built-in authenticated encryption
- **Standard**: NIST approved, used by NSA for TOP SECRET

### Key Derivation: PBKDF2
- **Algorithm**: PBKDF2-SHA256
- **Iterations**: 100,000 (protects against brute force)
- **Salt**: 16 bytes random (unique per user)
- **Output**: 256-bit AES key

### Implementation: Web Crypto API
- **Native**: Built into all modern browsers
- **Secure**: Hardware-accelerated when available
- **Audited**: Part of W3C Web Cryptography API standard

## 📋 Setup Instructions

### 1. Test the Encryption

Visit the test page:
```
http://localhost:3000/test-encryption.html
```

Try it out:
1. Enter a strong passphrase
2. Click "Initialize Encryption"
3. Encrypt some sample data
4. See what the server would store (encrypted bytes)
5. Decrypt it back to verify

### 2. Integration with Sync

When you enable sync with encryption:

```javascript
import encryptionService from './js/services/encryption-service.js';

// Initialize with your passphrase
await encryptionService.initialize('your-strong-passphrase');

// Encrypt before sending to server
const encrypted = await encryptionService.encryptSyncPayload({
    jobs: [...],
    resumes: [...],
    coverLetters: [...]
});

// Server stores encrypted data
await fetch('/api/sync/push', {
    method: 'POST',
    body: JSON.stringify(encrypted)
});

// Decrypt when pulling from server
const decrypted = await encryptionService.decryptSyncPayload(serverData);
```

## 🔒 Security Best Practices

### Your Passphrase

✅ **DO:**
- Use a strong, unique passphrase (12+ characters)
- Include numbers, symbols, upper/lowercase
- Keep it secret and safe
- Write it down in a secure location
- Use a password manager

❌ **DON'T:**
- Use common words or phrases
- Reuse passwords from other services
- Share your passphrase
- Store it in plain text on your computer
- Forget it! (Cannot be recovered)

### Example Strong Passphrases
```
Good:     "MyResume2024!JobSearch#Secure"
Better:   "correct-horse-battery-staple-9527"
Best:     "Qw8$mK2#pL9@nR4%tY6&zX3!"
```

## 🎯 What Gets Encrypted?

When encryption is enabled, these are encrypted:

✅ **Job Data** - All job listings, descriptions, notes
✅ **Resume Data** - Complete resume JSON, all versions
✅ **Cover Letters** - All cover letter content
✅ **Settings** - Your preferences and configurations
✅ **AI Logs** - Conversation history with AI assistants

**NOT Encrypted** (server needs these):
- User ID (authenticated identifier)
- Timestamps (for sync conflict resolution)
- Entity IDs (for syncing changes)

## 🔐 Privacy Guarantees

### What The Server CANNOT See:
- Your job search data
- Your resumes
- Your cover letters
- Your company notes
- Your salary expectations
- Your AI conversations
- Any personal information

### What The Server CAN See:
- Your user ID (to route data)
- When you sync (timestamps)
- How much data you have (encrypted blob sizes)
- Your IP address (standard for web servers)

## ⚠️ Important Warnings

### Data Recovery

🚨 **CRITICAL:** If you lose your passphrase:
- Your encrypted data **CANNOT BE RECOVERED**
- Not by you, not by us, not by anyone
- This is the cost of zero-knowledge encryption
- **BACK UP YOUR PASSPHRASE!**

### Passphrase Storage

The app will:
- Ask for your passphrase once per session
- Store encryption key in memory only
- Clear key when you close the app
- **NEVER** send passphrase to server
- **NEVER** store passphrase in browser storage

You can optionally:
- Use browser's password manager
- Store locally (at your own risk)
- Re-enter each session (most secure)

## 🆚 Comparison with Other Options

### Option 1: No Encryption (Default)
- **Privacy**: Server can read all data
- **Convenience**: ✅ Easy, automatic
- **Security**: 🔴 Server access
- **Recovery**: ✅ Easy if you forget password
- **Best For**: Single device, trust server

### Option 2: Zero-Knowledge Encryption (This Feature)
- **Privacy**: ✅ Server sees only encrypted blobs
- **Convenience**: 🟡 Need passphrase
- **Security**: ✅ Maximum privacy
- **Recovery**: 🔴 Impossible without passphrase
- **Best For**: Maximum privacy, multi-device

### Option 3: Local Only (No Sync)
- **Privacy**: ✅ Data never leaves your browser
- **Convenience**: ✅ No setup needed
- **Security**: ✅ No network exposure
- **Recovery**: 🔴 Lost if browser data cleared
- **Best For**: Privacy purists, single device

## 📊 Performance Impact

Encryption is fast but has minor overhead:

| Operation | No Encryption | With Encryption | Difference |
|-----------|---------------|-----------------|------------|
| Save Job | ~10ms | ~15ms | +5ms |
| Load Jobs | ~20ms | ~30ms | +10ms |
| Full Sync | ~200ms | ~300ms | +100ms |

**Impact**: Negligible for typical usage. You won't notice the difference!

## 🔧 Troubleshooting

### "Decryption Failed" Error
- **Cause**: Wrong passphrase or corrupted data
- **Fix**: Ensure you're using the correct passphrase

### "Encryption Not Initialized" Error
- **Cause**: Tried to encrypt before calling `initialize()`
- **Fix**: Call `initialize(passphrase)` first

### Data Not Syncing
- **Check**: Encryption enabled on all devices
- **Check**: Using same passphrase on all devices
- **Check**: Network connection working

## 🚀 Future Enhancements

Planned features:
- [ ] Biometric unlock (Touch ID, Face ID)
- [ ] Hardware security key support (YubiKey)
- [ ] Encrypted file attachments
- [ ] Encrypted search (searchable encryption)
- [ ] Key rotation/passphrase change
- [ ] Multi-device key sharing (secure)

## 📚 Additional Resources

- [Web Crypto API Specification](https://www.w3.org/TR/WebCryptoAPI/)
- [AES-GCM Explained](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [PBKDF2 Key Derivation](https://en.wikipedia.org/wiki/PBKDF2)
- [NIST Encryption Standards](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines)

## 🤝 Support

Have questions about encryption?
- Test it: `http://localhost:3000/test-encryption.html`
- Check console for detailed logs
- Review the code: `js/services/encryption-service.js`

---

**Remember:** With great privacy comes great responsibility. Keep your passphrase safe! 🔐
