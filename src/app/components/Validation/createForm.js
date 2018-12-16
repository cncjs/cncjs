import ensureArray from 'ensure-array';
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

const noop = () => {};

const createForm = (options) => (WrappedComponent) => class Form extends PureComponent {
    static displayName = `Form(${WrappedComponent.name})`;

    static childContextTypes = {
        $validation: PropTypes.shape({
            register: PropTypes.func.isRequired,
            unregister: PropTypes.func.isRequired,
            setProps: PropTypes.func.isRequired,
            getProps: PropTypes.func.isRequired
        })
    };

    state = this.getInitialState();
    options = {
        ...options
    };

    get errors() {
        return this.state.components.filter(c => !!c.props.error).map(c => c.props);
    }

    getChildContext() {
        return {
            $validation: {
                register: this.register,
                unregister: this.unregister,
                setProps: this.setProps,
                getProps: this.getProps
            }
        };
    }

    getInitialState() {
        return {
            components: []
        };
    }

    register = (component) => {
        if (!(component && component.props)) {
            return;
        }

        const hasCheckedProperty = (component.props.type === 'radio' || component.props.type === 'checkbox');

        this.setState(state => ({
            components: [
                ...state.components,
                {
                    component: component,
                    props: {
                        ...component.props,
                        value: component.props.value || '',
                        ...(hasCheckedProperty ? { checked: !!component.props.checked } : {})
                    }
                }
            ]
        }), () => {
            this.invalidate();
        });
    };

    unregister = (component) => {
        this.setState(state => ({
            components: state.components.reduce((components, c) => {
                if (c.component === component) {
                    return components;
                }
                components.push(c);
                return components;
            }, [])
        }), () => {
            this.invalidate();
        });
    };

    setProps = (component, props) => {
        this.setState(state => ({
            components: state.components.map(c => {
                // Update component props
                if (c.component === component) {
                    return {
                        ...c,
                        props: {
                            ...c.props,
                            ...props
                        }
                    };
                }

                // Uncheck other radio buttons in the same group
                if (c.props.type === 'radio' && c.component.props.name === component.props.name) {
                    return {
                        ...c,
                        props: {
                            ...c.props,
                            checked: false
                        }
                    };
                }

                // Other components
                return c;
            })
        }), () => {
            this.invalidate();
        });
    };

    getProps = (component) => {
        for (let i = 0; i < this.state.components.length; ++i) {
            if (component === this.state.components[i].component) {
                return this.state.components[i].props;
            }
        }

        return null;
    };

    invalidate = (callback = noop) => {
        if (typeof callback !== 'function') {
            callback = noop;
        }

        const errors = [];

        this.setState(state => {
            const components = state.components.reduce((acc, c) => {
                const { name } = c.props;
                if (!acc[name]) {
                    acc[name] = [];
                }
                acc[name].push(c.props);
                return acc;
            }, {});

            return {
                components: state.components.map(c => {
                    const validations = ensureArray(c.props.validations);

                    let error = null;
                    for (const validation of validations) {
                        error = validation(c.props.value, c.props, components);
                        if (error) {
                            errors.push({
                                ...c.props,
                                error: error
                            });
                            break;
                        }
                    }

                    return {
                        ...c,
                        props: {
                            ...c.props,
                            error: error
                        }
                    };
                })
            };
        }, () => {
            if (typeof this.options.onValidate === 'function') {
                this.options.onValidate.call(this, this.props, errors);
            }
            if (errors.length > 0) {
                callback(errors);
            } else {
                callback();
            }
        });
    };

    validate = (name = '', callback = noop) => {
        if (typeof name === 'function') {
            callback = name;
            name = '';
        }
        if (typeof callback !== 'function') {
            callback = noop;
        }

        this.setState(state => ({
            components: state.components.map(c => {
                if (!name || (name === c.props.name)) {
                    return {
                        ...c,
                        props: {
                            ...c.props,
                            blurred: true,
                            changed: true
                        }
                    };
                }

                return c;
            })
        }), () => {
            this.invalidate(callback);
        });
    };

    getValues() {
        return this.state.components.reduce((values, c) => {
            const { type, name, value, checked } = c.props;

            if ((type === 'radio' || type === 'checkbox') && !checked) {
                values[name] = values[name] || '';
                return values;
            }

            if (!Object.prototype.hasOwnProperty.call(values, name)) {
                values[name] = value;
            } else {
                values[name] = !!('' + values[name])
                    ? ensureArray(values[name]).concat(value)
                    : value;
            }

            return values;
        }, {});
    }

    render() {
        return (
            <WrappedComponent {...this.props} />
        );
    }
};

export default createForm;
