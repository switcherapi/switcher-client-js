import tryMatch from './match.js';

process.on('message', ({ values, input }) => {
    process.send(tryMatch(values, input));
});