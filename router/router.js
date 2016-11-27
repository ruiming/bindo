var Router = require('koa-router')
var jwt = require('jsonwebtoken')
var fs = Promise.promisifyAll(require('fs'))
var co = require('co')
var path = require('path')
var make = require('../make')
var yaml = require('js-yaml')
var rd = require('../rd')
var asyncBusboy = require('async-busboy')

const router = new Router({
    prefix: '/rocket'
})

// 后台主页页面
router.get('/', co.wrap(function *(ctx, next) {
    let posts = rd.get('posts')
    yield ctx.render('index', Object.assign({}, posts, {
        config: rd.get('config')
    }))
}))

// 创建新文章页面
router.get('/new', co.wrap(function *(ctx, next) {
    let tags = rd.get('tags')
    yield ctx.render('create', Object.assign({}, {
        tags: tags.tags.map(tag => Object.assign({ tag: tag })),
        config: rd.get('config')
    }))
}))

// 编辑文章页面
router.get('/edit/:id', co.wrap(function *(ctx, next) {
    let post = rd.get('post', ctx.params.id)
    let tags = rd.get('tags')
    yield ctx.render('edit', Object.assign(post, {
        config: rd.get('config'),
        all_tags: tags.tags.map(tag => Object.assign({ tag: tag }))
    }))
}))

router.get('/config', co.wrap(function *(ctx, next) {
    let config = yield fs.readFileAsync(path.resolve(__dirname, '../config.yml'), 'utf-8')
    yield ctx.render('config', {
        config: rd.get('config')
    })
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

// 上传图片
router.post('/upload', co.wrap(function *(ctx, next) {
    const { files, fields } = yield asyncBusboy(ctx.req)
    try {
        files.map(file => file.pipe(fs.createWriteStream(path.resolve(__dirname, 'image', fields.name||file.filename))))
    } catch(e) {
        ctx.body = {
            message: e
        }
    }
    ctx.body = {
        success: true
    }
}))

module.exports = router
