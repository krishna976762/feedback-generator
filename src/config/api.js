/**
 * API Configuration
 * Exports environment-specific API settings
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
export const APP_ENV =
  import.meta.env.VITE_ENV || "development";

export const API_ENDPOINTS = {
  SKILLS: "/skills",
  CLIENT_SKILLS: "/clientSkills",
};

/**
 * Build full API URL for a given endpoint
 * @param {string} endpoint - The API endpoint (e.g., '/skills', '/clientSkills')
 * @returns {string} - Full API URL
 */
export const getApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

export default {
  API_BASE_URL,
  APP_ENV,
  API_ENDPOINTS,
  getApiUrl,
};
