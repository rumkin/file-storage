task:init() {
    task:initial_deps
    npm init
}

task:initial_deps() {
    set -e
    bake dev mocha
    bake dev istanbul
}

# Install node package
task:i() {
    npm i $@
}

# Install dev dependency
task:dev() {
    npm i --save-dev $@
}

task:cov() {
    npm run cov
}

task:test() {
    local DIR=`mktemp -d`
    ./bin/cli.js $DIR &
    PID=$!

    function finish {
        kill -s 9 $PID
    }

    trap finish EXIT

    sleep 1

    local UUID=`uuidgen`

    task:test_upload

    curl "http://localhost:8080/storage/updates"
    echo ""

    rm -rf $DIR
}

task:test_upload() {
    local PORT=${1:-8080}
    local UUID=${2:-`uuidgen`}

    echo 'hello' | curl -X POST \
        --data-binary @- \
        -s \
        -H 'Content-Type: text/plain' \
        -H 'Content-Length: 5' \
        -H 'Content-Disposition: attachment; filename=hello.txt' \
        "http://localhost:$PORT/files/$UUID"
}

task:build:docker() {
    docker build -t "$1" Dockerfile
}
