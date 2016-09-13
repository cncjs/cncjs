import React from 'react';
import Switch from 'rc-switch';
import i18n from '../../lib/i18n';

class WidgetListItem extends React.Component {
    static propTypes = {
        id: React.PropTypes.string,
        caption: React.PropTypes.string,
        details: React.PropTypes.string,
        checked: React.PropTypes.bool,
        disabled: React.PropTypes.bool,
        onChange: React.PropTypes.func
    };
    state = {
        checked: this.props.checked
    };

    handleChange(checked) {
        this.setState({ checked: checked });
        this.props.onChange(this.props.id, checked);
    }
    render() {
        const { checked } = this.state;
        const styles = {
            thumbnail: {
                fontSize: 100,
                backgroundColor: '#f5f6f7',
                color: checked ? 'rgba(64, 64, 64, 0.8)' : '#ccc',
                textShadow: '2px 2px 2px #a0a0a0'
            },
            caption: {
                color: '#333',
                fontWeight: 'bold',
                opacity: checked ? 1 : 0.6
            },
            details: {
                color: '#333',
                height: 60,
                marginTop: 15,
                maxHeight: 60,
                opacity: checked ? 1 : 0.6
            }
        };

        return (
            <div className="panel panel-default">
                <div className="panel-head text-center" style={styles.thumbnail}>
                    <i className="fa fa-list-alt" />
                </div>
                <div className="panel-body">
                    <div className="row no-gutters">
                        <div className="col-sm-8 text-left">
                            <span style={styles.caption}>{this.props.caption}</span>
                        </div>
                        <div className="col-sm-4 text-right">
                            <Switch
                                className="noselect"
                                disabled={this.props.disabled}
                                defaultChecked={checked}
                                onChange={::this.handleChange}
                                checkedChildren={i18n._('ON')}
                                unCheckedChildren={i18n._('OFF')}
                            />
                        </div>
                    </div>
                    <div style={styles.details}>
                        <p>{this.props.details}</p>
                    </div>
                </div>
            </div>
        );
    }
}

export default WidgetListItem;
