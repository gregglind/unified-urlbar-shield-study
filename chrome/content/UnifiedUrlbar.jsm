"use strict";

this.EXPORTED_SYMBOLS = [
  "UnifiedUrlbar"
];

const STYLE_URL = "chrome://unified-urlbar/content/style.css";
const SEARCH_BAR_WIDGET_ID = "search-container";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Preferences.jsm");
Cu.import("resource:///modules/CustomizableUI.jsm");
Cu.import("resource:///modules/BrowserUITelemetry.jsm");
Cu.import("chrome://unified-urlbar/content/Panel.jsm");

var gOptions = {
    forceSearchSuggestions: true,
    addOneOffAndOnboarding: true,
    removeSearchbar: true,
};

var gBrowsers = null;
var gForcedSuggestions = false;
var gDisabledOneOffs = false;

this.UnifiedUrlbar = Object.freeze({
  isUserEligible() {
    // Users having a version of Firefox that includes the NEW one-off buttons
    // implementation are not eligible for this experiment.
    let vc = Cc["@mozilla.org/xpcom/version-comparator;1"]
               .getService(Ci.nsIVersionComparator);
    let appInfo = Cc["@mozilla.org/xre/app-info;1"]
                    .getService(Ci.nsIXULAppInfo);
    if (vc.compare(appInfo.version, "51") >= 0) {
      //return false;
    }

    // Exclude users who already removed the search bar from the UI.
    if (CustomizableUI.getPlacementOfWidget("search-container") === null) {
      return false;
    }

    return true;
  },

  init(options = gOptions) {
    if (gBrowsers) {
      Cu.reportError("UnifiedUrlbar.init() was invoked multiple times?");
      return;
    }

    gOptions = options;

    if (("forceSearchSuggestions" in gOptions) && gOptions.forceSearchSuggestions) {
      forceSearchSuggestions();
    }
    if (("addOneOffAndOnboarding" in gOptions) && gOptions.addOneOffAndOnboarding) {
      disableNewOneOffs();
    }

    Services.obs.addObserver(this, "autocomplete-did-enter-text", false);

    gBrowsers = new Set();
    getBrowserWindows();
    Services.ww.registerNotification(this);
  },

  destroy() {
    if (!gBrowsers) {
      Cu.reportError("UnifiedUrlbar.destroy() was invoked multiple times?");
      return;
    }

    restoreSearchSuggestions();
    restoreNewOneOffs();

    Services.obs.removeObserver(this, "autocomplete-did-enter-text", false);

    Services.ww.unregisterNotification(this);
    for (let browser of gBrowsers) {
      browser.destroy();
    }
    gBrowsers.clear();
    gBrowsers = null;
  },

  observe(subject, topic, data) {
    if (topic == "autocomplete-did-enter-text") {
      trackAutocompleteEnter(subject.QueryInterface(Ci.nsIAutoCompleteInput));
      return;
    }

    let win = subject.QueryInterface(Ci.nsIDOMWindow);
    if (!win) {
      return;
    }

    if (topic == "domwindowopened") {
      whenWindowLoaded(win, () => {
        if (isValidBrowserWindow(win)) {
          gBrowsers.add(new Browser(win));
        }
      });
    } else if (topic == "domwindowclosed") {
      for (let browser of gBrowsers) {
        if (browser.window == win) {
          browser.destroy();
          gBrowsers.delete(browser);
          break;
        }
      }
    }
  },

  reportTelemetryValue(key, optionalData={}) {
    reportTelemetryValue(key, optionalData);
  }
});

function Browser(win, branch) {
  this.window = win;

  // Per window toggles.
  if (("removeSearchbar" in gOptions) && gOptions.removeSearchbar) {
    this._removeSearchBar();
  }
  if (("addOneOffAndOnboarding" in gOptions) && gOptions.addOneOffAndOnboarding) {
    this._initPanel();
  }

  win.gBrowser.addProgressListener(this);
}

Browser.prototype = {
  get document() {
    return this.window.document;
  },

  destroy() {
    this.window.gBrowser.removeProgressListener(this);

    if (this._styleLink) {
      this._styleLink.remove();
      delete this._styleLink;
    }
    if (this._panel) {
      this._panel.destroy();
    }
    if (this._searchbarPlacement) {
      CustomizableUI.addWidgetToArea(SEARCH_BAR_WIDGET_ID,
                                     this._searchbarPlacement.area,
                                     this._searchbarPlacement.position);
    }
  },

  _initPanel() {
    // Inject style.
    this._styleLink = this.document.createElementNS(XHTML_NS, "link");
    this._styleLink.setAttribute("href", STYLE_URL);
    this._styleLink.setAttribute("rel", "stylesheet");
    this.document.documentElement.appendChild(this._styleLink);

    let elt = this.document.getElementById("PopupAutoCompleteRichResult");
    this._panel = new Panel(this.window.gURLBar.popup);
  },

  _removeSearchBar() {
    this._searchbarPlacement =
      CustomizableUI.getPlacementOfWidget(SEARCH_BAR_WIDGET_ID);
    CustomizableUI.removeWidgetFromArea(SEARCH_BAR_WIDGET_ID);
  },

  onLocationChange(webProgress, request, uri, flags) {
    try {
      if (webProgress.isTopLevel && uri.host) {
        let host = uri.host.replace(/^www./, "").replace(/^search./, "");
        if (gEngines.has(host)) {
          let rv = Services.search.parseSubmissionURL(uri.spec);
          // HACK: try to not count result pages we generated and subpages.
          // This is tricky and working until the engines keep same param names.
          if (rv.engine &&
              !["hspart=mozilla", // Yahoo tracking
                "&b=",            // Yahoo paging
                "client=firefox", // Google tracking
                "&start=",        // Google paging
                "pc=MOZI",        // Bing tracking
                "&first=",        // Bing paging
               ].some(str => uri.path.includes(str))) {
            reportTelemetryValue("userVisitedEngineResult",
                                 { engine: rv.engine });
          }
        }
      }
    } catch (ex) {}
  },
  onProgressChange() {},
  onSecurityChange() {},
  onStateChange(webProgress, request, flags, status) {
    try {
      if (webProgress.isTopLevel &&
          flags & Ci.nsIWebProgressListener.STATE_START &&
          flags & Ci.nsIWebProgressListener.STATE_IS_NETWORK &&
          (request && (request instanceof Ci.nsIChannel || "URI" in request)) &&
          request.URI.path == "/") {
        let host = request.URI.host.replace(/^www./, "").replace(/^search./, "");
        if (gEngines.has(host)) {
          reportTelemetryValue("userVisitedEngineHost",
                               { engine: gEngines.get(host) });
        }
      }
    } catch (ex) {}
  },
  onStatusChange() {},

  QueryInterface: XPCOMUtils.generateQI([ Ci.nsIWebProgressListener ])
};

XPCOMUtils.defineLazyGetter(this, "gEngines", () => {
  let engines = new Map();
  for (let engineName of [ "Google", "Yahoo", "Bing"]) {
    let engine = Services.search.getEngineByName(engineName);
    if (engine) {
      try {
        let engineHost = Services.io.newURI(engine.searchForm, null, null).host;
        engines.set(engineHost.replace(/^www./, "").replace(/^search./, ""),
                    engine);
      } catch (ex) {}
    }
  }
  return engines;
});

function forceSearchSuggestions() {
  // Enable search suggestions for everyone.
  let suggestions = Preferences.get("browser.urlbar.suggest.searches", false);
  if (!suggestions) {
    gForcedSuggestions = true;
    Preferences.set("browser.urlbar.suggest.searches", true);
  }
}

function disableNewOneOffs() {
  // Disable the one-off buttons NEW implementation, to replce it with ours.
  let oneoffs = Preferences.get("browser.urlbar.oneOffSearches", false);
  if (oneoffs) {
    gDisabledOneOffs = true;
    Preferences.set("browser.urlbar.oneOffSearches", false);
  }
}

function restoreSearchSuggestions() {
  if (gForcedSuggestions) {
    Preferences.set("browser.urlbar.suggest.searches", false);
    gForcedSuggestions = false;
  }
}

function restoreNewOneOffs() {
  if (gDisabledOneOffs) {
    Preferences.set("browser.urlbar.oneOffSearches", true);
    gDisabledOneOffs = false;
  }
}

function isValidBrowserWindow(win) {
  return !win.closed && win.toolbar.visible &&
          win.document.documentElement.getAttribute("windowtype") == "navigator:browser";
}

function getBrowserWindows() {
  let wins = Services.ww.getWindowEnumerator();
  while (wins.hasMoreElements()) {
    let win = wins.getNext().QueryInterface(Ci.nsIDOMWindow);
    whenWindowLoaded(win, () => {
      if (isValidBrowserWindow(win)) {
        gBrowsers.add(new Browser(win));
      }
    });
  }
}

function whenWindowLoaded(win, callback) {
  if (win.document.readyState == "complete") {
    callback();
    return;
  }
  win.addEventListener("load", function onLoad(event) {
    if (event.target == win.document) {
      win.removeEventListener("load", onLoad, true);
      win.setTimeout(callback, 0);
    }
  }, true);
}

function trackAutocompleteEnter(input) {
  if (!input || input.id != "urlbar" || input.inPrivateContext) {
    return;
  }

  let controller = input.popup.view.QueryInterface(Ci.nsIAutoCompleteController);

  let idx = input.popup.selectedIndex;
/*
  // Count when the user is direct typing the current engine to search.
  if (idx <= 0) {
    try {
      let uri = Services.uriFixup.createFixupURI(input.textValue, 0);
      let host = uri.host.replace(/^www./, "");
      let engineHost = Services.io.newURI(Services.search.currentEngine.searchForm, null, null)
                                  .host.replace(/^www./, "");
      if (uri.path == "/" && host == engineHost) {
        reportTelemetryValue("userTypedCurrentEngine");
      }
    } catch (ex) {}
  }
*/
  if (idx == -1) {
    return;
  }
  let value = controller.getValueAt(idx);
  let action = input._parseActionUrl(value);
  let actionType;

  if (action) {
    actionType = action.type == "searchengine" && action.params.searchSuggestion ?
                    "searchsuggestion" : action.type;
  }
  if (actionType == "searchengine") {
    reportTelemetryValue("searchByDefaultEngine");
  } else if (actionType == "searchSuggestion") {
    reportTelemetryValue("searchBySuggestion");
  }
}

/**
 * Registers the presence of an event.
 *
 * @param eventName The data is logged with this name.
 */
function reportTelemetryValue(key, optionalData={}) {
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
    let isInContentSearch = source.includes("content");
    if (isInContentSearch) {
      // Add engine name to the probe name.
      source += "-" + engine.name.toLowerCase();
    }

    BrowserUITelemetry.countSearchEvent(source, null);

    if (!isInContentSearch) {
      let engineId = engine ? engine.identifier ? engine.identifier
                                                : "other-" + engine.name
                            : "other";
      let count = Services.telemetry.getKeyedHistogramById("SEARCH_COUNTS");
      count.add(`${engineId}.${source}`);
    }
  }

  switch(key) {
    case "userVisitedEngineHost":
      recordSearch(optionalData.engine, "content");
      break;
    case "userVisitedEngineResult":
      recordSearch(optionalData.engine, "content-result");
      break;
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
    case "searchBySuggestions":
      recordSearch(optionalData.engine, "urlbar-suggestion");
      break;
    case "searchByDefaultEngine":
      // Already increments "search" / "urlbar" countable, it must also
      // increment oneoff countable for the current engine.
      // We don't have data about mouse or keyboard interaction here yet, so
      // just pass unknown for the type.
      recordOneOff(Services.search.currentEngine, "urlbar", "unknown");
      break;
    default:
      Cu.reportError("reportTelemetryValue() got an unknown value");
  }
}
