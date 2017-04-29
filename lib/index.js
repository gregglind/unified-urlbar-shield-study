const self = require("sdk/self");
const { study, checkHasConflicts } = require("./study");

checkHasConflicts().then(hasConflicts => {
  if (!hasConflicts) {
    study.startup(self.loadReason);
  }
});
