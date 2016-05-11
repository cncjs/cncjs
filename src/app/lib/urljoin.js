const normalize = (str) => str
    .replace(/[\/]+/g, '/')
    .replace(/\/\?/g, '?')
    .replace(/\/#/g, '#')
    .replace(/:\//g, '://');

const urljoin = function(...args) {
    let joined = [].slice.call(args, 0).join('/');
    return normalize(joined);
};

export default urljoin;
