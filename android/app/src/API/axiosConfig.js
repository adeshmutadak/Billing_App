import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: "https://billingservice-production-60e1.up.railway.app/v1/api", // change base URL
});

// Add token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
