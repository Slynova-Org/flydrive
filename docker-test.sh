#!/bin/sh

export $(egrep -v '^#' .env.docker | xargs -d '\n')

docker-compose up -d -V --build --remove-orphans --force-recreate localstack-s3;

# Run testing
docker-compose run flydrive yarn run test
