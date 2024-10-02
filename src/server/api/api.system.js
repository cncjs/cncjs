import serviceContainer from '../service-container';

const userStore = serviceContainer.resolve('userStore');

const api = {
  getInformation: (req, res) => {
    res.send({
      userStore: {
        file: userStore.file,
      },
    });
  },
};

export default api;
