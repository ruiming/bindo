var Router = require('koa-router')
var jwt = require('jsonwebtoken')
var fs = Promise.promisifyAll(require('fs'))
var co = require('co')
var path = require('path')
var make = require('../make')
var config = require('../config')

const router = new Router({
    prefix: '/rocket'
})

router.get('/', co.wrap(function *(ctx, next) {
    // 初次使用
    // await ctx.render('login')
    let posts = yield fs.readFileAsync(path.resolve(__dirname, '../data/posts.rt'))
    posts = JSON.parse(posts)
    yield ctx.render('index', Object.assign({}, posts, {
        config: config
    }))
}))
router.get('/new', co.wrap(function *(ctx, next) {
    let tags = yield fs.readFileAsync(path.resolve(__dirname, '../data/tags.rt'))
    tags = JSON.parse(tags)
    tags = tags.tags.map(tag => Object.assign({ tag: tag }))
    console.log(tags)
    yield ctx.render('edit', Object.assign({}, {
        tags: tags,
        config: config
    }))
}))

module.exports = router
