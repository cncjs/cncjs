import { Machine, assign } from 'xstate';

const createFetchMachine = () => {
  const fetchMachine = Machine({
    id: 'fetchMachine',
    initial: 'idle',
    context: {
      lastUpdateTime: 0, // in milliseconds
      isFetching: false,
      isSuccess: false,
      isError: false,
      data: null,
    },
    states: {
      idle: {
        on: {
          FETCH: {
            target: 'fetching',
            actions: ['onFetching'],
          },
          RESET: {
            target: 'idle',
            actions: 'resetContext',
          },
        },
      },
      fetching: {
        invoke: {
          src: 'fetch',
          onDone: {
            target: 'success',
            actions: ['onSuccess'],
          },
          onError: {
            target: 'failure',
            actions: ['onFailure'],
          },
        },
      },
      success: {
        on: {
          FETCH: {
            target: 'fetching',
            actions: ['onFetching'],
          },
          RESET: {
            target: 'idle',
            actions: 'resetContext',
          },
        },
      },
      failure: {
        on: {
          FETCH: {
            target: 'fetching',
            actions: ['onFetching'],
          },
          RESET: {
            target: 'idle',
            actions: 'resetContext',
          },
        },
      },
    },
  }, {
    actions: {
      onFetching: assign({
        isFetching: true,
      }),
      onSuccess: assign({
        lastUpdateTime: Date.now(),
        isFetching: false,
        isSuccess: true,
        isError: false,
        data: (context, event) => event.data,
      }),
      onFailure: assign({
        lastUpdateTime: Date.now(),
        isFetching: false,
        isSuccess: false,
        isError: true,
        data: (context, event) => event.data,
      }),
      resetContext: assign((context, event) => ({ ...fetchMachine.initialState.context })),
    },
    services: {
      fetch: (context) => null,
    },
  });

  return fetchMachine;
};

export default createFetchMachine;
