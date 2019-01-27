import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Container, Row, Col } from 'app/components/GridSystem';
import { Button } from 'app/components/Buttons';
import { Tooltip } from 'app/components/Tooltip';
import controller from 'app/lib/controller';
import Panel from './components/Panel';

class MDIPanel extends PureComponent {
    static propTypes = {
        config: PropTypes.object,
        state: PropTypes.object,
        actions: PropTypes.object
    };

    renderMDIButtons() {
        const { canClick, mdi } = this.props.state;

        return mdi.commands.map(c => {
            const grid = Object.keys(c.grid || {})
                .filter(size => ['xs', 'sm', 'md', 'lg', 'xl'].indexOf(size) >= 0)
                .reduce((acc, size) => {
                    if (c.grid[size] >= 1 && c.grid[size] <= 12) {
                        acc[size] = Math.floor(c.grid[size]);
                    }
                    return acc;
                }, {});

            return (
                <Col {...grid} key={c.id} style={{ padding: '0 4px', marginTop: 5 }}>
                    <Tooltip
                        placement="bottom"
                        disabled={!canClick}
                        content={(
                            <div className="text-left">
                                {c.command.split('\n').map((line, index) => (
                                    <div key={`${c.id}_${index + 1}`}>{line}</div>
                                ))}
                            </div>
                        )}
                        enterDelay={1000}
                        hideOnClick
                    >
                        <Button
                            btnSize="sm"
                            btnStyle="default"
                            style={{
                                minWidth: 'auto',
                                width: '100%'
                            }}
                            disabled={!canClick}
                            onClick={() => {
                                controller.command('gcode', c.command);
                            }}
                        >
                            {c.name}
                        </Button>
                    </Tooltip>
                </Col>
            );
        });
    }
    render() {
        return (
            <Panel>
                <Container
                    fluid
                    style={{
                        padding: 0,
                        margin: '-5px -4px 0 -4px',
                    }}
                >
                    <Row>
                        {this.renderMDIButtons()}
                    </Row>
                </Container>
            </Panel>
        );
    }
}

export default MDIPanel;
