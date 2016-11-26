global.Promise = require('bluebird')
const co = require('co')
const fs = Promise.promisifyAll(require('fs-extra'))
const path = require('path')
const yaml = require('js-yaml')
const marked = require('marked')
const swig = require('swig')
const hl = require('highlight').Highlight
const _ = require('underscore')

const mdDir = path.join(__dirname, 'posts')
const publicDir = path.join(__dirname, 'public')
const templateDir = path.join(__dirname, 'templates')
const config = path.join(__dirname, 'config.yml')
const template = {
    index:  path.join(templateDir, 'index.html'),
    post:   path.join(templateDir, 'base.html')
}

/**
 * 内存数据
 */
var cfg = null

/**
 * 方法
 */

// 初始化, 清理旧文件, 创建需要的文件夹, 并返回配置文件
module.exports.init = co.wrap(function *() {
    cfg = yaml.safeLoad(fs.readFileSync(config))
    yield [
        fs.ensureDirAsync(mdDir),
        fs.ensureDirAsync(templateDir)
    ]
    yield [
        fs.removeAsync(path.resolve(publicDir, 'page')),
        fs.removeAsync(path.resolve(publicDir, 'post')),
        fs.removeAsync(path.resolve(publicDir, 'index.html'))
    ]
    return cfg
})

// 获取 md 文章列表
module.exports.getMdFiles = co.wrap(function *() {
    let filenames = yield fs.readdirAsync('./posts')
    return filenames.filter(filename => filename.split('.').pop() === 'md')
})

// 渲染 post 页面
module.exports.renderPost = co.wrap(function *(data) {
    yield render(
        path.join(publicDir, data.link, 'index.html'),
        template['post'],
        data
    )
})

// 渲染 page 页面
module.exports.renderPage = co.wrap(function *(data) {
    console.log(path.join(publicDir, 'page', data.currentPage.toString(), 'index.html'))
    yield render(
        path.join(publicDir, 'page', data.currentPage.toString(), 'index.html'),
        template['index'],
        data
    )
    console.log('wait')
})

// 渲染 index 页面
module.exports.renderIndex = co.wrap(function *(data) {
    yield render(
        path.join(publicDir, 'index.html'),
        template['index'],
        data
    )
})

// 渲染
const render = co.wrap(function *(dist, template, data) {
    yield fs.outputFileAsync(
        dist,
        swig.renderFile(
            template,
            data
        )
    )
})

// 划分 posts 用于分页
module.exports.splitPosts = function (posts) {
    let config = cfg, temp = []
    let per_page = config['pagination']['index_page']
    let page = Math.ceil(posts.length / per_page )
    for (let index=0; index<page; index++) {
        temp.push(posts.slice(index * per_page, index * per_page + per_page))
    }
    return temp
}

// 根据指定文件名解析 MD 文档(包含当前配置文件信息)
module.exports.parseFile = co.wrap(function *(filename) {
    let post = yield fs.readFileAsync(path.join(mdDir, filename), 'utf-8')
    let block = post.match(/^---([\s\S]*?)---\s*/)
    let content = post.slice(block.index + block[0].length)
    let meta = yaml.safeLoad(block[1])
    let name = meta.title.toString().replace(/\s+/g, '-')
    return Object.assign(meta, {
        name:    name,
        link:    `/post/${name}/`,
        content: hl(marked(content), false, true),
        config:  cfg
    })
})

