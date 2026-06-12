FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build || true # Build if TS, otherwise ignore

EXPOSE 8002

CMD ["npm", "start"]
