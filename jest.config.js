module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: './',
    preset: './preset.js',
    testEnvironment: 'node',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    testTimeout: 120000,
};
