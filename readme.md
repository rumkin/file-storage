# File storage

Multi-backend file storage with REST interface and synchronization. This file
storage supports full REST only files manipulation put/delete and backup
features.

## Usage

File storage could be used via docker container `rumkin/file-storage` or
with manual installation. But note that it should be run behind authorization
proxy server.

### Nginx usage example

Let's assume that you have authorization application on the port 3000 and file
server on 4040. Nginx configuration example:
```
server {
    listen 80;
    server_name file-storage.your.domain;

    access_log /usr/local/var/log/nginx/file-storage/access.log;
    error_log /usr/local/var/log/nginx/file-storage/error.log notice;

    location /auth {
        internal;
        proxy_method GET;
        proxy_set_header Content-Length "";
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_pass_request_body off;
        proxy_pass http://localhost:3000/auth/;
        client_max_body_size 0;
    }

    location /files {
        auth_request /auth;

        client_body_temp_path     /tmp;
        client_body_in_file_only  on;
        client_body_buffer_size   521K;
        client_max_body_size      10G;

        proxy_pass_request_headers on;
        proxy_set_header X-FILE $request_body_file;
        proxy_pass_request_body off;
        proxy_set_header Content-Length 0;
        proxy_pass http://127.0.0.1:4040;
    }
}
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

## License

MIT.
