<runebook>
  <link rel="stylesheet" type="text/css" href={configfile.darktheme ? "dark.css" : "light.css"}>
  <header style="-webkit-app-region: drag;">
    <div class="ui secondary pointing menu">
      <div class="ui menu header item">
          RuneBook

          <update-button updateready={updateready}></update-button>

          <div style="position: absolute; top: 27%; right: 6%; -webkit-app-region: no-drag;">
            <i class="link window minimize small icon" onclick={ minimize }></i>
          </div>
          
          <div style="position: absolute; top: 27%; right: 1%; -webkit-app-region: no-drag;">
            <i class="link close small icon" onclick={ close }></i>
          </div>

      </div>
    </div>
  </header>

  <select-champion champion={current.champion} autochamp={autochamp} champselect={champselect}></select-champion>

  <chapters-segment current={current} lastuploadedpage={lastuploadedpage} session={session} connection={connection} tab={tab} plugins={plugins} lastbookmarkedpage={lastbookmarkedpage} lastsyncedpage={lastsyncedpage} tooltips={tooltips}></chapters-segment>
  <div style="margin-bottom: 20px;">
    <current-page connection={connection} session={session} current={current} tab={tab} plugins={plugins} tooltips={tooltips}></current-page>
  </div>

  <settings-panel configfile={configfile} updateready={updateready}></settings-panel>
  <changelog-modal></changelog-modal>

  <script>
    var remote;
    this.on("mount", () => {
      remote = require('electron').remote;
    })

    this.on("updated", () => {
      if(freezer.get().showchangelog) {
        $(".changelog-modal").modal("show");
      }
      freezer.get().set("showchangelog", false);
    })

    close() {
      if(remote.process.platform === "darwin") {
        remote.getCurrentWindow().hide();
      }
      else {
        remote.getCurrentWindow().close();
      }
    }

    minimize() {
      remote.getCurrentWindow().minimize();
    }

    this.current = opts.current;
    this.lastuploadedpage = opts.lastuploadedpage;
    this.connection = opts.connection;
    this.session = opts.session;
    this.tab = opts.tab;
    this.plugins = opts.plugins;
    this.lastbookmarkedpage = opts.lastbookmarkedpage;
    this.lastsyncedpage = opts.lastsyncedpage;
    this.lang = opts.lang;
    this.updateready = opts.updateready;
    this.configfile = opts.configfile;
    this.autochamp = opts.autochamp;
    this.champselect = opts.champselect;
    this.tooltips = opts.tooltips;

    freezer.on('update', () => {
      this.update(freezer.get());
    });

  </script>
</runebook>