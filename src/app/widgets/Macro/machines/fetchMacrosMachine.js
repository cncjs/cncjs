import axios from 'app/api/axios';
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
        const url = '/api/macros';
        return axios.get(url);
      },
    },
  });

export default fetchMacrosMachine;
