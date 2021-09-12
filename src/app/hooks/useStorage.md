# useStorage

TODO

## Usage

```jsx
const Demo = () => {
  const [name, setName, removeName] = useStorage('name', 'Kyle', window.sessionStorage);
  const [age, setAge, removeAge] = useStorage('age', 26, window.localStorage);

  return (
    <>
      <div>
        {name} - {age}
      </div>
      <button onClick={() => setName("John")}>Set Name</button>
      <button onClick={() => setAge(40)}>Set Age</button>
      <button onClick={removeName}>Remove Name</button>
      <button onClick={removeAge}>Remove Age</button>
    </>
  );
};
```
