global.Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))    
const co = require('co')
const marked = require('marked')
const yaml = require('js-yaml')
const swig = require('swig')
const hl = require('highlight').Highlight

co(function *() {
    const cfg = yaml.safeLoad(fs.readFileSync('./config.yml'))
    const filenames = fs.readdirSync('./posts')
    
    let posts = [], temp = [], page = 0, meta, per_page = cfg.pagination.index_page

    // 渲染 post
    for (let filename of filenames) {
        post = yield fs.readFileAsync(`./posts/${filename}`, 'utf-8')
        post = Object.assign({}, _parse(post), {
            config: cfg,
            name: filename.replace(/\s/, '-'),
            link: `/post/${filename.replace(/\s/, '-').split('.').shift()}.html`
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

    // 分页
    posts = posts.sort((pre, curr) => curr.date - pre.date)
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
        meta = yaml.safeLoad(block[1])
        return Object.assign({}, meta, {
            content: hl(marked(content), false, true)
        })
    }

})
