// facade for enumerated urlbar variations

const { BrowserListener } = require("./content/BrowserListener");
const { Telemetry } = require("./content/Telemetry");

/* Telemetry Pref needs to be on to record searches */
const TEL_PREF = "toolkit.telemetry.enabled";
const SUGGEST_PREF = "browser.urlbar.suggest.searches";

let prefSvc = require("sdk/preferences/service");
let prefs = require("sdk/simple-prefs").prefs;

let { educate } = require("./content/education");

// BUG, are these robust *enough*?  Generalize to prefs in general.
function setShadowPref (name, value) {
  let shadow = name + ".shadow";
  if (!prefSvc.isSet(shadow)) {
    let original = prefSvc.get(name);
    prefSvc.set(shadow, original);
    prefSvc.set(name, value);
  }
}

function resetShadowPref (name) {
  let shadow = name + ".shadow";
  if (prefSvc.isSet(shadow)) {
    let original = prefSvc.get(shadow);
    prefSvc.set(name, original);
    prefSvc.reset(shadow);
  }
}

// BUG: should control arm arm turn on suggestions?
// BUG: should having suggestions on include/exclude?

/* create a safe, multi-callable, idempotent modification */
let isCalled = false;
function modify (branch) {
  if (!isCalled) {
    switch (branch) {
      case 'unified': {
        educate()
      }
    }
    setShadowPref(TEL_PREF, true);
    setShadowPref(SUGGEST_PREF, true);
    isCalled = true;
    BrowserListener.init(branch);
    Telemetry.init(branch);
  }
};


let variations = {
  "unified":  () => modify("unified"),
    //- modify placement
    //- Orientation note (onboarding)  (BUG!)

  "control":  () => modify("control")
  //"customized":  // trash this from the study
};

function isEligible () {
  /* BUG
  eligible: {
    is not customized the search bar already.
    AND version < 50
  }*/
  return true;
};

function cleanup () {
  resetTelemetry();
  BrowserListener.destroy();
  Telemetry.destroy();
  return true;
};


module.exports = {
  isEligible: isEligible,
  cleanup: cleanup,
  variations: variations,
};


/* TODO: tests
- after destroy...
  - telemetry is reset
  - searchbar is back

*/
/*

everyoneSetup :
  - force extended telemetry on
  - onboarding check or show
  - turn on seach suggestions
    `browser.urlbar.suggest.searches` ??


cleanup:
  # restore telemetry from indirect pref
  # `browser.urlbar.suggest.searches` ??

  # remove indirect pref
  # searchbar restore?  "placement"
  BrowserListener.destroy();
  Telemetry.destroy();
*/
