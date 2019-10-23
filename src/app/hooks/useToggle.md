# useToggle

React state hook that toggles a boolean state.

## Usage

```jsx
const Demo = () => {
    const [checked, toggle] = useToggle(false);

    return (
        <>
            <div>{checked ? 'Checkbox is checked' : 'Checkbox is unchecked'}</div>
            <input type="checkbox" checked={checked} onChange={toggle} />
        </>
    );
};
```
