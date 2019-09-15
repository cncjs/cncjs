import { useEffect, useState } from 'react';

export const useStateFromProps = (initialValue) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        if (initialValue !== value) {
            setValue(value);
        }
    }, [initialValue]);

    return [value, setValue];
};
