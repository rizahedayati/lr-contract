module.exports = {
    providerOptions: {
      networkId: 80002,
      gas: 20000000,
      keepAliveTimeout: 0,
    },
    skipFiles: ["external","mocks","stake/planet","game"],
    measureStatementCoverage: true,
    measureFunctionCoverage: true,
    istanbulReporter: ["html"],
    mocha: {
      timeout: 0,
      grep: "@skip-on-coverage", // Find everything with this tag
      invert: true, // Run the grep's inverse set.
    },
  };