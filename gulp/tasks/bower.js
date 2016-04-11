import fs from 'fs';
import path from 'path';
import gulp from 'gulp';
import mainBowerFiles from 'main-bower-files';
/*
import pkg from '../../package.json';
import bower from '../../bower.json';

bower.name = pkg.name || bower.name;
bower.description = pkg.description || bower.description;
bower.version = pkg.version || bower.version;
fs.writeFileSync(path.resolve(__dirname, '../../bower.json'), JSON.stringify(bower, null, 2));
*/

const mainBowerFilesConfig = {
    base: 'bower_components/',
    dest: 'src/web/vendor/',
    options: {
        checkExistence: true,
        debugging: true,
        paths: {
            bowerDirectory: 'bower_components',
            bowerrc: '.bowerrc',
            bowerJson: 'bower.json'
        }
    }
};

export default (options) => {
    gulp.task('bower', () => {
        return gulp.src(mainBowerFiles(mainBowerFilesConfig.options), { base: mainBowerFilesConfig.base })
            .pipe(gulp.dest(mainBowerFilesConfig.dest));
    });
};
