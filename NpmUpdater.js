const BaseUpdater = require('./BaseUpdater.js'),
    npm = require('concierge/npm');

class NpmUpdaterModule extends BaseUpdater {
    constructor (out, globalInstall) {
        super(out);
        this._globalInstall = globalInstall;
    }

    _update () {
        let promise = this._npmLocalUpdate();
        if (this._globalInstall) {
            promise = promise.then(this._npmGlobalUpdate);
        }
        promise.catch(this._noop).then(() => this._out.log($$`Update successful`));
    }

    _check (callback) {
        const packageName = currentPlatform.packageInfo.name.trim().toLowerCase(),
            res = npm(['outdated', packageName].concat(this._globalInstall ? '-g' : ''))
                .split('\n').map(l => l.trim().split(/\s+/)),
            outdated = res.find(r => r[0] === packageName);
        callback(outdated && outdated[1] !== outdated[2]);
    }
}

module.exports = NpmUpdaterModule;
