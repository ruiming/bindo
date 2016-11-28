const co = require('co')
const jwt = require('koa-jwt')
const fs = Promise.promisifyAll(require('fs-extra'))
const rd = require('../rd')
const path = require('path')

module.exports = function () {
    return co.wrap(function *(ctx, next) {
        let token = ctx.cookies.get('jwt')
        let config = rd.get('config')
        ctx.request.header.authorization = 'Bearer ' + token
        // 检查是否初始化
        try {
            yield fs.accessAsync(path.resolve(__dirname, '../rocket.lock'))
        } catch(e) {
            // 未初始化, 渲染 init 页面并退出
            if (/^\/init/.test(ctx.url) && ctx.method === 'POST') {
                // 通过初始化的请求
                yield next()
            } else {
                yield ctx.render('init')
            }
            return
        }
        // 已初始化, 且访问后台, 检查是否登录
        // 1. 带 token, 认为这是一个已登录的访问
        if (token != null) {
            let verify = Promise.promisify(jwt.verify), data
            try {
                data = yield verify(token, rd.get('secret'))
            } catch (e) {
                ctx.clearcookies()
                yield ctx.render('login')
            }
            if (data && data.id.toString() !== config['username'].toString()) {
                ctx.clearcookies()
                yield ctx.render('login')
            } else {
                yield next()
            }
        } else if (/^\/auth/.test(ctx.url)) {
            // 2. 不带 token, 访问登录接口
            yield next()
        } else if (/^\/rocket/.test(ctx.url)) {
            // 3. 不带 token, 访问后台页面
            yield ctx.render('login')
        } else {
            // 4. 不带 token, 不知道访问什么鬼, 返回 404
            ctx.status = 404
            ctx.render('error', {
                err: '页面不存在'
            })
        }
    })
}