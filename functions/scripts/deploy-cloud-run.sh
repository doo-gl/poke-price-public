#!/bin/bash

# set errors to fail script
set -e

service=$1
project=$2

# move to directory that called script
cd $(pwd)

npm run build:cloud-run:$service

oldtag=$(gcloud run services describe pokeprice-$service --region=europe-west2 --format=json | jq '.metadata.annotations."client.knative.dev/user-image"' | grep --perl-regexp '[\d]+"$' -o | grep --perl-regexp '[\d]+' -o)
newtag=0.$(echo $oldtag + 1 | bc)
echo $oldtag
echo $newtag
echo "Deploying new tag:" pokeprice-$service:$newtag

docker build -f "Dockerfile.cloud-run-$service" -t "gcr.io/$project/pokeprice-$service:$newtag" .
docker push "gcr.io/$project/pokeprice-$service:$newtag"
gcloud run deploy "pokeprice-$service" --allow-unauthenticated --region=europe-west2 --image="gcr.io/$project/pokeprice-$service:$newtag"


