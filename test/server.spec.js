const fs = require('fs');
const connect = require('connect');
const hall = require('hall');
const {middleware, FileStore, NedbDataStorage, FsBlobStorage} = require('..');
const assert = require('assert');
const nedb = require('nedb');
const fetch = require('node-fetch');
const uuid = require('node-uuid');
const qs = require('querystring');
const DEBUG = process.env.DEBUG === '1';

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
                DEBUG && console.log(err);
            }
        })
        .listen();

        port = server.address().port;
    });

    it('Should post, get and head file', () => {
        const id = uuid();
        const data = new Buffer('Hello');
        const url = `http://localhost:${port}/files/${id}`;

        return fetch(url, {
            method: 'POST',
            headers: {
                    'content-type': 'text/plain',
                    'content-length': data.length,
                    'content-disposition': 'attachment; filename=test',
                    'x-tags': 'test, file',
            },
            body: data,
        })
        .then((res) => {
            assert.equal(res.status, 200, 'Status is 200');
        })
        .then(() => fetch(url, {method: 'HEAD'}))
        .then((res) => {
            assert.equal(res.status, 200, 'Status is 200');
            var filepath = storage.blobStore.getFilepath(res.headers.get('content-md5'));
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
            .then(() => fetch(
                `http://localhost:${port}/storage/dump`
            ))
            .then((res) => res.json())
            .then((items) => {
                var item = items[0];

                assert.ok(item._id === id, 'Item exists');
                assert.ok(item.accessDate !== null, 'Access date is set');
            })
        );
    });

    it('Should return updates list and count', () => {
        const id = uuid();
        const data = new Buffer('Hello');
        const url = `http://localhost:${port}/files/${id}`;
        const date = new Date();

        return fetch(url, {
            method: 'POST',
            headers: {
                    'content-type': 'text/plain',
                    'content-length': data.length,
                    'content-disposition': 'attachment; filename=test',
            },
            body: data,
        })
        .then((res) => assert.equal(res.status, 200, 'Status is 200'))
        .then(() => fetch(
            `http://localhost:${port}/storage/updates?` + qs.stringify({after: date.toISOString()})
        ))
        .then((res) => {
            assert.equal(res.status, 200, 'Status is 200');
            assert.equal(res.headers.get('content-type'), 'application/json', 'Content type is JSON');

            return res.json();
        })
        .then((result) => {
            assert.equal(result.length, 1, '1 file updated');
            assert.equal(result[0].name, 'test', 'Filename is `test`');
        })
        ;
    });
});
