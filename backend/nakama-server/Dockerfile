FROM heroiclabs/nakama:3.22.0

COPY ./modules /nakama/data/modules

CMD ["nakama",
"--logger.level", "DEBUG",
"--session.token_expiry_sec", "7200",
"--runtime.path", "/nakama/data/modules"]