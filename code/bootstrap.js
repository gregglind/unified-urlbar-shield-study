const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource:///modules/experiments/Experiments.jsm");
Cu.import("resource:///modules/CustomizableUI.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "Telemetry",
                                  "chrome://unified-urlbar/content/Telemetry.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "BrowserListener",
                                  "chrome://unified-urlbar/content/BrowserListener.jsm");

var gStarted = false;

function startup(data, reason) {
  // Seems startup() function is launched twice after install, we're
  // unsure why so far. We only want it to run once.
  if (gStarted) {
    return;
  }
  gStarted = true;

  // Workaround until bug 1228359 is fixed.
  //Components.manager.addBootstrappedManifestLocation(data.installPath);

  ensureExperimentBranch().then(branch => {
    BrowserListener.init(branch);
    Telemetry.init(branch);
  });
}

function shutdown(data, reason) {
  // Workaround until bug 1228359 is fixed.
  //Components.manager.removeBootstrappedManifestLocation(data.installPath);

  BrowserListener.destroy();
  Telemetry.destroy();
}

function install(data, reason) {}
function uninstall(data, reason) {}

/**
 * Ensures that the experiment branch is set and returns it.
 *
 * @return Promise<String> Resolved with the branch.
 */
function ensureExperimentBranch() {
  return new Promise(resolve => {
    // TESTING CODE
    try {
      let forcedBranch =
        Services.prefs.getCharPref("browser.urlbar.experiment.unified-urlbar.branch");
      resolve(forcedBranch);
    } catch (ex) {}

    let experiments = Experiments.instance();
    // This experiment has 3 user groups:
    //  * "control"   : Users with default search bar setup.
    //                  No UI changes.
    //  * "customized": Users who customized the search bar position.
    //                  Add one-off buttons.
    //  * "unified"   : Add one-off search buttons to the location bar and
    //                  customize away the search bar.
    let branch = experiments.getActiveExperimentBranch();
    if (branch) {
      resolve(branch);
      return;
    }
    let placement = CustomizableUI.getPlacementOfWidget("search-container");
    if (!placement || placement.area != "nav-bar") {
      branch = "customized";
    } else {
      let coinFlip = Math.floor(2 * Math.random());
      branch = coinFlip ? "control" : "unified";
    }
    let id = experiments.getActiveExperimentID();
    experiments.setExperimentBranch(id, branch).then(() => resolve(branch));
  });
}
