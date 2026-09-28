import axios from 'axios';

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://barberia-s5c0.onrender.com/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});
