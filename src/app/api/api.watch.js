import monitor from '../services/monitor';

export const find = (req, res) => {
    const path = req.body.path || req.query.path || '';
    const files = monitor.find(path);

    res.send({ path: path, files: files });
};
