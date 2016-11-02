import packageJson from 'package-json';

export const getLatestVersion = (req, res) => {
    packageJson('cncjs')
        .then(data => {
            const latest = data['dist-tags'].latest;
            const time = data.time[latest];
            const {
                name,
                version,
                description,
                homepage
            } = { ...data.versions[latest] };

            res.send({ time, name, version, description, homepage });
        })
        .catch(err => {
            res.status(400).send({
                err: err
            });
        });
};
