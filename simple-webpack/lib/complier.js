const path = require('path')
const fs = require('fs')
const { getAST, getDependencies, transform } = require('./parser')

module.exports = class Complier {
    constructor(options) {
        const { entry, output } = options
        this.entry = entry
        this.output = output
        this.modules = []
    }

    run() {
        const entryModule = this.buildModule(this.entry, true)
        this.modules.push(entryModule)

        this.modules.map(_module => {
            _module.dependencies.map(dependency => {
                this.modules.push(this.buildModule(dependency))
            })
        })
        this.generateFiles()
    }

    buildModule(filename, isEntry) {
        let ast
        if (isEntry) {
            ast = getAST(filename)
        } else {
            const absolutePath = path.join(process.cwd(), './src', filename)
            ast = getAST(absolutePath)
        }
        return {
            filename,
            dependencies: getDependencies(ast),
            source: transform(ast)
        }
    }

    async generateFiles() {
        const { path: _path, filename } = this.output
        const outputPath = path.join(_path, filename)

        let modules = ''
        this.modules.map(_module => {
            modules += `'${_module.filename}': function (require, module, exports) { ${_module.source} },`
        })

        const bundle = `
void function(modules) {
  function require (filename) {
    var fn = modules[filename]
    var module = { exports: {} }
    fn(require, module, module.exports)
    return module.exports
  }
  require('${this.entry}')
}({${modules}})`

        await fs.access(outputPath, fs.constants.F_OK | fs.constants.W_OK, err => {
            if (err && err.code === 'ENOENT') {
                try {
                    fs.mkdirSync(_path, { recursive: true })
                    fs.appendFileSync(outputPath, bundle, 'utf-8')
                } catch (e) {
                    throw e
                }
            } else {
                fs.writeFileSync(outputPath, bundle, 'utf-8')
            }
        })
    }
}