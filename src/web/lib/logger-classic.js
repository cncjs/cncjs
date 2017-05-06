/* eslint no-console: 0 */
module.exports = (options) => {
    const {
        colorized = true,
        showSource = true,
        showTimestamp = false,
        formatTimestamp = (t) => new Date(t).toISOString()
    } = { ...options };

    return (context, messages, next) => {
        const { name, level, stackframes = [] } = { ...context };
        const timestamp = new Date().getTime();
        const formatters = [];
        const styles = [];

        if (showTimestamp) {
            const str = (typeof formatTimestamp === 'function')
                ? formatTimestamp(timestamp)
                : timestamp;

            if (colorized) {
                formatters.push(`%c ${str} %c`);
                const style = `
                    line-height: 20px;
                    padding: 2px 0;
                    color: #3B5998;
                    background: #EDEFF4;
                `;
                styles.push(style.replace(/[\r\n]*/g, ''));
                styles.push('');
            } else {
                formatters.push(str);
            }
        }

        if (level && level.name) {
            if (colorized) {
                const str = level.name.charAt(0).toUpperCase();
                formatters.push(`%c${str}%c`);

                const style = {
                    trace: `
                        line-height: 20px;
                        padding: 2px 5px;
                        border: 1px solid #222;
                        color: #222;
                        background: #FFF;
                    `,
                    debug: `
                        line-height: 20px;
                        padding: 2px 5px;
                        border: 1px solid #4F8A10;
                        color: #4F8A10;
                        background: #DFF2BF;
                    `,
                    info: `
                        line-height: 20px;
                        padding: 2px 5px;
                        border: 1px solid #00529B;
                        color: #00529B;
                        background: #BDE5F8;
                    `,
                    warn: `
                        line-height: 20px;
                        padding: 2px 5px;
                        border: 1px solid #9F6000;
                        color: #9F6000;
                        background: #EFEFB3;
                    `,
                    error: `
                        line-height: 20px;
                        padding: 2px 5px;
                        border: 1px solid #D8000C;
                        color: #D8000C;
                        background: #FFBABA;
                    `
                }[level.name] || '';
                styles.push(style.replace(/[\r\n]*/g, ''));
                styles.push('');
            } else {
                formatters.push(level.name.toUpperCase());
            }
        }

        if (name) {
            if (colorized) {
                formatters.push(`%c[${name}]%c`);

                const style = `
                    line-height: 20px;
                    color: #036F96;
                `;
                styles.push(style.replace(/[\r\n]*/g, ''));
                styles.push('');
            } else {
                formatters.push('[' + name + ']');
            }
        }

        messages = [
            formatters.join(' '),
            ...styles,
            ...messages
        ];

        if (showSource && stackframes.length > 0) {
            const stackframeIndex = Math.min(2, stackframes.length - 1);
            const source = stackframes[stackframeIndex].source || '';
            messages = messages.concat(source);
        }

        Function.prototype.apply.call(console.log, console, messages);
        next();
    };
};
