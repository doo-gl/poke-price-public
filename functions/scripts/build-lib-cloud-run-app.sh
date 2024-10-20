#!/bin/bash

# set errors to fail script
set -e

service=$1

# move to directory that called script
cd $(pwd)

rm -rf build/$service
rm -rf lib

# compile to lib
npm run build:cloud-run:compile:$service

mkdir -p build/$service
cp -r lib build/$service
cp -r node_modules build/$service