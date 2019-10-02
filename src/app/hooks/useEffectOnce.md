# useEffectOnce

React lifecycle hook that runs an effect only once.

## Usage

```jsx
const Demo = () => {
    useEffectOnce(() => {
        console.log('Running effect once on mount');

        return () => {
            console.log('Running clean-up of effect on unmount');
        };
    });

    return null;
};
```
