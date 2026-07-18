/**
 * PebbleBridge browser mock.
 *
 * This file implements the window.pebbleBridge API defined in bridge-spec.md so
 * that config pages can be developed and tested in a normal browser before the
 * native bridge lands in coredevices/mobileapp.
 *
 * LIMITATIONS:
 * - fetch() uses the browser's native fetch, so CORS must be disabled (e.g. via a
 *   browser extension or a CORS-disabled browser launch) when talking to a real
 *   Home Assistant instance.
 * - WebSocket uses the browser's native WebSocket and has the same CORS limits.
 * - storage uses localStorage and is therefore not secure; the native bridge will
 *   use the mobile app's encrypted storage instead.
 *
 * To use this mock, load it before your config page logic:
 *
 *   <script src="bridge-mock.js"></script>
 *   <script>
 *     if (!window.pebbleBridge) {
 *       console.error('PebbleBridge mock failed to load');
 *     }
 *   </script>
 */
(function () {
  'use strict';

  if (window.pebbleBridge) {
    console.warn('PebbleBridge already exists; mock will not overwrite it.');
    return;
  }

  const BRIDGE_VERSION = '1.0.0-mock';
  const STORAGE_PREFIX = 'pebbleBridgeMock:';

  // Parse the current URL hash into an object, mirroring how Pebble currently
  // passes initial settings to the config page.
  function parseConfigFromHash() {
    const hash = window.location.hash ? window.location.hash.substring(1) : '';
    if (!hash) {
      try {
        const stored = localStorage.getItem('watch_config');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.error('PebbleBridge mock: failed to parse stored watch_config', e);
      }
      return {};
    }
    try {
      return JSON.parse(decodeURIComponent(hash));
    } catch (e) {
      console.error('PebbleBridge mock: failed to parse URL hash config', e);
      return {};
    }
  }

  function makeResponse(raw) {
    const body = raw.body || '';
    const rawText = typeof body === 'string' ? body : JSON.stringify(body);
    return {
      ok: raw.ok,
      status: raw.status,
      statusText: raw.statusText,
      headers: raw.headers || {},
      text: function () {
        return Promise.resolve(rawText);
      },
      json: function () {
        try {
          return Promise.resolve(typeof body === 'string' ? JSON.parse(body) : body);
        } catch (err) {
          console.error(
            '[PebbleBridge mock] JSON parse failed. First 500 chars of response:\n' +
            rawText.substring(0, 500)
          );
          throw err;
        }
      }
    };
  }

  async function mockedFetch(url, options) {
    options = options || {};
    const method = (options.method || 'GET').toUpperCase();
    const headers = Object.assign({}, options.headers || {});
    const timeout = options.timeout || 30000;

    // Browser testing helper: route fetch through a local CORS proxy while
    // keeping the real URL for WebSocket. Set window.PEBBLE_BRIDGE_PROXY in
    // the page before loading the mock, e.g.:
    //   window.PEBBLE_BRIDGE_PROXY = 'http://localhost:8001';
    let fetchUrl = url;
    if (window.PEBBLE_BRIDGE_PROXY && url.indexOf(window.PEBBLE_BRIDGE_PROXY) !== 0) {
      fetchUrl = window.PEBBLE_BRIDGE_PROXY;
      headers['X-Pebble-Target'] = url;
    }

    console.log('[PebbleBridge mock] fetch', method, url, '->', fetchUrl, headers);

    // Use the browser's native fetch. In a real native bridge this call would be
    // executed by OkHttp / NSURLSession and would not be subject to CORS.
    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, timeout);

    try {
      const res = await window.fetch(fetchUrl, {
        method: method,
        headers: headers,
        body: options.body,
        signal: controller.signal
      });
      clearTimeout(timer);

      const headerMap = {};
      res.headers.forEach(function (value, key) {
        headerMap[key] = value;
      });

      const text = await res.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch (e) {
        body = text;
      }

      return makeResponse({
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        headers: headerMap,
        body: body
      });
    } catch (err) {
      clearTimeout(timer);

      if (err && err.name === 'AbortError') {
        throw new Error('Request timed out after ' + timeout + 'ms');
      }

      const msg = err && err.message ? err.message : 'Request failed';

      if (msg.toLowerCase().indexOf('decoding') !== -1) {
        throw new Error(
          msg + '.\n' +
          'The response body and its Content-Encoding header do not match. ' +
          'If you are using a proxy, make sure it strips the Content-Encoding ' +
          'header when it decompresses the body. The native mobile-app bridge ' +
          'will not have this issue.'
        );
      }

      // Browsers throw a generic TypeError for CORS, network, DNS, and
      // certificate failures, so it is impossible to tell from the error alone
      // what went wrong. Surface the original error and list the common causes.
      const help =
        'The browser mock failed to complete the request. Common causes are:\n' +
        '1. CORS: the page origin is not allowed by Home Assistant.\n' +
        '2. Mixed content: an https page or file:// page cannot reach an http HA URL.\n' +
        '3. Certificate error: HA uses a self-signed cert not trusted by the browser.\n' +
        '4. Network error: wrong URL, HA unreachable, or firewall blocking the port.\n' +
        'Try serving this page from http://localhost:8000 (see bridge-spec.md).\n' +
        'The native mobile-app bridge will not have these browser limitations.';

      throw new Error(msg + '.\n' + help);
    }
  }

  // Minimal WebSocket-like wrapper around the browser's native WebSocket.
  function MockWebSocket(url, protocols) {
    const self = this;
    const ws = new WebSocket(url, protocols);

    this.url = url;
    this.protocol = ws.protocol;
    this.readyState = ws.readyState;
    this.bufferedAmount = ws.bufferedAmount;
    this.extensions = ws.extensions;
    this.binaryType = ws.binaryType || 'blob';

    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;

    ws.onopen = function (event) {
      self.readyState = ws.readyState;
      if (typeof self.onopen === 'function') {
        self.onopen(event);
      }
    };
    ws.onmessage = function (event) {
      if (typeof self.onmessage === 'function') {
        self.onmessage(event);
      }
    };
    ws.onerror = function (event) {
      if (typeof self.onerror === 'function') {
        self.onerror(event);
      }
    };
    ws.onclose = function (event) {
      self.readyState = ws.readyState;
      if (typeof self.onclose === 'function') {
        self.onclose(event);
      }
    };

    this.send = function (data) {
      ws.send(data);
    };
    this.close = function (code, reason) {
      ws.close(code, reason);
    };
  }
  MockWebSocket.CONNECTING = 0;
  MockWebSocket.OPEN = 1;
  MockWebSocket.CLOSING = 2;
  MockWebSocket.CLOSED = 3;

  const storage = {
    get: async function (key) {
      const prefixed = STORAGE_PREFIX + key;
      const value = localStorage.getItem(prefixed);
      if (value === null) {
        return null;
      }
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    },
    set: async function (key, value) {
      const prefixed = STORAGE_PREFIX + key;
      localStorage.setItem(prefixed, JSON.stringify(value));
    },
    remove: async function (key) {
      const prefixed = STORAGE_PREFIX + key;
      localStorage.removeItem(prefixed);
    }
  };

  function closeConfig(returnValue) {
    console.log('[PebbleBridge mock] close() called with:', returnValue);
    try {
      localStorage.setItem('watch_config', JSON.stringify(returnValue));
    } catch (e) {
      console.error('PebbleBridge mock: failed to persist config on close', e);
    }
    alert(
      'PebbleBridge mock: config would close here.\n' +
      'In the native app this returns the value to the watch.\n' +
      'The value has been saved to localStorage as watch_config for inspection.'
    );
  }

  window.pebbleBridge = {
    version: BRIDGE_VERSION,
    fetch: mockedFetch,
    WebSocket: MockWebSocket,
    storage: storage,
    config: parseConfigFromHash(),
    close: closeConfig
  };

  console.log('[PebbleBridge mock] initialized v' + BRIDGE_VERSION);
})();
