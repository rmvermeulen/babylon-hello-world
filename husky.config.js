module.exports = {
  hooks: {
    'pre-commit': 'lint-staged',
    'pre-push': 'yarn lint && yarn test && yarn check-build',
  },
};
