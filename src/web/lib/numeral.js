// http://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
export const formatBytes = (bytes, decimals = 3) => {
    if (!bytes) {
        return '0 byte';
    }

    const k = 1000;
    const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / (k ** i)).toFixed(decimals)) + ' ' + sizes[i];
};
