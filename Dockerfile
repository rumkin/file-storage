FROM mhart/alpine-node:latest

WORKDIR "/app"

COPY . "/app"

RUN npm install .

ENV VERBOSE=1

EXPOSE 8080

CMD ["node", "bin/cli.js", "/data"]
