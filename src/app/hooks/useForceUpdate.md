# useForceUpdate

React utility hook that returns a function that forces component to re-render when called.

## Usage

```jsx
const Demo = () => {
    const updater = useForceUpdate();

    return (
        <>
            <div>Time: {Date.now()}</div>
            <button onClick={updater}>Update</button>
        </>
    );
};
```
