function defineConst(target, name, value) {
    Object.defineProperty(target, name, {
        value,
        enumerable: true,
        configurable: false,
    });
}

function promiseSeries(test, step) {
    return new Promise((resolve, reject) => {
        function spin() {
            if (test()) {
                Promise.resolve(step())
                .then(spin)
                .catch(reject);
            }
            else {
                resolve();
            }
        }

        spin();
    });
}

exports.defineConst = defineConst;
exports.promiseSeries = promiseSeries;
