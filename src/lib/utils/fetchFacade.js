export default class FetchFacade {
    static async fetch(url, init) {
        return fetch(url, init);
    }
}