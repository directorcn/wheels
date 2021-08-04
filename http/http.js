const net = require('net')


class Request {
    constructor(options) {
        // method host+port+path headers body
        this.method = options.method || 'GET'
        this.host = options.host
        this.port = options.port || '80'
        this.path = options.path || '/'
        this.headers = options.headers || {}
        this.body = options.body || {}

        if (!this.headers['Content-Type']) {
            this.headers['Content-Type'] = 'application/x-www-form-urlencoded'
        }

        if (this.headers['Content-Type'] === 'application/json') {
            this.dataBlock = JSON.stringify(this.body)
        } else if (this.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
            this.dataBlock = Object.keys(this.body)
                .map(key => `${key}=${encodeURIComponent(this.body[key])}`)
                .join('&')
        }
    }

    // client request text directives
    toString() {
        const requestLine = `${this.method} ${this.path} HTTP/1.1`
        const headers = `${Object.keys(this.headers)
            .map(key => `${key}: ${this.headers[key]}`)
            .join('\r\n')}`
        return `${requestLine}\r\n${headers}\r\n\r\n${this.dataBlock}`
    }

    // sending a client request
    send(connection) {
        return new Promise((resolve, reject) => {
            const parser = new ResponseParser
            if (connection) {
                connection.write(this.toString())
            } else {
                connection = net.createConnection({
                    host: this.host,
                    port: this.port
                }, () => {
                    connection.write(this.toString())
                })
            }
            connection.on('data', data => {
                // http transfer is trunked, 
                // so you need to hand over received characters to parser.
                parser.receive(data.toString())
                if (parser.isFinished) {
                    resolve(parser.response)
                }
                connection.end()
            })
            connection.on('error', err => {
                reject(err)
                connection.end()
            })
        })
    }
}

class ResponseParser {
    constructor() {
        this.statusLine = ''
        this.headers = {}
        this.headerName = ''
        this.headerValue = ''

        const WAITING_STATUS_LINE = c => {
            if (c === '\r') {
                this.state = WAITING_STATUS_LINE_END
            } else {
                this.statusLine += c
            }
        }

        const WAITING_STATUS_LINE_END = c => {
            if (c === '\n') {
                this.state = WAITING_HEADER_NAME
            }
        }

        const WAITING_HEADER_NAME = c => {
            if (c === '\r') {
                // received headers, to know transfer encoding
                if (this.headers['Transfer-Encoding'] === 'chunked') {
                    // console.log('statusLine', this.statusLine)
                    // console.log('headers', this.headers)
                    this.bodyParser = new TrunkedBodyParser
                }
                this.state = WAITING_HEADER_BLOCK_END
            } else if (c === ':') {
                this.state = WAITING_HEADER_SPACE
            } else {
                this.headerName += c
            }
        }

        const WAITING_HEADER_SPACE = c => {
            if (c === ' ') {
                this.state = WAITING_HEADER_VALUE
            }
        }

        const WAITING_HEADER_VALUE = c => {
            if (c === '\r') {
                this.headers[this.headerName] = this.headerValue
                this.headerName = ''
                this.headerValue = ''
                this.state = WAITING_HEADER_LINE_END
            } else {
                this.headerValue += c
            }
        }

        const WAITING_HEADER_LINE_END = c => {
            if (c === '\n') {
                this.state = WAITING_HEADER_NAME
            }
        }

        const WAITING_HEADER_BLOCK_END = c => {
            if (c === '\n') {
                this.state = WAITING_BODY
            } 
        }

        const WAITING_BODY = c => {
            this.bodyParser.receive(c)
        }

        this.state = WAITING_STATUS_LINE
    }
    receive(string) {
        for (let char of string) {
            this.state(char)
        }
    }
    
    get response() {
        this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/)
        return {
            statusCode: RegExp.$1,
            statusText: RegExp.$2,
            headers: this.headers,
            body: this.bodyParser.content.join('')
        }
    }

    get isFinished() {
        return this.bodyParser && this.bodyParser.isFinished
    }
}

class TrunkedBodyParser {
    constructor() {
        this.length = 0
        this.content = []
        this.isFinished = false

        const WAITING_LENGTH = c => {
            if (c === '\r') {
                this.state = WAITING_LENGTH_LINE_END
            } else {
                this.length *= 16
                this.length += parseInt(c, 16)
            }
        }

        const WAITING_LENGTH_LINE_END = c => {
            if (c === '\n') {
                this.state = READING_TRUNKED
            }
        }

        const READING_TRUNKED = c => {
            this.content.push(c)
            if (-- this.length === 0) {
                this.state = WAITING_TRUNKED_END
            }
        }

        const WAITING_TRUNKED_END = c => {
            if (c === '\r') {
                this.state = WAITING_TRUNKED_DATA_END
            }
        }

        const WAITING_TRUNKED_DATA_END = c => {
            if (c === '\n') {
                this.state = WAITING_TRUNKED_END_FLAG
            }
        }

        const WAITING_TRUNKED_END_FLAG = c => {
            if (c === '0') {
                this.isFinished = true
                this.state = TRUNKED_END_FLAG_END
            }
        }

        const TRUNKED_END_FLAG_END = c => {
            if (c === '\r') {
                this.state = WAITING_TRUNKED_END_FLAG_END
            }
        }

        const WAITING_TRUNKED_END_FLAG_END = c => {
            if (c === '\n') {
                this.state = WAITING_EMPTY_LINE
            }
        }

        const WAITING_EMPTY_LINE = c => {
            if (c === '\r') {
                this.state = WAITING_EMPTY_LINE_END
            }
        }

        const WAITING_EMPTY_LINE_END = c => {
            if (c === '\n') {
                this.state = WAITING_LENGTH
            }
        }

        this.state = WAITING_LENGTH
    }
    receive(char) {
        this.state(char)
    }
}

void async function() {
    const request = new Request({
        method: 'POST',
        path: '/',
        host: '127.0.0.1',
        headers: {
            ['X-Foo']: 'xxx'
        },
        body: {
            name: 'I want a piece of HTML' // real HTTP session can't so
        }
    })
    const response = await request.send()
    console.log(response)
}()
