FROM heroiclabs/nakama:3.22.0

COPY ./modules /nakama/data/modules

ENTRYPOINT /bin/sh -c "/nakama/nakama migrate up --database.address "$DATABASE_URL?sslmode=require" || echo 'Migration failed, continuing...' ; exec /nakama/nakama --name nakama1 --database.address "$DATABASE_URL?sslmode=require" --logger.level DEBUG --runtime.path /nakama/data/modules --runtime.js_entrypoint match.js --session.token_expiry_sec 7200 --socket.server_key defaultkey"
