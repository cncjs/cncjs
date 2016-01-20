const normalize = (str) => str.replace(/[\/]+/g, '/').replace(/\/\?/g, '?').replace(/\/\#/g, '#').replace(/\:\//g, '://');

const urljoin = function() {
    let joined = [].slice.call(arguments, 0).join('/');
    return normalize(joined);
};

export default urljoin;
