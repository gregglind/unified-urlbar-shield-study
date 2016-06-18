this.EXPORTED_SYMBOLS = [
  "Telemetry",
];

const SEARCH_SUGGESTIONS_OPT_IN_CHOICE_PREF =
  "browser.urlbar.userMadeSearchSuggestionsChoice";

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Preferences.jsm");
Cu.import("resource:///modules/BrowserUITelemetry.jsm");
Cu.import("resource://gre/modules/Services.jsm");

var gBranch = "control";
var gValues = new Map();

this.Telemetry = Object.freeze({

  init(branch) {
    gBranch = branch;
    addSearchSuggestionsOptInTelemetry();
    Services.obs.addObserver(this, "autocomplete-did-enter-text", false);
  },

  destroy() {
    Services.obs.removeObserver(this, "autocomplete-did-enter-text", false);
    Preferences.ignore(SEARCH_SUGGESTIONS_OPT_IN_CHOICE_PREF);
    gValues.clear();
  },

  observe: function(aSubject, aTopic, aData) {
    let input = aSubject.QueryInterface(Ci.nsIAutoCompleteInput);
    if (!input || input.id != "urlbar" || input.inPrivateContext ||
        input.popup.selectedIndex == -1) {
      return;
    }
    let controller = input.popup.view.QueryInterface(Ci.nsIAutoCompleteController);
    let idx = input.popup.selectedIndex;
    let value = controller.getValueAt(idx);
    let action = input._parseActionUrl(value);
    let actionType;
    if (action) {
      actionType = action.type == "searchengine" && action.params.searchSuggestion ?
                      "searchsuggestion" : action.type;
    }
    if (actionType == "searchengine") {
      this.incrementValue("searchByDefaultEngine");
    } else if (actionType == "searchSuggestion") {
      this.incrementValue("searchBySuggestion");
    }
  },

  /**
   * Registers the presence of an event.
   *
   * @param eventName The data is logged with this name.
   */
  incrementValue(key, optionalData={}) {
    // Since we only care about search volume, ignore the rare cases where a
    // search opens in a new tab (currently onlye CTRL + Go button) and always
    // set where to "current".
    function recordOneOff(engine, source="unknown", type="unknown") {
        let engineId = engine ? engine.identifier ? engine.identifier
                                                  : "other-" + engine.name
                              : "other";
        BrowserUITelemetry.countOneoffSearchEvent(`${engineId}.${source}`, type,
                                                  "current");
    }

    // Increment "search" / "urlbar" countable.
    // Since we only care about search volume, don't report details, like the
    // suggestion index clicked, to countSearchEvent.
    function recordSearch(engine=Services.search.currentEngine, source) {
      BrowserUITelemetry.countSearchEvent(source, null);
      let engineId = engine ? engine.identifier ? engine.identifier
                                                : "other-" + engine.name
                            : "other";
      let count = Services.telemetry.getKeyedHistogramById("SEARCH_COUNTS");
      count.add(`${engineId}.${source}`);
    }

    switch(key) {
      case "searchSettingsClicked":
        BrowserUITelemetry.countSearchSettingsEvent("urlbar");
        break;
      case "searchByReturnKeyOnOneOffButton":
        recordOneOff(optionalData.engine, "urlbar-oneoff", "key");
        recordSearch(optionalData.engine, "urlbar");
        break;
      case "searchByClickOnOneOffButton":
        recordOneOff(optionalData.engine, "urlbar-oneoff", "mouse");
        recordSearch(optionalData.engine, "urlbar");
        break;
      case "searchByDefaultEngine":
        // Already increments "search" / "urlbar" countable, it must also
        // increment oneoff countable for the current engine.
        // We don't have data about mouse or keyboard interaction here yet, so
        // just pass unknown for the type.
        recordOneOff(Services.search.currentEngine, "urlbar", "unknown");
        break;
      default:
        // This data is currently unused, but stored for reference.
        let val = gValues.get(key) || 0;
        gValues.set(key, val);
    }
  },

  /**
   * Registers a key-value.
   *
   * @param key The data is logged with this name.
   * @param value The value of the data.
   */
  setValue(key, value) {
    // This data is currently unused, but stored for reference.
    gValues.set(key, value);
  },

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver ]),
});

/**
 * Collects data about the user's urlbar search suggestions opt-in choice, or
 * if none has been made yet, adds a pref observer for it.
 */
function addSearchSuggestionsOptInTelemetry() {
  let userMadeChoice = Preferences.get(SEARCH_SUGGESTIONS_OPT_IN_CHOICE_PREF);
  Telemetry.setValue("userMadeSuggestionsChoice", userMadeChoice);
  if (!userMadeChoice) {
    Preferences.observe(SEARCH_SUGGESTIONS_OPT_IN_CHOICE_PREF, () => {
      Preferences.ignore(SEARCH_SUGGESTIONS_OPT_IN_CHOICE_PREF);
      addSearchSuggestionsOptInTelemetry();
    });
  }
  let optedIn = Preferences.get("browser.urlbar.suggest.searches");
  Telemetry.setValue("suggestionsEnabled", optedIn);
}
