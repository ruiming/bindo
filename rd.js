global.Promise = require('bluebird')
const co = require('co')
const fs = Promise.promisifyAll(require('fs-extra'))
const path = require('path')
const yaml = require('js-yaml')
const marked = require('marked')
const swig = require('swig')
const hl = require('highlight').Highlight
const _ = require('underscore')
const gulp = require('gulp')
const postcss = require('gulp-postcss')
const concat = require('gulp-concat')

const mdDir = path.join(__dirname, 'posts')
const publicDir = path.join(__dirname, 'public')
const templateDir = path.join(__dirname, 'templates')
const dbDir = path.join(__dirname, 'data')
const configFile = path.join(__dirname, 'config.yml')
const template = {
    index:  path.join(templateDir, 'index.html'),
    post:   path.join(templateDir, 'post.html')
}
const database = {
    post:   path.join(dbDir, 'post'),
    posts:  dbDir
}

// TODO 改用类实现

/**
 * 内存数据
 */
var config = null,
    posts = null,
    tags = null,
    rawposts = []

/**
 * 方法
 */

// 初始化, 创建需要的文件夹, 读取内存数据
module.exports.init = co.wrap(function *() {
    config = yaml.safeLoad(fs.readFileSync(configFile))

    yield [
        fs.ensureDirAsync(dbDir),
        fs.ensureDirAsync(mdDir),
        fs.ensureDirAsync(publicDir),        
        fs.ensureDirAsync(templateDir),
        fs.ensureDirAsync(database['post']),
        fs.ensureDirAsync(path.resolve(publicDir, 'css')),
        fs.ensureDirAsync(path.resolve(publicDir, 'img'))
    ]

})


// 重新构建, 删除旧数据
module.exports.rebuild = co.wrap(function *() {
    yield [
        fs.removeAsync(path.resolve(publicDir, 'page')),
        fs.removeAsync(path.resolve(publicDir, 'post')),
        fs.removeAsync(path.resolve(publicDir, 'index.html'))
    ]
})

// 获取信息
// 禁止修改
module.exports.get = function (key, id) {
    switch(key) {
        case 'posts':
            return posts
        case 'tags':
            return tags
        case 'config':
            return config
        case 'post':
            let post = rawposts.find(post => post.id.toString() === id.toString())
            post.content = unescape(post.content)
            return post
        default:
            return {}
    }
}

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
    let temp = []
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
    let name = meta.title && meta.title.toString().replace(/\s+/g, '-')
    rawposts.push(Object.assign({}, meta, {
        content: content
    }))
    return Object.assign(meta, {
        name:    name,
        link:    `/post/${name}/`,
        content: hl(marked(content), false, true),
        config:  config
    })
})

// 存储 post 信息
module.exports.savePost = co.wrap(function *(post) {
    yield fs.writeJsonAsync(
        path.join(database['post'], `${post.id}.json`),
        JSON.stringify({
            post: post
        })
    )
})

// 存储全部 post 信息
module.exports.savePosts = co.wrap(function *(data) {
    posts = { posts: data }
    yield fs.writeJsonAsync(
        path.join(dbDir, 'posts.json'),
        JSON.stringify({
            posts: data
        })
    )
})

// 存储全部标签信息
module.exports.saveTags = co.wrap(function *(data) {
    tags = { tags: data }
    yield fs.writeJsonAsync(
        path.join(dbDir,'tags.json'),
        JSON.stringify({
            tags: data
        })
    )
})

// 删除 md 文档
// TODO 旧文章兼容
module.exports.deleteMd = co.wrap(function *(id) {
    let post = posts.posts.find(post => post.id.toString() === id.toString())
    yield fs.removeAsync(
        path.join(mdDir, `${post.title}.md`)
    )
})

// 创建新的 md 文档
module.exports.createMd = co.wrap(function *(data) {
    // Format
    let post = `---\ntitle: ${data.title}\ndate: ${data.date}\nid: ${data.id}\ntags:\n`
    data.tags.split(',').forEach(tag => post += `- ${tag}\n`)
    post += '\n---\n' + data.content
    // Output
    yield fs.outputFileAsync(
        path.resolve(mdDir, `${data.title}.md`),
        post
    )
})

// 静态资源处理
module.exports.runGulp = function () {
    gulp.task('default', function () {
        gulp.src(['./static/main.css',
              './static/markdown.css'])
        .pipe(postcss([ require('postcss-nested'), require('postcss-cssnext')] ))
        .pipe(concat('blog.min.css'))
        .pipe(gulp.dest('./public/css'))

        gulp.src(['./static/rocket.css',
                './static/markdown.css'])
            .pipe(postcss([ require('postcss-nested'), require('postcss-cssnext')] ))
            .pipe(concat('rocket.min.css'))
            .pipe(gulp.dest('./public/css'))

        gulp.src(['./static/*.js'])
            .pipe(gulp.dest('./public/js/'))

        gulp.src(['./images/*'])
            .pipe(gulp.dest('./public/img/'))
    })

    gulp.start('default')
}

module.exports.buildImg = function() {
    gulp.task('img', function () {
        gulp.src(['./images/*'])
            .pipe(gulp.dest('./public/img/'))
    })

    gulp.start('img')
}