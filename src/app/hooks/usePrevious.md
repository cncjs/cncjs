# usePrevious

React state hook that returns the previous state as described in the [React hooks FAQ](https://reactjs.org/docs/hooks-faq.html#how-to-get-the-previous-props-or-state).

## Usage

```jsx
const Demo = () => {
    const [count, setCount] = React.useState(0);
    const prevCount = usePrevious(count);

    return (
        <p>
            Now: {count}, before: {prevCount}
        </p>
    );
};
```
