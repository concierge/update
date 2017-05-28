const files = require('concierge/files'),
    Output = require('./Output.js'),
    /**
        Default update period in milliseconds.
        Once per day.
    */
    defaultUpdatePeriod = 86400000;

let Updater = null,
    arg1 = null;

if (global.__rootPath.contains('node_modules')) {
    Updater = require('./NpmUpdater.js');
    arg1 = !global.__runAsRequired;
}
else if (global.__runAsLocal && files.existsSync(rootPathJoin('.git'))) {
    Updater = require('./GitUpdater.js');
}
else {
    Updater = require('./NoopUpdater.js');
}

class UpdaterModule {
    load () {
        if (!arg1) {
            arg1 = this.config.branchName;
        }
        this.config.autoUpdatePeriod = this.config.autoUpdatePeriod || defaultUpdatePeriod;
        this.config.autoUpdateEnabled = autoUpdateEnabled || false;
        if (this.config.autoUpdateEnabled) {
            this._setUpdateTimer();
        }
    }

    unload () {
        if (this._timeout) {
            clearTimeout(this._timeout);
        }
    }

    _performUpdate (up, restart = false) {
        up._check(avalible => {
            if (avalible) {
                up._update().then(() => {
                    if (restart) {
                        exports.platform.shutdown(StatusFlag.ShutdownShouldRestart);
                    }
                });
            }
            else {
                up._out.log($$`No update avalible`);
            }
        });
    }

    _setUpdateTimer () {
        const up = new Updater(new Output(), arg1);
        this._timeout = setInterval(() => {
            this._performUpdate(up, true);
        }, this.config.autoUpdatePeriod);
    }

    run (api, event) {
        const up = new Updater(new Output(api, event), arg1);
        this._performUpdate(up, false);
    }
};

module.exports = new UpdaterModule();
