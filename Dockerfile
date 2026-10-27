FROM node:20-alpine

# python3 pro yt-dlp, ffmpeg pra quando ele precisa juntar áudio e vídeo
RUN apk add --no-cache python3 ffmpeg curl ca-certificates \
 && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node . .
USER node

ENV NODE_ENV=production \
    PORT=3000 \
    YT_DLP_PATH=/usr/local/bin/yt-dlp

EXPOSE 3000
CMD ["node", "src/server.js"]
