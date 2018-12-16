import isTwelveHourTime from './is-twelve-hour-time';

export default function stringify(groups) {
    if (isTwelveHourTime(groups)) {
        return groups.slice(0, -1).join(':') + ' ' + groups[groups.length - 1];
    }
    return groups.join(':');
}
