/* eslint-disable */
const gulp = require('gulp');
const CONFIG = require('./../constants').CONFIG;

function copyGovUk() {
  return gulp.src(`${CONFIG.sourcePaths.govUk}/**`)
    .pipe(gulp.dest(CONFIG.distPaths.govUk));
}

gulp.task('govuk-elements', copyGovUk);
