FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates fonts-dejavu fontconfig \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY server ./server
COPY public ./public
COPY .env.example ./

RUN mkdir -p /app/renders /app/projects /app/jobs

EXPOSE 8080
CMD ["node","server/index.js"]
