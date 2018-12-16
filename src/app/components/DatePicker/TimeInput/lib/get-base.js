export default function getBase(groupId, twelveHourTime) {
    if (!groupId) {
        return twelveHourTime ? 12 : 24;
    }
    if (groupId < 3) {
        return 60;
    }
    return 1000;
}
