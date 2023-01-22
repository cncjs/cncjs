const promiseSeries = (tasks, initialValue) => {
  if (!Array.isArray(tasks)) {
    return Promise.reject(new TypeError('"tasks" must be an array of functions'));
  }
  return tasks.reduce((p, task) => p.then(task), Promise.resolve(initialValue));
};

export default promiseSeries;
