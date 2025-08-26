const axios = require('axios');
const crypto = require('crypto');

/**
 * TokenProvider handles OAuth2 client-credentials tokens per issuer with caching and rotation
 */
class TokenProvider {
  constructor() {
    this.cache = new Map(); // key: issuer, value: { token, expiresAt, scope }
    this.clockSkewMs = 30 * 1000; // 30s skew
    this.defaultTimeoutMs = 15000;
  }

  /**
   * Get a bearer token for an issuer (e.g., 'shetab', 'national', 'central')
   */
  async getToken(issuer) {
    const config = this.getIssuerConfig(issuer);
    if (!config) {
      throw new Error(`OAuth config not found for issuer: ${issuer}`);
    }

    const cached = this.cache.get(issuer);
    const now = Date.now();
    if (cached && cached.expiresAt - this.clockSkewMs > now) {
      return cached.token;
    }

    const token = await this.fetchClientCredentialsToken(config);
    const expiresAt = now + (token.expires_in ? (token.expires_in * 1000) : (55 * 60 * 1000));

    this.cache.set(issuer, {
      token: token.access_token,
      expiresAt,
      scope: config.scope || ''
    });

    return token.access_token;
  }

  /**
   * Force refresh token for issuer
   */
  async refreshToken(issuer) {
    this.cache.delete(issuer);
    return this.getToken(issuer);
  }

  /**
   * Fetch token via client credentials
   */
  async fetchClientCredentialsToken(config) {
    const form = new URLSearchParams();
    form.append('grant_type', 'client_credentials');
    if (config.scope) form.append('scope', config.scope);
    // optional JTI to prevent replay on some providers
    form.append('jti', this.generateJti());

    const resp = await axios.post(
      config.tokenUrl,
      form.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: {
          username: config.clientId,
          password: config.clientSecret
        },
        timeout: this.defaultTimeoutMs,
        httpsAgent: config.httpsAgent
      }
    );

    if (!resp.data || !resp.data.access_token) {
      throw new Error('OAuth response missing access_token');
    }

    return resp.data;
  }

  /**
   * Read issuer config from environment
   */
  getIssuerConfig(issuer) {
    switch (issuer) {
      case 'shetab':
        return this.readConfig('SHETAB');
      case 'national':
        return this.readConfig('NATIONAL');
      case 'central':
        return this.readConfig('CENTRAL');
      default:
        return null;
    }
  }

  readConfig(prefix) {
    const tokenUrl = process.env[`${prefix}_OAUTH_TOKEN_URL`];
    const clientId = process.env[`${prefix}_OAUTH_CLIENT_ID`];
    const clientSecret = process.env[`${prefix}_OAUTH_CLIENT_SECRET`];
    const scope = process.env[`${prefix}_OAUTH_SCOPE`];

    if (!(tokenUrl && clientId && clientSecret)) return null;

    return {
      tokenUrl,
      clientId,
      clientSecret,
      scope,
      httpsAgent: undefined // may be set by mTLS factory per caller
    };
  }

  generateJti() {
    return crypto.randomBytes(16).toString('hex');
  }
}

module.exports = TokenProvider;