# useStateWithEffect

React state hook that offers an optional second argument to pass a callback function for useState using the useEffect hook.

## Usage

```jsx
const Demo = () => {
    const [count, setCount] = useStateWithEffect(0, (count) => {
        console.log(count);
    });

    return (
        <div>
            <p>{count}</p>
            <button type="button" onClick={() => setCount(count => count + 1)}>
                Increase
            </button>
        </div>
    );
};
```
