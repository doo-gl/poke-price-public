#!/bin/bash
set -e
cd $(pwd)

echo "INSTALLING FUNCTION MODULES"
npm install
echo "INSTALLING WEBAPP MODULES"
npm --prefix src/web-app-v2/client install