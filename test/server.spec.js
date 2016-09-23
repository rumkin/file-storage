const fs = require('fs');
const connect = require('connect');
const hall = require('hall');
const {middleware, FileStore, NedbDataStorage, FsBlobStorage} = require('..');
const assert = require('assert');
const nedb = require('nedb');
const fetch = require('node-fetch');
const uuid = require('node-uuid');

describe('HTTP server', () => {
    var server, storage, dir, port;

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

        var router = hall();

        server = connect()
        .use(middleware(router, storage))
        .use((err, req, res, next) => {
            if (! err) {
                res.statusCode = 404;
                res.statusText = 'Nothing found';
                res.end();
            }
            else {
                res.statusCode = 500;
                res.statusText = 'Internal error';
                res.end(err.message);
                console.log('Error', err);
            }
        })
        .listen();

        port = server.address().port;
    });

    it('Should post and get file', () => {
        const id = uuid();
        const data = new Buffer('Hello');
        const url = `http://localhost:${port}/files/${id}`;

        return fetch(url, {
            method: 'POST',
            headers: {
                    'content-type': 'text/plain',
                    'content-length': data.length,
                    'content-disposition': 'attachment; filename=test',
            },
            body: data,
        })
        .then((res) => {
            assert.equal(res.status, 200, 'Status is 200');

            var filepath = storage.blobStore.getFilepath(id);

            assert.ok(fs.existsSync(filepath), 'File created');
        })
        .then(() => fetch(url)
            .then((res) => {
                assert.equal(res.status, 200, 'Status is 200');
                assert.equal(res.headers.get('content-type'), 'text/plain', 'Content type header');
                assert.equal(res.headers.get('content-length'), data.length, 'Content length header');
                return res.text();
            })
            .then((result) => {
                assert.equal(result, data, 'result is `Hello`');
            })
        );
    });
});
