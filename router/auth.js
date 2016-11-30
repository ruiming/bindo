var Router = require('koa-router')
var rd = require('../rd')

const router = new Router()

router.post('/auth', function (ctx, next) {
    let { username, password } = ctx.request.body
    let config = rd.get('config')
    if (username.toString() === config['username'].toString() && password.toString() === config['password'].toString()) {
        ctx.setAuthCookies(username)
        return ctx.body = {
            success: 'true',
            data:    username
        }
    } else {
        let message = null
        if (username.toString() !== config['username'].toString()) { message = '用户名不存在' }
        else if (password.toString() !== config['password'].toString()) { message = '密码错误' }
        ctx.status = 401
        return ctx.body = {
            success: 'false',
            message
        }
    }
})

module.exports = router
