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

// Netlify is supposed to auto-configure Blobs inside Functions with zero
// setup, but some sites hit a known bug (MissingBlobsEnvironmentError) where
// that auto-configuration doesn't kick in. As a reliable fallback, we also
// accept an explicit Site ID + Personal Access Token via environment
// variables (set these in Site settings > Environment variables):
//   BLOBS_SITE_ID  = your Project ID (Project configuration > General)
//   BLOBS_TOKEN    = a Personal Access Token (User settings > Applications)
function openStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: STORE_NAME, siteID, token });
  }
  return getStore(STORE_NAME);
}

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

  let store;
  try {
    store = openStore();
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'store-init-failed: ' + String(err && err.message || err) }) };
  }

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
