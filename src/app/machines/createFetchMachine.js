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
      error: null,
    },
    states: {
      idle: {
        on: {
          CLEAR: {
            target: 'idle',
            actions: ['onClear'],
          },
          FETCH: {
            target: 'fetching',
            actions: ['onFetching'],
          },
          RESET: {
            target: 'idle',
            actions: ['onResetContext'],
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
          CLEAR: {
            target: 'idle',
            actions: ['onClear'],
          },
          FETCH: {
            target: 'fetching',
            actions: ['onFetching'],
          },
          RESET: {
            target: 'idle',
            actions: ['onResetContext'],
          },
        },
      },
      failure: {
        on: {
          CLEAR: {
            target: 'idle',
            actions: ['onClear'],
          },
          FETCH: {
            target: 'fetching',
            actions: ['onFetching'],
          },
          RESET: {
            target: 'idle',
            actions: ['onResetContext'],
          },
        },
      },
    },
  }, {
    actions: {
      onResetContext: assign((context, event) => ({ ...fetchMachine.initialState.context })),
      onClear: () => ({
        isFetching: false,
        isSuccess: false,
        isError: false,
        data: null,
        error: null,
      }),
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
        error: (context, event) => event.data,
      }),
    },
    services: {
      fetch: (context) => null,
    },
  });

  return fetchMachine;
};

export default createFetchMachine;
