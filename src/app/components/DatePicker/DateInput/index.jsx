import cx from 'classnames';
import moment from 'moment';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import uncontrollable from 'uncontrollable';
import Calendar from './Calendar';
import styles from './index.styl';

const KEYCODE_BACKSPACE = 8;
const KEYCODE_TAB = 9;
const KEYCODE_ESCAPE = 27;
const KEYCODE_PAGE_UP = 33;
const KEYCODE_PAGE_DOWN = 34;
const KEYCODE_UP_ARROW = 38;
const KEYCODE_DOWN_ARROW = 40;
const KEYCODE_SPACE = 32;
const KEYCODE_DELETE = 46;

const SILHOUETTE = '0001-01-01';

const getGroups = (str) => {
    return str.split(/[\-\s+]/);
};

const getGroupId = (index) => {
    if (index < 5) {
        return 0;
    }
    if (index < 8) {
        return 1;
    }
    return 2;
};

const replaceCharAt = (string, index, replace) => {
    return string.substring(0, index) + replace + string.substring(index + 1);
};

const isValidDate = (date) => {
    if (!date) {
        return false;
    }

    return moment(date).isValid();
};

class DateInput extends PureComponent {
    static propTypes = {
        value: PropTypes.string,

        // The minimum date. When set to null, there is no minimum.
        // Types supported:
        // * Date: A date object containing the minimum date.
        // * String: A date string in ISO 8601 format (i.e. YYYY-MM-DD).
        minDate: PropTypes.oneOfType([
            PropTypes.object,
            PropTypes.string
        ]),

        // The maximum date. When set to null, there is no maximum.
        // Types supported:
        // * Date: A date object containing the maximum date.
        // * String: A date string in ISO 8601 format (i.e. YYYY-MM-DD).
        maxDate: PropTypes.oneOfType([
            PropTypes.object,
            PropTypes.string
        ]),

        // Called when the value changes.
        onChange: PropTypes.func
    };

    static defaultProps = {
        value: '0000-00-00'
    };

    input = null;

    mounted = false;

    state = {
        focused: false,
        caretIndex: null
    };

    handleDateOutOfRange = () => {
        if (typeof this.props.onChange !== 'function') {
            return;
        }

        const date = moment(this.props.value);

        if (isValidDate(this.props.minDate)) {
            const minDate = moment(this.props.minDate).startOf('day');
            if (date.isBefore(minDate)) {
                this.props.onChange(minDate.format('YYYY-MM-DD'));
            }
        }

        if (isValidDate(this.props.maxDate)) {
            const maxDate = moment(this.props.maxDate).endOf('day');
            if (date.isAfter(maxDate)) {
                this.props.onChange(maxDate.format('YYYY-MM-DD'));
            }
        }
    };

    handleFocus = (event) => {
        if (this.mounted) {
            this.setState({ focused: true });
        }
    };

    handleBlur = (event) => {
        if (this.mounted) {
            this.setState({ caretIndex: null, focused: false });
            this.handleDateOutOfRange();
        }
    };

    handleChange = (event) => {
        let value = this.props.value;
        let newValue = this.input.value;
        let diff = newValue.length - value.length;
        let end = this.input.selectionStart;
        let insertion;
        let start = end - Math.abs(diff);

        event.preventDefault();

        if (diff > 0) {
            insertion = newValue.slice(end - diff, end);
            while (diff--) {
                const oldChar = value.charAt(start);
                const newChar = insertion.charAt(0);
                if (this.isSeparator(oldChar)) {
                    if (this.isSeparator(newChar)) {
                        insertion = insertion.slice(1);
                        start++;
                    } else {
                        start++;
                        diff++;
                        end++;
                    }
                } else {
                    value = replaceCharAt(value, start, newChar);
                    insertion = insertion.slice(1);
                    start++;
                }
            }
            newValue = value;
        } else {
            if (newValue.charAt(start) === '-') {
                start++;
            }
            // apply default to selection
            let result = value;
            for (let i = start; i < end; i++) {
                result = replaceCharAt(result, i, newValue.charAt(i));
            }
            newValue = result;
        }

        if (newValue.length > SILHOUETTE.length) {
            return;
        }

        const m = moment(newValue);
        if (m.isValid()) {
            if (newValue.charAt(end) === '-') {
                end++;
            }
            this.onChange(newValue, end);
        } else {
            const caretIndex = this.props.value.length - (newValue.length - end);
            if (this.mounted) {
                this.setState({ caretIndex: caretIndex });
            }
        }
    };

    handleKeyDown = (event) => {
        event.stopPropagation();

        if (event.which === KEYCODE_BACKSPACE) {
            this.handleBackspace(event);
            return;
        }
        if (event.which === KEYCODE_TAB) {
            this.handleTab(event);
            return;
        }
        if (event.which === KEYCODE_ESCAPE) {
            this.handleEscape(event);
            return;
        }
        if (event.which === KEYCODE_SPACE || event.which === KEYCODE_DELETE) {
            this.handleForwardspace(event);
            return;
        }
        if (event.which === KEYCODE_PAGE_UP) {
            this.handlePageUp(event);
            return;
        }
        if (event.which === KEYCODE_PAGE_DOWN) {
            this.handlePageDown(event);
            return;
        }
        if (event.which === KEYCODE_UP_ARROW) {
            this.handleUpArrow(event);
            return;
        }
        if (event.which === KEYCODE_DOWN_ARROW) {
            this.handleDownArrow(event);
            return;
        }
    };

    handleEscape = () => {
        if (this.mounted) {
            this.input.blur();
        }
    };

    handleTab = (event) => {
        const start = this.input.selectionStart;
        const value = this.props.value;
        const groups = getGroups(value);
        let groupId = getGroupId(start);
        if (event.shiftKey) {
            if (!groupId) {
                return;
            }
            groupId--;
        } else {
            if (groupId >= (groups.length - 1)) {
                return;
            }
            groupId++;
        }

        event.preventDefault();

        let index = 0; // YYYY-MM-DD
        if (groupId === 1) {
            index = (4 + 1);
        }
        if (groupId === 2) {
            index = (4 + 1) + (2 + 1);
        }
        if (this.props.value.charAt(index) === ' ') {
            index++;
        }
        if (this.mounted) {
            this.setState({ caretIndex: index });
        }
    };

    handlePageUp = (event) => {
        event.preventDefault();

        const m = moment(this.props.value);
        if (!m.isValid()) {
            return;
        }

        const value = m.subtract(1, 'months').format('YYYY-MM-DD');
        const start = this.input.selectionStart;
        this.onChange(value, start);
    };

    handlePageDown = (event) => {
        event.preventDefault();

        const m = moment(this.props.value);
        if (!m.isValid()) {
            return;
        }

        const value = m.add(1, 'months').format('YYYY-MM-DD');
        const start = this.input.selectionStart;
        this.onChange(value, start);
    };

    handleUpArrow = (event) => {
        event.preventDefault();

        const start = this.input.selectionStart;
        const groupId = getGroupId(start);
        const unit = {
            0: 'years',
            1: 'months',
            2: 'days'
        }[groupId];

        if (!unit) {
            return;
        }

        const m = moment(this.props.value);
        if (!m.isValid()) {
            return;
        }

        const value = m.add(1, unit).format('YYYY-MM-DD');
        this.onChange(value, start);
    };

    handleDownArrow = (event) => {
        event.preventDefault();

        const start = this.input.selectionStart;
        const groupId = getGroupId(start);
        const unit = {
            0: 'years',
            1: 'months',
            2: 'days'
        }[groupId];

        if (!unit) {
            return;
        }

        const m = moment(this.props.value);
        if (!m.isValid()) {
            return;
        }

        const value = m.subtract(1, unit).format('YYYY-MM-DD');
        this.onChange(value, start);
    };

    handleBackspace = (event) => {
        event.preventDefault();

        let value = this.props.value;
        let start = this.input.selectionStart;
        let end = this.input.selectionEnd;

        if (!start && !end) {
            return;
        }

        let diff = end - start;
        const silhouette = this.silhouette();

        if (!diff) {
            if (value[start - 1] === '-') {
                start--;
            }
            value = replaceCharAt(value, start - 1, silhouette.charAt(start - 1));
            start--;
        } else {
            while (diff--) {
                if (value[end - 1] !== '-') {
                    value = replaceCharAt(value, end - 1, silhouette.charAt(end - 1));
                }
                end--;
            }
            if (value.charAt(start - 1) === '-') {
                start--;
            }
        }

        this.onChange(value, start);
    };

    handleForwardspace = (event) => {
        event.preventDefault();

        let start = this.input.selectionStart;
        let value = this.props.value;
        let end = this.input.selectionEnd;

        if (start === end === (value.length - 1)) {
            return;
        }

        let diff = end - start;
        const silhouette = this.silhouette();

        if (!diff) {
            if (value[start] === '-') {
                start++;
            }
            value = replaceCharAt(value, start, silhouette.charAt(start));
            start++;
        } else {
            while (diff--) {
                if (value[end - 1] !== '-') {
                    value = replaceCharAt(value, start, silhouette.charAt(start));
                }
                start++;
            }
        }

        if (value.charAt(start) === '-') {
            start++;
        }

        this.onChange(value, start);
    };

    isSeparator = (char) => {
        return /[:\s]/.test(char);
    };

    onChange = (str, caretIndex) => {
        const m = moment(str);
        if (m.isValid()) {
            this.props.onChange && this.props.onChange(str);
        }
        if (this.mounted && typeof caretIndex === 'number') {
            this.setState({ caretIndex: caretIndex });
        }
    };

    silhouette = () => {
        return this.props.value.replace(/\d/g, (val, i) => {
            return SILHOUETTE.charAt(i);
        });
    };

    componentDidMount () {
        this.mounted = true;
        this.handleDateOutOfRange();
    }

    componentWillUnmount () {
        this.mounted = false;
    }

    componentDidUpdate() {
        const index = this.state.caretIndex;
        if (index || index === 0) {
            const selectionStart = index;
            const selectionEnd = index;
            this.input.setSelectionRange(selectionStart, selectionEnd);
        }
    }

    render() {
        const icon = (
            <Calendar className={styles.dateInputIcon} style={{ color: this.state.focused ? '#0096cc' : '#666' }} />
        );

        return (
            <div
                className={cx(this.props.className, styles.dateInputContainer)}
                style={this.props.style}
            >
                <div className={styles.dateInput}>
                    <input
                        ref={node => {
                            this.input = node;
                        }}
                        type="text"
                        value={this.props.value}
                        onChange={this.handleChange}
                        onFocus={this.handleFocus}
                        onBlur={this.handleBlur}
                        onKeyDown={this.handleKeyDown}
                    />
                </div>
                {icon}
            </div>
        );
    }
}

export default uncontrollable(DateInput, {
    // Define the pairs of prop/handlers you want to be uncontrollable
    value: 'onChange'
});
