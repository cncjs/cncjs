# useAsync

TODO

## Usage

```jsx
const Demo = () => {
  const { state, data, error } = useAsync(() => {
    return new Promise((resolve, reject) => {
      const success = false;
      setTimeout(() => {
        success ? resolve('ok') : reject('error');
      }, 1000);
    });
  });

  return (
    <>
      <div>Loading: {(state === 'loading').toString()}</div>
      <div>{JSON.stringify(data, null, 2)}</div>
      <div>{JSON.stringify(error, null, 2)}</div>
    </>
  );
};
```
