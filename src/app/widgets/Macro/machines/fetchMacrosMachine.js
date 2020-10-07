import api from 'app/api';
import createFetchMachine from 'app/machines/createFetchMachine';

const fetchMacrosMachine = createFetchMachine()
  .withConfig({
    actions: {
      notifySuccess: (context) => {
        // TODO
      },
      notifyFailure: (context) => {
        // TODO
      },
    },
    services: {
      fetch: (context) => {
        return api.macros.fetch();
      },
    },
  });

export default fetchMacrosMachine;
