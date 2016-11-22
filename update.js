var git = require('concierge/git'),
    install = global.requireHook,
    /**
    Default update period in milliseconds.
    Once per day.
    */
    defaultUpdatePeriod = 86400000,
    timeout = null,
    updatePeriod = defaultUpdatePeriod,
    failedUpdateAttempts = 0,
    currentSHA = null,
    shutdown = null,

    checkForHash = function() {
        git.getSHAOfRemoteMaster(function(err, consoleOutput) {
            if (err) {
                console.debug($$`Failed SHA hash ${consoleOutput}`);
                return false;
            }
            if (currentSHA !== consoleOutput) {
                currentSHA = consoleOutput;
                return true;
            }

            return false;
        });
    },

    setUpdateTimer = function() {
        timeout = setTimeout(function() {
            git.pull(function(err, consoleOutput) {
                // Well something is wrong if the update process has failed for 3 periods.
                // prevent restart and stop auto updating.
                if (failedUpdateAttempts > 2) {
                    return;
                }

                if (err) {
                    failedUpdateAttempts++;
                    console.critical(err);
                    console.debug($$`Periodic auto update failed ${consoleOutput}`);
                    setUpdateTimer();
                }
                else {
                    git.submoduleUpdate(function(err) {
                        if (err) {
                            console.critical(err);
                            console.debug($$`Periodic auto git submodule update failed. ${consoleOutput}`);
                        }
                        else {
                            try {
                                install.update();
                            }
                            catch (e) {
                                console.critical(e);
                                api.sendMessage($$`Periodic auto update of NPM packages failed.`, event.thread_id);
                            }
                        }

                        if (checkForHash()) {
                            shutdown(StatusFlag.ShutdownShouldRestart);
                        }

                        setUpdateTimer();
                    });
                }
            });
        }, updatePeriod);
    };

exports.load = function() {
    var isEnabled = null,
        branchName;

    isEnabled = exports.config.autoUpdateEnabled;
    shutdown = this.shutdown;

    git.getCurrentBranchName(function (err, consoleOutput) {
        if (err) {
            console.debug($$`Failed to get branch name ${consoleOutput}`);
            return;
        }
        branchName = consoleOutput.trim();
    });

    // Only allow auto update to be run on the master branch.
    // By default auto update is enabled but can be turned off in the config.
    if (branchName === 'master' && isEnabled) {
        var configUpdatePeriod = this.config.autoUpdatePeriod;
        if (configUpdatePeriod) {
            updatePeriod = configUpdatePeriod;
        }
        git.getSHAOfHead(function (err, consoleOutput) {
            if (err) {
                console.debug($$`Failed SHA hash ${consoleOutput}`);
                return;
            }
            currentSHA = consoleOutput;
        });
        setUpdateTimer();
    }
};

exports.unload = function() {
    if (timeout) {
        clearTimeout(timeout);
    }
    shutdown = null;
};

exports.run = function (api, event) {
    api.sendMessage($$`Updating from git`, event.thread_id);
    git.pull(function(err) {
        if (err) {
            console.critical(err);
            api.sendMessage($$`Update failed`, event.thread_id);
        }
        else {
            api.sendMessage($$`Updating submodules`, event.thread_id);
            git.submoduleUpdate(function(err) {
                if (err) {
                    console.critical(err);
                    api.sendMessage($$`Update failed`, event.thread_id);
                }
                else {
                    api.sendMessage($$`Updating installed NPM packages`, event.thread_id);
                    try {
                        install.update();
                        api.sendMessage($$`Update successful`, event.thread_id);
                    }
                    catch (e) {
                        console.critical(e);
                        api.sendMessage($$`Update failed`, event.thread_id);
                    }
                }
            });
        }
    });

    return true;
};
