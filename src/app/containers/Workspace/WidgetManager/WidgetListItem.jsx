import PropTypes from 'prop-types';
import React, { Component } from 'react';
import styled from 'styled-components';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import { Container, Row, Col } from 'app/components/GridSystem';
import Margin from 'app/components/Margin';
import ToggleSwitch from 'app/components/ToggleSwitch';
import i18n from 'app/lib/i18n';

const Box = styled.div`
    width: 100%;
    background-color: #f5f6f7;
    text-align: center;
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;
`;

class WidgetListItem extends Component {
    static propTypes = {
        id: PropTypes.string,
        caption: PropTypes.string,
        details: PropTypes.string,
        checked: PropTypes.bool,
        disabled: PropTypes.bool,
        onChange: PropTypes.func
    };

    state = {
        checked: this.props.checked
    };

    handleChangeWidgetVisibility = (event) => {
        const checked = !this.state.checked;
        this.setState({ checked });
        this.props.onChange({
            id: this.props.id,
            checked: checked,
        });
    };

    render() {
        const { checked } = this.state;

        return (
            <Container
                fluid
                gutterWidth={24}
                style={{
                    border: '1px solid #ddd',
                    height: '100%',
                }}
            >
                <Margin bottom={12}>
                    <Row>
                        <Box>
                            <FontAwesomeIcon
                                icon="list-alt"
                                style={{
                                    fontSize: 100,
                                    filter: checked ? 'drop-shadow(4px 4px 4px rgba(0, 0, 0, 0.3))' : 'none',
                                    color: '#666',
                                    opacity: checked ? 1 : 0.6,
                                }}
                            />
                        </Box>
                    </Row>
                </Margin>
                <Margin bottom={12}>
                    <Row>
                        <Col>
                            <div
                                style={{
                                    opacity: checked ? 1 : 0.6,
                                }}
                            >
                                <strong>{this.props.caption}</strong>
                            </div>
                        </Col>
                        <Col width="auto">
                            <ToggleSwitch
                                title={checked ? i18n._('On') : i18n._('Off')}
                                disabled={this.props.disabled}
                                checked={checked}
                                onChange={this.handleChangeWidgetVisibility}
                            />
                        </Col>
                    </Row>
                </Margin>
                <Margin bottom={12}>
                    <div
                        style={{
                            opacity: checked ? 1 : 0.6,
                        }}
                    >
                        {this.props.details}
                    </div>
                </Margin>
            </Container>
        );
    }
}

export default WidgetListItem;
