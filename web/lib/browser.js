var browser = {
    isSafari: function() {
        return (/Safari/).test(navigator.userAgent) && (/Apple Computer/).test(navigator.vendor);
    },
    isOpera: function() {
        return (/OPR/).test(navigator.userAgent) && (/Opera/).test(navigator.vendor);
    },
    isFirefox: function() {
        return (/Firefox/).test(navigator.userAgent);
    },
    // http://stackoverflow.com/questions/10213639/differentiate-ie7-browser-and-browser-in-ie7-compatibility-mode
    // If the browser has "Trident" and "MSIE 7.0" in the user agent it is most likely a ie>7 in compat mode.
    // No "trident" but "MSIE 7.0" means most likely a real IE7. 
    isIEEdge: function() {
        return (navigator.appName === 'Netscape') && (/Trident\/\d/).test(navigator.userAgent);
    },
    isIE: function() {
        return (browser.getIEVersion() > 0);
    },
    // http://msdn.microsoft.com/en-us/library/ie/bg182625(v=vs.110).aspx
    // http://stackoverflow.com/questions/17907445/how-to-detect-ie11
    getIEVersion: function() {
        var rv = -1;
        var ua, re;
        if (navigator.appName === 'Microsoft Internet Explorer') {
            ua = navigator.userAgent;
            re  = new RegExp(/MSIE ([0-9]{1,}[\.0-9]{0,})/);
            if (re.exec(ua) !== null) {
                rv = parseFloat( RegExp.$1 );
            }
        } else if (navigator.appName === 'Netscape') {
            ua = navigator.userAgent;
            re  = new RegExp(/Trident\/.*rv:([0-9]{1,}[\.0-9]{0,})/);
            if (re.exec(ua) !== null) {
                rv = parseFloat( RegExp.$1 );
            }
        }
        return rv;
    }
};

// http://stackoverflow.com/questions/11018101/render-image-using-datauri-in-javascript
// Data URIs must be smaller than 32 KiB in Internet Explorer 8
browser.datauri = {
    // Alternative to Modernizr.datauri.over32kb 
    over32kb: ! (browser.isIE() && browser.getIEVersion() < 9)
};

module.exports = browser;
