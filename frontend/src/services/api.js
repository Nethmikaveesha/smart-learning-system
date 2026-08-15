import axios from "axios";

// Local default. Override with VITE_API_URL in frontend/.env for deploy.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
});

// Attach JWT automatically when AuthContext saved it to localStorage.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const predictPassFailRisk = (studentProfileId, data = {}) => {
  return api.post(`/risk/final-predict-auto/${studentProfileId}`, data);
};

/** Run automatic Commerce Stream Model prediction and save to MongoDB. */
export const predictCommerceRisk = (studentProfileId, data = {}) => {
  return api.post(`/risk/multi-class-predict-auto/${studentProfileId}`, data);
};

export const generateCommerceRisk = (studentProfileId, data = {}) =>
  api.post(`/risk/multi-class-predict-auto/${studentProfileId}`, data);

/** Staff list of saved Commerce predictions */
export const getCommerceRisks = () => api.get("/risk/commerce");

/** One student's Commerce prediction history (ownership enforced on API) */
export const getStudentCommerceRiskHistory = (studentProfileId) =>
  api.get(`/risk/commerce/student/${studentProfileId}`);

export default api;