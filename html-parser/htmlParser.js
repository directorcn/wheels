class HTMLLexicalParser {
    constructor() {
        const EOF = Symbol('EOF') // end of file
        this.stack = [{type: 'document', children: []}]
        this.tokens = []
        this.eof = EOF
        let currentToken = null,
            currentTextNode = null,
            currentAttribute = null
        const WHITESPACE = /^[\t\n\f ]$/
        const LETTERS = /^[a-zA-Z]$/

        // emit token
        const emit = token => {
            this.tokens.push(token)
            let top = this.stack[this.stack.length - 1]
            if (token.type === 'startTag') {
                const element = {
                    type: 'element',
                    children: [],
                    attributes: []
                }
                // process attributes
                Object.keys(token).forEach(p => {
                    if (p !== 'tagName' &&
                        p !== 'type' &&
                        p !== 'isSelfClosing') {
                        element.attributes.push({
                            name: p,
                            value: token[p]
                        })
                    }
                })
        
                element.tagName = token.tagName
        
                top.children.push(element)
        
                if (!token.isSelfClosing) {
                    this.stack.push(element)
                }
                currentTextNode = null
            } else if (token.type === 'endTag') {
                if (token.tagName !== top.tagName) {
                    throw new Error('tag start end doesn\'t match !')
                } else {
                    this.stack.pop()
                }
                currentTextNode = null
            } else if (token.type === 'text') {
                // process textNode
                if (currentTextNode === null) {
                    currentTextNode = {
                        type: 'text',
                        content: ''
                    }
                    top.children.push(currentTextNode)
                }
                currentTextNode.content += token.content
            }
        }

        // state function
        const data = c => {
            if (c === '<') {
                return tagOpen
            } else if (c === EOF) {
                emit({
                    type: 'EOF'
                })
                return
            } else {
                emit({
                    type: 'text',
                    content: c
                })
                return data
            }
        }

        const tagOpen = c => {
            if (c === '/') {
                return endTagOpen
            } else if (c.match(LETTERS)) {
                currentToken = {
                    type: 'startTag',
                    tagName: ''
                }
                return tagName(c)
            } else if (c === EOF) {
                throw new Error('eof before tag name')
            } else {
                throw new Error('invalid first character of tag name')
            }
        }
        
        const tagName = c => {
            if (c.match(WHITESPACE)) {
                return beforeAttributeName
            } else if (c === '/') {
                return selfClosingStartTag
            } else if (c === '>') {
                emit(currentToken)
                return data
            } else if (c === EOF){
                throw new Error('eof in tag')
            } else {
                currentToken.tagName += c.toLowerCase()
                return tagName
            }
        }
        
        const endTagOpen = c => {
            if (c.match(LETTERS)) {
                currentToken = {
                    type: 'endTag',
                    tagName: ''
                }
                return tagName(c)
            } else if (c === '>') {
                throw new Error('missing end tag name')
            } else if (c === EOF) {
                throw new Error('eof before tag name')
            } else {
                throw new Error('invalid first character of tag name')
            }
        }
        
        const selfClosingStartTag = c => {
            if (c === '>') {
                currentToken.isSelfClosing = true
                emit(currentToken)
                return data
            } else if (c === EOF) {
                throw new Error('eof in tag')
            } else {
                throw new Error('unexpected solidus in tag')
            }
        }
        
        const beforeAttributeName = c => {
            if (c.match(WHITESPACE)) {
                return beforeAttributeName
            } else if (c === '/' ||
                       c ==='>' ||
                       c === EOF){
                return afterAttributeName(c)
            } else if (c === '=') {
                throw new Error('unexpected equals sign in before attribute name')
            } else {
                currentAttribute = {
                    name: '',
                    value: ''
                }
                return attributeName(c)
            }
        }
        
        const attributeName = c => {
            if (c.match(WHITESPACE) || 
                c === '/' ||
                c === '>' ||
                c === EOF) {
                return afterAttributeName(c)
            } else if (c === '=') {
                return beforeAttributeValue
            } else if (c === '\"' ||
                       c === '\'' ||
                       c === '<') {
                throw new Error('unexpected character in attribute name')
            } else {
                currentAttribute.name += c
                return attributeName
            }
        }
        
        const afterAttributeName = c => {
            if (c.match(WHITESPACE)) {
                return afterAttributeName
            } else if (c === '/') {
                return selfClosingStartTag
            } else if (c === '=') {
                return beforeAttributeValue
            } else if (c === '>'){
                emit(currentToken)
                return data
            } else if (c === EOF) {
                throw new Error('eof in tag')
            } else {
                currentAttribute = {
                    name: '',
                    value: ''
                }
                return attributeName(c)
            }
        }
        
        const beforeAttributeValue = c => {
            if (c.match(WHITESPACE)) {
                return beforeAttributeValue
            } else if (c === '\"') {
                return doubleQuotedAttributeValue
            } else if (c === '\'') {
                return singleQuotedAttributeValue
            } else if (c === '>') {
                throw new Error('missing attribute value')
            } else {
                return unquotedAttributeValue(c)
            }
        }
        
        const doubleQuotedAttributeValue = c => {
            if (c === '\"') { // end of attribute value.  eg: class="xx\"
                currentToken[currentAttribute.name] = currentAttribute.value
                return afterQuotedAttributeValue
            } else if (c === EOF) {
                throw new Error('eof in tag')
            } else {
                currentAttribute.value += c
                return doubleQuotedAttributeValue
            }
        }
        
        const singleQuotedAttributeValue = c => {
            if (c === '\'') { // end of attribute value.  eg: class='xx\'
                currentToken[currentAttribute.name] = currentAttribute.value
                return afterQuotedAttributeValue
            } else if (c === EOF) {
                throw new Error('eof in tag')
            } else {
                currentAttribute.value += c
                return singleQuotedAttributeValue
            }
        }
        
        const unquotedAttributeValue = c => {
            if (c.match(WHITESPACE)) {
                currentToken[currentAttribute.name] = currentAttribute.value
                return beforeAttributeName
            } else if (c === '>') {
                currentToken[currentAttribute.name] = currentAttribute.value
                emit(currentToken)
                return data
            } else if (c === '\"' ||
                       c === '\'' ||
                       c === '<' ||
                       c === '=' ||
                       c === '`') {
                throw new Error('unexpected character in unquoted attribute value')
            } else if (c === EOF) {
                throw new Error('eof in tag')
            } else {
                currentAttribute.value += c
                return unquotedAttributeValue
            }
        }
        
        const afterQuotedAttributeValue = c => {
            if (c.match(WHITESPACE)) {
                return beforeAttributeName
            } else if (c === '/') {
                return selfClosingStartTag
            } else if (c === '>') {
                emit(currentToken)
                return data
            } else if (c === EOF) {
                throw new Error('eof in tag')
            } else {
                throw new Error('missing whitespace between attributes')
            }
        }

        this.state = data
    }
    
    receiveInput(char, done) {
        this.state = this.state(char)
        if (done) {
            this.state = this.state(this.eof)
        }
    }
}
