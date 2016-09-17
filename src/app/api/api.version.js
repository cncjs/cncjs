import packageJson from 'package-json';

export const getLatestVersion = (req, res) => {
    packageJson('cncjs', 'latest')
        .then(json => {
            const {
                name,
                version,
                description,
                homepage
            } = { ...json };

            res.send({ name, version, description, homepage });
        })
        .catch((err) => {
            res.status(400).send({
                err: err
            });
        });
};
