const BaseUpdater = require('./BaseUpdater.js');

class NoopUpdater extends BaseUpdater {
    _update () {
        this._out.log($$`${currentPlatform.packageInfo.name} cannot be updated`);
    }

    _check (callback) {
        callback(false);
    }
}

module.exports =
