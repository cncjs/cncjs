# useEventCallback

React callback hook that uses ref as an instance variable to memoize a callback function.

Learn `How to read an often-changing value from useCallback?` at https://reactjs.org/docs/hooks-faq.html#how-to-read-an-often-changing-value-from-usecallback.

## Usage

```jsx
const Demo = () => {
    const [text, setText] = useState('');
    // Will be memoized even if `text` changes:
    const handleSubmit = useEventCallback(() => {
        alert(text);
    }, [text]);

    return (
        <>
            <input value={text} onChange={e => setText(e.target.value)} />
            <ExpensiveTree onSubmit={handleSubmit} />
        </>
    );
};
```
