/* eslint-env jest */
import CommandInput from '../CommandInput';

// Runs in Jest's node environment: the component is constructed and its handlers are called directly, no DOM
jest.mock('../index.styl', () => ({}));

const make = (onSend) => {
  const component = new CommandInput({ onSend });
  // Not mounted: apply state updates synchronously
  component.setState = (update) => {
    component.state = { ...component.state, ...update };
  };
  return component;
};

const submit = (component) => {
  const event = { preventDefault: jest.fn() };
  component.handleSubmit(event);
  return event;
};

describe('CommandInput', () => {
  test('sends the trimmed command and clears the field', () => {
    const onSend = jest.fn();
    const component = make(onSend);
    component.handleChange({ target: { value: '  G0 X10  ' } });

    const event = submit(component);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(onSend).toHaveBeenCalledWith('G0 X10');
    expect(component.state.value).toBe('');
  });

  test('sends nothing for an empty or blank field', () => {
    const onSend = jest.fn();
    const component = make(onSend);

    submit(component);
    component.handleChange({ target: { value: '   ' } });
    submit(component);

    expect(onSend).not.toHaveBeenCalled();
    expect(component.state.value).toBe('   ');
  });
});
