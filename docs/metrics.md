{
  "payload": {
    "ver": 4,
    "simpleMeasurements": {
      "UITelemetry": {
        "toolbars": {
          "defaultKept": [
            "edit-controls",
            "zoom-controls",
            "save-page-button",
            "print-button",
            "history-panelmenu",
            "fullscreen-button",
            "preferences-button",
            "add-ons-button",
            "privatebrowsing-button",
            "urlbar-container",
            "search-container",
            "bookmarks-menu-button",
            "downloads-button",
            "menubar-items",
            "tabbrowser-tabs",
            "new-tab-button",
            "alltabs-button",
            "personal-bookmarks"
          ],
          "defaultMoved": [
            "developer-button"
          ],
          "nondefaultAdded": [
            "feed-button"
          ],
          "defaultRemoved": [
            "sync-button",
            "find-button",
            "social-share-button",
            "pocket-button",
            "new-window-button",
            "home-button"
          ],
          "currentSearchEngine": "engine_name",
           "countableEvents": {
            "__DEFAULT__": {
              "click-builtin-item": {
                "urlbar": {
                  "search-settings": 1
                },
                "searchbar": {
                  "search-settings": 1
                }
              },
              "search": {
                "urlbar": 3,
                "searchbar": 3,
                "newtab": 3,
                "abouthome": 3,
                "content-bing": 3,
                "content-google": 3,
                "content-yahoo": 3,
                "content-result-bing": 3,
                "content-result-google": 3,
                "content-result-yahoo": 3,
                "autocomplete-other": 3,
                "autocomplete-default": 3,
              },
              "search-oneoff": {
                "engine_name.ui_source": {
                  "mouse": {
                    "current": 1
                  },
                  "key": {
                    "current": 1
                  }
                }
              }
            }
          }
        }
      }
    },
    "histograms": {
      "FX_URLBAR_SELECTED_RESULT_TYPE": {
        "range": [
          1,
          14
        ],
        "bucket_count": 15,
        "histogram_type": 1,
        "values": {
          "0": 4,
          "1": 2,
          "2": 8,
          "3": 6,
          "8": 2,
          "9": 0
        },
        "sum": 52
      }
    },
    "keyedHistograms": {
      "SEARCH_COUNTS": {
        "engine_name.ui_source": {
          "range": [
            1,
            2
          ],
          "bucket_count": 3,
          "histogram_type": 4,
          "values": {
            "0": 1,
            "1": 0
          },
          "sum": 1
        }
      }
    }
  },
  "environment": {
    "settings": {
      "userPrefs": {
        "browser.urlbar.suggest.searches": true,
        "browser.urlbar.userMadeSearchSuggestionsChoice": true,
      }
    }
  }
}
