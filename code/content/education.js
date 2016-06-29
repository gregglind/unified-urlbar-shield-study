// education panel.

var panel = require("sdk/panel").Panel({
  contentURL: require("sdk/self").data.url("panel.html"),
});

exports.educate = function () {
  panel.show({
    //position: button
  });
}
