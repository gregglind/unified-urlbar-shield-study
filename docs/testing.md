Since UITelemetry is only collected after a restart, it's required to use the --profile and --no-copy options to ensure the profile persists across runs.
It's also necessary to use an unbranded build (from https://wiki.mozilla.org/Add-ons/Extension_Signing) to test this on Beta 50 using the Shield cli.

For example, after cloning the git report and entering the add-on folder:
```Bash
npm install -g shield-study-cli jpm
npm install --save-dev jpm
shield run . unified -- --profile path_to_profile --no-copy
```
After the first run, just close the browser and shield run again, UITelemetry should be now collected properly.

unified is one of the three variations:
 * unified: add oneoffs, remove searchbar
 * oneoff: add oneoff
 * control: no changes
