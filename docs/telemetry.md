environment/settings/userPrefs/browser.urlbar.suggest.searches
* tracks the search suggestions enabled pref

environment/settings/userPrefs/browser.urlbar.userMadeSearchSuggestionsChoice
* tracks the pref stating whether the user made a choice for search suggestions opt-in

payload/simpleMeasurements/UITelemetry/toolbars/countableEvents/__DEFAULT__/search/searchbar
* total number of searches started from the search bar

payload/simpleMeasurements/UITelemetry/toolbars/countableEvents/__DEFAULT__/search/abouthome
* total number of searches started from about:home

payload/simpleMeasurements/UITelemetry/toolbars/countableEvents/__DEFAULT__/search/newtab
* total number of searches started from about:newtab

payload/simpleMeasurements/UITelemetry/toolbars/countableEvents/__DEFAULT__/search/urlbar
* total number of searches started from the urlbar

payload/simpleMeasurements/UITelemetry/toolbars/countableEvents/__DEFAULT__/search/content-bing
payload/simpleMeasurements/UITelemetry/toolbars/countableEvents/__DEFAULT__/search/content-google
payload/simpleMeasurements/UITelemetry/toolbars/countableEvents/__DEFAULT__/search/content-yahoo
* In-content direct accesses to "google", "bing", "yahoo" root domains

payload/simpleMeasurements/UITelemetry/toolbars/countableEvents/__DEFAULT__/search/content-result-bing
payload/simpleMeasurements/UITelemetry/toolbars/countableEvents/__DEFAULT__/search/content-result-google
payload/simpleMeasurements/UITelemetry/toolbars/countableEvents/__DEFAULT__/search/content-result-yahoo
* In-content accesses to a "google", "bing", "yahoo" first result page (heuristic)

payload/simpleMeasurements/UITelemetry/toolbars/countableEvents/__DEFAULT__/search/autocomplete-other
* number of searches to a non-current engine started by revisiting a previous search result in the urlbar

payload/simpleMeasurements/UITelemetry/toolbars/countableEvents/__DEFAULT__/search/autocomplete-default
* number of searches to the current engine started by revisiting a previous search result in the urlbar

payload/simpleMeasurements/UITelemetry/toolbars/defaultKept
payload/simpleMeasurements/UITelemetry/toolbars/defaultMoved
payload/simpleMeasurements/UITelemetry/toolbars/defaultRemMoved
* widget positions on toolbar, look for "search-container"

payload/histograms/FX_URLBAR_SELECTED_RESULT_TYPE
* type of result selected from the urlbar dropdown, see nsBroweserGlue.js::_handleURLBarTelemetry for enums

payload/simpleMeasurements/UITelemetry/toolbars/countableEvents/__DEFAULT__/search-oneoff/
* engine.unknown
  * Serches done by just typing something and pressing Enter
* engine.oneoff-searchbar
  * searches from searchbar one-off buttons
* engine.oneoff-urlbar
  * searches from urlbar one-off buttons

payload/simpleMeasurements/UITelemetry/toolbars/countableEvents/__DEFAULT__/click-builtin-item/searchbar/search-settings
* number of times the searchbar search settings button is used

payload/simpleMeasurements/UITelemetry/toolbars/countableEvents/__DEFAULT__/click-builtin-item/urlbar/search-settings
* number of times the urlbar search settings button is used

payload/keyedHistograms/SEARCH_COUNTS
* should ideally be the sum of all the searches from urlbar, searchbar, abouthome, newtab
