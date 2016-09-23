const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const pify = require('pify');
const mkdirpP = pify(mkdirp);
const writeFileP = pify(fs.writeFile);
const readFileP = pify(fs.readFile);
const unlinkP = pify(fs.unlink)
const statP = pify(fs.stat);
const {Readable} = require('stream');

class FsBlobStorage {
    constructor({dir = process.cwd(), depth = 3} = {}) {
        defineConst(this, 'dir', dir);
        defineConst(this, 'depth', depth);
    }

    /**
     * Put binary data into storage.
     *
     * @param  {String} id Item id.
     * @param  {Buffer|Stream} content Data to store.
     * @return {Promise}
     */
    put(id, content) {
        if (content instanceof Readable) {
            return this.putStream(id, content);
        }

        var dir = this.getDirpath(id);

        return mkdirpP(dir)
        .then(() => writeFileP(path.join(dir, id), content))
        .then(() => id);
    }
    /**
     * Get item value as Buffer.
     *
     * @param  {String} id Item id.
     * @return {Promise<Buffer,Error>} Returns item content with promise.
     */
    get(id) {
        var filepath = this.getFilepath(id);

        return readFileP(filepath);
    }
    /**
     * Put file as a stream.
     * @param  {String} id Item id.
     * @param {Stream.Readable} readStream Readable stream.
     * @return {Promise} Result
     */
    putStream(id, readStream) {
        var filepath = this.getFilepath(id);

        return (new Promise(resolve => fs.exists(filepath, resolve)))
        .then(exists => {
            if (exists) {
                throw new Error('File already exists');
            }

            return mkdirpP(path.dirname(filepath))
            .then(() => {
                var writeStream = fs.createWriteStream(filepath);
                return new Promise((resolve, reject) => {
                    readStream.pipe(writeStream);

                    writeStream.on('finish', resolve);
                    writeStream.on('error', reject);
                });
            });
        });
    }
    /**
     * Get file read stream.
     *
     * @param  {String} id Item id.
     * @return {Promise}      Promise returning stram.
     */
    getStream (id) {
        var filepath = this.getFilepath(id);

        return existsP(filepath)
        .then((exists) => {
            if (! exists) {
                throw new Error(`Item "${id}" not found`);
            }

            return fs.createReadStream(filepath);
        });
    }
    /**
     * Remove item from storage.
     *
     * @param  {String} id Item id.
     * @return {Promise}
     */
    delete(id) {
        return unlinkP(
            this.getFilepath(id)
        );
    }
    /**
     * Check if item exists in blob storage
     * @param {String} id Item id.
     * @return {Promise<Boolean>} Return promise returning boolean status.
     */
    has(id) {
        return existsP(
            this.getFilepath(id)
        );
    }


    // UTILS ---------------------------------------------------------------


    getDirpath(id) {
        var parts = [];
        var depth = this.depth;

        for (let i = 0; i < depth; i++) {
            parts.push(id.slice(i * 2, i * 2 + 2));
        }

        return path.join(this.dir, ...parts);
    }

    getFilepath(id) {
        return path.join(
            this.getDirpath(id), id
        );
    }

    getStat(id) {
        return statP(
            this.getFilepath(id)
        );
    }
}

function existsP(filepath) {
    return new Promise((resolve) => fs.exists(filepath, resolve));
}

function defineConst(target, name, value) {
    Object.defineProperty(target, name, {
        value,
        enumerable: true,
        configurable: false,
    });
}

module.exports = FsBlobStorage;
