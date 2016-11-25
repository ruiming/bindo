var Router = require('koa-router')
var jwt = require('jsonwebtoken')
var fs = Promise.promisifyAll(require('fs'))
var co = require('co')
var path = require('path')
var make = require('../make')
var config = require('../config')
var yaml = require('js-yaml')

const router = new Router({
    prefix: '/rocket'
})

// 后台主页
router.get('/', co.wrap(function *(ctx, next) {
    // 初次使用
    make()
    let posts = yield fs.readFileAsync(path.resolve(__dirname, '../data/posts.rt'))
    posts = JSON.parse(posts)
    yield ctx.render('index', Object.assign({}, posts, {
        config: config
    }))
}))

// 创建新文章
router.get('/new', co.wrap(function *(ctx, next) {
    let tags = yield fs.readFileAsync(path.resolve(__dirname, '../data/tags.rt'))
    tags = JSON.parse(tags)
    tags = tags.tags.map(tag => Object.assign({ tag: tag }))
    yield ctx.render('edit', Object.assign({}, {
        tags: tags,
        config: config
    }))
}))

// 发布新文章
router.post('/new', co.wrap(function *(ctx, next) {
    let { title, tags, content } = ctx.request.body, date = new Date()
    let post = `---\ntitle: ${title}\ndate: ${date}\ntags:\n`
    tags.split(',').forEach(tag => post += `- ${tag}\n`)
    post += '\n---\n' + content
    yield fs.writeFileAsync(
        path.resolve(__dirname, `../posts/${title}.md`),
        post
    )
    yield make()
}))

// 编辑文章
router.get('/edit/:title', co.wrap(function *(ctx, next) {
    let post = yield fs.readFileAsync(path.resolve(__dirname, `../posts/${ctx.params.title}.md`), 'utf-8')
    let block = post.match(/^---([\s\S]*?)---\s*/)
    let content = post.slice(block.index + block[0].length)
    let meta = yaml.safeLoad(block[1])
    let tags = yield fs.readFileAsync(path.resolve(__dirname, '../data/tags.rt'))
        tags = JSON.parse(tags)
        tags = tags.tags.map(tag => Object.assign({ tag: tag }))
    yield ctx.render('edit', Object.assign({
        tags: tags,
        config: config,
        post: Object.assign(meta, {
            content: content
        })
    }))
}))

module.exports = router
