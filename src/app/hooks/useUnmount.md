# useUnmount

React lifecycle hook that calls a function when the component will unmount. Use `useEffectOnce` if you need both a mount and unmount function.

## Usage

```jsx
const Demo = () => {
    useUnmount(() => console.log('UNMOUNTED'));
    return null;
};
```
