import { API_BASE, assetUrl, compressImage, readFileAsDataURL } from './utils';

export { API_BASE, assetUrl };

const TOKEN_KEY = 've-token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (t) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {

  }
};

export class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.status = status;
    this.data = data;
    this.code = data.code;
  }
}

export async function api(path, { method = 'GET', body, token = getToken() } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Please check that the backend is running.', 0);
  }
  let data = {};
  try {
    data = await res.json();
  } catch {

  }
  if (!res.ok) {
    if (res.status === 401 && token && data.code !== undefined) window.dispatchEvent(new Event('ve:session-expired'));
    throw new ApiError(data.message || `Request failed (${res.status})`, res.status, data);
  }
  return data;
}

export async function uploadFile(file, { maxWidth = 1400 } = {}) {
  const dataUrl = file.type.startsWith('image/') ? await compressImage(file, maxWidth) : await readFileAsDataURL(file);
  return api('/uploads', { method: 'POST', body: { name: file.name, dataUrl } });
}

export const qs = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '' && v !== 'all') q.set(k, v); });
  const t = q.toString();
  return t ? `?${t}` : '';
};

export async function downloadFromApi(path, filename) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${API_BASE}/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new ApiError('Cannot reach the server. Please check that the backend is running.', 0);
  }
  if (!res.ok) {
    let data = {};
    try { data = await res.json(); } catch {}
    throw new ApiError(data.message || `Download failed (${res.status})`, res.status, data);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
