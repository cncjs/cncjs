import { isUpdate } from '../update';

describe('isUpdate', () => {
  // `controllerchange` fires for two quite different reasons and only one of
  // them is worth a badge beside the stop button.
  it('is not the first worker taking over a page that had none', () => {
    expect(isUpdate({ hadController: false })).toBe(false);
  });

  it('is a worker replacing one that was already in charge', () => {
    expect(isUpdate({ hadController: true })).toBe(true);
  });

  it('answers false rather than throwing when asked about nothing', () => {
    // The module is imported by the Jest tier, which has no navigator, and by
    // a panel over plain HTTP, where there is no worker to ask.
    expect(isUpdate({})).toBe(false);
  });
});
