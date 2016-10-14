# File storage

![Build](https://img.shields.io/travis/rumkin/file-storage.svg)

Multi-backend file storage with REST interface and synchronization. This file
storage supports full REST only files manipulation put/delete and backup
features.

## Usage

File storage could be used via docker container `rumkin/file-storage` or
with manual installation. But note that public access should be prevented
with iptables or authorization proxy server.

Run with docker:

```
$ docker run -d --name fs -p 4444:8080 -v /var/data/file-store:/data rumkin/file-store
```

## REST API

### POST /files/:id

Add file to storage.

Params:
    * HTTP-header 'Content-Type' sets file mime type
    * HTTP-header 'Content-Length' sets file length
    * HTTP-header 'Content-Disposition' sets filename
    * HTTP body sets body.

Request:

```
POST /files/7211bef2-6856-4a18-9359-5a0373e5b8c1
Content-Type: text/plain
Content-Length: 5
Content-Disposition: attachment; filename=hello.txt

Hello
```

Response:

```
HTTP/1.1 200 OK

OK
```

### GET /files/:id

Get file from storage. If file was deleted returns 413.

Params:

    * URL query param 'download' adds content-disposition header into response. Optional.

```
GET /files/7211bef2-6856-4a18-9359-5a0373e5b8c1?download
```

Response:
```
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 5
Content-Disposition: attachment; filename=hello.txt

Hello
```

### DELETE /files/:id

Mark file as removed and delete it's binary data.

Request:

```
DELETE /files/7211bef2-6856-4a18-9359-5a0373e5b8c1
```


Response:
```
HTTP/1.1 200 OK

OK
```

### HEAD /files/:id

Check file exists or not. This method return's no body but meta data only.

Request:

```
HEAD /files/7211bef2-6856-4a18-9359-5a0373e5b8c1
```


Response:
```
HTTP/1.1 200 OK
Content-Length: 5
Content-Type: text/plain
```

### GET /storage/dump

List stored all items sorted by update date in descending order.

Response is a gzipped JSON array.

```
GET /storage/dump
```

### GET /storage/updates

List storage updates since special date or from storage creation:

Params:
    * URL query params 'after' specifies date to filter changes. Could be
    ISO 8601 or unix timestamp. Optional. Default is 0.

Response is a JSON array.

```
GET /storage/updates?after=2016-09-26T00:00:00Z
```

Response _body_:
```
[
    {
        "_id": "7211bef2-6856-4a18-9359-5a0373e5b8c1",
        "isDeleted": false,
        "updateDate": "2016-09-26T00:18:48.848Z",
        "name":"hello.txt"
    }
]
```

### GET /storage/updates/count

Get count of updated files in db since specified date.

Params:
    * URL query params 'after' specifies date to filter changes. Could be
    ISO 8601 or unix timestamp. Optional. Default is 0.

Response is a JSON number.

```
GET /storage/updates/count?after=2016-09-26T00:00:00Z
```

Response _body_:
```
1
```

### Nginx usage example

Let's assume that you have authorization application on the port 3333 and file
server on unix socket `/var/file-store.sock`. Nginx configuration example:

```nginx
server {
    listen 80;
    server_name file-storage.your.domain;

    access_log /usr/local/var/log/nginx/file-storage/access.log;
    error_log /usr/local/var/log/nginx/file-storage/error.log notice;

    location /auth {
        internal;

        proxy_pass "http://localhost:3333";
        proxy_method GET;
        proxy_set_header Host $host;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";

        # Set original request values uri and method to make
        # authorization though.
        proxy_set_header X-Original-Uri $request_uri;
        proxy_set_header X-Original-Method $request_method;
    }

    location / {
        auth_request /auth;

        # Use unix socket to avoid direct access from network
        proxy_pass "http://unix:/var/file-store.sock";
    }
}
```

## License

MIT.


## Credits

Inspired by [Pavo](https://github.com/kavkaz/pavo) and [Hermitage](https://github.com/LiveTyping/hermitage-skeleton).
