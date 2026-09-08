// OFBiz API Client

const BASE_URL = '/heavyequipment/control/api';

// ==================== Types ====================

export interface LoginResponse {
  success: boolean;
  userLoginId?: string;
  partyId?: string;
  displayName?: string;
  roles?: string[];
  isPlatformAdmin?: boolean;
  hasHeavyEquipmentAccess?: boolean;
  tenantId?: string;
  tenantName?: string;
  error?: string;
}

export interface SessionResponse {
  authenticated: boolean;
  userLoginId?: string;
  partyId?: string;
  displayName?: string;
  roles?: string[];
  isPlatformAdmin?: boolean;
  tenantId?: string;
  tenantName?: string;
}

// ==================== Auth Functions ====================

/**
 * Login to OFBiz using form-encoded credentials (OFBiz expects form params, not JSON)
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  const url = `${BASE_URL}/login`;
  
  // OFBiz LoginWorker expects USERNAME and PASSWORD as request parameters
  const params = new URLSearchParams();
  params.append('USERNAME', username);
  params.append('PASSWORD', password);

  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return { success: false, error: 'Invalid response from server' };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Network error. Is OFBiz running?' };
  }
}

/**
 * Check if the current session is authenticated
 */
export async function checkSession(): Promise<SessionResponse> {
  try {
    const response = await fetch(`${BASE_URL}/session`, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return { authenticated: false };
  } catch {
    return { authenticated: false };
  }
}

/**
 * Logout — invalidate OFBiz session
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${BASE_URL}/session?action=logout`, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
    });
  } catch {
    // Even if logout fails, we clear local state
  }
}

// ==================== Generic API Fetch ====================

/**
 * Generic fetch wrapper for OFBiz APIs
 */
export async function ofbizFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers = {
    'Accept': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    // OFBiz might return HTML if there's a routing error (like auth redirect), 
    // so we need to handle JSON parsing carefully.
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      const text = await response.text();
      console.error('Expected JSON, got:', text.substring(0, 200));
      throw new Error('Invalid JSON response from server');
    }
  } catch (error) {
    console.error(`OFBiz Fetch Error [${endpoint}]:`, error);
    throw error;
  }
}
