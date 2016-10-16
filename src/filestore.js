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

        return this.blobStore.put(id, content)
        .then(() => this.dataStore.put(id, meta));
    }

    has(id) {
        return this.blobStore.has(id);
    }

    get(id) {
        return Promise.all([
            this.getMeta(id),
            this.getBlob(id),
        ]);
    }

    delete(id) {
        return Promise.all([
            this.dataStore.delete(id),
            this.blobStore.delete(id),
        ]);
    }

    setDeleted(id) {
        return this.dataStore.setDeleted(id);
    }

    setAccessDate(id, date) {
        return this.dataStore.setAccessDate(id, date);
    }

    getStream(id) {
        return Promise.all([
            this.getMeta(id),
            this.getBlobStream(id),
        ]);
    }

    getMeta(id) {
        return this.dataStore.get(id);
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
