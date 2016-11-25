global.Promise = require('bluebird')
const Koa = require('koa')
const make = require('./make')
const path = require('path')
const co = require('co')
const serve = require('koa-static')
const swig = require('koa-swig')
const router = require('./router/router')

const app = new Koa()

app.context.render = co.wrap(swig({
    root: path.join(__dirname, 'views'),
    autoescape: true,
    ext: 'html'
}));

app.use(router.routes())
   .use(router.allowedMethods())

app.use(serve(path.resolve(__dirname, './public')))

app.listen(8080)