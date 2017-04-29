const self = require("sdk/self");
const shield = require("shield-studies-addon-utils");
const { when: unload } = require("sdk/system/unload");
const { feature } = require('./feature');
const prefSvc = require('sdk/preferences/service');

const studyConfig = {
  name: self.addonId,
  duration: 14,
  variations: {
    "unified": () => feature.install("unified"),
    "oneoff": () => feature.install("oneoff"),
    "control": () => feature.install("control")
  },
  surveyUrls:  {
    'end-of-study': "https://qsurvey.mozilla.com/s3/search-study-1",
    'user-ended-study': "https://qsurvey.mozilla.com/s3/search-study-1",
    'ineligible': null
  },
}

class OurStudy extends shield.Study {
  constructor(config) {
    super(config);
  }

  isEligible() {
    return super.isEligible() && feature.isEligible();
  }

  whenIneligible () {
    // Additional actions when the user isn't eligible.
    super.whenIneligible();
  }

  whenInstalled() {
    // Additional actions when the study gets installed.
    super.whenInstalled();
  }

  cleanup() {
    super.cleanup();
    feature.cleanup();
  }

  whenComplete () {
    // Additional actions when the study is naturally completed.
    super.whenComplete();  // calls survey, uninstalls
  }

  whenUninstalled () {
    // Additional actions when the user uninstalls the study.
    super.whenUninstalled();
    feature.uninstall();
  }

  decideVariation () {
    return super.decideVariation(); // chooses at random
  }
}

const thisStudy = new OurStudy(studyConfig);
unload((reason) => thisStudy.shutdown(reason))

exports.study = thisStudy;
exports.checkHasConflicts = feature.checkHasConflicts;
