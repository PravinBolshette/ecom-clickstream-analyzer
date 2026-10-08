// ==============================================================================
//  Hadoop Clickstream Analytics — Client API Service
//  File: src/services/api.js
// ==============================================================================

const API_BASE = import.meta.env.VITE_API || (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:4000' : '');

async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${endpoint}`);
  }
  return response.json();
}

export async function fetchSummary() {
  return fetchJson('/api/summary');
}

export async function fetchCategories() {
  return fetchJson('/api/categories');
}

export async function fetchProducts(params = {}) {
  const q = new URLSearchParams();
  if (params.category && params.category !== 'All') q.set('category', params.category);
  if (params.minViews !== undefined) q.set('minViews', params.minViews);
  if (params.viewPctl !== undefined) q.set('viewPctl', params.viewPctl);
  if (params.convPctl !== undefined) q.set('convPctl', params.convPctl);
  const queryStr = q.toString() ? `?${q.toString()}` : '';
  return fetchJson(`/api/products${queryStr}`);
}

export async function fetchDevices() {
  return fetchJson('/api/devices');
}

export async function fetchLocations() {
  return fetchJson('/api/locations');
}

export async function fetchHourly() {
  return fetchJson('/api/hourly');
}

export async function fetchFunnel() {
  return fetchJson('/api/funnel');
}

export async function fetchCluster() {
  return fetchJson('/api/cluster');
}
