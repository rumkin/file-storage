const {defineConst} = require('../lib/utils.js');

class FileStore {
    constructor({dataStore, blobStore}) {
        if (! dataStore) {
            throw new Error('Datastore requried');
        }

        if (! dataStore) {
            throw new Error('Blobstore requried');
        }

        defineConst(this, 'dataStore', dataStore);
        defineConst(this, 'blobStore', blobStore);
    }

    put(id, meta, content) {
        if (typeof meta !== 'object') {
            throw new Error('Meta should be an object');
        }

        return this.blobStore.put(content)
        .then((md5) => Object.assign({}, meta, {md5}))
        .then((meta) => this.dataStore.put(id, meta).then(() => meta));
    }

    has(id) {
        return this.dataStore.has(id);
    }

    get(id) {
        return this.getMeta(id)
        .then((meta) => this.getBlob(meta.md5));
    }

    delete(id) {
        return this.getMeta(id)
        .then((meta) =>
            this.dataStore.delete(id)
            .then(() => this.dataStore.countBlobRefs(meta.md5))
            .then((count) => {
                if (count > 0) {
                    return;
                }

                return this.blobStore.delete(meta.md5);
            })
        );
    }

    setDeleted(id) {
        return this.dataStore.setDeleted(id);
        return this.getMeta(id)
        .then((meta) =>
            this.dataStore.setDeleted(id)
            .then(() => this.dataStore.countBlobRefs(meta.md5))
            .then((count) => {
                if (count > 0) {
                    return;
                }

                return this.blobStore.delete(meta.md5);
            })
        );
    }

    setAccessDate(id, date) {
        return this.dataStore.setAccessDate(id, date);
    }

    getStream(id) {
        return this.getMeta(id)
        .then((meta) => this.getBlobStream(meta.md5)
        .then((stream) => [meta, stream]));
    }

    getMeta(id) {
        if (typeof id === 'object') {
            return Promise.resolve(id);
        }
        else {
            return this.dataStore.get(id);
        }
    }

    listMeta(skip, limit) {
        return this.dataStore.find(skip, limit);
    }

    countMeta(query, params = {}) {
        return this.dataStore.count(query, params);
    }

    getBlob(id) {
        return this.globStorage.get(id);
    }

    getBlobStream(id) {
        return this.blobStore.getStream(id);
    }

    listUpdated(date) {
        return this.dataStore.listUpdated(date);
    }

    countUpdated(date) {
        return this.dataStore.countUpdated(date);
    }
}

module.exports = FileStore;
