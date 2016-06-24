const {Ci, Cu, Cc} = require("chrome");

const STYLE_URL = require("sdk/self").data.url("style.css");
const SEARCH_BAR_WIDGET_ID = "search-container";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/CustomizableUI.jsm");

const { Panel } = require("./Panel.js");

var gBranch = "control";
var gBrowsers = null;

this.BrowserListener = Object.freeze({
  init(branch) {
    gBranch = branch;

    if (gBrowsers) {
      return;
    }
    gBrowsers = new Set();
    getBrowserWindows();
    Services.ww.registerNotification(this);
  },

  destroy() {
    if (!gBrowsers) {
      return;
    }

    Services.ww.unregisterNotification(this);
    for (let browser of gBrowsers) {
      browser.destroy();
    }
    gBrowsers.clear();
    gBrowsers = null;
  },

  observe(subj, topic, data) {
    let win = subj.QueryInterface(Ci.nsIDOMWindow);
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
});

function Browser(win) {
  this.window = win;

  switch (gBranch) {
    case "unified":
      this._moveSearchBar();
      // Fall through.
    case "customized":
      this._injectStyle();
      this._initPanel();
      break;
    default:
      // Nothing!
      break;
  }
}

Browser.prototype = {
  get document() {
    return this.window.document;
  },

  destroy() {
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

  _injectStyle() {
    this._styleLink = this.document.createElementNS(XHTML_NS, "link");
    this._styleLink.setAttribute("href", STYLE_URL);
    this._styleLink.setAttribute("rel", "stylesheet");
    this.document.documentElement.appendChild(this._styleLink);
  },

  _initPanel() {
    let elt = this.document.getElementById("PopupAutoCompleteRichResult");
    this._panel = new Panel(elt);
  },

  _moveSearchBar() {
    this._searchbarPlacement =
      CustomizableUI.getPlacementOfWidget(SEARCH_BAR_WIDGET_ID);
    CustomizableUI.removeWidgetFromArea(SEARCH_BAR_WIDGET_ID);
  },
};

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

// require-ify
exports.BrowserListener = BrowserListener;
