var Router = require('koa-router')
var jwt = require('jsonwebtoken')
var fs = Promise.promisifyAll(require('fs'))
var co = require('co')
var path = require('path')
var make = require('../make')
var yaml = require('js-yaml')
var rd = require('../rd')
var asyncBusboy = require('async-busboy')
var { SHA256 } = require('crypto-js')

const router = new Router()

router.post('/init', co.wrap(function *(ctx, next) {
    try {
        yield fs.accessAsync(path.resolve(__dirname, 'rocket.lock'))
        ctx.status = 400
        ctx.body = {
            success: false,
            message: '你已经完成初始化操作'
        }
    } catch(e) {
        let { title, username, password, description, github, googlePlus } = ctx.request.body
        let yml = `# Site\ntitle: ${title}\ndescription: ${description}\ngithub: ${github}\n`
            + `google: ${googlePlus}\n\n# Pagination\npagination:\n  index_page: 5\n\n`
            + `# Markdown\neditor:\n  minHeight: 600\n  height:\n\n# User\nusername: ${username}\n`
            + `password: ${password}`
        let data = yield yaml.safeLoad(yml)
        yield fs.writeFileAsync(path.resolve(__dirname, '../config.yml'), yml)
        yield fs.writeFileAsync(path.resolve(__dirname, '../rocket.lock'), '')
        yield make()
        ctx.body = {
            success: true,
            data: '初始化成功'
        }
    }
}))

module.exports = router