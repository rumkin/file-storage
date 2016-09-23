function task:init {
    task:initial_deps
    npm init
}

function task:initial_deps {
    set -e
    bake dev mocha
    bake dev istanbul
}

# Install node package
function task:i {
    npm i $@
}

# Install dev dependency
function task:dev {
    npm i --save-dev $@
}

function task:cov {
    npm run cov
}
