const TWEET_HOSTS = new Set([
  'twitter.com',
  'www.twitter.com',
  'mobile.twitter.com',
  'x.com',
  'www.x.com',
  'mobile.x.com'
]);

const MEDIA_HOSTS = ['video.twimg.com', 'pbs.twimg.com', 'ton.twimg.com'];

// aceita /user/status/ID, /i/status/ID e /i/web/status/ID
const STATUS_PATH = /\/(?:i\/status|i\/web\/status|[^/]+\/status(?:es)?)\/(\d+)/i;

export function validateTwitterUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { isValid: false, error: 'Informe uma URL.' };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { isValid: false, error: 'URL inválida.' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || !TWEET_HOSTS.has(parsed.hostname.toLowerCase())) {
    return { isValid: false, error: 'O link precisa ser do X/Twitter (ex: https://x.com/usuario/status/123...)' };
  }

  const match = parsed.pathname.match(STATUS_PATH);
  if (!match) {
    return { isValid: false, error: 'Não achei o ID do tweet nessa URL.' };
  }

  const tweetId = match[1];
  return { isValid: true, tweetId, normalizedUrl: `https://x.com/i/status/${tweetId}` };
}

export function validateMediaProxyUrl(mediaUrl) {
  try {
    const { protocol, hostname } = new URL(mediaUrl);
    const host = hostname.toLowerCase();
    return protocol === 'https:' && MEDIA_HOSTS.some(d => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}
