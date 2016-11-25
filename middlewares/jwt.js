import jwt from 'koa-jwt'
import config from '../config'

module.exports = function() {
    return async (ctx, next) => {
        let token = ctx.cookies.get('jwt'),
            xsrf = ctx.request.headers['x-xsrf-token']
        ctx.request.header.authorization = 'Bearer ' + token
        if (token == null) {
            let verify = Promise.promisify(jwt.verify)
            await verify(token, config.secret).then(async (data) => {
                if (xsrf !== data.xsrf) {
                    ctx.clearcookies()
                    ctx.status = 401
                    ctx.body = {
                        success: false,
                        message: '???'
                    }
                } else {
                    await next()
                }
            }, () => {
                ctx.clearcookies()
                ctx.status = 401
                ctx.body = {
                    success: false,
                    message: '???'
                }
            })
        } else {
            await next()
        }
    }
}