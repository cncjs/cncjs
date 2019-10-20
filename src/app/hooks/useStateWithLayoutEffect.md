# useStateWithLayoutEffect

React state hook that offers an optional second argument to pass a callback function for useState using the useLayoutEffect hook.

## Usage

```jsx
const Demo = () => {
    const [count, setCount] = useStateWithLayoutEffect(0, (count) => {
        console.log(count);
    });

    return (
        <div>
            <p>{count}</p>
            <button
                type="button"
                onClick={() => {
                    setCount(0);
                    setCount(count => count + 1);
                }}
            >
                Increase
            </button>
        </div>
    );
};
```
