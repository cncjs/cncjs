export default function getGroupId(index) {
    if (index < 3) {
        return 0;
    }
    if (index < 6) {
        return 1;
    }
    if (index < 9) {
        return 2;
    }
    if (index < 13) {
        return 3;
    }
    return 4;
}
