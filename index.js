global.Promise = require('bluebird')
const Koa = require('koa')
const make = require('./make')
const path = require('path')
const co = require('co')
const serve = require('koa-static')
const swig = require('koa-swig')
const router = require('./router/router')
const authRouter = require('./router/auth')
const initRouter = require('./router/init')
const bodyparser = require('koa-bodyparser')
const bindo = require('./bindo')
const jwt = require('koa-jwt')
const cookies = require('./middlewares/cookies')
const onerror = require('./middlewares/onerror')
const auth = require('./middlewares/auth')
const http = require('http')
const http2 = require('http2')
const fs = require('fs')
const etag = require('koa-etag')
const enforceHttps = require('koa-sslify')
const helmet = require('koa-helmet')

co(function *() {
    const app = new Koa()

    yield bindo.init()
    yield make()
    bindo.runGulp()
    const config = bindo.get('config')

    if (config['key']) {
        app.use(enforceHttps())
        app.use(helmet())
    }

    app.use(etag())

    app.use(serve(path.resolve(__dirname, './public'), {
        maxage: 256000000,
        gzip:   true
    }))

    app.use(bodyparser())

    app.use(cookies())

    app.use(onerror())

    app.use(auth())

    app.use(initRouter.routes())

    app.use(authRouter.routes())

    app.use(jwt({
        secret:    bindo.get('secret'),
        algorithm: 'RS256'
    }))

    app.context.render = co.wrap(swig({
        root:       path.join(__dirname, 'views'),
        autoescape: true,
        ext:        'html',
        cache:      false
    }))

    app.use(router.routes())
        .use(router.allowedMethods())

    
    if (config['env'] === 'production' && config['key'] && config['cert'] && config['ca']) {
        http.createServer(app.callback()).listen(80)
        http2.createServer({
            key:  fs.readFileSync(config['key']),
            cert: fs.readFileSync(config['cert']),
            ca:   fs.readFileSync(config['ca'])
        }, app.callback()).listen(443)
    } else if (config['env'] === 'production') {
        http.createServer(app.callback()).listen(80)
    } else {
        http.createServer(app.callback()).listen(8080)
    }
})
