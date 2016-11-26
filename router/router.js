var Router = require('koa-router')
var jwt = require('jsonwebtoken')
var fs = Promise.promisifyAll(require('fs'))
var co = require('co')
var path = require('path')
var make = require('../make')
var config = require('../config')
var yaml = require('js-yaml')
var rd = require('../rd')

const router = new Router({
    prefix: '/rocket'
})

// 后台主页页面
router.get('/', co.wrap(function *(ctx, next) {
    let posts = rd.get('posts')
    yield ctx.render('index', Object.assign({}, posts, {
        config: config
    }))
}))

// 创建新文章页面
router.get('/new', co.wrap(function *(ctx, next) {
    let tags = rd.get('tags')
    yield ctx.render('create', Object.assign({}, {
        tags: tags.tags.map(tag => Object.assign({ tag: tag })),
        config: config
    }))
}))

// 编辑文章页面
router.get('/edit/:id', co.wrap(function *(ctx, next) {
    let post = rd.get('post', ctx.params.id)
    let tags = rd.get('tags')
    yield ctx.render('edit', Object.assign(post, {
        all_tags: tags.tags.map(tag => Object.assign({ tag: tag }))
    }))
}))

// 发布/修改文章
router.post('/new', co.wrap(function *(ctx, next) {
    let { title, tags, content, id, date } = ctx.request.body
    if (id) {
        yield rd.deleteMd(id)
    } else {
        id = Date.now()
        date = Date.now()
    }
    yield rd.createMd({
        title,
        tags,
        content,
        id,
        date
    })
    yield make()
    ctx.body = {
        success: true,
        data:    title
    }
}))

// 删除文章
router.delete('/post/:id', co.wrap(function *(ctx, next) {
    yield rd.deleteMd(ctx.params.id)
    yield make()
    ctx.body = {
        success: true,
        data:    ctx.params.id
    }
}))

module.exports = router
