'use strict';

module.exports = function(router, filestore, logger) {
    const VERBOSE = !! logger;

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
                res.setHeader('content-type', meta.contentType);
                res.setHeader('content-length', meta.contentLength);

                VERBOSE && logger.log('Sent', id);
                stream.pipe(res);
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
                let match = filename.match(/^attachment;\s+filename=(.*)/);
                if (match) {
                    filename = match[1];
                    if (filename.charAt(0) === '"') {
                        filename = filename.slice(1, -1);
                    }
                }
                else {
                    filename = undefined;
                }
            }

            var meta = {
                // name: filename || '',
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

    // Stat routes


    return router;
};
