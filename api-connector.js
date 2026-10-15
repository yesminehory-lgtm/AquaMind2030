/**
 * AquaMind Frontend ↔ Backend connector
 * Include this script in your existing index.html (or merge the functions)
 *
 * <script src="api-connector.js"></script>
 */

const AQUAMIND_API = window.AQUAMIND_API_URL || 'http://localhost:4000/api';

const AquaMindAPI = {
  async health() {
    const r = await fetch(`${AQUAMIND_API}/health`);
    return r.json();
  },

  async login(email, password) {
    const r = await fetch(`${AQUAMIND_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (data.token) localStorage.setItem('aquamind_token', data.token);
    return data;
  },

  async getFarms() {
    const r = await fetch(`${AQUAMIND_API}/farms`);
    return r.json();
  },

  async getFarm(id) {
    const r = await fetch(`${AQUAMIND_API}/farms/${id}`);
    return r.json();
  },

  async createFarm(payload) {
    const token = localStorage.getItem('aquamind_token');
    const r = await fetch(`${AQUAMIND_API}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    return r.json();
  },

  async getWeather(farmId) {
    const r = await fetch(`${AQUAMIND_API}/farms/${farmId}/weather`);
    return r.json();
  },

  async getIrrigationPlan(farmId) {
    const r = await fetch(`${AQUAMIND_API}/farms/${farmId}/irrigation-plan`);
    return r.json();
  },

  async getLatestSensors(fieldId) {
    const r = await fetch(`${AQUAMIND_API}/sensors/field/${fieldId}/latest`);
    return r.json();
  },

  async postReading(deviceId, value, unit = '%') {
    const r = await fetch(`${AQUAMIND_API}/sensors/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, value, unit }),
    });
    return r.json();
  },

  async getAlerts(farmId) {
    const url = farmId ? `${AQUAMIND_API}/alerts?farm_id=${farmId}` : `${AQUAMIND_API}/alerts`;
    const r = await fetch(url);
    return r.json();
  },
};

// Expose globally for the existing inline script
window.AquaMindAPI = AquaMindAPI;

console.log('🌱 AquaMind API connector ready →', AQUAMIND_API);
