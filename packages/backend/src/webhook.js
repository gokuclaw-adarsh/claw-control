/**
 * @fileoverview Webhook dispatcher for Claw Control events.
 * 
 * Dispatches HTTP POST requests to configured webhook URLs when events occur.
 * Supports HMAC signature verification and async (non-blocking) delivery.
 * 
 * @module webhook
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/** @type {Array<{url: string, events: string[], secret?: string, enabled?: boolean}>} */
let webhooks = [];

/** @type {string[]} Supported event types */
const SUPPORTED_EVENTS = [
  'task-created',
  'task-updated',
  'agent-status-changed',
  'message-created'
];

/**
 * Paths to search for webhooks configuration file.
 * @type {string[]}
 */
const WEBHOOK_CONFIG_PATHS = [
  path.resolve(process.cwd(), 'config', 'webhooks.yaml'),
  path.resolve(process.cwd(), 'config', 'webhooks.yml'),
  path.resolve(__dirname, '..', '..', '..', 'config', 'webhooks.yaml'),
  path.resolve(__dirname, '..', '..', '..', 'config', 'webhooks.yml'),
];

/**
 * Loads webhook configuration from YAML file.
 * @returns {Array<object>} Array of webhook configurations
 */
function loadWebhooksConfig() {
  for (const configPath of WEBHOOK_CONFIG_PATHS) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        const config = yaml.load(content);
        
        if (config && Array.isArray(config.webhooks)) {
          webhooks = config.webhooks.filter(wh => wh.url && wh.enabled !== false);
          console.log(`[webhook] Loaded ${webhooks.length} webhook(s) from ${configPath}`);
          return webhooks;
        }
      }
    } catch (err) {
      console.error(`[webhook] Error loading config from ${configPath}:`, err.message);
    }
  }
  
  console.log('[webhook] No webhook configuration found. Webhooks disabled.');
  webhooks = [];
  return webhooks;
}

/**
 * Generates HMAC-SHA256 signature for webhook payload.
 * @param {string} payload - JSON stringified payload
 * @param {string} secret - Secret key for HMAC
 * @returns {string} HMAC signature prefixed with 'sha256='
 */
function generateSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Checks if a webhook should receive a specific event.
 * @param {object} webhook - Webhook configuration
 * @param {string} event - Event name
 * @returns {boolean} True if webhook should receive the event
 */
function shouldReceiveEvent(webhook, event) {
  if (!webhook.events || webhook.events.length === 0) {
    return false;
  }
  return webhook.events.includes('*') || webhook.events.includes(event);
}

/**
 * Dispatches an event to a single webhook URL.
 * @param {object} webhook - Webhook configuration
 * @param {string} event - Event name
 * @param {object} data - Event data payload
 * @returns {Promise<void>}
 */
async function dispatchToWebhook(webhook, event, data) {
  const payload = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data
  });

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'ClawControl-Webhook/1.0',
    'X-Claw-Event': event,
  };

  if (webhook.secret) {
    headers['X-Claw-Signature'] = generateSignature(payload, webhook.secret);
  }

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payload,
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      console.error(`[webhook] Failed to deliver to ${webhook.url}: ${response.status} ${response.statusText}`);
    } else {
      console.log(`[webhook] Delivered ${event} to ${webhook.url}`);
    }
  } catch (err) {
    console.error(`[webhook] Error delivering to ${webhook.url}:`, err.message);
  }
}

/**
 * Dispatches an event to all configured webhooks that listen for it.
 * Fires asynchronously (does not block the calling code).
 * 
 * @param {string} event - Event name (e.g., 'task-created')
 * @param {object} data - Event data payload
 * @returns {void}
 * 
 * @example
 * dispatchWebhook('task-created', { id: 1, title: 'New task', status: 'backlog' });
 */
function dispatchWebhook(event, data) {
  if (!SUPPORTED_EVENTS.includes(event)) {
    console.warn(`[webhook] Unknown event type: ${event}`);
    return;
  }

  const matchingWebhooks = webhooks.filter(wh => shouldReceiveEvent(wh, event));
  
  if (matchingWebhooks.length === 0) {
    return;
  }

  // Fire async - don't block the main request
  setImmediate(() => {
    Promise.all(
      matchingWebhooks.map(wh => dispatchToWebhook(wh, event, data))
    ).catch(err => {
      console.error('[webhook] Dispatch error:', err.message);
    });
  });
}

/**
 * Reloads webhook configuration from disk.
 * @returns {Array<object>} Updated webhook configurations
 */
function reloadWebhooks() {
  return loadWebhooksConfig();
}

/**
 * Returns the current webhook configuration.
 * @returns {Array<object>} Current webhook configurations
 */
function getWebhooks() {
  return webhooks;
}

// Load config on module initialization
loadWebhooksConfig();

module.exports = {
  dispatchWebhook,
  reloadWebhooks,
  getWebhooks,
  loadWebhooksConfig,
  SUPPORTED_EVENTS
};
