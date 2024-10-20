#!/bin/bash
set -e
cd $(pwd)

service=$1

rm -rf src/web-app-v2/.next
rm -rf build/$service

npm run build:ssr:compile

mkdir -p build/$service
cp -r src/web-app-v2/client/.next build/$service
cp src/web-app-v2/client/next.config.js build/$service
cp src/web-app-v2/client/package.json build/$service

npm --prefix build/$service install