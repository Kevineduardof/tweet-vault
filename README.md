# TweetVault (Vault Downloader) 🎬

> Aplicação web e API moderna e rápida para extração e download de vídeos do **X (Twitter)** em múltiplas qualidades.

![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)

---

## 🚀 Sobre o Projeto

O **TweetVault** é um downloader de vídeos do X/Twitter construído com Node.js e Express. Ele extrai os links diretos das diferentes resoluções disponíveis (720p, 1080p, 480p, etc.) e fornece um proxy seguro de download para contornar bloqueios de CORS e forçar o salvamento direto no dispositivo do usuário.

### ✨ Funcionalidades

- **Múltiplas resoluções**: Identifica e lista automaticamente todas as qualidades disponíveis em MP4.
- **Download direto via Proxy**: Sem problemas com restrições de CORS da CDN do Twitter.
- **Segurança integrada**:
  - Proteção contra SSRF validando URLs autorizadas da CDN do Twitter/X.
  - Sanitização de nomes de arquivos.
  - Proteção de headers HTTP com `helmet`.
  - Rate limiting configurável por IP via `express-rate-limit`.
- **Interface Web Limpa**: Frontend responsivo em HTML5, CSS3 e JavaScript Vanilla.
- **Pronto para Produção**: Imagem Docker otimizada baseada em Alpine com `yt-dlp` e `ffmpeg` pré-instalados.

---

## 🛠️ Tecnologias Utilizadas

- **Backend**: [Node.js](https://nodejs.org/) (ES Modules), [Express](https://expressjs.com/)
- **Extração**: [yt-dlp](https://github.com/yt-dlp/yt-dlp) + [ffmpeg](https://ffmpeg.org/)
- **Segurança**: [Helmet](https://helmetjs.github.io/), [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Containerização**: Docker, Docker Compose

---

## 📋 Pré-requisitos

Você pode rodar o projeto de duas formas:

1. **Via Docker (Recomendado)**: Necessário apenas ter o [Docker](https://www.docker.com/) e o Docker Compose instalados (não precisa instalar Node.js nem yt-dlp na sua máquina).
2. **Localmente (Manual)**:
   - [Node.js](https://nodejs.org/) 18 ou superior.
   - [yt-dlp](https://github.com/yt-dlp/yt-dlp) instalado e disponível no `PATH` do sistema (ou configurado via `.env`).
   - [FFmpeg](https://ffmpeg.org/) (opcional, para mesclagem de formatos quando necessário).

---

## ⚡ Como Rodar

### Opção 1: Usando Docker Compose (Recomendado)

Clone o repositório e execute:

```bash
# Subir o container
docker compose up -d --build
```

Acesse no seu navegador: `http://localhost:3000`

Para parar o serviço:
```bash
docker compose down
```

---

### Opção 2: Rodando Localmente com Node.js

1. Clone o repositório e acesse a pasta:
   ```bash
   git clone https://github.com/Kevineduardof/vault-downloader.git
   cd vault-downloader
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Crie e configure o arquivo `.env`:
   ```bash
   cp .env.example .env
   ```

   *(No Windows PowerShell: `Copy-Item .env.example .env`)*

4. Inicie o servidor:
   ```bash
   # Modo de desenvolvimento com auto-reload
   npm run dev

   # Ou modo padrão
   npm start
   ```

5. Acesse: `http://localhost:3000`

---

## ⚙️ Variáveis de Ambiente (`.env`)

| Variável | Padrão | Descrição |
| :--- | :--- | :--- |
| `PORT` | `3000` | Porta onde o servidor Express irá rodar |
| `NODE_ENV` | `development` | Ambiente de execução (`development` / `production`) |
| `YT_DLP_PATH` | `yt-dlp` | Caminho do executável do yt-dlp (ex: `C:\tools\yt-dlp.exe`) |
| `RATE_LIMIT_MAX` | `30` | Máximo de requisições por IP na janela de tempo |
| `RATE_LIMIT_WINDOW_MINUTES` | `15` | Janela de tempo em minutos para o rate limit |

---

## 📡 Endpoints da API

### `POST /api/download`
Extrai os dados e as qualidades de vídeo a partir de uma URL de tweet.

**Body (JSON):**
```json
{
  "url": "https://x.com/username/status/1234567890"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "1234567890",
    "text": "Conteúdo do tweet...",
    "duration": "0:30",
    "thumbnail": "https://pbs.twimg.com/...",
    "qualities": [
      {
        "quality": "1080p",
        "size": "15.4 MB",
        "directUrl": "https://video.twimg.com/...",
        "proxyDownloadUrl": "/api/proxy-download?url=..."
      }
    ]
  }
}
```

### `GET /api/proxy-download?url={url}&filename={filename}`
Faz o streaming do arquivo de mídia da CDN do X diretamente para o usuário com o header `Content-Disposition: attachment`.

### `GET /health`
Endpoint de healthcheck para monitoramento e Docker.

---

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).
