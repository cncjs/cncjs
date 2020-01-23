import { Machine, assign } from 'xstate';

const createFetchMachine = () => {
    const fetchMachine = Machine({
        id: 'fetchMachine',
        initial: 'idle',
        context: {
            data: null,
            error: null,
        },
        states: {
            idle: {
                on: {
                    FETCH: 'loading',
                },
            },
            loading: {
                invoke: {
                    src: 'fetch',
                    onDone: {
                        target: 'success',
                        actions: ['setData', 'notifyData'],
                    },
                    onError: {
                        target: 'failure',
                        actions: ['setError', 'notifyError'],
                    },
                },
            },
            success: {
                on: {
                    FETCH: {
                        target: 'loading',
                        actions: 'resetContext',
                    },
                },
            },
            failure: {
                on: {
                    FETCH: {
                        target: 'loading',
                        actions: 'resetContext',
                    },
                },
            },
        },
    }, {
        actions: {
            setData: assign({
                data: (context, event) => event.data,
            }),
            notifyData: () => {},
            setError: assign({
                error: (context, event) => new Error(event.data?.message),
            }),
            notifyError: () => {},
            resetContext: assign((context, event) => ({ ...fetchMachine.initialState.context })),
        },
        services: {
            fetch: (context) => null,
        },
    });

    return fetchMachine;
};

export default createFetchMachine;
