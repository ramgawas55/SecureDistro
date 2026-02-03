FROM node:20-alpine AS build
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
COPY rules ./rules
RUN npm install
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/rules ./rules
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]
