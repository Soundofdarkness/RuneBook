<chapters-segment>
  <div class="ui container">
    
    <div class="ui horizontal divider"><i1-8n>chapters.title</i1-8n></div>

    <div class="ui top attached pointing small borderless menu" style="margin-top: 0;">
      <virtual each={ val, key in opts.plugins.local }>
        <a class={ opts.tab.active == key ? "item active" : "item" } data-tab={key} onclick={ switchTab }>
          { i18n.localise(val.name) }
        </a>
      </virtual>
      <virtual each={ val, key in opts.plugins.remote }>
        <a class={ opts.tab.active == key ? "item active" : "item" } data-tab={key} onclick={ switchTab }>
          { i18n.localise(val.name) }
        </a>
      </virtual>

    </div>

    <div id="pagelist-limiter" class={ opts.tab.loaded ? "ui bottom attached tab segment active" : "ui bottom attached tab segment active" }>
      <div if={ opts.tab.loaded } id="grid-wrapper" class={ opts.current.champion && !_.isEmpty(opts.current.champ_data.pages.toJS()) ? "ui one column centered grid" : "ui one column middle aligned centered grid" }>
        <div class="row">
          <div class="column" style={ opts.current.champion && !_.isEmpty(opts.current.champ_data.pages.toJS()) ? "height: 100%;" : "" }>
            
            <h1 if={ !opts.current.champion } class="ui center aligned icon header">
              <i class="open book icon"></i>
              <div class="content">
                <i1-8n>chapters.welcome</i1-8n>
                <div class="sub header"><i1-8n>chapters.startmessage</i1-8n></div>
              </div>
            </h1>

            <page-list current={opts.current} lastuploadedpage={opts.lastuploadedpage} connection={opts.connection} tab={opts.tab} plugins={opts.plugins} lastbookmarkedpage={opts.lastbookmarkedpage} lastsyncedpage={opts.lastsyncedpage} tooltips={opts.tooltips}></page-list>
          </div>
        </div>
      </div>

      <div if={ !opts.tab.loaded } class="ui active inverted dimmer">
        <div class="ui loader"></div>
      </div>

    </div>
    
  </div>

  <script>

    switchTab(evt) {
      evt.preventUpdate = true;

      var tab = $(evt.target).attr("data-tab");
      freezer.emit("tab:switch", tab);
    }
  
  </script>

</chapters-segment>