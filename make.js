global.Promise = require('bluebird')
const co = require('co')
const _ = require('underscore')
const bindo = require('./bindo')

// TODO let ... of ... ? map ?
// Set secret here to avoid user to modify
const make = co.wrap(function *(source) {
    yield bindo.init(source)
    yield bindo.rebuild()
    bindo.runGulp()
    let config = bindo.get('config')
    let filenames = yield bindo.getMdFiles()
    let posts = [], tags = []
    
    // 渲染并保存 post
    for (let filename of filenames) {
        let post = yield bindo.parseFile(filename)
        posts.push(post)
        yield bindo.renderPost(post)
    }
    
    // 保存 posts 和 tags
    posts = posts.sort((pre, curr) => Date.parse(curr.created_date) - Date.parse(pre.created_date))
    tags = _.uniq(_.flatten(posts.map(post => post.tags)))
    bindo.savePosts(posts)
    bindo.saveTags(tags)
    
    // 渲染 index
    posts = bindo.splitPosts(posts)
    bindo.renderIndex({
        posts:       posts[0],
        config:      config,
        currentPage: 1,
        page:        posts.length
    })
    
    // 渲染 page
    for (let post of posts) {
        yield bindo.renderPage({
            posts:       post,
            config:      config,
            currentPage: posts.indexOf(post) + 1,
            page:        posts.length
        })
    }

})
module.exports = make
