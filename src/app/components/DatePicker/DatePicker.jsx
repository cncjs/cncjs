import cx from 'classnames';
import moment from 'moment';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import DatePicker from 'react-datepicker';
import uncontrollable from 'uncontrollable';
import styles from './index.styl';

class DatePickerWrapper extends PureComponent {
    static propTypes = {
        locale: PropTypes.string,

        date: PropTypes.oneOfType([
            PropTypes.object,
            PropTypes.string
        ]),

        // The minimum selectable date. When set to null, there is no minimum.
        // Types supported:
        // * Date: A date object containing the minimum date.
        // * String: A date string in ISO 8601 format (i.e. YYYY-MM-DD).
        minDate: PropTypes.oneOfType([
            PropTypes.object,
            PropTypes.string
        ]),

        // The maximum selectable date. When set to null, there is no maximum.
        // Types supported:
        // * Date: A date object containing the maximum date.
        // * String: A date string in ISO 8601 format (i.e. YYYY-MM-DD).
        maxDate: PropTypes.oneOfType([
            PropTypes.object,
            PropTypes.string
        ]),

        // Called when a date is selected.
        onSelect: PropTypes.func
    };
    static defaultProps = {
        date: null,
        minDate: null,
        maxDate: null,
        onSelect: () => {}
    };

    handleSelect = (selected) => {
        const date = moment(selected).format('YYYY-MM-DD');
        this.props.onSelect && this.props.onSelect(date);
    };

    render() {
        const {
            locale,
            date,
            minDate,
            maxDate,
            onSelect, // eslint-disable-line
            className,
            ...props
        } = this.props;

        return (
            <DatePicker
                {...props}
                calendarClassName={cx(className, styles.datePickerContainer)}
                fixedHeight
                inline
                locale={locale}
                selected={moment(date)}
                minDate={moment(minDate)}
                maxDate={moment(maxDate)}
                onChange={this.handleSelect}
            />
        );
    }
}

export default uncontrollable(DatePickerWrapper, {
    // Define the pairs of prop/handlers you want to be uncontrollable
    date: 'onSelect'
});
