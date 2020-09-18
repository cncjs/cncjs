import api from 'app/api';
import createFetchMachine from 'app/machines/createFetchMachine';

const fetchMacrosMachine = createFetchMachine()
  .withConfig({
    services: {
      fetch: (context) => {
        return api.macros.fetch().then(res => res.body);
      },
    },
  });

export default fetchMacrosMachine;
