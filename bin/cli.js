#!/usr/bin/env node

'use strict';

const connect = require('connect');
const hall = require('hall');
const {middleware, FileStore, NedbDataStorage, FsBlobStorage} = require('..');
const nedb = require('nedb');
const argentum = require('argentum');
const fs = require('fs');
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
        pidFile: process.env.PID_FILE || '/var/run/file-store.pid'
    },
});

const DEBUG = config.debug;
const VERBOSE = config.verbose;
const port = config.port;
const dir = path.resolve(process.cwd(), argv[0] || '.');
const PID_FILE = path.resolve(process.cwd(), config.pidFile);

if (fs.existsSync(PID_FILE)) {
    onError(`Pid file "${PID_FILE}" already exists`);
}

fs.writeFileSync(PID_FILE, process.pid);

process.on('beforeExit', () => onExit);
process.on('exit', () => onExit);
process.on('SIGINT', () => {
    onExit()
    process.exit();
});

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
.use(middleware(router, storage, logger, DEBUG))
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

function onError(error) {
    console.error(error);
    process.exit(1);
}

function onExit() {
    fs.existsSync(PID_FILE) && fs.unlinkSync(PID_FILE);
}
