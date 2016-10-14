#!/usr/bin/env node
/* eslint no-console: 0 */
/* eslint max-len: 0 */
import path from 'path';
import _ from 'lodash';
import GitHubApi from 'github';
import program from 'commander';
import pkg from './package.json';

program
    .version(pkg.version)
    .option('-T, --token <token>', 'OAuth2 token')
    .option('-o, --owner <owner>', 'owner')
    .option('-r, --repo <repo>', 'repo')
    .option('-t, --tag <tag>', 'tag')
    .option('-n, --name <name>', 'name')
    .option('-b, --body <body>', 'body', false)
    .parse(process.argv);

const github = new GitHubApi({
    version: '3.0.0',
    timeout: 5000,
    headers: {
        'user-agent': 'GitHub-Release-App'
    }
});
const files = program.args;

github.authenticate({
    type: 'oauth',
    token: program.token || process.env.GITHUB_TOKEN
});

const getReleaseByTag = (options) => {
    return new Promise((resolve, reject) => {
        github.repos.getReleaseByTag(options, (err, res) => {
            err ? reject(err) : resolve(res);
        });
    });
};

const createRelease = (options) => {
    return new Promise((resolve, reject) => {
        github.repos.createRelease(options, (err, res) => {
            err ? reject(err) : resolve(res);
        });
    });
};

const editRelease = (options) => {
    return new Promise((resolve, reject) => {
        github.repos.editRelease(options, (err, res) => {
            err ? reject(err) : resolve(res);
        });
    });
};

const listAssets = (options) => {
    return new Promise((resolve, reject) => {
        github.repos.listAssets(options, (err, res) => {
            err ? reject(err) : resolve(res);
        });
    });
};

const deleteAsset = (options) => {
    return new Promise((resolve, reject) => {
        github.repos.deleteAsset(options, (err, res) => {
            err ? reject(err) : resolve(res);
        });
    });
};

const uploadAsset = (options) => {
    return new Promise((resolve, reject) => {
        github.repos.uploadAsset(options, (err, res) => {
            err ? reject(err) : resolve(res);
        });
    });
};

const main = async () => {
    const { owner, repo, tag, name, body } = program;

    try {
        console.log('> releases#getReleaseByTag');
        let release = await getReleaseByTag({
            owner: owner,
            repo: repo,
            tag: tag
        });
        if (!release) {
            console.log('> releases#createRelease');
            release = await createRelease({
                owner: owner,
                repo: repo,
                tag_name: tag,
                name: name || tag,
                body: body || ''
            });
            console.log('ok', release);
        } else if (release.body !== body) {
            console.log('> releases#editRelease');
            let releaseOptions = {
                owner: owner,
                repo: repo,
                id: release.id,
                tag_name: tag,
                name: name || tag
            };
            if (body) {
                releaseOptions.body = body || '';
            }
            release = await editRelease(releaseOptions);
            console.log('ok', release);
        }

        console.log('> releases#listAssets');
        let assets = await listAssets({
            owner: owner,
            repo: repo,
            id: release.id
        });
        console.log('assets=%d', assets.length);

        assets = _.filter(assets, (asset) => {
            // Example:
            // 'cnc-1.1.0-latest-08c256a-linux-x64.tar.gz'
            // ["cnc-1.1.0-latest-08c256a-linux-x64.tar.gz", "cnc", "1.1.0-latest-08c256a", "linux", "x64", "tar.gz"]
            const pattern = new RegExp(/([a-zA-Z0-9][a-zA-Z0-9\-]*)\-(\d+\.\d+\.\d+(?:\-[a-zA-Z0-9][a-zA-Z0-9\-]*)?)(?:\-(mac|win|linux|tinyweb))(?:(?:\-([a-zA-Z0-9_\-]+))?\.(.*))/);

            return _.some(files, (file) => {
                const r1 = asset.name.match(pattern);
                const r2 = path.basename(file).match(pattern);

                if ((r1 === null) || (r2 === null)) {
                    console.error('Unable to match file: asset="%s", file="%s"', asset.name, path.basename(file));
                    return false;
                }

                // 0: full
                // 1: name
                // 2: version
                // 3: platform
                // 4: arch
                // 5: extname

                // Skip checking for #0 (full) and #2 (version)
                r1[0] = r1[2] = undefined;
                r2[0] = r2[2] = undefined;

                return _.isEqual(_.compact(r1), _.compact(r2));
            });
        });

        if (assets.length > 0) {
            console.log('> releases#deleteAsset');
            for (let i = 0; i < assets.length; ++i) {
                const asset = assets[i];
                console.log('#%d', i + 1, {
                    id: asset.id,
                    name: asset.name,
                    label: asset.label,
                    state: asset.state,
                    size: asset.size,
                    download_count: asset.download_count,
                    created_at: asset.created_at,
                    updated_at: asset.updated_at
                });
                await deleteAsset({
                    owner: owner,
                    repo: repo,
                    id: asset.id
                });
            }
        }

        if (files.length > 0) {
            console.log('> releases#uploadAsset');
            for (let i = 0; i < files.length; ++i) {
                const file = files[i];
                console.log('#%d name="%s" filePath="%s"', i + 1, path.basename(file), file);
                await uploadAsset({
                    owner: owner,
                    repo: repo,
                    id: release.id,
                    filePath: file,
                    name: path.basename(file)
                });
            }
        }
    } catch (err) {
        console.error(err);
    }
};

main();
