const https = require('https');
const fs = require('fs');

/**
 * Create HTTPS Agent with optional mTLS for a given prefix (e.g., 'SHETAB', 'NATIONAL', 'CENTRAL')
 */
function createMtlsAgent(prefix, env = process.env) {
  const certPath = env[`${prefix}_CERT_PATH`];
  const keyPath = env[`${prefix}_PRIVATE_KEY_PATH`];
  const caPath = env[`${prefix}_CA_PATH`];

  const options = {
    rejectUnauthorized: env.NODE_ENV === 'production'
  };

  if (certPath && keyPath) {
    options.cert = fs.readFileSync(certPath);
    options.key = fs.readFileSync(keyPath);
  }

  if (caPath) {
    options.ca = fs.readFileSync(caPath);
  }

  return new https.Agent(options);
}

module.exports = { createMtlsAgent };