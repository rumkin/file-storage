'use strict';

const Datastore = require('nedb');
const {NedbDataStorage} = require('..');
const assert = require('assert');
const uuid = require('node-uuid');

describe('NedbDataStorage', () => {
    var storage;

    it('Should instantiate ', () => {
        storage = new NedbDataStorage({
            db: new Datastore(),
        });
    });

    it('#put should return valid item', () => {
        var id = uuid();

        return storage.put(id, {
            contentType: 'text/plain',
            contentLength: 1,
        })
        .then((result) => {
            assert.equal(typeof result, 'object', 'result is object');
            [
                '_id',
                'contentLength',
                'contentType',
                'createDate',
                'updateDate',
                'isDeleted',
            ]
            .forEach((prop) => {
                assert.ok(result.hasOwnProperty(prop), `result has \`${prop}\``);
            });
        });
    });

    it('#get should return item', () => {
        var id = uuid();

        return storage.put(id, {
            contentType: 'text/plain',
            contentLength: 1,
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
                'isDeleted',
            ]
            .forEach((prop) => {
                assert.ok(result.hasOwnProperty(prop), `result has \`${prop}\``);
            });
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
