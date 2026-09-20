/**
 * UIU Rescue Rover - WebSocket Client Service
 * 
 * Provides robust connection management, auto-reconnect with backoff,
 * and typed message listener subscription.
 */

class WebSocketClient {
  constructor() {
    this.ws = null;
    this.url = null;
    this.listeners = new Map(); // eventType -> Set of callbacks
    this.statusListeners = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 10000;
    this.reconnectTimeout = null;
    this.status = 'disconnected'; // 'connected' | 'connecting' | 'disconnected'
    this.forcedClose = false;
  }

  connect(customUrl) {
    this.forcedClose = false;
    if (customUrl) {
      this.url = customUrl;
    } else if (!this.url) {
      // Check localStorage first
      let savedUrl = null;
      try {
        savedUrl = localStorage.getItem('urrt_ws_url');
      } catch (e) {}

      if (savedUrl) {
        this.url = savedUrl;
      } else {
        const envUrl = import.meta.env.VITE_WS_URL;
        if (envUrl) {
          this.url = envUrl;
        } else {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          this.url = `${protocol}//${window.location.hostname}:3001`;
        }
      }
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this._setStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log(`[WS-Client] Connected to ${this.url}`);
        this.reconnectAttempts = 0;
        this._setStatus('connected');

        // Identify as dashboard
        this.send({
          type: 'register',
          role: 'dashboard'
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this._dispatch(message);
        } catch (err) {
          console.warn('[WS-Client] Malformed packet received:', event.data);
        }
      };

      this.ws.onclose = () => {
        this._setStatus('disconnected');
        this.ws = null;
        if (!this.forcedClose) {
          this._scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WS-Client] Socket encountered an error:', err);
      };
    } catch (err) {
      console.error('[WS-Client] Initialization error:', err);
      this._setStatus('disconnected');
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);
    console.log(`[WS-Client] Reconnecting in ${(delay / 1000).toFixed(1)}s...`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  _setStatus(status) {
    this.status = status;
    for (const callback of this.statusListeners) {
      try {
        callback(status);
      } catch (err) {
        console.error('[WS-Client] Status listener error:', err);
      }
    }
  }

  _dispatch(message) {
    const type = message.type || 'unknown';

    // Notify specific type listeners
    if (this.listeners.has(type)) {
      for (const callback of this.listeners.get(type)) {
        try {
          callback(message);
        } catch (err) {
          console.error(`[WS-Client] Listener error for ${type}:`, err);
        }
      }
    }

    // Notify wildcard '*' listeners
    if (this.listeners.has('*')) {
      for (const callback of this.listeners.get('*')) {
        try {
          callback(message);
        } catch (err) {
          console.error('[WS-Client] Wildcard listener error:', err);
        }
      }
    }
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);

    // Return unbind function
    return () => {
      if (this.listeners.has(type)) {
        this.listeners.get(type).delete(callback);
      }
    };
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    return false;
  }

  disconnect() {
    this.forcedClose = true;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
    }
    this.ws = null;
    this._setStatus('disconnected');
  }

  updateUrl(newUrl) {
    if (!newUrl) return;
    try {
      localStorage.setItem('urrt_ws_url', newUrl);
    } catch (e) {}
    this.url = newUrl;
    this.forcedClose = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    this.connect(newUrl);
  }

  resetUrl() {
    try {
      localStorage.removeItem('urrt_ws_url');
    } catch (e) {}
    this.url = null;
    this.disconnect();
    this.connect();
  }
}

export const wsClient = new WebSocketClient();
export default wsClient;
