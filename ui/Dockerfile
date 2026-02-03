FROM node:20-alpine AS build
WORKDIR /app
COPY package.json tsconfig.json next.config.js ./
COPY app ./app
RUN npm install
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/.next ./.next
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start"]
