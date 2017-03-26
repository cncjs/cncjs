import ExpressionEvaluator from 'expr-eval';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import log from '../../lib/log';
import Modal from '../../components/Modal';
import ToggleSwitch from '../../components/ToggleSwitch';

class RunMacro extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { state, actions } = this.props;
        const { modalParams } = state;
        const { id, name, content, displayOriginalContent } = { ...modalParams };

        // Replace variables
        let gcode = content || '';
        if (!displayOriginalContent) {
            const { Parser } = ExpressionEvaluator;

            // Context
            const context = {
                xmin: 0,
                xmax: 0,
                ymin: 0,
                ymax: 0,
                zmin: 0,
                zmax: 0,
                ...controller.context
            };

            try {
                const reExpressionContext = new RegExp(/\[[^\]]+\]/g);
                gcode = gcode.replace(reExpressionContext, (match) => {
                    const expr = match.slice(1, -1);
                    return Parser.evaluate(expr, context) || '[]';
                });
            } catch (e) {
                log.error(e);
            }
        }

        return (
            <Modal
                onClose={actions.closeModal}
                size="md"
            >
                <Modal.Header>
                    <Modal.Title>
                        {i18n._('Run Macro')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div style={{ marginBottom: 10 }}>
                        <label><strong>{name}</strong></label>
                        <textarea
                            readOnly
                            rows="10"
                            className="form-control"
                            value={gcode}
                        />
                    </div>
                    <div>
                        <ToggleSwitch
                            checked={displayOriginalContent}
                            onChange={() => {
                                actions.updateModalParams({
                                    displayOriginalContent: !displayOriginalContent
                                });
                            }}
                            size="sm"
                        />
                        {i18n._('Display original content')}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={actions.closeModal}
                    >
                        {i18n._('Cancel')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                            actions.runMacro(id, { name });
                            actions.closeModal();
                        }}
                    >
                        {i18n._('Run')}
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default RunMacro;
