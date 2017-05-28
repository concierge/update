const BaseUpdater = require('./BaseUpdater.js'),
    git = require('concierge/git'),
    npm = require('concierge/npm');

class GitUpdaterModule extends BaseUpdater {
    constructor (out, branchName = 'master') {
        super(out);
        this._branchName = branchName;
    }

    _submodule () {
        this._out.log($$`Updating submodules`);
        return BaseUpdater._wrapPromise(git.submoduleUpdate)
            .catch(this._updateFailed)
            .then(this._npmLocalUpdate);
    }

    _pull () {
        this._out.log($$`Updating from git`);
        return BaseUpdater._wrapPromise(git.pull)
            .catch(this._updateFailed)
            .then(this._submodule);
    }

    _update () {
        this._pull().catch(this._noop).then(() => this._out.log($$`Update successful`));
    }

    _check (callback) {
        git.getCurrentBranchName((err, consoleOutput) => {
            if (err) {
                LOG.silly($$`Failed to get branch name ${consoleOutput}`);
                return callback(false);
            }
            const branch = consoleOutput.trim();
            if (this._branchName !== void(0) && this._branchName == branch ||
                this._branchName === void(0) && branch === 'master') {
                git.getSHAOfHead((err1, consoleOutput1) => {
                    git.getSHAOfRemoteMaster((err2, consoleOutput2) => {
                        if (err1 || err2) {
                            LOG.silly($$`Failed SHA hash ${err1 ? consoleOutput1 : consoleOutput2}`);
                        }
                        callback(!err1 && !err2 && consoleOutput1.trim() !== consoleOutput2.trim());
                    });
                });
            }
            else {
                callback(false);
            }
        });
    }
}

module.exports = GitUpdaterModule;
