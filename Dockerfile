FROM node:20-alpine

# nginx = statika (HTML, fotky, video), node = /api/contact (poptávkový formulář)
RUN apk add --no-cache nginx && mkdir -p /run/nginx

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY api/ /app/api/
COPY server.js start.sh /app/
COPY nginx.conf /etc/nginx/http.d/default.conf

COPY . /usr/share/nginx/html/
RUN cd /usr/share/nginx/html \
 && rm -rf api server.js start.sh package.json package-lock.json node_modules Dockerfile .dockerignore nginx.conf vercel.json scripts \
 && chmod +x /app/start.sh

EXPOSE 80
CMD ["/app/start.sh"]
