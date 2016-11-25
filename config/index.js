var yaml = require('js-yaml')
var fs = require('fs')
var path = require('path')

const config = yaml.safeLoad(fs.readFileSync(path.resolve(__dirname, '../config.yml')))

module.exports = config
