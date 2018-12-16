export default function replaceCharAt(str, index, replacement) {
    str = str.split('');
    str[index] = replacement;
    return str.join('');
}
