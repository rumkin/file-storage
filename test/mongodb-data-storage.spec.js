'use strict';

const {MongoClient} = require('mongodb');
const {MongodbDataStorage} = require('..');
const assert = require('assert');
const uuid = require('node-uuid');

describe('MongodbDataStorage', () => {
    var storage;

    it('Should instantiate ', () => {
        return MongoClient.connect('mongodb://localhost:27017/test').then((db) => {
            storage = new MongodbDataStorage({
                db,
                collection: 'files',
            });
        });
    });

    it('#put should return valid item', () => {
        var id = uuid();

        return storage.put(id, {
            contentType: 'text/plain',
            contentLength: 1,
            tags: ['test'],
        })
        .then((result) => {
            assert.equal(typeof result, 'object', 'result is object');
            [
                '_id',
                'contentLength',
                'contentType',
                'createDate',
                'updateDate',
                'accessDate',
                'isDeleted',
                'tags',
            ]
            .forEach((prop) => {
                assert.ok(result.hasOwnProperty(prop), `result has \`${prop}\``);
            });
            assert.deepEqual(result.tags, ['test'], 'Tags returned');
        });
    });

    it('#get should return item', () => {
        var id = uuid();

        return storage.put(id, {
            contentType: 'text/plain',
            contentLength: 1,
            tags: ['test'],
        })
        .then(() => storage.get(id))
        .then((result) => {
            assert.equal(typeof result, 'object', 'result is object');
            [
                '_id',
                'contentLength',
                'contentType',
                'createDate',
                'updateDate',
                'accessDate',
                'isDeleted',
                'tags',
            ]
            .forEach((prop) => {
                assert.ok(result.hasOwnProperty(prop), `result has \`${prop}\``);
            });
            assert.deepEqual(result.tags, ['test'], 'Tags returned');
        });
    });

    it('#has should return `true` when exists', () => {
        var id = uuid();

        return storage.put(id, {
            contentType: 'text/plain',
            contentLength: 1,
        })
        .then(() => storage.has(id))
        .then((result) => {
            assert.ok(result, 'Item exists');
        });
    });

    it('#has should return `false` when item deleted', () => {
        var id = uuid();

        return storage.put(id, {
            contentType: 'text/plain',
            contentLength: 1,
        })
        .then(() => storage.delete(id))
        .then(() => storage.has(id))
        .then((result) => {
            assert.ok(! result, 'Item not exists');
        });
    });

    it('#setDeleted should set isDeleted `true`', () => {
        var id = uuid();

        return storage.put(id, {
            contentType: 'text/plain',
            contentLength: 1,
        })
        .then(() => storage.setDeleted(id))
        .then(() => storage.get(id))
        .then((result) => {
            assert.ok(result.isDeleted, 'isDeleted is `true`');
        });
    });

    it('#countUpdates should return updated items count', () => {
        var id = uuid();
        var date;

        return storage.put(id, {
            contentType: 'text/plain',
            contentLength: 1,
        })
        .then(() =>new Promise(
            (resolve) => setTimeout(() => {
                date = new Date();
                resolve();
            }, 10))
        )
        // .then(() => storage.listUpdated(date).then(updates => console.log('updates', updates, date)))
        .then(() => storage.countUpdates(date))
        .then((count) => assert.equal(count, 0, 'no updates in db'))
        .then(() => storage.setDeleted(id))
        .then(() => storage.countUpdates(date))
        .then((count) => assert.equal(count, 1, '1 document updated'))
        ;
    });
});
