# useStateWithHistory

TODO

## Usage

```jsx
const Demo = () => {
  const [count, setCount, { history, pointer, back, forward, go }] = useStateWithHistory(1);
  const [name, setName] = useState('Kyle');

  return (
    <>
      <div>{count}</div>
      <div>{history.join(", ")}</div>
      <div>Pointer - {pointer}</div>
      <div>{name}</div>
      <button onClick={() => setCount(currentCount => currentCount * 2)}>
        Double
      </button>
      <button onClick={() => setCount(currentCount => currentCount + 1)}>
        Increment
      </button>
      <button onClick={back}>Back</button>
      <button onClick={forward}>Forward</button>
      <button onClick={() => go(2)}>Go To Index 2</button>
      <button onClick={() => setName("John")}>Change Name</button>
    </>
  );
};
```
