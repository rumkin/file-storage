function defineConst(target, name, value) {
    Object.defineProperty(target, name, {
        value,
        enumerable: true,
        configurable: false,
    });
}

exports.defineConst = defineConst;
