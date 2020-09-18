module.exports = {
  hooks: {
    'commit-msg': 'commitlint -x @commitlint/config-conventional -E HUSKY_GIT_PARAMS',
    'pre-push': 'yarn lint',
  },
};
