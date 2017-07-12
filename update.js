const git = require('concierge/git'),
    npm = require('concierge/npm'),
    files = require('concierge/files'),
    defaultUpdatePeriod = 86400000;

class UpdateModule {
    constructor () {
        this._failedUpdateAttempts = 0;
    }

    async _checkForHash () {
        try {
            const res = await git.getSHAOfRemoteMaster();
            if (this._currentSha !== res) {
                this._currentSha = res;
                return true;
            }
            return false;
        }
        catch (e) {
            LOG.debug($$`Failed SHA hash ${e}`);
            return false;
        }
    }

    _setUpdateTimer () {
        const api = {
            sendMessage: LOG.debug
        };
        this._timeout = setInterval(async() => {
            let cont = true;
            if (!await this._runCheckError(api, void(0), git.pull, $$`Updating from git`)) {
                LOG.error($$`Periodic auto update failed ${''}`);
                cont = false;
            }

            if (cont && !await this._runCheckError(api, void(0), git.submoduleUpdate, $$`Updating submodules`)) {
                LOG.error($$`Periodic auto git submodule update failed. ${''}`);
                cont = false;
            }

            if (cont && !await this._runCheckError(api, void(0), npm.update, $$`Updating installed NPM packages`)) {
                LOG.error($$`Periodic auto update of NPM packages failed.`);
                cont = false;
            }

            if (!cont) {
                // Well something is wrong if the update process has failed for 3 periods.
                // prevent restart and stop auto updating.
                if (this._failedUpdateAttempts > 2) {
                    clearTimeout(this._timeout);
                    delete this._timeout;
                    return;
                }
                this._failedUpdateAttempts++;
            }

            if (await checkForHash()) {
                this.platform.shutdown(StatusFlag.ShutdownShouldRestart);
            }
        }, this._updatePeriod);
    }

    async load () {
        const branchName = (await git.getCurrentBranchName()).trim();

        // Only allow auto update to be run on the master branch.
        // By default auto update is enabled but can be turned off in the config.
        if (branchName === 'master' && this.config.autoUpdateEnabled && (await files.fileExists(global.rootPathJoin('.git'))) === 'directory') {
            this._updatePeriod = this.config.autoUpdatePeriod || defaultUpdatePeriod;
            this._currentSha = await git.getSHAOfHead();
            this._setUpdateTimer();
        }
    }

    unload () {
        this._timeout && clearTimeout(this._timeout);
    }

    async _runCheckError (api, thread, func, stat) {
        try {
            api.sendMessage(stat, thread);
            await func();
            return true;
        }
        catch (e) {
            LOG.critical(e);
            api.sendMessage($$`Update failed`, thread);
            return false;
        }
    }

    async run (api, event) {
        if (await this._runCheckError(api, event.thread_id, git.pull, $$`Updating from git`) &&
            await this._runCheckError(api, event.thread_id, git.submoduleUpdate, $$`Updating submodules`) &&
            await this._runCheckError(api, event.thread_id, npm.update, $$`Updating installed NPM packages`)) {
            api.sendMessage($$`Update successful`, event.thread_id);
        }
        return true;
    }
}
module.exports = new UpdateModule();
