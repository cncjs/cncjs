var request = require('supertest'),
    express = require('express'),
    path = require('path');

// https://github.com/visionmedia/express/wiki/New-features-in-4.x
//
// No more app.use(app.router)
//
// All routing methods will be added in the order in which they appear.
// You should not do app.use(app.router).
// This eliminates the most common issue with Express.
var appRoutes = function(app) {
    app.get('/403', function(req, res, next) {
        // trigger a 403 error
        var err = new Error('Access Forbidden');
        err.status = 403;
        next(err);
    });

    app.get('/404', function(req, res, next) {
        // trigger a 404 since no other middleware
        // will match /404 after this one, and we're not
        // responding here
        next();
    });

    app.get('/500', function(req, res, next) {
        // trigger a generic (500) error
        var err = new Error('Internal Server Error');
        next(err);
    });
};

module.exports.err = {
    setUp: function(done) {
        var app = this.app = express(),
            settings = require('../../../config/settings'),
            engines = require('consolidate');

        for (var i = 0; i < settings.view.engines.length; ++i) {
            var extension = settings.view.engines[i].extension;
            var template = settings.view.engines[i].template;
            app.engine(extension, engines[template]);
        }
        app.set('view engine', settings.view.defaultExtension); // The default engine extension to use when omitted
        app.set('views', path.join(__dirname, '../../../views')); // The view directory path

        appRoutes(app);

        var err_log = require('../../../lib/middleware/err_log'),
            err_client = require('../../../lib/middleware/err_client'),
            err_notfound = require('../../../lib/middleware/err_notfound'),
            err_server = require('../../../lib/middleware/err_server');

        /**
         * Error handling
         */
        app.use(err_log());
        app.use(err_client({
            error: 'XHR error'
        }));
        app.use(err_notfound({
            view: 'common/404.hogan'
        }));

        app.use(err_server({
            view: 'common/500.jade'
        }));

        this.app = app;

        done();
    },
    tearDown: function(done) {
        done();
    },
    '403 Forbidden Access': function(test) {
        request(this.app)
            .get('/403')
            .expect(403)
            .end(function(err, res) {
                if (err) {
                    return test.done(err);
                }
                test.equal(res.status, 403);
                test.done();
            });
    },
    '404 Not Found': function(test) {
        request(this.app)
            .get('/404')
            .expect(404)
            .end(function(err, res) {
                if (err) {
                    return test.done(err);
                }
                test.equal(res.status, 404);
                test.done();
            });
    },
    '500 Internal Server Error': function(test) {
        request(this.app)
            .get('/500')
            .expect(500)
            .end(function(err, res) {
                if (err) {
                    return test.done(err);
                }
                test.equal(res.status, 500);
                test.done();
            });

    }
};
