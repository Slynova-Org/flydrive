FROM node:current-alpine

WORKDIR /app

RUN apk add --no-cache \
  python \
  make \
  gcc \
  g++

COPY package.json ./
COPY package-lock.json ./

RUN npm install

COPY . .

CMD ["npm", "run", "test"]
