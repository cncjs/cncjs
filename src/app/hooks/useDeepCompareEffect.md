# useDeepCompareEffect

A useEffect hook that performs a deep comparison for the dependencies.

## Usage

```jsx
const Demo = () => {
    const url = '/users';
    const payload = {
        offset: 0,
        limit: 100,
    };
    useDeepCompareEffect(() => {
        /**
         * make an HTTP request or whatever with the url and payload
         * optionally return a cleanup function if necessary
         */
    }, [url, payload]);

    return (
        <div>
        {/* awesome UI here */}
        </div>
    );
};
```
