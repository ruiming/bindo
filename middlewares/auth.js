const co = require('co')
const jwt = require('koa-jwt')
const rd = require('../rd')

module.exports = function () {
    return co.wrap(function *(ctx, next) {
        let token = ctx.cookies.get('jwt'),
            xsrf = ctx.request.headers['x-xsrf-token']
        ctx.request.header.authorization = 'Bearer ' + token
        if (token == null) {
            let verify = Promise.promisify(jwt.verify)
            let data = yield verify(token, rd.get('config').secret)
            if (data.xsrf || data.xsrf !== xsrf) {
                ctx.clearcookies()
                ctx.render('login')
            } else {
                yield next()
            }
        } else {
            yield next()
        }
    })
}