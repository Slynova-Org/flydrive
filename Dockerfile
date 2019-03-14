FROM node:current-alpine

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./

RUN apk add --no-cache \
  python \
  make \
  gcc \
  g++ \
  && yarn

RUN yarn

COPY . .
CMD ["yarn", "run", "test"]
