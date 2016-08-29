import _ from 'lodash';
import React from 'react';
import { Grid, Row, Col } from 'react-bootstrap';
import WidgetListItem from './WidgetListItem';

const WidgetList = (props) => {
    const { list, onChange } = props;
    const style = {
        maxHeight: Math.max(window.innerHeight / 2, 200),
        maxWidth: Math.max(window.innerWidth * 0.8, 600),
        overflowY: 'scroll',
        padding: 15
    };

    return (
        <Grid fluid={true} style={style}>
            <Row>
            {_.map(list, (o, key) =>
                <Col xs={6} md={4} key={key}>
                    <WidgetListItem
                        id={o.id}
                        caption={o.caption}
                        details={o.details}
                        checked={o.visible}
                        disabled={o.disabled}
                        onChange={onChange}
                    />
                </Col>
            )}
            </Row>
        </Grid>
    );
};

WidgetList.propTypes = {
    list: React.PropTypes.array.isRequired,
    onChange: React.PropTypes.func
};

export default WidgetList;
