import axios from 'axios';

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://us-central1-barberia-d8bac.cloudfunctions.net/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});
