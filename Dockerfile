FROM node:current-alpine

WORKDIR /app

RUN apk add --no-cache \
  python \
  make \
  gcc \
  g++

COPY package.json ./
COPY yarn.lock ./

RUN yarn

COPY . .

CMD ["yarn", "run", "test"]
