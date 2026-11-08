import deferred from '../deferred';

test('deferred promise can be resolved by its caller', async () => {
  const pending = deferred();

  pending.resolve('resolved value');

  await expect(pending.promise).resolves.toBe('resolved value');
});

test('deferred promise can be rejected by its caller', async () => {
  const pending = deferred();
  const error = new Error('rejected value');

  pending.reject(error);

  await expect(pending.promise).rejects.toBe(error);
});
