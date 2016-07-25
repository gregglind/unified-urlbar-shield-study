this.EXPORTED_SYMBOLS = [
  "Panel",
];

const EXISTING_FOOTER_ID = "urlbar-search-footer";
const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://unified-urlbar/content/Telemetry.jsm");

this.Panel = function (panelElt) {
  this.panelElement = panelElt;
  this._initPanelElement();
  try {
    this._initTipElement();
  } catch (ex) {
    Cu.reportError(ex);
  }
  this.panelElement.addEventListener("popupshowing", this);
  this.panelElement.addEventListener("popuphiding", this);
  this._initKeyHandler();
  this.urlbar.addEventListener("input", this);
};

this.Panel.prototype = {
  get document() {
    return this.panelElement.ownerDocument;
  },

  get window() {
    return this.document.defaultView;
  },

  get urlbar() {
    return this.window.gURLBar;
  },

  destroy() {
    this.urlbar.handleKeyPress = this.urlbar._handleKeyPress;
    delete this.urlbar._handleKeyPress;

    this.urlbar.handleCommand = this.urlbar._handleCommand;
    delete this.urlbar._handleCommand;

    this.urlbar.removeEventListener("input", this);

    this.panelElement.removeEventListener("popupshowing", this);
    this.panelElement.removeEventListener("popuphiding", this);

    this.footer.remove();
    if (this._existingFooter) {
      this._existingFooterParent.appendChild(this._existingFooter);
    }

    this._uninitTipElement();
  },

  _shouldShowHint(decreaseCounter = false) {
    let Preferences = Cu.import("resource://gre/modules/Preferences.jsm", {}).Preferences;
    if (this._showSuggestions === undefined) {
      this._showSuggestions = Preferences.get("browser.urlbar.suggest.searches", false);
    }
    if (this._tipShownCount === undefined) {
      // Set to 1 more than the actual number of times the tip should be shown.
      const SHOW_TIP_DEFAULT_COUNT = 5;
      this._tipShownCount = Preferences.get("browser.urlbar.experiment.unified-urlbar.tipShownCount",
                                            SHOW_TIP_DEFAULT_COUNT);
    }

    if (this._tipShownCount > 0 && decreaseCounter) {
      Preferences.set("browser.urlbar.experiment.unified-urlbar.tipShownCount", --this._tipShownCount);
    }
    return this.__shouldShowHint = this._tipShownCount > 0 && this._showSuggestions;
  },

  _initTipElement() {
    if (!this._shouldShowHint()) {
      return;
    }

    let tipContainer = this.document.createElementNS(XUL_NS, "hbox");
    tipContainer.id = "urlbar-tip-container";
    tipContainer.setAttribute("flex", "1");
    tipContainer.setAttribute("align", "center");
    this.tipContainer = tipContainer;

    let icon = this.document.createElementNS(XUL_NS, "image");
    icon.className = "ac-site-icon";
    tipContainer.appendChild(icon);
    this.tipIcon = icon;

    let titleBox = this.document.createElementNS(XUL_NS, "hbox");
    titleBox.id = "urlbar-tip-title";
    tipContainer.appendChild(titleBox);

    let title = this.document.createElementNS(XUL_NS, "description");
    title.className = "ac-title-text";
    title.textContent = "Firefox";
    titleBox.appendChild(title);

    let tipBox = this.document.createElementNS(XUL_NS, "hbox");
    tipBox.id = "urlbar-tip-box";
    tipContainer.setAttribute("align", "center");
    tipContainer.appendChild(tipBox);

    let tip = this.document.createElementNS(XUL_NS, "description");
    tip.innerHTML = `<span class="emoji">&#x1f4a1;</span><span class="bold">Tip:</span> Results with a magnifying glass are search suggestions. They might be what you're looking for!<span class="emoji">&#x1F604;</span>`;
    tipBox.appendChild(tip);

    let notification = this.panelElement.searchSuggestionsNotification;
    for (let child of notification.childNodes) {
      child.collapsed = true;
    }
    notification.setAttribute("tip", "true");
    notification.appendChild(tipContainer);
  },

  _uninitTipElement() {
    if (this.tipContainer) {
      this.tipContainer.remove();
      delete this.tipContainer;
    }
    let notification = this.panelElement.searchSuggestionsNotification;
    notification.removeAttribute("tip");
    for (let child of notification.childNodes) {
      child.collapsed = false;
    }
  },

  _updateTip() {
    if (!this._shouldShowHint(true)) {
      if (this.tipContainer) {
        this._uninitTipElement();
        this.document.getAnonymousElementByAttribute(this.panelElement, "anonid", "search-suggestions-notification")
                     .style.visibility = "collapse";
      }
      return;
    }

    let iconStart = this.panelElement.siteIconStart;
    if (iconStart) {
      this.tipIcon.style.marginInlineStart = iconStart + "px";
    }
    this.document.getAnonymousElementByAttribute(this.panelElement, "anonid", "search-suggestions-notification")
                 .style.visibility = "visible";
    this.tipContainer.setAttribute("animate", "true");
  },

  _initPanelElement() {
    this._existingFooter = this.document.getElementById(EXISTING_FOOTER_ID);
    if (this._existingFooter) {
      this._existingFooterParent = this._existingFooter.parentNode;
      this._existingFooter.remove();
    }

    let footer = this._makeFooter();
    this.footer = footer;

    let header = this._makeHeader();
    this.header = header;
    footer.appendChild(header);

    let hbox = this._makeFooterHbox();
    footer.appendChild(hbox);

    let list = this._makeButtonList();
    this.buttonList = list;
    hbox.appendChild(list);

    this.settingsButton = this._makeSettingsButton();
    hbox.appendChild(this.settingsButton);

    this.panelElement.appendChild(footer);
  },

  _makeFooter() {
    let footer = this.document.createElementNS(XUL_NS, "vbox");
    footer.id = "urlbar-search-footer2";
    footer.setAttribute("flex", "1");
    return footer;
  },

  _makeHeader() {
    let header = this.document.createElementNS(XUL_NS, "deck");
    header.id = "urlbar-one-offs-header";
    header.className = "urlbar-header urlbar-current-input";
    header.setAttribute("selectedIndex", "0");

    let label = this.document.createElementNS(XUL_NS, "label");
    label.id = "urlbar-oneoffheader-search"
    label.setAttribute("value", "Search with:"); // searchWithHeader.label
    header.appendChild(label);

    let hbox = this.document.createElementNS(XUL_NS, "hbox");
    hbox.id = "urlbar-searchforwith";
    hbox.className = "urlbar-current-input";
    label = this.document.createElementNS(XUL_NS, "label");
    label.id = "urlbar-oneoffheader-before";
    label.setAttribute("value", "Search for "); // searchFor.label
    hbox.appendChild(label);
    label = this.document.createElementNS(XUL_NS, "label");
    label.id = "urlbar-oneoffheader-searchtext";
    label.className = "urlbar-input-value";
    label.setAttribute("flex", "1");
    label.setAttribute("crop", "end");
    hbox.appendChild(label);
    label = this.document.createElementNS(XUL_NS, "label");
    label.id = "urlbar-oneoffheader-after";
    label.setAttribute("flex", "10000");
    label.setAttribute("value", " with:"); // searchWith.label
    hbox.appendChild(label);
    header.appendChild(hbox);

    hbox = this.document.createElementNS(XUL_NS, "hbox");
    hbox.id = "urlbar-searchonengine";
    hbox.className = "urlbar-current-input";
    label = this.document.createElementNS(XUL_NS, "label");
    label.id = "urlbar-oneoffheader-beforeengine";
    label.setAttribute("value", "Search "); // search.label
    hbox.appendChild(label);
    label = this.document.createElementNS(XUL_NS, "label");
    label.id = "urlbar-oneoffheader-engine";
    label.className = "urlbar-input-value";
    label.setAttribute("flex", "1");
    label.setAttribute("crop", "end");
    hbox.appendChild(label);
    label = this.document.createElementNS(XUL_NS, "label");
    label.id = "urlbar-oneoffheader-afterengine";
    label.setAttribute("flex", "10000");
    label.setAttribute("value", ""); // searchAfter.label
    hbox.appendChild(label);
    header.appendChild(hbox);

    return header;
  },

  _makeFooterHbox() {
    let box = this.document.createElementNS(XUL_NS, "hbox");
    box.setAttribute("flex", "1");
    box.setAttribute("align", "stretch");
    box.setAttribute("pack", "end");
    return box;
  },

  _makeSettingsButton() {
    let button = this.document.createElementNS(XUL_NS, "button");
    button.className = "urlbar-engine-one-off-item search-setting-button";
    button.id = "urlbar-search-settings2";
    button.addEventListener("command", this);
    return button;
  },

  _makeButtonList() {
    let list = this.document.createElementNS(XUL_NS, "description");
    list.id = "urlbar-one-offs";
    list.className = "urlbar-one-offs";
    list.setAttribute("flex", "1");

    let eventNames = ["click", "mouseout", "mouseover"];
    for (let name of eventNames) {
      list.addEventListener(name, this);
    }

    return list;
  },

  _updateHeader() {
    let headerSearchText =
      this.document.getElementById("urlbar-oneoffheader-searchtext");

    let searchStr = this.urlbar.controller.searchString;
    headerSearchText.setAttribute("value", searchStr);

    let groupText;
    let isOneOffSelected =
      this.selectedButton &&
      this.selectedButton.classList.contains("urlbar-engine-one-off-item");
    // Typing de-selects the settings or opensearch buttons at the bottom
    // of the search panel, as typing shows the user intends to search.
    if (this.selectedButton && !isOneOffSelected) {
      this.selectedButton = null;
    }
    if (searchStr) {
      groupText = headerSearchText.previousSibling.value +
                  '"' + headerSearchText.value + '"' +
                  headerSearchText.nextSibling.value;
      if (!isOneOffSelected) {
        this.header.setAttribute("selectedIndex", "1");
      }
    }
    else {
      let noSearchHeader =
        this.document.getElementById("urlbar-oneoffheader-search");
      groupText = noSearchHeader.value;
      if (!isOneOffSelected) {
        this.header.setAttribute("selectedIndex", "0");
      }
    }
    this.buttonList.setAttribute("aria-label", groupText);
  },

  _initKeyHandler() {
    this.urlbar._handleKeyPress = this.urlbar.handleKeyPress;
    this.urlbar.handleKeyPress = event => this._handleKeyPress(event);

    this.urlbar._handleCommand = this.urlbar.handleCommand;
    this.urlbar.handleCommand = event => this._handleCommand(event);
  },

  _handleKeyPress(event) {
    if (!this.panelElement.popupOpen ||
        this.panelElement.disableKeyNavigation) {
      this.urlbar._handleKeyPress(event);
      return;
    }

    let keyCode = event.keyCode;

    // Handle Tab and Shift+Tab like Down and Up arrow keys.
    if (event.keyCode == Ci.nsIDOMKeyEvent.DOM_VK_TAB &&
        this.urlbar.tabScrolling) {
      keyCode = event.shiftKey ? Ci.nsIDOMKeyEvent.DOM_VK_UP :
                                 Ci.nsIDOMKeyEvent.DOM_VK_DOWN;
    }

    // Only handle Up and Down (and Tab and Shift+Tab).  Delegate everything
    // else to the urlbar.
    switch (keyCode) {
      case Ci.nsIDOMKeyEvent.DOM_VK_UP:
        if (this.panelElement.selectedIndex == 0) {
          this.selectedButtonIndex = this.numButtons - 1;
          break;
        }
        if (this.selectedButtonIndex >= 0) {
          this.selectedButtonIndex--;
          if (this.selectedButtonIndex >= 0) {
            break;
          }
        }
        this.urlbar._handleKeyPress(event);
        return;
      case Ci.nsIDOMKeyEvent.DOM_VK_DOWN:
        if (this.panelElement.selectedIndex ==
            this.panelElement._matchCount - 1) {
          this.selectedButtonIndex = 0;
          break;
        }
        if (this.selectedButtonIndex >= 0) {
          this.selectedButtonIndex++;
          if (this.selectedButtonIndex >= 0) {
            break;
          }
        }
        this.urlbar._handleKeyPress(event);
        return;
      default:
        this.urlbar._handleKeyPress(event);
        return;
    }

    if (this.selectedButton != this.settingsButton) {
      Telemetry.incrementValue("oneOffButtonSelectedByKeypress");
    }
    event.preventDefault();
  },

  // Called on the settings button.
  _onCommand(event) {
    this._handleCommand(event);
  },

  _handleCommand(event) {
    // This function only handles Return key presses in the urlbar when a one-
    // off button is selected.
    if (!event || event.type != "keypress" || !this.selectedButton) {
      this.urlbar._handleCommand(event);
      return;
    }
    if (this.selectedButton == this.settingsButton) {
      Telemetry.incrementValue("searchSettingsClicked");
      this.window.openPreferences("paneSearch");
    } else {
      this._doSearchFromButton(this.selectedButton, event);
    }
    event.preventDefault();
  },

  handleEvent(event) {
    let methName = "_on" + event.type[0].toUpperCase() + event.type.substr(1);
    this[methName](event);
  },

  _onInput(event) {
    this._updateHeader();
  },

  _onPopupshowing(event) {
    this.selectedButton = null;
    this._buildButtonList();
    this._updateHeader();
    this._updateTip();
  },

  _onPopuphiding(event) {
    if (this.tipContainer) {
      this.tipContainer.removeAttribute("animate");
    }
  },

  _onMouseover(event) {
    let target = event.originalTarget;
    if (target.localName != "button") {
      return;
    }

    if ((target.classList.contains("urlbar-engine-one-off-item") &&
         !target.classList.contains("dummy")) ||
        target.classList.contains("addengine-item") ||
        target.classList.contains("search-setting-button")) {
      Telemetry.incrementValue("oneOffButtonSelectedByMouseover");
      this.selectedButton = target;
    }
  },

  _onMouseout(event) {
    let target = event.originalTarget;
    if (target.localName != "button") {
      return;
    }

    if (this.selectedButton == target) {
      this.selectedButton = null;
    }
  },

  _onClick(event) {
    if (event.button == 2) {
      return; // ignore right clicks.
    }
    let button = event.originalTarget;
    this._doSearchFromButton(button, event);
  },

  _doSearchFromButton(button, event) {
    let engine = button.engine || button.parentNode.engine;
    if (!engine) {
      return;
    }

    let win = button.ownerDocument.defaultView;
    if (event instanceof win.KeyboardEvent) {
      Telemetry.incrementValue("searchByReturnKeyOnOneOffButton", { engine } );
    } else if (event instanceof win.MouseEvent) {
      Telemetry.incrementValue("searchByClickOnOneOffButton", { engine });
    }

    let query = this.urlbar.controller.searchString;
    let submission = engine.getSubmission(query, null, "keyword");
    let url = submission.uri.spec;
    let postData = submission.postData;

//     // close the autocomplete popup and revert the entered address
//     urlBar.popup.closePopup();
//     controller.handleEscape();

    // respect the usual clicking subtleties
    this.window.openUILink(url, event, { postData });
  },

  _buildButtonList() {
    while (this.buttonList.firstChild) {
      this.buttonList.firstChild.remove();
    }

    let Preferences =
      Cu.import("resource://gre/modules/Preferences.jsm", {}).Preferences;
    let pref = Preferences.get("browser.search.hiddenOneOffs");
    let hiddenList = pref ? pref.split(",") : [];

    let currentEngineName = Services.search.currentEngine.name;
    let engines = Services.search.getVisibleEngines()
                          .filter(e => e.name != currentEngineName &&
                                       hiddenList.indexOf(e.name) == -1);

    // header is a xul:deck so collapsed doesn't work on it, see bug 589569.
    this.header.hidden = this.buttonList.collapsed = !engines.length;

    // 49px is the min-width of each search engine button,
    // adapt this const when changing the css.
    // It's actually 48px + 1px of right border.
    const ENGINE_WIDTH = 49;
    let minWidth = parseInt(this.panelElement.width);
    if (engines.length) {
      // Ensure the panel is wide enough to fit at least 3 engines.
      minWidth = Math.max(minWidth, ENGINE_WIDTH * 3);
    }
    this.panelElement.style.minWidth = minWidth + "px";

    if (!engines.length) {
      return;
    }

    let listWidth = parseInt(this.buttonList.clientWidth);
    // The + 1 is because the last button doesn't have a right border.
    let enginesPerRow = Math.floor((listWidth + 1) / ENGINE_WIDTH);
    let buttonWidth = Math.floor(listWidth / enginesPerRow);
    // There will be an emtpy area of:
    //   panelWidth - enginesPerRow * buttonWidth  px
    // at the end of each row.

    // If the <description> tag with the list of search engines doesn't have
    // a fixed height, the panel will be sized incorrectly, causing the bottom
    // of the suggestion <tree> to be hidden.
    let rowCount = Math.ceil(engines.length / enginesPerRow);
    let height = rowCount * 33; // 32px per row, 1px border.
    this.buttonList.setAttribute("height", height + "px");

    let dummyItems =
      enginesPerRow - (engines.length % enginesPerRow || enginesPerRow);
    for (let i = 0; i < engines.length; ++i) {
      let engine = engines[i];
      let button = this.document.createElementNS(XUL_NS, "button");
      button.id = "urlbar-engine-one-off-item-" + engine.name.replace(/ /g, '-');
      button.className = "urlbar-engine-one-off-item";
      let uri = "chrome://browser/skin/search-engine-placeholder.png";
      if (engine.iconURI) {
        uri = engine.iconURI.spec;
      }
      button.setAttribute("image", uri);
      button.setAttribute("tooltiptext", engine.name);
      button.setAttribute("width", buttonWidth);
      button.engine = engine;

      if ((i + 1) % enginesPerRow == 0) {
        button.classList.add("last-of-row");
      }

      if (i >= engines.length + dummyItems - enginesPerRow) {
        button.classList.add("last-row");
      }

      this.buttonList.appendChild(button);
    }

    while (dummyItems) {
      let button = this.document.createElementNS(XUL_NS, "button");
      button.className = "urlbar-engine-one-off-item dummy last-row";
      button.setAttribute("width", buttonWidth);

      if (!--dummyItems) {
        button.classList.add("last-of-row");
      }

      this.buttonList.appendChild(button);
    }

    // Add a data point for the engine count if it's changed (or this is the
    // first time reaching here).
    this._engineCount = this._engineCount || 0;
    if (engines.length != this._engineCount) {
      this._engineCount = engines.length;
      Telemetry.setValue("engineCount", engines.length);
    }
  },

  get numButtons() {
    return Array.reduce(this.buttonList.children, (num, button) => {
      if (!button.classList.contains("dummy")) {
        num++;
      }
      return num;
    }, 1); // Also take into account the settings button.
  },

  get selectedButtonIndex() {
    if (this.selectedButton) {
      if (this.settingsButton == this.selectedButton) {
        return Array.filter(this.buttonList.children,
                            b => !b.classList.contains("dummy"))
                    .length;
      }
      for (let i = 0; i < this.buttonList.children.length; i++) {
        let child = this.buttonList.children[i];
        if (child == this.selectedButton) {
          return i;
        }
      }
    }
    return -1;
  },

  set selectedButtonIndex(index) {
    let button = null;
    let validChildrenLen = Array.filter(this.buttonList.children,
                                        b => !b.classList.contains("dummy"))
                                .length;
    if (index == validChildrenLen) {
      button = this.settingsButton;
    } else if (0 <= index && index < validChildrenLen) {
      button = this.buttonList.children[index];
    }
    this.selectedButton = button;
  },

  get selectedButton() {
    return this._selectedButton || null;
  },

  set selectedButton(val) {
    if (this._selectedButton) {
      this._selectedButton.removeAttribute("selected");
    }

    // Avoid selecting dummy buttons.
    if (val && !val.classList.contains("dummy")) {
      val.setAttribute("selected", "true");
      this._selectedButton = val;

      // Clear the panel's selection and make sure the input shows the search
      // string.  Set selectedIndex on the richlistbox directly so that the
      // panel does not scroll the listbox to the top.
      this.panelElement.richlistbox.selectedIndex = -1;
      this.urlbar.textValue = this.urlbar.controller.searchString;

      if (val.classList.contains("urlbar-engine-one-off-item") && val.engine) {
        let headerEngineText =
          this.document.getElementById("urlbar-oneoffheader-engine");
        this.header.selectedIndex = 2;
        headerEngineText.value = val.engine.name;
      }
      else {
        this.header.selectedIndex = this.urlbar.textValue ? 1 : 0;
      }
      this.urlbar.setAttribute("aria-activedescendant", val.id);

      return;
    }

    this.header.selectedIndex = this.urlbar.textValue ? 1 : 0;
    this.urlbar.removeAttribute("aria-activedescendant");
    this._selectedButton = null;
  },
};
