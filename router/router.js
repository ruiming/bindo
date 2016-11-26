var Router = require('koa-router')
var jwt = require('jsonwebtoken')
var fs = Promise.promisifyAll(require('fs'))
var co = require('co')
var path = require('path')
var make = require('../make')
var config = require('../config')
var yaml = require('js-yaml')
var { SHA256 } = require('crypto-js')

const router = new Router({
    prefix: '/rocket'
})

// 后台主页页面
router.get('/', co.wrap(function *(ctx, next) {
    // 初次使用
    yield make()
    let posts = yield fs.readFileAsync(path.resolve(__dirname, '../data/posts.rt'))
    posts = JSON.parse(posts)
    yield ctx.render('index', Object.assign({}, posts, {
        config: config
    }))
}))

// 创建新文章页面
router.get('/new', co.wrap(function *(ctx, next) {
    let tags = yield fs.readFileAsync(path.resolve(__dirname, '../data/tags.rt'))
    tags = JSON.parse(tags)
    tags = tags.tags.map(tag => Object.assign({ tag: tag }))
    yield ctx.render('create', Object.assign({}, {
        tags: tags,
        config: config
    }))
}))

// 发布/修改文章
// TODO 自定义时间
// 每篇文章都有一个固定的 ID, 这个 ID 用于唯一区分不同文章
// 生成与 hexo 的 markdown 格式一致的文章, 即带 yaml 格式的 metadata
// Notice 无法创建同名文章
// 标题名可以包含空格, 但生成的 html 文件不能有空格，且链接到的博客链接也不能有空格
// data 中单篇文章数据不会清除, 以供手工恢复用
router.post('/new', co.wrap(function *(ctx, next) {
    let { title, tags, content, id, date } = ctx.request.body
    // 根据 ID 有无判断是编辑文章还是新增文章
    // 编辑文章的话考虑到标题修改要进行删除原文操作
    if (id) {
        // 存在 ID 则先删除原来的 markdown 文档
        // 如果无法正常生成新的 markdown 文档, 那么可以从 data 文件夹中找到已经解析好的原文
        let filenames = yield fs.readdirSync(path.resolve(__dirname, '../data/')), exist = false
        for (let filename of filenames) {
            if (filename.indexOf(id) !== -1) {
                exist = filename
                break
            }
        }
        if (exist) {
            let data = yield fs.readFileAsync(path.resolve(__dirname, `../data/${exist}`), 'utf-8')
            let origin = JSON.parse(data)
            yield fs.unlinkAsync(path.resolve(__dirname, `../posts/${origin.post.title}.md`))
        }
    } else {
        id = SHA256(Date.now()).toString()
        date = new Date()
    }
    // 创建新的 md 文档
    let post = `---\ntitle: ${title}\ndate: ${date}\nid: ${id}\ntags:\n`
    tags.split(',').forEach(tag => post += `- ${tag}\n`)
    post += '\n---\n' + content
    yield fs.writeFileAsync(
        path.resolve(__dirname, `../posts/${title}.md`),
        post
    )
    yield make()
    ctx.body = {
        success: true,
        data:    title
    }
}))

// 编辑文章
router.get('/edit/:id', co.wrap(function *(ctx, next) {
    let data = yield fs.readFileAsync(path.resolve(__dirname, `../data/${ctx.params.id}.rt`), 'utf-8')
    let origin = JSON.parse(data)
    let post = yield fs.readFileAsync(path.resolve(__dirname, `../posts/${origin.post.title}.md`), 'utf-8')
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

// 删除文章
router.delete('/post/:id', co.wrap(function *(ctx, next) {
    let id = ctx.params.id
    let data = yield fs.readFileAsync(path.resolve(__dirname, `../data/${id}.rt`), 'utf-8')
    let origin = JSON.parse(data)
    yield fs.unlinkAsync(path.resolve(__dirname, `../posts/${origin.post.title}.md`))
    yield make()
    ctx.body = {
        success: true,
        data:    id
    }
}))

module.exports = router
