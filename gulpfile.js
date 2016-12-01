const gulp     = require('gulp');
const htmlmin  = require('gulp-htmlmin');
const cleanCSS = require('gulp-clean-css');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const uglifyjs = require('uglify-js');
const minifier = require('gulp-uglify/minifier');
const sourcemaps = require('gulp-sourcemaps');
const del = require('del');
const replace = require('gulp-replace');
const merge = require('merge-stream');
const moment = require('moment');
const sitemap = require('sitemap');
const realFavicon = require ('gulp-real-favicon');
const runSequence = require('run-sequence');
const fs = require('fs');
const babel = require('gulp-babel');
const eslint = require('gulp-eslint');
const sassLint = require('gulp-sass-lint');

const FAVICON = {
  dataFile: 'source/faviconData.json',
  sourceFile: 'source/img/logo.png',
  destFolder: 'dist/assets/icons',
  distPath: '/assets/icons',
  htmlFile: 'source/index.html',
  htmlTarget: 'dist/'
}

const PATHS = {
  uri: 'https://quote.fullstackdev.es',
  sources: {
    htmlDev: 'source/index.html',
    htmlProd: 'dist/index.html',
    jsDev: 'source/es6/script.js',
    sass: 'source/sass/*.sass'
  },
  dev: {
    html: 'build/',
    css: 'build/css',
    js: 'build/js'
  },
  destinations: {
    html: 'dist/',
    siteMap: 'dist/sitemap.xml',
    css: 'dist/css'
  }
}

const CHANGEPATTERNS = {
  humans: {
    pattern: /#! DO NOT CHANGE THIS LINE !#/,
    change: `Last update: ${moment().format('YYYY/MM/DD')}`},
  index: {
    pattern: /<meta name="dcterms\.modified" content=".*" \/>/,
    change: `<meta name="dcterms.modified" content="${moment().format('YYYY/MM/DD')}" />`
  },
  cssDev: {
    pattern: /href="css\/style.min.css"/,
    change: 'href="css/style.css"'
  },
  cssPrintDev: {
    pattern: /href="css\/print.min.css"/,
    change: 'href="css/print.css"'
  },
  jsDev: {
    pattern: /href="js\/script.min.css"/,
    change: 'href="js/script.css"'
  }
};

gulp.task('clean:first', () =>
  del(['dist/*', '!dist/.keep'])
);

gulp.task('clean:dev', () =>
  del(['build/*', '!build/.keep'])
);

gulp.task('clean:last', () =>
  del(['dist/css/style.css',
       'dist/css/print.css',
       'dist/js/scripts.js',
       'sources/index.iconified.html'])
);

// Generate the icons. This task takes a few seconds to complete.
// You should run it at least once to create the icons. Then,
// you should run it whenever RealFaviconGenerator updates its
// package (see the check-for-favicon-update task below).
gulp.task('generate-favicon', (done) => {
  realFavicon.generateFavicon({
    masterPicture: FAVICON.sourceFile,
    dest: FAVICON.destFolder,
    iconsPath: FAVICON.distPath,
    design: {
      ios: {
        pictureAspect: 'backgroundAndMargin',
        backgroundColor: '#ffffff',
        margin: '21%',
        assets: {
          ios6AndPriorIcons: true,
          ios7AndLaterIcons: true,
          precomposedIcons: true,
          declareOnlyDefaultIcon: true
        },
        appName: 'Quotes'
      },
      desktopBrowser: {},
      windows: {
        pictureAspect: 'whiteSilhouette',
        backgroundColor: '#b91d47',
        onConflict: 'override',
        assets: {
          windows80Ie10Tile: true,
          windows10Ie11EdgeTiles: {
            small: true,
            medium: true,
            big: true,
            rectangle: true
          }
        },
        appName: 'Quotes'
      },
      androidChrome: {
        pictureAspect: 'shadow',
        themeColor: '#ffffff',
        manifest: {
          name: 'Quotes',
          startUrl: PATHS.uri,
          display: 'standalone',
          orientation: 'portrait',
          onConflict: 'override',
          declared: true
        },
        assets: {
          legacyIcon: true,
          lowResolutionIcons: true
        }
      },
      safariPinnedTab: {
        pictureAspect: 'silhouette',
        themeColor: '#5bbad5'
      }
    },
    settings: {
      compression: 5,
      scalingAlgorithm: 'Mitchell',
      errorOnImageTooSmall: false
    },
    markupFile: FAVICON.dataFile
  }, () => {
    done();
  });
});

// Inject the favicon markups in your HTML pages. You should run
// this task whenever you modify a page. You can keep this task
// as is or refactor your existing HTML pipeline.
gulp.task('inject-favicon-markups', () => {
  return gulp.src(FAVICON.htmlFile)
    .pipe(realFavicon.injectFaviconMarkups(
      JSON.parse(fs.readFileSync(FAVICON.dataFile)).favicon.html_code))
    .pipe(gulp.dest(FAVICON.htmlTarget));
});

// Check for updates on RealFaviconGenerator (think: Apple has just
// released a new Touch icon along with the latest version of iOS).
// Run this task from time to time. Ideally, make it part of your
// continuous integration system.
gulp.task('check-for-favicon-update', (done) => {
  var currentVersion = JSON.parse(fs.readFileSync(FAVICON.dataFile)).version;
  return realFavicon.checkForUpdates(currentVersion, (err) => {
    if (err) {
      throw err;
    }
  });
});

gulp.task('sitemap', () => {
  let siteMap = sitemap.createSitemap ({
    hostname: PATHS.uri,
    cacheTime: 600000,
    urls: [{
      url: '/',
      changefreq: 'monthly',
      priority: 1.0,
      lastmodrealtime: true,
      lastmodfile: PATHS.sources.htmlProd,
    }]});

  siteMap.toXML((err, xml) =>{
    if (!err){
    fs.writeFileSync(PATHS.destinations.siteMap, siteMap.toString());
  }});

});

gulp.task('minify-html', () =>
  gulp.src(PATHS.sources.html)
    .pipe(replace(CHANGEPATTERNS.index.pattern,
                  CHANGEPATTERNS.index.change))
    .pipe(htmlmin({
      collapseWhitespace: true,
      html5: true,
      removeComments: true,
      sortAttributes: true,
      sortClassName: true,
      minifyJS: true,
      minifyCSS: true}))
    .pipe(gulp.dest(PATHS.destinations.html))
);

gulp.task('prod', () =>
  runSequence(
    'clean:first',
    'generate-favicon',
    ['inject-favicon-markups', 'sitemap'],
    'minify-html',
    'clean:last')
);

gulp.task('sass-dev', () =>
  gulp.src(PATHS.sources.sass)
    .pipe(sassLint())
    .pipe(sassLint.format())
    .pipe(sassLint.failOnError())
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest(PATHS.dev.css))
);

gulp.task('html-dev', () =>
  gulp.src(PATHS.sources.htmlDev)
    .pipe(replace(CHANGEPATTERNS.cssDev.pattern,
                  CHANGEPATTERNS.cssDev.change))
    .pipe(replace(CHANGEPATTERNS.cssPrintDev.pattern,
                  CHANGEPATTERNS.cssPrintDev.change))
    .pipe(replace(CHANGEPATTERNS.jsDev.pattern,
                  CHANGEPATTERNS.jsDev.change))
    .pipe(htmlmin({
      collapseWhitespace: false,
      html5: true,
      removeComments: true,
      sortAttributes: true,
      sortClassName: true,
      minifyJS: false,
      minifyCSS: false}))
    .pipe(gulp.dest(PATHS.dev.html))
);

gulp.task('js-dev', () =>
  gulp.src(PATHS.sources.jsDev)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .pipe(babel({ presets: ['es2015'] }))
    .pipe(gulp.dest(PATHS.dev.js))
);

//Watch task
gulp.task('dev',() => {
  runSequence('clean:dev',['html-dev', 'sass-dev', 'js-dev']);
  gulp.watch(PATHS.sources.sass,['sass-dev']);
  gulp.watch(PATHS.sources.htmlDev,['html-dev']);
  gulp.watch(PATHS.sources.jsDev,['js-dev']);
});
