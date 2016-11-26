const co = require('co')

// TODO 错误页面
module.exports = function () {
    return co.wrap(function *(ctx, next) {
        try {
            yield next()
        } catch (err) {
            if (err == null) {
                ctx.status = 500
                yield ctx.render('error', {
                    err: err.toString()
                })
            }
            if (err && 401 === err.status) {
                ctx.clearcookies()
                yield ctx.render('login', {
                    err: err.toString()
                })
            } else {
                ctx.status = (err && err.status) || 404
                yield ctx.render('error', {
                    err: err.toString()
                })
            }
        }
    })
}