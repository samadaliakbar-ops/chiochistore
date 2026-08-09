// Netlify Function: shared data store for the Chiochi storefront.
//
// Why this exists: the site itself is a static single HTML file that used to
// keep everything (products, settings, accounts, orders) in the browser's
// localStorage. localStorage is per-browser/per-device, so admin changes made
// on one computer never showed up for a visitor — or even the same admin —
// opening the site on a different device. This function gives the site one
// shared place to read/write that data, backed by Netlify Blobs (zero-config
// storage built into Netlify, no database to set up).
//
// GET  -> returns the current shared data as JSON
// POST -> replaces the shared data with the JSON body (last write wins)

const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'chiochi-data';
const KEY = 'app-state';

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const store = getStore(STORE_NAME);

  try {
    if (event.httpMethod === 'GET') {
      const data = await store.get(KEY, { type: 'json' });
      return { statusCode: 200, headers, body: JSON.stringify(data || {}) };
    }

    if (event.httpMethod === 'POST') {
      let payload;
      try {
        payload = JSON.parse(event.body || '{}');
      } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
      }
      await store.setJSON(KEY, payload);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err && err.message || err) }) };
  }
};
