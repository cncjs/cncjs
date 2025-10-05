import { ensureArray } from 'ensure-type';
import { parseLine } from 'gcode-parser';

const fromPairs = (pairs) => {
  let index = -1;
  const length = (!pairs) ? 0 : pairs.length;
  const result = {};

  while (++index < length) {
    const pair = pairs[index];
    result[pair[0]] = pair[1];
  }

  return result;
};

const partitionWordsByGroup = (words = []) => {
  const groups = [];

  for (let i = 0; i < words.length; ++i) {
    const word = words[i];
    const letter = word[0];

    if ((letter === 'G') || (letter === 'M')) {
      groups.push([word]);
      continue;
    }

    if (groups.length > 0) {
      groups[groups.length - 1].push(word);
    } else {
      groups.push([word]);
    }
  }

  return groups;
};

const interpret = (function() {
  let cmd = '';

  return function (line, callback) {
    const data = parseLine(line);
    const groups = partitionWordsByGroup(ensureArray(data.words));

    for (let i = 0; i < groups.length; ++i) {
      const words = groups[i];
      const word = words[0] || [];
      const letter = word[0];
      const arg = word[1];

      if (letter === 'G' || letter === 'M') {
        cmd = letter + arg;
        const params = fromPairs(words.slice(1));
        callback(cmd, params);
      } else {
        // Use previous command if the line does not start with Gxx or Mxx
        // G0 XZ0.25
        //   X-0.5 Y0
        //   Z0.1
        const params = fromPairs(words);
        callback(cmd, params);
      }
    }
  };
}());

export default interpret;
