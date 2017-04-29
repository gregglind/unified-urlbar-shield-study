var {Cc, Ci, Cu} = require("chrome");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "UnifiedUrlbar",
                                  "chrome://unified-urlbar/content/UnifiedUrlbar.jsm");
const prefSvc = require('sdk/preferences/service');

const feature = {
  isEligible() {
    return UnifiedUrlbar.isUserEligible();
  },

  checkHasConflicts() {
    // Exclude users having the Activity Stream add-on.
    const { AddonManager } = Cu.import("resource://gre/modules/AddonManager.jsm");
    return new Promise(resolve => {
      AddonManager.getAddonsByIDs(["@activity-streams", "universal-search@mozilla.com"],
        results => resolve(results.some(r => !!r)));
    });
  },

  install(variation) {
    // Enable extended telemetry if needed, but note this requires a restart
    // before we can start collecting data.
    if (!prefSvc.isSet("browser.urlbar.experiment.unified-urlbar.telemetry.enabled.mirror")) {
      let telemetryEnabled = prefSvc.get("toolkit.telemetry.enabled", false);
      if (!telemetryEnabled) {
        prefSvc.set("browser.urlbar.experiment.unified-urlbar.telemetry.enabled.mirror", telemetryEnabled);
        prefSvc.set("toolkit.telemetry.enabled", true);
      }
    }

    switch (variation) {
      case "unified":
        UnifiedUrlbar.init({
          forceSearchSuggestions: true,
          addOneOffAndOnboarding: true,
          removeSearchbar:        true,
        });
        break;

      case "oneoff":
        UnifiedUrlbar.init({
          forceSearchSuggestions: true,
          addOneOffAndOnboarding: true,
          removeSearchbar:        false,
        });
        break;

      default:
        UnifiedUrlbar.init({
          forceSearchSuggestions: false,
          addOneOffAndOnboarding: false,
          removeSearchbar:        false,
        });
        break;
    }
  },

  cleanup() {
    UnifiedUrlbar.destroy();
  },

  uninstall() {
    if (prefSvc.isSet("browser.urlbar.experiment.unified-urlbar.telemetry.enabled.mirror")) {
      let telemetryEnabled = prefSvc.get("browser.urlbar.experiment.unified-urlbar.telemetry.enabled.mirror", false);
      prefSvc.reset("browser.urlbar.experiment.unified-urlbar.telemetry.enabled.mirror");
      prefSvc.set("toolkit.telemetry.enabled", telemetryEnabled);
    }
    prefSvc.reset("browser.urlbar.experiment.unified-urlbar.tipShownCount");
  }
};

exports.feature = feature;
