var gulp = require('gulp')
var postcss = require('gulp-postcss')
var concat = require('gulp-concat')

gulp.task('css', () => {
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
})

gulp.watch(['./static/*.css'], ['css'])

gulp.task('default', ['css'])
