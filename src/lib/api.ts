export const getApiBaseUrl = () => {
  // Use the current hostname to dynamically point to the backend
  // This allows the app to work on both localhost and the local network (e.g., 192.168.x.x)
  const hostname = window.location.hostname;
  const port = "8000";
  return `http://${hostname}:${port}`;
};

export const API_BASE_URL = getApiBaseUrl();
