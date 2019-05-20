import i18next from 'i18next';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import uncontrollable from 'uncontrollable';
import DatePicker, { TimeInput, DateInput } from '@trendmicro/react-datepicker';
import styles from './index.styl';

class DateTimeRangePicker extends PureComponent {
    static propTypes = {
        locale: PropTypes.string,
        minDate: PropTypes.object,
        maxDate: PropTypes.object,
        startDate: PropTypes.string,
        startTime: PropTypes.string,
        endDate: PropTypes.string,
        endTime: PropTypes.string,
        onChangeStartDate: PropTypes.func,
        onChangeStartTime: PropTypes.func,
        onChangeEndDate: PropTypes.func,
        onChangeEndTime: PropTypes.func
    };

    static defaultProps = {
        locale: i18next.language,
        minDate: null,
        maxDate: null
    };

    render() {
        const {
            locale,
            minDate,
            maxDate,
            startDate,
            startTime,
            endDate,
            endTime,
            onChangeStartDate,
            onChangeStartTime,
            onChangeEndDate,
            onChangeEndTime
        } = this.props;

        return (
            <div className={styles.datePickerPane}>
                <div className={styles.datePickerPaneHeader}>
                    <div className={styles.inputIconGroup}>
                        <DateInput
                            value={startDate}
                            onChange={onChangeStartDate}
                        />
                    </div>
                    <div className={styles.inputIconGroup}>
                        <TimeInput
                            value={startTime}
                            onChange={onChangeStartTime}
                        />
                    </div>
                    <div className={styles.tilde}>~</div>
                    <div className={styles.inputIconGroup}>
                        <DateInput
                            value={endDate}
                            onChange={onChangeEndDate}
                        />
                    </div>
                    <div className={styles.inputIconGroup}>
                        <TimeInput
                            value={endTime}
                            onChange={onChangeEndTime}
                        />
                    </div>
                </div>
                <div className={styles.datePickerPaneBody}>
                    <div className={styles.datePickerPaneContainer}>
                        <DatePicker
                            locale={locale}
                            date={startDate}
                            minDate={minDate}
                            maxDate={maxDate}
                            onSelect={onChangeStartDate}
                        />
                    </div>
                    <div className={styles.datePickerPaneContainer}>
                        <DatePicker
                            locale={locale}
                            date={endDate}
                            minDate={minDate}
                            maxDate={maxDate}
                            onSelect={onChangeEndDate}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

export default uncontrollable(DateTimeRangePicker, {
    // Define the pairs of prop/handlers you want to be uncontrollable
    startDate: 'onChangeStartDate',
    startTime: 'onChangeStartTime',
    endDate: 'onChangeEndDate',
    endTime: 'onChangeEndTime'
});
