import zeroPad from './zero-pad';
import getGroups from './get-groups';
import getBase from './get-base';
import stringify from './stringify';
import toggle24Hr from './toggle-24-hour';
import isTwelveHourTime from './is-twelve-hour-time';

const add = (groups, groupId, amount, twelveHourTime) => {
    const base = getBase(groupId, twelveHourTime);
    if (!groupId && groups[groupId] === '12' && twelveHourTime) {
        groups[groupId] = '00';
    }
    const val = Number(groups[groupId]) + amount;
    groups = replace(groups, groupId, (val + base) % base);
    if (groupId && val >= base) {
        return add(groups, groupId - 1, 1, twelveHourTime);
    }
    if (groupId && val < 0) {
        return add(groups, groupId - 1, -1, twelveHourTime);
    }
    if (!groupId && twelveHourTime) {
        if (val >= base || val < 0) {
            toggle24Hr(groups);
        }
        if (groups[0] === '00') {
            groups[0] = '12';
        }
    }

    return groups;
};

const replace = (groups, groupId, amount) => {
    const digits = groups[groupId].length;
    groups[groupId] = zeroPad(String(amount), digits);
    return groups;
};

export default function adder(str, groupId, amount) {
    const groups = getGroups(str);
    const twelveHourTime = isTwelveHourTime(groups);
    if (twelveHourTime && (groupId === (groups.length - 1))) {
        return stringify(toggle24Hr(groups));
    }
    return stringify(add(groups, groupId, amount, twelveHourTime));
}
