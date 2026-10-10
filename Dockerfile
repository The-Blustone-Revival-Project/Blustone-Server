FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY tests ./tests
COPY assets ./assets
COPY config ./config
COPY resources/reference ./resources/reference
COPY resources/manifests ./resources/manifests
RUN npm run build
ENV BLUSTONE_PORT=8080
EXPOSE 8080
CMD ["node", "scripts/start-local.mjs"]
