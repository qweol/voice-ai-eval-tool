/**
 * Vertex AI OAuth2 认证辅助函数
 * 用于生成访问令牌（Access Token）
 */

interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

/**
 * 生成 JWT（JSON Web Token）
 */
async function createJWT(
  serviceAccount: ServiceAccountCredentials,
  scope: string = 'https://www.googleapis.com/auth/cloud-platform'
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1小时后过期

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: serviceAccount.token_uri,
    iat: now,
    exp: expiry,
    scope: scope,
  };

  // Base64URL 编码
  const base64UrlEncode = (obj: any): string => {
    const json = JSON.stringify(obj);
    return Buffer.from(json)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const headerEncoded = base64UrlEncode(header);
  const payloadEncoded = base64UrlEncode(payload);
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  // 使用私钥签名
  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  sign.end();

  const signature = sign.sign(serviceAccount.private_key, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${signatureInput}.${signature}`;
}

/**
 * 获取访问令牌（Access Token）
 */
export async function getVertexAIAccessToken(
  serviceAccountJSON: string
): Promise<string> {
  try {
    // 解码 Base64 编码的服务账号 JSON
    const serviceAccountStr = Buffer.from(serviceAccountJSON, 'base64').toString('utf-8');
    const serviceAccount: ServiceAccountCredentials = JSON.parse(serviceAccountStr);

    // 生成 JWT
    const jwt = await createJWT(serviceAccount);

    // 交换 JWT 获取访问令牌
    const response = await fetch(serviceAccount.token_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Vertex AI 认证失败:', error);
    throw new Error(`Vertex AI authentication failed: ${error}`);
  }
}

/**
 * 访问令牌缓存
 */
interface TokenCache {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCache>();

/**
 * 获取访问令牌（带缓存）
 */
export async function getCachedVertexAIAccessToken(
  serviceAccountJSON: string
): Promise<string> {
  const cacheKey = serviceAccountJSON.substring(0, 50); // 使用前50个字符作为缓存键
  const cached = tokenCache.get(cacheKey);

  // 如果缓存存在且未过期（提前5分钟刷新）
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.token;
  }

  // 获取新令牌
  const token = await getVertexAIAccessToken(serviceAccountJSON);

  // 缓存令牌（1小时后过期）
  tokenCache.set(cacheKey, {
    token,
    expiresAt: Date.now() + 3600 * 1000,
  });

  return token;
}
