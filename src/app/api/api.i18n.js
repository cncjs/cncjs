import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import settings from '../config/settings';
import logger from '../lib/logger';

const log = logger('[api.i18n]');

export const getAcceptedLanguage = (req, res) => {
    let headers = req.headers || {};
    let httpAccept = headers['accept-language'] || '';

    // Tags for the Identification of Languages (http://www.ietf.org/rfc/rfc1766.txt)
    //
    // The syntax of this tag in RFC-822 EBNF is:
    //
    // Language-Tag = Primary-tag *( "-" Subtag )
    // Primary-tag = 1*8ALPHA
    // Subtag = 1*8ALPHA

    let values = httpAccept.split(',') || [];
    let acceptedList = [];
    _.each(values, (val) => {
        let matches = val.match(/([a-z]{1,8}(-[a-z]{1,8})?)\s*(;\s*q\s*=\s*(1|0\.[0-9]+))?/i);
        if (!matches) {
            return;
        }
        let lang = matches[1];
        let qval = Number(matches[4]) || Number(1.0);
        acceptedList.push({
            lang: lang.toLowerCase(),
            qval: qval
        });
    });

    // In decreasing order of preference
    let sortedLngs = _.chain(acceptedList)
                       .sortBy((o) => o.qval)
                       .reverse()
                       .map('lang')
                       .value();

    let preferred, match;

    // 1. Look through sorted list and use first one that exactly matches our languages
    match = 'exact';
    preferred = _.find(sortedLngs, (lang) => {
        return _.contains(settings.supportedLngs, lang);
    });

    // 2. Look through sorted list again and use first one that partially matches our languages
    if (!preferred) {
        match = 'partial';
        _.some(sortedLngs, (lang) => {
            preferred = _.find(settings.supportedLngs, (supportedLng) => {
                return supportedLng.indexOf(lang) === 0;
            });

            return !!preferred;
        });
    }

    // 3. Fallback to default language that matches nothing
    if (!preferred) {
        match = 'none';
        preferred = settings.supportedLngs[0];
    }

    const result = {
        acceptedList: acceptedList,
        sortedLngs: sortedLngs,
        supportedLngs: settings.supportedLngs,
        preferred: preferred,
        match: match
    };
    log.debug(`getAcceptedLanguage: ${JSON.stringify(result)}`);

    res.send(preferred);
};

export const saveMissing = (req, res) => {
    let lng = req.params.__lng__;
    let ns = req.params.__ns__;

    let mergedFile = path.join(settings.assets.web.path, 'i18n', lng, ns + '.json');
    let mergedObject = JSON.parse(fs.readFileSync(mergedFile, 'utf8'));

    let savedMissingFile = path.join(settings.assets.web.path, 'i18n', lng, ns + '.savedMissing.json');
    let savedMissingObject = req.body;

    // Copy all of the properties in the sendMissing object over to the merged object
    _.extend(mergedObject, savedMissingObject);

    // Sort object by key
    let sortedObject = {};
    let sortedKeys = _.keys(mergedObject).sort();
    _.each(sortedKeys, (key) => {
        sortedObject[key] = mergedObject[key];
    });
    let prettyJSON = JSON.stringify(sortedObject, null, 4); // space=4

    fs.writeFile(savedMissingFile, prettyJSON, (err) => {
        if (err) {
            log.error(`err=${err}`);
        } else {
            log.debug(`Saved missing ${JSON.stringify(savedMissingObject)} to "${savedMissingFile}"`);
        }
    });

    res.send({ 'reply': 'ok' });
};
