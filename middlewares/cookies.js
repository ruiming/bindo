var { SHA256 } = require('crypto-js')
var jwt = require('jsonwebtoken')
var _ = require('underscore')

module.exports = function () {
    return co.wrap(function *(ctx, next) {
        // 清除 cookies
        ctx.clearcookies = () => {
            ctx.cookies.set('xsrf-token', null, {
                overwrite: true,
                expires:   new Date()
            })
            ctx.cookies.set('jwt', null, {
                overwrite: true,
                expires:   new Date()
            })
        }
        // 设置 cookies
        ctx.setAuthCookies = (_id) => {
            let xsrf = SHA256(_.random(999999999)).toString(),
                date = new Date().getTime() + 5184000000,
                token = jwt.sign({
                    id:  _id,
                    xsrf,
                    exp: date / 1000,
                }, config.APP.JWT_KEY)
            ctx.cookies.set('xsrf-token', xsrf, {
                httpOnly:  false,
                overwrite: true,
                expires:   new Date(date),
            })
            ctx.cookies.set('jwt', token, {
                httpOnly:  true,
                overwrite: true,
                expires:   new Date(date),
            })
            return {
                jwt: token,
                xsrf,
                exp: date / 1000
            }
        }
        yield next()
    })
}
