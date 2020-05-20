#!/bin/sh

export $(egrep -v '^#' .env.docker | xargs'\n')

docker-compose up -d -V --build --remove-orphans --force-recreate

# Run testing
docker-compose run flydrive npm run test:local
