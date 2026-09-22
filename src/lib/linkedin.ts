import crypto from 'crypto';

const PHILIP_USER_ID = '00000000-0000-0000-0000-000000000001';

export function generateState(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || 'default-32-char-encryption-key!!';
  // Derive 32-byte key via SHA256 for MVP
  return crypto.createHash('sha256').update(key).digest();
}

export function encryptToken(token: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(token, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');
    // Store as iv:authTag:encrypted
    return `${iv.toString('base64')}:${authTag}:${encrypted}`;
  } catch (e) {
    console.error('Encryption error', e);
    return token;
  }
}

export function decryptToken(encrypted: string): string {
  try {
    const key = getEncryptionKey();
    const [ivB64, authTagB64, encryptedB64] = encrypted.split(':');
    if (!ivB64 || !authTagB64 || !encryptedB64) return encrypted;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedB64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('Decryption error', e);
    return encrypted;
  }
}

export function getLinkedInAuthUrl(state: string): string {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || process.env.NEXT_PUBLIC_APP_URL + '/api/auth/linkedin/callback' || 'https://personal-linkedin-agent.vercel.app/api/auth/linkedin/callback';
  
  if (!clientId) {
    throw new Error('LINKEDIN_CLIENT_ID not configured');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    state,
  });

  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<any> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || process.env.NEXT_PUBLIC_APP_URL + '/api/auth/linkedin/callback' || 'https://personal-linkedin-agent.vercel.app/api/auth/linkedin/callback';

  if (!clientId || !clientSecret) {
    throw new Error('LinkedIn OAuth not configured');
  }

  const resp = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  return resp.json();
}

export async function getLinkedInUserInfo(accessToken: string): Promise<any> {
  const resp = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Userinfo failed: ${text}`);
  }

  return resp.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<any> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) throw new Error('LinkedIn OAuth not configured');

  const resp = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Refresh failed: ${text}`);
  }

  return resp.json();
}
