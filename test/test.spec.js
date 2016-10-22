const assert = require('assert');
const fs = require('fs');
const {middleware, FileStore, NedbDataStorage, FsBlobStorage} = require('..');
const nedb = require('nedb');
const uuid = require('node-uuid');
const DEBUG = process.env.DEBUG === '1';

describe('Filestore', () => {
    var storage, dir;

    before(() => {
        dir = fs.mkdtempSync('/tmp/node-test-');
        storage = new FileStore({
            dataStore: new NedbDataStorage({
                db: new nedb({
                    filename: dir + '/files.db',
                    autoload: true,
                }),
            }),
            blobStore: new FsBlobStorage({dir}),
        });

    });

    it('Should add file', () => {
        var id = uuid();
        var content = new Buffer('Hello');
        var meta = {
            name: 'test.txt',
            contentLength: content.length,
            contentType: 'text/plain',
        };

        return storage.put(id, meta, content)
        .then(({md5}) => {
            let filepath = storage.blobStore.getFilepath(md5);
            assert.ok(fs.existsSync(filepath), 'File exists');
        });
    });

    it('Should delete file', () => {
        var id = uuid();
        var content = new Buffer(uuid);
        var meta = {
            name: 'delete.txt',
            contentLength: content.length,
            contentType: 'text/plain',
        };

        return storage.put(id, meta, content)
        .then(({md5}) => storage.delete(id).then(() => md5))
        .then((md5) => {
            let filepath = storage.blobStore.getFilepath(md5);
            assert.ok(! fs.existsSync(filepath), 'File not exists');
        });
    });
});
