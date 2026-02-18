import api from './api';

export const authService = {
  // Login
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success) {
      const { token, ...user } = response.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      return response.data;
    }
    throw new Error('Login failed');
  },

  // Signup
  async signup(username, email, password, role) {
    const response = await api.post('/auth/signup', { 
      username, 
      email, 
      password, 
      role 
    });
    if (response.data.success) {
      const { token, ...user } = response.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      return response.data;
    }
    throw new Error('Signup failed');
  },

  // Logout
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  // Get current user
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if authenticated
  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  // Get token
  getToken() {
    return localStorage.getItem('token');
  }
};