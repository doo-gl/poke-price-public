
#!/usr/bin/env bash

docker run -d -p 27017:27017 --name pokeprice_mongo mongo:latest --auth
docker cp create_mongo_user.js pokeprice_mongo:create_mongo_user.js
sleep 5
docker exec pokeprice_mongo mongosh admin ./create_mongo_user.js
docker cp initialise_mongo.js pokeprice_mongo:initialise_mongo.js
docker exec pokeprice_mongo mongosh --username pokeprice --password pokeprice admin ./initialise_mongo.js