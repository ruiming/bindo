var gulp = require('gulp')
var postcss = require('gulp-postcss')
var concat = require('gulp-concat')

gulp.task('css', () => {
    gulp.src(['./static/*.css'])
        .pipe(postcss([ require('postcss-nested'), require('postcss-cssnext')] ))
        .pipe(concat('blog.min.css'))
        .pipe(gulp.dest('./public/css'))
})

gulp.task('watch', () => {
    gulp.watch(['./static/*.css'], ['css'])
})

gulp.task('default', ['watch'])
