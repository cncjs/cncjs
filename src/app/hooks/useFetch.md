# useFetch

TODO

## Usage

```jsx
const Demo = () => {
  const [id, setId] = useState(1);
  const url = `https://jsonplaceholder.typicode.com/todos/${id}`;
  const options = {};
  const { state, data, error } = useFetch(url, options, [id]);

  return (
    <>
      <div>{id}</div>
      <button onClick={() => setId(currentId => currentId + 1)}>
        Increment ID
      </button>
      <div>Loading: {(state === 'loading').toString()}</div>
      <div>{JSON.stringify(data.data, null, 2)}</div>
      <div>{JSON.stringify(error, null, 2)}</div>
    </>
  );
};
```
