'use strict';

const _ = require('lodash');
const url = require('url');
const {promiseSeries} = require('../lib/utils.js');
const zlib = require('zlib');

module.exports = function(router, filestore, logger, debug) {
    const VERBOSE = !! logger;
    const DEBUG = !! debug;

    // Parse url query if it's not presented in request object.
    router.use((req, res, next) => {
        if (req.query) {
            next();
            return;
        }

        req._url = req.url;
        req.parsedUrl = url.parse(req.url, true);
        req.query = req.parsedUrl.query;
        req.url = req.parsedUrl.pathname;

        next();
    });

    // Get file
    router.get('/files/:id', (req, res, next) => {
        const id = req.params.id;

        filestore.has(id)
        .then((status) => {
            if (! status) {
                next();
                return;
            }


            return filestore.getStream(id)
            .then(([meta, stream]) => {
                if (meta.isDeleted) {
                    res.writeHead(403, 'Deleted');
                    res.end();
                    return;
                }
                
                res.setHeader('content-type', meta.contentType);
                res.setHeader('content-length', meta.contentLength);

                if (req.query.download) {
                    res.setHeader(
                        'content-disposition',
                        `attachment; filename="${meta.name || id}"`
                    );
                }

                VERBOSE && logger.log('Sent', id);
                stream.pipe(res);

                filestore.setAccessDate(id, new Date())
                .catch((error) => DEBUG && console.error(error));
            });
        })
        .catch(next);
    });

    // Get file status
    router.head('/files/:id', (req, res, next) => {
        const id = req.params.id;

        filestore.has(id)
        .then((status) => {
            if (! status) {
                next();
                return;
            }


            return filestore.getMeta(id)
            .then((meta) => {
                if (meta.isDeleted) {
                    res.writeHead(403, 'Deleted');
                    res.end();
                    return;
                }

                res.setHeader('content-type', meta.contentType);
                res.setHeader('content-length', meta.contentLength);
                res.end();

                VERBOSE && logger.log('Check', id);
            });
        })
        .catch(next);
    });

    // Put file
    router.post('/files/:id', (req, res, next) => {
        const id = req.params.id;

        filestore.has(id)
        .then((status) => {
            if (status) {
                // Item exists...
                res.statusCode = 409;
                res.statusText = 'File already exists';
                res.end('File exists');
                return;
            }

            var contentType = req.headers['content-type'];
            var contentLength = req.headers['content-length'];
            var filename = req.headers['content-disposition'];


            if (filename) {
                let match = filename.match(/^attachment;\s+filename=(.+)/);
                if (match) {
                    filename = match[1];
                    if (filename.charAt(0) === '"') {
                        filename = filename.slice(1, -1);
                    }

                    if (! filename.length) {
                        filename = undefined;
                    }
                }
                else {
                    filename = undefined;
                }
            }

            var meta = {
                name: filename || '',
                contentType,
                contentLength,
            };

            return filestore.put(id, meta, req)
            .then(() => {
                VERBOSE && logger.log('Added', id);
                res.end('OK');
            });
        })
        .catch(next);
    });

    // Delete file
    router.delete('/files/:id', () => {
        const id = req.params.id;

        filestore.has(id)
        .then((exists) => {
            if (! exists) {
                next();
                return;
            }

            return storage.getMeta(id)
            .then((meta) => {
                if (meta.isDeleted) {
                    res.statusCode = 413;
                    res.statusText = 'File deleted';
                    res.end('Deleted');
                    return;
                }

                return storage.setDeleted(id)
                .then(() => {
                    VERBOSE && logger.log('Deleted', id);
                    res.end('OK');
                });
            });
        })
        .catch(next);
    });

    // Info routes

    router.get('/storage/updates', (req, res, next) => {
        var date = req.query.after || 0;

        filestore.listUpdated(date)
        .then((updates) => {
            var result = JSON.stringify(updates.map(
                (item) => _.pick(item, [
                    '_id',
                    'isDeleted',
                    'updateDate',
                    'createDate',
                    'accessDate',
                    'contentType',
                    'contentLength',
                    'name',
                ])
            ));

            res.setHeader('content-type', 'application/json');
            res.setHeader('content-length', result.length);
            res.end(result);
        })
        .catch(next);
    });

    router.get('/storage/updates/count', (req, res, next) => {
        var date = req.query.after || 0;

        filestore.countUpdated(date)
        .then((count) => {
            var result = JSON.stringify(count);

            res.setHeader('content-type', 'application/json');
            res.setHeader('content-length', result.length);
            res.end(result);
        })
        .catch(next);
    });

    router.get('/storage/dump', (req, res, next) => {
        filestore.countMeta()
        .then((count) => {
            if (! count) {
                res.end('[]');
                return;
            }

            var skip = 0;
            var limit = 1000;
            var output = res;

            res.setHeader('content-type', 'application/json');

            // If accept gzipped.
            if ('accept-encoding' in req.headers) {
                let accept = req.headers['accept-encoding'];
                if (accept.includes('gzip')) {
                    res.setHeader('content-encoding', 'gzip');
                    let gzip = zlib.createGzip();
                    gzip.pipe(res);
                    output = gzip;
                }
            }

            // Start sending an array
            output.write('[\n');

            return promiseSeries(
                () => skip < count,
                () => filestore.listMeta(skip, limit)
                .then((items) => {
                    skip += Math.min(limit, items.length);

                    // Convert items to JSON strings
                    var result = items.map((item) =>
                        JSON.stringify(_.pick(item, [
                            '_id',
                            'isDeleted',
                            'updateDate',
                            'createDate',
                            'accessDate',
                            'contentType',
                            'contentLength',
                            'name',
                        ]))
                    ).join(',\n');

                    // Append final comma if not a last chunk
                    if (skip < count) {
                        result += ',';
                    }

                    // Write gzip data
                    output.write(result + '\n');
                })
            )
            .then(() => {
                output.write(']');
                output.end();
            });
        })
        .catch(next);
    });

    return router;
};
