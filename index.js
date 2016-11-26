global.Promise = require('bluebird')
const Koa = require('koa')
const make = require('./make')
const path = require('path')
const co = require('co')
const serve = require('koa-static')
const swig = require('koa-swig')
const router = require('./router/router')
const authRouter = require('./router/auth')
const bodyparser = require('koa-bodyparser')
const rd = require('./rd')
const jwt = require('koa-jwt')
const cookies = require('./middlewares/cookies')
const onerror = require('./middlewares/onerror')
const auth = require('./middlewares/auth')

co(function *() {
    const app = new Koa()

    yield rd.init()
    yield make()

    app.use(serve(path.resolve(__dirname, './public')))

    app.use(bodyparser())

    app.use(cookies())

    app.use(onerror())

    app.use(auth())

    app.use(authRouter.routes())

    app.use(jwt({
        secret:     rd.get('config').secret,
        algorithm:  'RS256'
    }))

    app.context.render = co.wrap(swig({
        root: path.join(__dirname, 'views'),
        autoescape: true,
        ext: 'html'
    }))

    app.use(router.routes())
    .use(router.allowedMethods())

    app.listen(8080)
})