'use strict';

const {FsBlobStorage} = require('..');
const assert = require('assert');
const fs = require('fs');
const uuid = require('node-uuid');
const {Readable} = require('stream');

describe('FsBlobStorage', () => {
    describe('#constructor', () => {
        it('Should define default values', () => {
            var store = new FsBlobStorage();

            assert.equal(typeof store.depth, 'number', 'Depth is a number');
            assert.equal(typeof store.dir, 'string', 'Directory is a string');
        });
    });

    describe('Storage methods', () => {
        var storage;
        before(() => {
            const dir = fs.mkdtempSync('/tmp/node-test-');

            storage = new FsBlobStorage({
                dir,
                depth: 1,
            });
        });

        it('It should put and get string', () => {
            var content = 'Hello';

            return storage.put(content)
            .then((id) => storage.get(id))
            .then((result) => {
                assert.ok(result instanceof Buffer, 'Result is a buffer');
                assert.equal(result, content, 'Data from storage is the same as written');
            });
        });

        it('It should put stream and get buffer', () => {
            var content = new Buffer('Hello', 'utf-8');

            return storage.put(content)
            .then((id) => storage.get(id))
            .then((result) => {
                assert.ok(result instanceof Buffer, 'Result is a buffer');
                assert.equal(Buffer.compare(result, content), 0, 'Data from storage is the same as written');
            });
        });

        it('It should put and get stream', () => {
            var content = new Buffer('Hello', 'utf-8');

            class Stream extends Readable {
                constructor(opt) {
                    super(opt);
                    this.isRead = false;
                }

                _read() {
                    if (this.isRead) {
                        this.push(null);
                    }
                    else {
                        this.isRead = true;
                        this.push(content);
                    }
                }
            }

            var stream = new Stream;

            return storage.put(stream)
            .then((id) => storage.get(id))
            .then((result) => {
                assert.ok(result instanceof Buffer, 'Result is a buffer');
                assert.equal(Buffer.compare(result, content), 0, 'Data from storage is the same as written');
            });
        });

        it('It should get stream', () => {
            var content = new Buffer('Hello', 'utf-8');

            return storage.put(content)
            .then((id) => storage.getStream(id))
            .then((stream) => {
                assert.ok(stream instanceof Readable, 'Stream returned');

                return new Promise((resolve, reject) => {
                    var result = '';
                    stream.on('data', (chunk) => {
                        result += chunk;
                    });

                    stream.on('end', () => resolve(result));
                    stream.on('error', reject);
                });
            })
            .then((result) => {
                assert.equal(result, content, 'Data from storage is the same as written');
            });
        });

        it('#has should return `true` when item exists', () => {
            var content = new Buffer('Hello', 'utf-8');

            return storage.put(content)
            .then((id) => storage.has(id))
            .then((result) => {
                assert.ok(result, 'Item exists');
            });
        });

        it('#has should return `false` when item removed', () => {
            var content = new Buffer('Hello', 'utf-8');
            var id;
            return storage.put(content)
            .then((id_) => (id = id_))
            .then(() => storage.delete(id))
            .then(() => storage.has(id))
            .then((result) => {
                assert.ok(! result, 'Item not exists');
            });
        });

        it('Should write item on disk', () => {
            var content = new Buffer('Hello', 'utf-8');

            return storage.put(content)
            .then((id) => {
                var filepath = storage.getFilepath(id);

                assert.ok(fs.existsSync(filepath), 'File exists');
            });
        });

        it('Should remove item from disk', () => {
            var content = new Buffer('Hello', 'utf-8');
            var id;
            return storage.put(content)
            .then((id_) => (id = id_))
            .then(() => storage.delete(id))
            .then(() => {
                var filepath = storage.getFilepath(id);

                assert.ok(! fs.existsSync(filepath), 'File not exists');
            });
        });
    });


    describe('Utils', () => {
        var storage;

        before(() => {
            storage = new FsBlobStorage({
                dir: '/tmp/blob',
                depth: 2,
            });
        });

        it('#getDirpath', () => {
            var dirname = storage.getDirpath('40b2da21-ac35-48af-a08a-1957cf3eb284');

            assert.equal(dirname, '/tmp/blob/40/b2');
        });

        it('#getFilepath', () => {
            var filename = storage.getFilepath('40b2da21-ac35-48af-a08a-1957cf3eb284');

            assert.equal(filename, '/tmp/blob/40/b2/40b2da21-ac35-48af-a08a-1957cf3eb284');
        });
    });
});
