import axios from 'app/api/axios';
import createFetchMachine from 'app/machines/createFetchMachine';

const fetchVersionMachine = createFetchMachine()
  .withConfig({
    actions: {
      notifySuccess: (context) => {},
      notifyFailure: (context) => {},
    },
    services: {
      fetch: (context) => {
        const url = '/api/version/latest';
        return axios.get(url);
      }
    }
  });

export {
  fetchVersionMachine,
};
