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

// 发布/修改文章
// TODO 自定义时间
// 每篇文章都有一个固定的 ID, 这个 ID 用于唯一区分不同文章
// 生成与 hexo 的 markdown 格式一致的文章, 即带 yaml 格式的 metadata
router.post('/new', co.wrap(function *(ctx, next) {
    let { title, tags, content, id, date } = ctx.request.body
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
            let origin = JSON.parse(yield fs.readFileAsync(path.resolve(__dirname, '../data/' + exist), 'utf-8'))
            yield fs.unlinkAsync(path.resolve(__dirname, '../posts/' + origin.post.title + '.md'))
            console.log('deleted')
        }
    } else {
        id = SHA256(Date.now()).toString().substr(0, 10)
    }
    let post = `---\ntitle: ${title}\ndate: ${date}\nid: ${id}\ntags:\n`
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
