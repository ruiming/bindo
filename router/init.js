var Router = require('koa-router')
var fs = Promise.promisifyAll(require('fs'))
var co = require('co')
var path = require('path')
var make = require('../make')
var yaml = require('js-yaml')

const router = new Router()

router.post('/init', co.wrap(function *(ctx, next) {
    try {
        yield fs.accessAsync(path.resolve(__dirname, 'bindo.lock'))
        ctx.status = 400
        ctx.body = {
            success: false,
            message: '你已经完成初始化操作'
        }
    } catch (e) {
        let { title, username, password, description, github, googlePlus, avatar } = ctx.request.body
        let content = yield fs.readFileAsync(path.resolve(__dirname, '../config.yml'))
        content = content.replace(/(title:)(\s+.*)/, `$1 ${title}`)
                         .replace(/(username:)(\s+.*)/, `$1 ${username}`)
                         .replace(/(password:)(\s+.*)/, `$1 ${password}`)
                         .replace(/(description:)(\s+.*)/, `$1 ${description}`)
                         .replace(/(github:)(\s+.*)/, `$1 ${github}`)
                         .replace(/(googlePlus:)(\s+.*)/, `$1 ${googlePlus}`)
                         .replace(/(avatar:)(\s+.*)/, `$1 ${avatar}`)
        /*Object.keys(ctx.request.body).forEach(key => {
            content = content.replace(`/(${key}:)(\s+.*)/`, '$1 ' + `${ctx.request.body[key]}`)
        })*/
        yield yaml.safeLoad(content)
        yield fs.writeFileAsync(path.resolve(__dirname, '../config.yml'), content)
        yield fs.writeFileAsync(path.resolve(__dirname, '../bindo.lock'), '')
        yield make()
        ctx.body = {
            success: true,
            data:    '初始化成功'
        }
    }
}))

module.exports = router
