module.exports = class Output {
    constructor (api, thread) {
        this._api = api;
        this._thread = thread;
    }

    log (output) {
        this._api ? this._api.sendMessage(output, this._thread) : LOG.info(output);
    }
};
