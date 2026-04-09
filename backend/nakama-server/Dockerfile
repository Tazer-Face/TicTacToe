FROM heroiclabs/nakama:3.22.0

COPY ./modules /nakama/data/modules

CMD nakama migrate up --database.address "$NAKAMA_DATABASE_ADDRESS" && \
    nakama --database.address "$NAKAMA_DATABASE_ADDRESS" --logger.level DEBUG --runtime.path /nakama/data/modules
