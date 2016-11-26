global.Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))    
const co = require('co')
const marked = require('marked')
const yaml = require('js-yaml')
const swig = require('swig')
const hl = require('highlight').Highlight
const _ = require('underscore')
const rd = require('./rd')

// TODO let ... of ... ? map ?
const make = co.wrap(function *() {
    yield rd.rebuild()
    let config = rd.get('config')
    let filenames = yield rd.getMdFiles()
    let posts = []
    
    for (let filename of filenames) {
        let post = yield rd.parseFile(filename)
        posts.push(post)
        rd.savePost(post)
        yield rd.renderPost(post)
    }
    
    posts = posts.sort((pre, curr) => curr.date - pre.date)
    tags = _.uniq(_.flatten(posts.map(post => post.tags)))
    rd.savePosts(posts)
    rd.saveTags(tags)
    
    posts = rd.splitPosts(posts)
    rd.renderIndex({
        posts: posts[0],
        config: config,
        currentPage: 1,
        page: posts.length
    })
    
    for (let post of posts) {
        yield rd.renderPage({
            posts: post,
            config: config,
            currentPage: posts.indexOf(post) + 1,
            page: posts.length
        })
    }

    console.log('done')
})
module.exports = make
