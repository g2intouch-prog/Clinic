// Unified Database & Blob Store Client

// Helper to check server-side connection
async function checkServerConnection() {
  try {
    const res = await fetch('/api/health');
    return res.ok;
  } catch (e) {
    return false;
  }
}

class DB {
  static async isCloudAvailable() {
    if (this._cloudAvailable !== undefined) return this._cloudAvailable;

    const conn = await checkServerConnection();
    if (!conn) {
      this._cloudAvailable = false;
      return false;
    }

    try {
      const response = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' })
      });
      if (response.ok) {
        const result = await response.json();
        this._cloudAvailable = !!result.cloudActive;
        return this._cloudAvailable;
      }
    } catch (e) {
      console.warn('Error checking cloud availability:', e);
    }

    this._cloudAvailable = false;
    return false;
  }

  // Generic fetch wrapper for Vercel KV REST Database Action
  static async request(action, payload = {}) {
    const response = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Database action "${action}" failed with status ${response.status}`);
    }

    const result = await response.json();
    if (result && result.data !== undefined) {
      return result.data;
    }
    throw new Error(`Invalid response structure for database action "${action}"`);
  }

  // Clinic Logo Header Upload & Retrieval via Vercel Blobs
  static async uploadClinicHeader(clinicId, file) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch('/api/blobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinicId, dataUrl })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Blob upload failed');
    }

    const result = await response.json();
    return result.url;
  }

  static async getClinicHeader(clinicId) {
    const response = await fetch(`/api/blobs?clinicId=${clinicId}`);
    if (!response.ok) {
      throw new Error('Blob fetch failed');
    }
    const result = await response.json();
    return result.url || '';
  }
}

// Expose DB class globally for other scripts
window.DB = DB;

