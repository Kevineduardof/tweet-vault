import { Router } from 'express';
import { Readable } from 'node:stream';
import { validateTwitterUrl, validateMediaProxyUrl } from '../services/validator.js';
import { extractTweetVideo } from '../services/extractor.js';
import { logger } from '../utils/logger.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export const apiRouter = Router();

apiRouter.post('/download', async (req, res) => {
  const validation = validateTwitterUrl(req.body.url);
  if (!validation.isValid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  try {
    const video = await extractTweetVideo(validation.normalizedUrl, validation.tweetId);

    // o link da CDN não força download e tem CORS, então passa pelo nosso proxy
    const qualities = video.qualities.map(q => {
      const filename = `tweetvault_${video.id}_${q.quality.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
      return {
        ...q,
        directUrl: q.url,
        proxyDownloadUrl: `/api/proxy-download?url=${encodeURIComponent(q.url)}&filename=${encodeURIComponent(filename)}`
      };
    });

    res.json({ success: true, data: { ...video, qualities } });
  } catch (err) {
    logger.error('/api/download:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Erro ao processar o vídeo.' });
  }
});

apiRouter.get('/proxy-download', async (req, res) => {
  const { url, filename } = req.query;

  if (typeof url !== 'string' || !url) {
    return res.status(400).send('Parâmetro "url" é obrigatório.');
  }

  // só deixa baixar das CDNs do twitter (evita SSRF)
  if (!validateMediaProxyUrl(url)) {
    logger.warn(`proxy bloqueado: ${url}`);
    return res.status(403).send('Domínio não permitido.');
  }

  const safeFilename = (typeof filename === 'string' && filename ? filename : 'video.mp4')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.+/g, '.')
    .replace(/^_+/, '');

  try {
    const upstream = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

    if (!upstream.ok || !upstream.body) {
      return res.status(upstream.ok ? 502 : upstream.status).send('Erro ao buscar o vídeo na CDN.');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'video/mp4');

    const length = upstream.headers.get('content-length');
    if (length) res.setHeader('Content-Length', length);

    const stream = Readable.fromWeb(upstream.body);
    stream.on('error', err => {
      logger.error('erro no stream:', err.message);
      if (!res.headersSent) res.status(500).send('Falha na transmissão.');
      else res.destroy();
    });
    stream.pipe(res);
  } catch (err) {
    logger.error('/api/proxy-download:', err.message);
    if (!res.headersSent) res.status(500).send('Erro ao processar o download.');
  }
});
