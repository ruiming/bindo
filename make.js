global.Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))    
const co = require('co')
const marked = require('marked')
const yaml = require('js-yaml')
const swig = require('swig')
const _ = require('underscore')
const rd = require('./rd')

// TODO let ... of ... ? map ?
// Set secret here to avoid user to modify
const make = co.wrap(function *() {
    yield rd.rebuild()
    let config = rd.get('config')
    let filenames = yield rd.getMdFiles()
    let posts = []
    
    // 渲染并保存 post
    for (let filename of filenames) {
        let post = yield rd.parseFile(filename)
        posts.push(post)
        yield rd.renderPost(post)
    }
    
    // 保存 posts 和 tags
    posts = posts.sort((pre, curr) => curr.date - pre.date)
    tags = _.uniq(_.flatten(posts.map(post => post.tags)))
    rd.savePosts(posts)
    rd.saveTags(tags)
    
    // 渲染 index
    posts = rd.splitPosts(posts)
    rd.renderIndex({
        posts: posts[0],
        config: config,
        currentPage: 1,
        page: posts.length
    })
    
    // 渲染 page
    for (let post of posts) {
        yield rd.renderPage({
            posts: post,
            config: config,
            currentPage: posts.indexOf(post) + 1,
            page: posts.length
        })
    }

})
module.exports = make
