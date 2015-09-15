// Makes CommonJS incompatible files browserifyable.
// https://github.com/thlorenz/browserify-shim

module.exports = {

    // https://github.com/thlorenz/browserify-shim#a-expose-global-variables-via-global
    // Use below options if you prefer to load angular or jquery via a script tag:
    // <script type="text/javascript" src="http://cdnjs.cloudflare.com/ajax/libs/three.js/r61/three.min.js"></script>
    //
    //'angular': 'global:angular',

    // Modernizr
    'modernizr': {
        exports: 'Modernizr'
    },

    // Bootstrap
    'tm.commercial-bootstrap': {
        depends: {
            'jquery': 'jQuery'
        }
    },

    // Bootstrap Jasny
    'bootstrap-jasny.bootstrap-fileupload': {
        depends: {
            'jquery': 'jQuery'
        }
    },

    // Bootstrap Multiselect
    'bootstrap-multiselect': {
        depends: {
            'jquery': 'jQuery'
        }
    },

    // Bootstrap Tokenfield
    'bootstrap-tokenfield': {
        exports: 'Tokenfield',
        depends: {
            'jquery': 'jQuery'
        }
    },

    // DataTables Extras
    'datatables-tabletools': {
        exports: 'TableTools'
    },

    'sha1': {
        exports: 'sha1'
    },

    // jQuery plugin: cookie
    'jquery-plugins.cookie': {
        depends: {
            'jquery': 'jQuery'
        }
    },

    // jQuery plugin: iframe-transport
    'jquery-plugins.iframe-transport': {
        depends: {
            'jquery': 'jQuery'
        }
    },

    // jQuery plugin: idleTimer
    'jquery-plugins.idle-timer': {
        depends: {
            'jquery': 'jQuery'
        }
    },

    // jQuery plugin: multi-select
    'jquery-plugins.multiselect': {
        depends: {
            'jquery': 'jQuery'
        }
    },

    // jQuery plugin: placeholder
    'jquery-plugins.placeholder': {
        depends: {
            'jquery': 'jQuery'
        }
    },

    // jqTree
    'jqtree': {
        depends: {
            'jquery': 'jQuery',
            'jquery-plugins.cookie': null
        }
    },

    // Parsley
    'parsley': {
        depends: {
            'jquery': 'jQuery'
        }
    },

    // Prettify
    'prettify': {
        exports: 'prettyPrint'
    }

};
