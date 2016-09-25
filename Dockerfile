FROM mhart/alpine-node:latest

WORKDIR "/app"

COPY . "/app"

RUN npm install .

EXPOSE 8080

CMD ["node", "bin/cli.js", "/var/data"]
