// encryption-service.js - Client-side encryption for zero-knowledge sync
// Uses Web Crypto API to encrypt data before sending to server
// Server never sees plaintext - true privacy!

class EncryptionService {
    constructor() {
        this.encryptionKey = null;
        this.salt = null;
        this.iv = null;
    }

    /**
     * Initialize encryption with user's passphrase
     * Derives a strong encryption key from the passphrase
     * @param {string} passphrase - User's encryption passphrase
     * @param {string} existingSalt - Optional: use existing salt for decryption
     */
    async initialize(passphrase, existingSalt = null) {
        try {
            // Use existing salt or generate new one
            if (existingSalt) {
                this.salt = this.base64ToBuffer(existingSalt);
            } else {
                this.salt = crypto.getRandomValues(new Uint8Array(16));
            }

            // Derive encryption key from passphrase using PBKDF2
            const passphraseKey = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(passphrase),
                { name: 'PBKDF2' },
                false,
                ['deriveKey']
            );

            // Derive AES-GCM key (256-bit)
            this.encryptionKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: this.salt,
                    iterations: 100000, // High iteration count for security
                    hash: 'SHA-256'
                },
                passphraseKey,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );

            console.log('✅ Encryption initialized (zero-knowledge mode)');
            return {
                salt: this.bufferToBase64(this.salt),
                success: true
            };

        } catch (error) {
            console.error('❌ Encryption initialization failed:', error);
            throw new Error('Failed to initialize encryption: ' + error.message);
        }
    }

    /**
     * Encrypt data before sending to server
     * @param {any} data - Data to encrypt (will be JSON stringified)
     * @returns {Object} - { encryptedData: base64, iv: base64 }
     */
    async encrypt(data) {
        if (!this.encryptionKey) {
            throw new Error('Encryption not initialized. Call initialize() first.');
        }

        try {
            // Generate random IV for this encryption
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // Convert data to bytes
            const dataBytes = new TextEncoder().encode(JSON.stringify(data));

            // Encrypt using AES-GCM
            const encryptedBuffer = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                this.encryptionKey,
                dataBytes
            );

            return {
                encryptedData: this.bufferToBase64(encryptedBuffer),
                iv: this.bufferToBase64(iv),
                encrypted: true,
                version: 1 // Encryption version for future upgrades
            };

        } catch (error) {
            console.error('❌ Encryption failed:', error);
            throw new Error('Failed to encrypt data: ' + error.message);
        }
    }

    /**
     * Decrypt data received from server
     * @param {string} encryptedData - Base64 encrypted data
     * @param {string} iv - Base64 initialization vector
     * @returns {any} - Decrypted data (parsed from JSON)
     */
    async decrypt(encryptedData, iv) {
        if (!this.encryptionKey) {
            throw new Error('Encryption not initialized. Call initialize() first.');
        }

        try {
            // Convert from base64 to buffers
            const encryptedBuffer = this.base64ToBuffer(encryptedData);
            const ivBuffer = this.base64ToBuffer(iv);

            // Decrypt using AES-GCM
            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: ivBuffer },
                this.encryptionKey,
                encryptedBuffer
            );

            // Convert bytes back to string and parse JSON
            const decryptedText = new TextDecoder().decode(decryptedBuffer);
            return JSON.parse(decryptedText);

        } catch (error) {
            console.error('❌ Decryption failed:', error);
            throw new Error('Failed to decrypt data. Wrong passphrase or corrupted data.');
        }
    }

    /**
     * Encrypt entire sync payload
     * @param {Object} entities - { jobs: [], resumes: [], coverLetters: [], settings: {} }
     * @returns {Object} - Encrypted payload
     */
    async encryptSyncPayload(entities) {
        try {
            const encrypted = {};

            // Encrypt each entity type
            for (const [entityType, data] of Object.entries(entities)) {
                if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
                    const result = await this.encrypt(data);
                    encrypted[entityType] = {
                        data: result.encryptedData,
                        iv: result.iv,
                        encrypted: true,
                        version: result.version
                    };
                }
            }

            return encrypted;

        } catch (error) {
            console.error('❌ Failed to encrypt sync payload:', error);
            throw error;
        }
    }

    /**
     * Decrypt entire sync response
     * @param {Object} encryptedEntities - Encrypted entities from server
     * @returns {Object} - Decrypted entities
     */
    async decryptSyncPayload(encryptedEntities) {
        try {
            const decrypted = {};

            for (const [entityType, encryptedData] of Object.entries(encryptedEntities)) {
                if (encryptedData && encryptedData.encrypted) {
                    decrypted[entityType] = await this.decrypt(
                        encryptedData.data,
                        encryptedData.iv
                    );
                } else {
                    // Data not encrypted (backward compatibility)
                    decrypted[entityType] = encryptedData;
                }
            }

            return decrypted;

        } catch (error) {
            console.error('❌ Failed to decrypt sync payload:', error);
            throw error;
        }
    }

    /**
     * Test encryption/decryption with sample data
     */
    async test() {
        try {
            const testData = { message: 'Hello, encrypted world!', timestamp: Date.now() };
            console.log('Testing encryption with:', testData);

            const encrypted = await this.encrypt(testData);
            console.log('✅ Encrypted:', encrypted);

            const decrypted = await this.decrypt(encrypted.encryptedData, encrypted.iv);
            console.log('✅ Decrypted:', decrypted);

            const match = JSON.stringify(testData) === JSON.stringify(decrypted);
            console.log(match ? '✅ Encryption test PASSED' : '❌ Encryption test FAILED');

            return match;

        } catch (error) {
            console.error('❌ Encryption test failed:', error);
            return false;
        }
    }

    /**
     * Check if encryption is initialized
     */
    isInitialized() {
        return this.encryptionKey !== null;
    }

    /**
     * Clear encryption key from memory
     */
    clear() {
        this.encryptionKey = null;
        this.salt = null;
        console.log('🔒 Encryption key cleared from memory');
    }

    // Helper methods for base64 encoding/decoding
    bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    base64ToBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

// Create singleton instance
const encryptionService = new EncryptionService();

// Make globally available
window.encryptionService = encryptionService;

export default encryptionService;
