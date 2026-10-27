import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from '../utils/logger.js';

const execFileAsync = promisify(execFile);

const YT_DLP_BIN = process.env.YT_DLP_PATH || 'yt-dlp';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return null;
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

function formatDuration(seconds) {
  if (!seconds) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

async function extractWithYtDlp(url) {
  const { stdout } = await execFileAsync(
    YT_DLP_BIN,
    ['--dump-single-json', '--no-warnings', '--no-playlist', url],
    { timeout: 20000, maxBuffer: 10 * 1024 * 1024 }
  );

  const data = JSON.parse(stdout);

  // só mp4 direto; o yt-dlp também lista os m3u8, que não servem pra download simples
  const formats = (data.formats || []).filter(f =>
    f.vcodec && f.vcodec !== 'none' &&
    /^https?:\/\//.test(f.url || '') &&
    (f.ext === 'mp4' || f.url.includes('.mp4'))
  );

  if (!formats.length) {
    throw new Error('Nenhum vídeo MP4 encontrado nesse tweet.');
  }

  // a mesma resolução pode vir repetida com bitrates diferentes, fica com o maior
  const byHeight = new Map();

  for (const f of formats) {
    const height = f.height || 0;
    const bitrate = Math.round(f.tbr || f.vbr || 0);
    const key = height || f.format_id;

    if (byHeight.has(key) && byHeight.get(key).rawBitrate >= bitrate) continue;

    let size = f.filesize || f.filesize_approx;
    if (!size && bitrate && data.duration) {
      size = Math.round((bitrate * 1000 / 8) * data.duration);
    }

    byHeight.set(key, {
      quality: height ? `${height}p` : 'Padrão',
      height,
      width: f.width || 0,
      isHD: height >= 720,
      bitrate: bitrate ? `${bitrate} kbps` : null,
      filesize: formatFileSize(size),
      url: f.url,
      ext: 'mp4',
      rawBitrate: bitrate
    });
  }

  const qualities = [...byHeight.values()]
    .sort((a, b) => b.height - a.height)
    .map(({ rawBitrate, ...q }) => q);

  return {
    source: 'yt-dlp',
    id: data.id,
    title: data.description || data.title || '',
    author: {
      name: data.uploader || 'Usuário do X',
      username: data.uploader_id ? `@${data.uploader_id}` : ''
    },
    thumbnail: data.thumbnail || null,
    duration: formatDuration(data.duration),
    qualities
  };
}

// endpoint público que o twitter usa nos embeds, não precisa de token de verdade
async function extractWithSyndication(tweetId) {
  const res = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=x&lang=pt`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }
  });

  if (res.status === 404) {
    throw new Error('Tweet não encontrado (apagado ou conta privada).');
  }
  if (!res.ok) {
    throw new Error(`Syndication respondeu ${res.status}.`);
  }

  const data = await res.json();
  const media = data.mediaDetails?.find(m => m.type === 'video' || m.type === 'animated_gif');

  if (!media?.video_info?.variants) {
    throw new Error('Esse tweet não tem vídeo nem GIF.');
  }

  const variants = media.video_info.variants
    .filter(v => v.content_type === 'video/mp4' && v.url)
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  if (!variants.length) {
    throw new Error('Nenhuma versão MP4 disponível.');
  }

  const qualities = variants.map(v => {
    let quality = 'Padrão';
    let height = 0;
    let width = 0;

    // a resolução costuma vir na url: /vid/1280x720/... ou /vid/avc1/720x1280/...
    const dims = v.url.match(/\/(\d+)x(\d+)\//);
    if (dims) {
      const [w, h] = [Number(dims[1]), Number(dims[2])];
      // vídeo vertical vem invertido, então usa o menor lado
      height = Math.min(w, h);
      width = Math.max(w, h);
      quality = `${height}p`;
    } else if (v.bitrate >= 2000000) {
      quality = '1080p';
    } else if (v.bitrate >= 800000) {
      quality = '720p';
    } else if (v.bitrate >= 400000) {
      quality = '480p';
    } else if (v.bitrate) {
      quality = '360p';
    }

    return {
      quality,
      height,
      width,
      isHD: height >= 720 || v.bitrate >= 800000,
      bitrate: v.bitrate ? `${Math.round(v.bitrate / 1000)} kbps` : null,
      filesize: null,
      url: v.url,
      ext: 'mp4'
    };
  });

  const user = data.user;

  return {
    source: 'syndication',
    id: data.id_str || tweetId,
    title: data.text || '',
    author: {
      name: user?.name || 'Usuário do X',
      username: user ? `@${user.screen_name}` : '',
      avatar: user?.profile_image_url_https || null
    },
    thumbnail: media.media_url_https || null,
    duration: formatDuration(media.video_info.duration_millis / 1000),
    qualities
  };
}

// tenta o yt-dlp primeiro; se não estiver instalado ou falhar, cai pro syndication
export async function extractTweetVideo(normalizedUrl, tweetId) {
  let ytDlpError;

  try {
    return await extractWithYtDlp(normalizedUrl);
  } catch (err) {
    ytDlpError = err;
    logger.warn(`yt-dlp falhou (${err.message}), tentando syndication`);
  }

  try {
    return await extractWithSyndication(tweetId);
  } catch (err) {
    logger.error(`syndication falhou: ${err.message}`);
    // ENOENT = yt-dlp não instalado, aí o erro do syndication é mais útil
    const ytDlpMissing = ytDlpError.code === 'ENOENT';
    throw new Error(ytDlpMissing ? err.message : ytDlpError.message);
  }
}
