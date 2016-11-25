global.Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))    
const co = require('co')
const marked = require('marked')
const yaml = require('js-yaml')
const swig = require('swig')
const hl = require('highlight').Highlight
const config = require('./config')
const _ = require('underscore')

/**
 * 生成静态博客
 */
const make = co.wrap(function *() {
    const cfg = config
    let filenames = fs.readdirSync('./posts')
    filenames = filenames.filter(filename => filename.split('.').pop() === 'md')

    let posts = [], temp = [], page = 0, meta, per_page = cfg.pagination.index_page

    // 渲染 post
    for (let filename of filenames) {
        post = yield fs.readFileAsync(`./posts/${filename}`, 'utf-8')
        post = Object.assign({}, _parse(post), {
            config: cfg,
            name: filename.replace(/\s+/, '-'),
            link: `/post/${filename.replace(/\s+/, '-').split('.').shift()}.html`
        })
        posts.push(post)
        yield fs.writeFileAsync(
            `${__dirname}/public/${post.link}`,
            swig.renderFile(
                `${__dirname}/templates/post.html`,
                post
            )
        )
    }

    // 存储
    posts = posts.sort((pre, curr) => curr.date - pre.date)
    tags = _.uniq(_.flatten(posts.map(post => post.tags)))
    // 存储每篇解析后的文章数据(按其 ID 存储)
    posts.forEach(post => fs.writeFileAsync(`${__dirname}/data/${post.id}.rt`, JSON.stringify({
        post: post
    })))
    // 存储全部解析后的文章数据
    fs.writeFileAsync(`${__dirname}/data/posts.rt`, JSON.stringify({
        posts: posts
    }))
    // 存储所有标签
    fs.writeFileAsync(`${__dirname}/data/tags.rt`, JSON.stringify({
        tags: tags
    }))

    // 分页
    page = Math.ceil(posts.length / cfg.pagination.index_page)
    for (let index = 0; index < page; index++) {
        temp.push(posts.slice(index * per_page, index * per_page + per_page))
    }
    posts = temp
    
    // 渲染 index
    let template = __dirname + '/templates/index.html'
    yield fs.writeFileAsync(
        `${__dirname}/public/index.html`, 
        swig.renderFile(
            template, 
            Object.assign({}, meta, {
                posts: posts[0],
                config: cfg,
                currentPage: 1,
                page: page
            })
        )
    )

    // 渲染 page
    for (let i=0; i<posts.length; i++) {
        yield fs.writeFileAsync(
            `${__dirname}/public/page/${i + 1}.html`, 
            swig.renderFile(
                template, 
                Object.assign({}, meta, {
                    posts: posts[i],
                    config: cfg,
                    currentPage: i+1,
                    page: page
                })
            )
        )
    }


    // 解析
    function _parse(post) {
        let block = post.match(/^---([\s\S]*?)---\s*/)
        let content = post.slice(block.index + block[0].length)
        console.log(block[1])
        meta = yaml.safeLoad(block[1])
        return Object.assign({}, meta, {
            content: hl(marked(content), false, true)
        })
    }

})

module.exports = make