var gulp = require('gulp');
var browserSync = require('browser-sync');
var reload = browserSync.reload;

gulp.task('serve', function() {
  browserSync({
    server: {
      baseDir: './'
    }
  });
});

gulp.task('reload', function() {
  browserSync.reload();
});

gulp.task('default', ['serve'], function() {
  gulp.watch("**/*.js", ['reload']);
  gulp.watch("**/*.html", ['reload']);
});
