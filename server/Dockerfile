FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY *.mjs ./
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 USAGE_DB_PATH=/data/usage.sqlite
USER node
EXPOSE 3001
CMD ["node", "start.mjs"]
