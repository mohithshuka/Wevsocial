FROM node:20-alpine

# Recent Alpine base images don't ship OpenSSL by default. Prisma's query
# and schema engine binaries link against libssl at runtime, and without it
# they fail to start (surfacing as "Could not parse schema engine response").
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["./docker-entrypoint.sh"]
