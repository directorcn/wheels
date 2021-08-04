# HTTP

[MDN](https://developer.mozilla.org/en-US) > [HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP) > [A typical HTTP session](https://developer.mozilla.org/en-US/docs/Web/HTTP/Session) 可以看到一次 HTTP Session 中 Request 和 Response 的结构

* Request structure

```
method<SP>path<SP>HTTP protocol version<CRLF>
headers<CRLF>
<CRLF>
optional data block
```

* Response structure

```
HTTP version<SP>status code<SP>status text<CRLF>
headers<CRLF>
<CRLF>
data block
```


chucked

```
length<CRLF>
chunked data<CRLF>
0<CRLF>
<CRLF>
```

> "Transfer-Encoding: chunked" 和 "Content-Length" 这两个字段是互斥的，也就是说响应头里这两个字段不能同时出现，一个 response 的传输要么是长度已知，要么是长度未知（chunked）

