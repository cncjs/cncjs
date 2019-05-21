import PropTypes from 'prop-types';
import React from 'react';
import { Container, Row, Col } from 'app/components/GridSystem';
import WidgetListItem from './WidgetListItem';

const WidgetList = ({ data, onChange }) => (
    <Container fluid gutterWidth={24} style={{ padding: 0 }}>
        <Row>
            {data.map(widget => (
                <Col
                    key={widget.id} xs={12} md={6}
                    lg={4} style={{ margin: '12px 0' }}
                >
                    <WidgetListItem
                        id={widget.id}
                        caption={widget.caption}
                        details={widget.details}
                        checked={widget.visible}
                        disabled={widget.disabled}
                        onChange={onChange}
                    />
                </Col>
            ))}
        </Row>
    </Container>
);

WidgetList.propTypes = {
    data: PropTypes.array.isRequired,
    onChange: PropTypes.func
};

export default WidgetList;
