module.exports = {
    moduleFileExtensions: ["js", "json", "ts"],
    rootDir: ".",
    forceCoverageMatch: ['src/**/*.ts'],
    setupFiles: ['dotenv/config'],
    testEnvironment: "node",
    testRegex: ".spec.ts$",
    transform: {
        "^.+\\.(t|j)s$": "ts-jest"
    },
};
