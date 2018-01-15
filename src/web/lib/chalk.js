import chalk from 'chalk';

const ctx = new chalk.constructor({
    enabled: true,

    // 0: All colors disabled
    // 1: 16 colors
    // 2: 256 colors
    // 3: 16 million colors
    level: 3
});

export default ctx;
