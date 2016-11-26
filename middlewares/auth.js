const co = require('co')
const jwt = require('koa-jwt')
const rd = require('../rd')

module.exports = function () {
    return co.wrap(function *(ctx, next) {
        let token = ctx.cookies.get('jwt')
        let config = rd.get('config')
        ctx.request.header.authorization = 'Bearer ' + token
        if (token != null) {
            let verify = Promise.promisify(jwt.verify), data
            try {
                data = yield verify(token, rd.get('config').secret)
            } catch (e) {
                ctx.clearcookies()
                ctx.render('login')
            }
            if (data && data.id !== config['username']) {
                ctx.clearcookies()
                ctx.render('login')
            } else {
                yield next()
            }
        } else if (/^\/auth/.test(ctx.url)) {
            yield next()
        } else {
            ctx.clearcookies()
            ctx.render('login')
        }
    })
}