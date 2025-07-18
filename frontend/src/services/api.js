const API_BASE_URL = 'https://qr-4z80.onrender.com/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('authToken');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async updateProfile(updates) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // QR Code endpoints
  async getQRCodes(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/qrcodes${queryString ? `?${queryString}` : ''}`);
  }

  async createQRCode(qrData) {
    return this.request('/qrcodes', {
      method: 'POST',
      body: JSON.stringify(qrData),
    });
  }

  async getQRCode(id) {
    return this.request(`/qrcodes/${id}`);
  }

  async updateQRCode(id, updates) {
    return this.request(`/qrcodes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteQRCode(id) {
    return this.request(`/qrcodes/${id}`, {
      method: 'DELETE',
    });
  }

  async deleteAllQRCodes() {
    return this.request('/qrcodes', {
      method: 'DELETE',
    });
  }

  async toggleFavorite(id) {
    return this.request(`/qrcodes/${id}/favorite`, {
      method: 'PATCH',
    });
  }

  async getStats() {
    return this.request('/qrcodes/stats/overview');
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

export default new ApiService();