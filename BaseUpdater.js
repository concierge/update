const npm = require('concierge/npm');

class BaseUpdater {
    static _wrapPromise (method) => {
        return new Promise((resolve, reject) => {
            method(err => err ? reject(err) : resolve());
        });
    }

    _updateFailed (err) {
        LOG.critical(err);
        this._out.log($$`Update failed`);
        throw new Error(err);
    }

    _npmLocalUpdate () {
        return new Promise(resolve => {
            this._out.log($$`Updating installed NPM packages`);
            try {
                npm.update();
            }
            catch (e) {
                this._updateFailed(e);
            }
        });
    }

    constructor (out) {
        this._out = out;
        this._noop = () => {};
    }
}

module.exports = BaseUpdater;
