#!/usr/bin/env node

'use strict';

const connect = require('connect');
const hall = require('hall');
const {middleware, FileStore, NedbDataStorage, FsBlobStorage} = require('..');
const nedb = require('nedb');
const argentum = require('argentum');
const path = require('path');

const argv = process.argv.slice(2);
const config = argentum.parse(argv, {
    aliases: {
        d: 'debug',
        v: 'verbose',
    },
    defaults: {
        port: process.env.PORT || 8080,
        debug: process.env.DEBUG === '1',
        verbose: process.env.VERBOSE === '1',
    },
});

const DEBUG = config.debug;
const VERBOSE = config.verbose;
const port = config.port;
const dir = path.resolve(process.cwd(), argv[0] || '.');

const storage = new FileStore({
    dataStore: new NedbDataStorage({
        db: new nedb({
            filename: dir + '/files.db',
            autoload: true,
        }),
    }),
    blobStore: new FsBlobStorage({dir}),
});

const router = hall();
const logger = VERBOSE
    ? console
    : null;

connect()
.use(middleware(router, storage, logger))
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
.listen(port);

VERBOSE && console.log('Listening on localhost:%s', port);
