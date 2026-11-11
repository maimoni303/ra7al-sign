# رحّال للتوقيع — صورة Docker لسيرفر ZimaOS
# المرحلة 1: بناء أداة التوقيع zsign (مفتوحة المصدر، رخصة MIT) من نسخة محددة
FROM node:22-bookworm-slim AS zsign
ARG ZSIGN_COMMIT=9299685bab7ef99827e06e5dfda93af747386590
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl g++ make pkg-config libssl-dev \
 && rm -rf /var/lib/apt/lists/*
RUN mkdir /src && curl -fsSL "https://codeload.github.com/zhlynn/zsign/tar.gz/${ZSIGN_COMMIT}" | tar -xz -C /src --strip-components=1 \
 && cd /src/build/linux && make -j"$(nproc)" \
 && mkdir -p /out && cp "$(find /src -type f -name zsign -perm -u+x | head -1)" /out/zsign && /out/zsign -v

# المرحلة 2: التطبيق
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl libssl3 tini \
 && rm -rf /var/lib/apt/lists/*
COPY --from=zsign /out/zsign /usr/local/bin/zsign
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY public ./public
ENV NODE_ENV=production DATA_DIR=/data PORT=8787
VOLUME /data
EXPOSE 8787
HEALTHCHECK --interval=60s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:8787/api/ping').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
LABEL org.opencontainers.image.title="RA7AL Sign" org.opencontainers.image.description="رحّال للتوقيع — iOS app signing on your home server" org.opencontainers.image.source="https://github.com/maimoni303/ra7al-sign" org.opencontainers.image.licenses="MIT"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server/index.js"]
