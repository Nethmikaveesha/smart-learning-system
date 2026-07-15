import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5001/api",
});

export const predictPassFailRisk = (studentProfileId, data = {}) => {
  return api.post(`/risk/final-predict-auto/${studentProfileId}`, data);
};

export const predictCommerceRisk = (studentProfileId, data = {}) => {
  return api.post(`/risk/multi-class-predict-auto/${studentProfileId}`, data);
};

export default api;