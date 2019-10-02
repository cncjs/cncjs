# useMount

React lifecycle hook that calls a function after the component is mounted. Use `useEffectOnce` if you need both a mount and unmount function.

## Usage

```jsx
const Demo = () => {
    useMount(() => console.log('MOUNTED'));
    return null;
};
```
