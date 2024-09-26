import serviceContainer from '../service-container';

const userStore = serviceContainer.resolve('userStore');

export const getInformation = (req, res) => {
  res.send({
    userStore: {
      file: userStore.file,
    },
  });
};
