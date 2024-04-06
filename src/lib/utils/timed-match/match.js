export default function tryMatch(values, input) {
    let result = false;
    for (const value of values) {
        if (input.match(value)) {
            result = true;
            break;
        }
    }

    return result;
}