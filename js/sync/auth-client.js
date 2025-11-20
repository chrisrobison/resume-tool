// auth-client.js - Client-side authentication service
// Handles JWT tokens, authentication flows, and user session management

import { getDataService } from '../data-service.js';

const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : `${window.location.protocol}//${window.location.host}/api`;

class AuthClient {
  constructor() {
    this.token = null;
    this.userId = null;
    this.isAnonymous = null;
    this.email = null;
    this.displayName = null;
    this.initialized = false;
    this.listeners = [];
  }

  /**
   * Initialize auth client - load stored token
   */
  async initialize() {
    if (this.initialized) {
      return this;
    }

    try {
      const dataService = await getDataService();

      // Try to load stored auth from settings
      const settings = await dataService.getSettings('default');

      if (settings && settings.auth) {
        this.token = settings.auth.token;
        this.userId = settings.auth.userId;
        this.isAnonymous = settings.auth.isAnonymous;
        this.email = settings.auth.email;
        this.displayName = settings.auth.displayName;

        // Verify token is still valid
        try {
          await this.getStatus();
        } catch (error) {
          console.warn('Stored token is invalid, clearing auth');
          await this.clearAuth();
        }
      }

      this.initialized = true;
      this.notifyListeners('initialized');

      return this;
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.initialized = true;
      return this;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.token && !!this.userId;
  }

  /**
   * Get current token
   */
  getToken() {
    return this.token;
  }

  /**
   * Get current user ID
   */
  getUserId() {
    return this.userId;
  }

  /**
   * Get device ID (generate or retrieve from localStorage)
   */
  getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  /**
   * Get device name
   */
  getDeviceName() {
    const stored = localStorage.getItem('deviceName');
    if (stored) return stored;

    // Generate default device name
    const platform = navigator.platform || 'Unknown';
    const browser = this.getBrowserName();
    return `${browser} on ${platform}`;
  }

  /**
   * Set device name
   */
  setDeviceName(name) {
    localStorage.setItem('deviceName', name);
  }

  /**
   * Get browser name
   */
  getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Browser';
  }

  /**
   * Create anonymous session
   */
  async createAnonymous() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/anonymous`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deviceName: this.getDeviceName()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create anonymous session');
      }

      const data = await response.json();

      await this.setAuth({
        token: data.token,
        userId: data.userId,
        isAnonymous: true,
        email: null,
        displayName: 'Anonymous User'
      });

      this.notifyListeners('login', { isAnonymous: true });

      return data;
    } catch (error) {
      console.error('Anonymous auth error:', error);
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(email, password, displayName = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          displayName
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const data = await response.json();

      await this.setAuth({
        token: data.token,
        userId: data.userId,
        isAnonymous: false,
        email: data.email,
        displayName: data.displayName
      });

      this.notifyListeners('register', { email: data.email });

      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login with email and password
   */
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();

      await this.setAuth({
        token: data.token,
        userId: data.userId,
        isAnonymous: false,
        email: data.email,
        displayName: data.displayName
      });

      this.notifyListeners('login', { email: data.email });

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Convert anonymous user to authenticated
   */
  async convertToAuthenticated(email, password, displayName = null) {
    if (!this.isAuthenticated() || !this.isAnonymous) {
      throw new Error('Can only convert anonymous users');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          email,
          password,
          displayName
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Conversion failed');
      }

      const data = await response.json();

      await this.setAuth({
        token: data.token,
        userId: data.userId,
        isAnonymous: false,
        email: data.email,
        displayName: data.displayName
      });

      this.notifyListeners('convert', { email: data.email });

      return data;
    } catch (error) {
      console.error('Convert error:', error);
      throw error;
    }
  }

  /**
   * Get authentication status from server
   */
  async getStatus() {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get status');
      }

      const data = await response.json();

      // Update local state
      this.email = data.email;
      this.displayName = data.displayName;
      this.isAnonymous = data.isAnonymous;

      return data;
    } catch (error) {
      console.error('Status error:', error);
      throw error;
    }
  }

  /**
   * Refresh JWT token
   */
  async refreshToken() {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to refresh token');
      }

      const data = await response.json();

      // Update token
      this.token = data.token;
      await this.saveAuth();

      this.notifyListeners('tokenRefresh');

      return data;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Logout (clear local auth)
   */
  async logout() {
    try {
      if (this.isAuthenticated()) {
        // Notify server (optional, just for logging)
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        }).catch(() => {}); // Ignore errors
      }

      await this.clearAuth();
      this.notifyListeners('logout');

    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Set authentication data
   */
  async setAuth({ token, userId, isAnonymous, email, displayName }) {
    this.token = token;
    this.userId = userId;
    this.isAnonymous = isAnonymous;
    this.email = email;
    this.displayName = displayName;

    await this.saveAuth();
  }

  /**
   * Save auth to IndexedDB
   */
  async saveAuth() {
    try {
      const dataService = await getDataService();

      const settings = await dataService.getSettings('default') || { id: 'default' };
      settings.auth = {
        token: this.token,
        userId: this.userId,
        isAnonymous: this.isAnonymous,
        email: this.email,
        displayName: this.displayName,
        lastUpdated: new Date().toISOString()
      };

      await dataService.saveSettings(settings);
    } catch (error) {
      console.error('Error saving auth:', error);
    }
  }

  /**
   * Clear authentication
   */
  async clearAuth() {
    this.token = null;
    this.userId = null;
    this.isAnonymous = null;
    this.email = null;
    this.displayName = null;

    try {
      const dataService = await getDataService();
      const settings = await dataService.getSettings('default') || { id: 'default' };
      delete settings.auth;
      await dataService.saveSettings(settings);
    } catch (error) {
      console.error('Error clearing auth:', error);
    }
  }

  /**
   * Add event listener
   */
  addEventListener(callback) {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify listeners of auth events
   */
  notifyListeners(event, data = {}) {
    this.listeners.forEach(callback => {
      try {
        callback({
          event,
          isAuthenticated: this.isAuthenticated(),
          isAnonymous: this.isAnonymous,
          userId: this.userId,
          email: this.email,
          displayName: this.displayName,
          ...data
        });
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      'x-device-id': this.getDeviceId(),
      'x-device-name': this.getDeviceName(),
      ...options.headers
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    // Handle 401 (token expired)
    if (response.status === 401) {
      // Try to refresh token
      try {
        await this.refreshToken();

        // Retry request with new token
        headers.Authorization = `Bearer ${this.token}`;
        return await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers
        });
      } catch (error) {
        // Token refresh failed, clear auth
        await this.clearAuth();
        this.notifyListeners('sessionExpired');
        throw new Error('Session expired, please login again');
      }
    }

    return response;
  }
}

// Export singleton instance
let authClientInstance = null;

export async function getAuthClient() {
  if (!authClientInstance) {
    authClientInstance = new AuthClient();
    await authClientInstance.initialize();
  }
  return authClientInstance;
}

export default AuthClient;
