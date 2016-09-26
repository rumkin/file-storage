'use strict';

const http = require('http');
const {inspect} = require('util');
const fs = require('fs');

const VERBOSE = process.env.VERBOSE === '1';
const DEBUG = process.env.DEBUG === '1';

// Socket path or port number
const sock = process.env.SOCK || '/tmp/auth.sock';
// Socket file owner
const UID = process.env.UID || process.getuid();
// Socket file group (www-data or 33 for ubuntu/xenial)
const GID = process.env.GID || 33;


if (fs.existsSync(sock)) {
    fs.unlinkSync(sock);
}

http.createServer((req, res) => {
        DEBUG && console.log(inspect(req.method, {colors: true}));
        DEBUG && console.log(inspect(req.headers, {colors: true}));

        if (req.headers.authorization === 'token secret') {
            res.end('ok');
        }
        else {
            res.statusCode = 403;
            res.end('access denied');
        }
    })
    .listen(sock, () => {
        fs.chownSync(sock, UID, GID);
        VERBOSE && console.log('Listening at %s', sock);
    });
