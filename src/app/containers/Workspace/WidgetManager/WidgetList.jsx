import PropTypes from 'prop-types';
import React from 'react';
import WidgetListItem from './WidgetListItem';

const WidgetList = (props) => {
    const { list, onChange } = props;
    const style = {
        maxHeight: Math.max(window.innerHeight / 2, 200),
        overflowY: 'scroll',
        padding: 15
    };

    return (
        <div className="container-fluid" style={style}>
            <div className="row">
                {list.map((o, key) => (
                    <div className="col-xs-6 col-md-4" key={o.id}>
                        <WidgetListItem
                            id={o.id}
                            caption={o.caption}
                            details={o.details}
                            checked={o.visible}
                            disabled={o.disabled}
                            onChange={onChange}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

WidgetList.propTypes = {
    list: PropTypes.array.isRequired,
    onChange: PropTypes.func
};

export default WidgetList;
