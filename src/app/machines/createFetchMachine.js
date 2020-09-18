import { Machine, assign } from 'xstate';

const createFetchMachine = () => {
  const fetchMachine = Machine({
    id: 'fetchMachine',
    initial: 'idle',
    context: {
      isFetchedOnce: false,
      isLoading: false,
      data: null,
      error: null,
    },
    states: {
      idle: {
        on: {
          FETCH: {
            target: 'loading',
            actions: ['onLoading'],
          },
        },
      },
      loading: {
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
      onLoading: assign({
        isLoading: true,
      }),
      onSuccess: assign({
        isFetchedOnce: true,
        isLoading: false,
        data: (context, event) => event.data,
      }),
      onFailure: assign({
        isLoading: false,
        error: (context, event) => new Error(event.data?.message),
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
