class FakeFormatter {
  format() {
    return '';
  }
}

class FakeESLint {
  static version = '99.0.0';

  constructor(options = {}) {
    this.options = options;
  }

  async calculateConfigForFile() {
    return {
      plugins: ['@next/next'],
      rules: {}
    };
  }

  async lintFiles() {
    return [];
  }

  async loadFormatter() {
    return new FakeFormatter();
  }
}

FakeESLint.outputFixes = async () => {};
FakeESLint.getErrorResults = () => [];

async function loadESLint() {
  return FakeESLint;
}

module.exports = {
  ESLint: FakeESLint,
  loadESLint,
  CLIEngine: { version: FakeESLint.version }
};
