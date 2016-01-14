import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import settings from '../config/settings';
import urljoin from '../lib/urljoin';
import log from '../lib/log';

export const getAcceptedLanguage = (req, res) => {
    var headers = req['headers'] || {};
    var http_accept = headers['accept-language'] || '';

    // Tags for the Identification of Languages (http://www.ietf.org/rfc/rfc1766.txt)
    //
    // The syntax of this tag in RFC-822 EBNF is:
    //
    // Language-Tag = Primary-tag *( "-" Subtag )
    // Primary-tag = 1*8ALPHA
    // Subtag = 1*8ALPHA

    var values = http_accept.split(',') || [];
    var acceptedList = [];
    _.each(values, function(val) {
        var matches = val.match(/([a-z]{1,8}(-[a-z]{1,8})?)\s*(;\s*q\s*=\s*(1|0\.[0-9]+))?/i);
        if ( ! matches) {
            return;
        }
        var lang = matches[1];
        var qval = Number(matches[4]) || Number(1.0);
        acceptedList.push({
            'lang':lang.toLowerCase(),
            'qval':qval
        });
    });

    // In decreasing order of preference
    var sortedLngs = _.chain(acceptedList)
                       .sortBy(function(o) { return o.qval; })
                       .reverse()
                       .pluck('lang')
                       .value();

    var preferred, match;

    // 1. Look through sorted list and use first one that exactly matches our languages
    match = 'exact';
    preferred = _.find(sortedLngs, function(lang) {
        return _.contains(settings.supportedLngs, lang);
    });

    // 2. Look through sorted list again and use first one that partially matches our languages
    if ( ! preferred) {
        match = 'partial';
        _.some(sortedLngs, function(lang) {
            preferred = _.find(settings.supportedLngs, function(supportedLng) {
                console.log(lang, supportedLng, supportedLng.indexOf(lang) === 0);
                return supportedLng.indexOf(lang) === 0;
            });

            return !!preferred;
        });
    }

    // 3. Fallback to default language that matches nothing
    if ( ! preferred) {
        match = 'none';
        preferred = settings.supportedLngs[0];
    }

    log.debug({
        acceptedList: acceptedList,
        sortedLngs: sortedLngs,
        supportedLngs: settings.supportedLngs,
        preferred: preferred, match: match
    });

    res.send(preferred);
};

export const saveMissing = (req, res) => {
    var lng = req.params.__lng__;
    var ns = req.params.__ns__;

    var mergedFile = path.join(settings.assets['web'].path, 'i18n', lng, ns + '.json');
    var mergedObject = require(mergedFile);

    var savedMissingFile = path.join(settings.assets['web'].path, 'i18n', lng, ns + '.savedMissing.json');
    var savedMissingObject = req.body;

    // Copy all of the properties in the sendMissing object over to the merged object
    _.extend(mergedObject, savedMissingObject);

    // Sort object by key
    var sortedObject = {};
    var sortedKeys = _.keys(mergedObject).sort();
    _.each(sortedKeys, function(key) {
        sortedObject[key] = mergedObject[key];
    });
    var prettyJSON = JSON.stringify(sortedObject, null, 4); // space=4

    fs.writeFile(savedMissingFile, prettyJSON, function(err) {
        if (err) {
            log.error(err);
        } else {
            log.debug('i18n: Saved missing %s to %s', JSON.stringify(savedMissingObject), savedMissingFile);
        }
    });

    res.send({'reply':'ok'});
};
