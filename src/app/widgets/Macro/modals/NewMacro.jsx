import _uniqueId from 'lodash/uniqueId';
import React, { useRef } from 'react';
import { Form, Field } from 'react-final-form';
import Box from 'app/components/Box';
import { Button } from 'app/components/Buttons';
import Dropdown, { MenuItem } from 'app/components/Dropdown';
import { Container, Row, Col } from 'app/components/GridSystem';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import Input from 'app/components/FormControl/Input';
import Textarea from 'app/components/FormControl/Textarea';
import FormGroup from 'app/components/FormGroup';
import Label from 'app/components/Label';
import Modal from 'app/components/Modal';
import Space from 'app/components/Space';
import i18n from 'app/lib/i18n';
import variables from '../shared/variables';

const NewMacro = ({
    onClose,
}) => {
    const contentRef = useRef();
    const initialValues = {
        name: '',
        content: '',
    };

    return (
        <Modal md onClose={onClose}>
            <Form
                initialValues={initialValues}
                onSubmit={(values) => {
                    // FIXME
                    onClose();
                }}
                subscription={{}}
            >
                {({ form }) => (
                    <Container>
                        <Modal.Header>
                            <Modal.Title>
                                {i18n._('New Macro')}
                            </Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <Field name="name">
                                {({ input, meta }) => {
                                    return (
                                        <FormGroup>
                                            <Label>{i18n._('Macro Name')}</Label>
                                            <Box>
                                                <Input {...input} />
                                            </Box>
                                        </FormGroup>
                                    );
                                }}
                            </Field>
                            <Field name="content">
                                {({ input, meta }) => {
                                    return (
                                        <FormGroup>
                                            <Row style={{ alignItems: 'center' }}>
                                                <Col>
                                                    <Label>{i18n._('Macro Commands')}</Label>
                                                </Col>
                                                <Col>
                                                    <Dropdown
                                                        sm
                                                        pullRight
                                                        onSelect={(eventKey) => {
                                                            const textarea = contentRef.current;
                                                            if (!textarea) {
                                                                return;
                                                            }

                                                            const textToInsert = eventKey;
                                                            const caretPos = textarea.selectionStart;
                                                            const front = (textarea.value).substring(0, caretPos);
                                                            const back = (textarea.value).substring(textarea.selectionEnd, textarea.value.length);
                                                            const value = front + textToInsert + back;
                                                            input.onChange(value);
                                                        }}
                                                    >
                                                        <Dropdown.Toggle
                                                            btnStyle="link"
                                                            noCaret
                                                            style={{
                                                                padding: 0,
                                                                paddingBottom: '.5rem',
                                                            }}
                                                        >
                                                            <FontAwesomeIcon icon="plus" fixedWidth />
                                                            <Space width={8} />
                                                            {i18n._('Macro Variables')}
                                                            <Space width={4} />
                                                            <FontAwesomeIcon icon="caret-down" fixedWidth />
                                                        </Dropdown.Toggle>
                                                        <Dropdown.Menu
                                                            style={{
                                                                maxHeight: 180,
                                                                overflowY: 'auto'
                                                            }}
                                                        >
                                                            {variables.map(v => {
                                                                if (typeof v === 'object') {
                                                                    return (
                                                                        <MenuItem
                                                                            header={v.type === 'header'}
                                                                            key={_uniqueId()}
                                                                        >
                                                                            {v.text}
                                                                        </MenuItem>
                                                                    );
                                                                }

                                                                return (
                                                                    <MenuItem
                                                                        eventKey={v}
                                                                        key={_uniqueId()}
                                                                    >
                                                                        {v}
                                                                    </MenuItem>
                                                                );
                                                            })}
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </Col>
                                            </Row>
                                            <Textarea
                                                {...input}
                                                ref={contentRef}
                                                rows={10}
                                            />
                                        </FormGroup>
                                    );
                                }}
                            </Field>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button
                                btnStyle="default"
                                onClick={onClose}
                            >
                                {i18n._('Cancel')}
                            </Button>
                            <Button
                                sm
                                btnStyle="primary"
                                onClick={() => form.submit()}
                            >
                                {i18n._('OK')}
                            </Button>
                        </Modal.Footer>
                    </Container>
                )}
            </Form>
        </Modal>
    );
};

export default NewMacro;
