const tryMatch = require('./match');

process.on('message', ({ values, input }) => {
    process.send(tryMatch(values, input));
});