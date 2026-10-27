const $ = id => document.getElementById(id);

const form = $('downloadForm');
const urlInput = $('tweetUrlInput');
const submitBtn = $('submitBtn');
const clearBtn = $('clearBtn');
const alertBox = $('alertBox');
const resultCard = $('resultCard');

const TWEET_URL = /^(https?:\/\/)?(www\.|mobile\.)?(twitter\.com|x\.com)\/\w+\/status(es)?\/\d+/i;

function show(el, visible, display = 'block') {
  el.style.display = visible ? display : 'none';
}

function showAlert(message, type = 'error') {
  alertBox.className = `alert-box ${type}`;
  $('alertMessage').textContent = message;
  alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert() {
  alertBox.classList.add('is-hidden');
}

function setLoading(loading) {
  submitBtn.classList.toggle('is-loading', loading);
  submitBtn.disabled = loading;
  urlInput.disabled = loading;
  if (loading) {
    hideAlert();
    resultCard.classList.add('is-hidden');
  }
}

urlInput.addEventListener('input', () => {
  clearBtn.classList.toggle('is-hidden', !urlInput.value.trim());
});

clearBtn.addEventListener('click', () => {
  urlInput.value = '';
  clearBtn.classList.add('is-hidden');
  hideAlert();
  urlInput.focus();
});

$('pasteBtn').addEventListener('click', async () => {
  if (!navigator.clipboard?.readText) {
    showAlert('Seu navegador não deixa colar por aqui. Use Ctrl+V.', 'info');
    return;
  }

  try {
    const text = (await navigator.clipboard.readText()).trim();
    if (!text) return;

    urlInput.value = text;
    clearBtn.classList.remove('is-hidden');
    hideAlert();

    if (TWEET_URL.test(text)) form.requestSubmit();
  } catch {
    showAlert('Sem permissão pra ler a área de transferência. Cole com Ctrl+V.', 'info');
  }
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  const url = urlInput.value.trim();

  if (!TWEET_URL.test(url)) {
    showAlert(url ? 'Link inválido. Formato esperado: https://x.com/usuario/status/123456789' : 'Cole o link de um tweet.');
    urlInput.focus();
    return;
  }

  setLoading(true);

  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Não deu pra processar esse vídeo.');
    }

    renderResult(json.data);
  } catch (err) {
    showAlert(err.message || 'Erro ao buscar o vídeo. Confere se o tweet é público.');
  } finally {
    setLoading(false);
  }
});

function renderAvatar(author) {
  const avatar = $('authorAvatar');
  const fallback = $('authorFallbackAvatar');

  const useFallback = () => {
    show(avatar, false);
    show(fallback, true, 'flex');
    fallback.textContent = (author.name || 'X')[0].toUpperCase();
  };

  if (!author.avatar) return useFallback();

  avatar.onerror = useFallback;
  avatar.src = author.avatar;
  show(avatar, true);
  show(fallback, false);
}

function qualityCard(q) {
  const card = document.createElement('div');
  card.className = q.isHD ? 'quality-card is-hd' : 'quality-card';

  let badge = '';
  if (q.height >= 1080) badge = '<span class="quality-badge">Full HD</span>';
  else if (q.isHD) badge = '<span class="quality-badge">HD</span>';

  const meta = [q.bitrate || 'MP4', q.filesize].filter(Boolean).join(' • ');

  card.innerHTML = `
    <div class="quality-info">
      <div class="quality-header-row">
        <span class="quality-name"></span>
        ${badge}
      </div>
      <div class="quality-meta"><span></span></div>
    </div>
    <div class="quality-actions">
      <a class="download-btn" download>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>Baixar MP4</span>
      </a>
      <a class="direct-link-btn" target="_blank" rel="noopener noreferrer">Abrir link direto</a>
    </div>
  `;

  card.querySelector('.quality-name').textContent = q.quality;
  card.querySelector('.quality-meta span').textContent = meta;
  card.querySelector('.download-btn').href = q.proxyDownloadUrl;
  card.querySelector('.direct-link-btn').href = q.directUrl;

  return card;
}

function renderResult(data) {
  $('authorName').textContent = data.author.name || 'Usuário do X';
  $('authorHandle').textContent = data.author.username || '';
  renderAvatar(data.author);

  const duration = $('videoDuration');
  duration.textContent = data.duration || '';
  show(duration, Boolean(data.duration), 'inline-block');

  const text = $('tweetText');
  text.textContent = data.title || '';
  show(text, Boolean(data.title?.trim()));

  const thumb = $('videoThumbnail');
  if (data.thumbnail) thumb.src = data.thumbnail;
  show(thumb, Boolean(data.thumbnail));

  const list = $('qualitiesList');
  list.replaceChildren();

  if (data.qualities?.length) {
    data.qualities.forEach(q => list.appendChild(qualityCard(q)));
  } else {
    list.innerHTML = '<p class="text-muted">Nenhuma opção de download pra esse vídeo.</p>';
  }

  resultCard.classList.remove('is-hidden');
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
