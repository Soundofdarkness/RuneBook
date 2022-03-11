<select-champion>
  <div class="ui container">
    <div class="ui basic segment">
      
      <div class="ui equal width grid">
        <div class="row">
          
          <div class="column">
            <img draggable="false" class="ui tiny image circular"
              src={opts.champion ? `https://ddragon.leagueoflegends.com/cdn/${freezer.get().lolversions[0]}/img/champion/${this.opts.champion}.png` : "./img/unknown.png"}>
            <img draggable="false" class="ui tiny-ring image circular" style="position: absolute; top: -2px; left: 12px;" src={opts.autochamp ? "./img/ring_active.png" : "./img/ring.png"}>
            <img if={ opts.autochamp && opts.champselect.active } draggable="false" class="ui tiny-spin image circular" style="position: absolute; top: -10px; left: 4px;" src="./img/ring_spinner.png">
          </div>
          
          <div class="column middle aligned">
            <div class="ui search loading fluid champion">
              <div class="ui icon input">
                <input disabled class="prompt" type="text" placeholder="{ i18n.localise('champion.name') }..." onClick="this.select();">
                <i class="search icon"></i>
              </div>
              <div class="results"></div>
            </div>

          </div>

          <div class="column middle aligned">
            <div class="ui toggle checkbox" id="autochamp">
              <input type="checkbox" tabindex="0" class="hidden">
              <label id="autochamp-label"><i1-8n>champion.autopick</i1-8n></label>
            </div>
            <div class="ui toggle checkbox" id="autoaccept">
              <input type="checkbox" tabindex="0">
              <label id="autoaccept-label"<i1-8n>game.autoaccept</i1-8n></label>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
  
  <div class="ui popup autochamp" style="width: 250px;"><i1-8n>champion.autopick.tooltip</i1-8n></div>
  <div class="ui popup autoaccept" style="width: 250px;"><i1-8n>game.autoaccept.tooltip</i1-8n></div>
  <style>
    .tiny-ring {
      width: 84px;
      height: 84px;
    }

    .tiny-spin {
      width: 100px;
      height: 100px;
      animation: spin 1.6s linear infinite;
  }
  @keyframes spin { 100% { -webkit-transform: rotate(360deg); transform: rotate(360deg); } }
  </style>

  <script>

    freezer.on("champion:choose", (champion) => {
      $('.ui.search.champion').search("set value", champion);
    })

    freezer.on("lang:update", (champion) => {
      $('.ui.search.champion input').attr('placeholder', i18n.localise('champion.name') + '...');
    })

    freezer.on("championsinfo:set", () => {
      var ddres = handleDDRes(freezer.get().championsinfo);

      var search_el = $('.ui.search.champion');
      search_el.removeClass("loading");
      $('input', search_el).prop("disabled", false);

      search_el.search({
        source: ddres,
        duration: 0,
        searchDelay: 0,
        showNoResults: false,
        maxResults: 10,
        fullTextSearch: true,
        selectFirstResult: true,
        searchFields: ['title', 'info'],
        regExp: {
          escape     : /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,
          beginsWith : '(?:\\s|^)'
        },

        onSelect: (data) => {
          if(data) freezer.emit('champion:choose', data.id);
        },
      });

      $('.ui.search.champion').removeClass("disabled");

      $("#autochamp-label").popup({
        position: "bottom right",
        popup: '.ui.popup.autochamp',
        delay: {
          show: 800,
          hide: 0
        }
      });

      $('#autochamp')
        .checkbox({
          onChecked: () => {
            freezer.emit("autochamp:enable");
          },
          onUnchecked: () => {
            freezer.emit("autochamp:disable");
          }
        });

      $("#autoaccept-label").popup({
          position: "bottom right",
          popup: '.ui.popup.autoaccept',
          delay: {
              show: 800,
              hide: 0
          }
      });
      if(freezer.get().autochamp) {
        $('#autochamp').checkbox("check");
      }
      
      $('#autoaccept')
        .checkbox({
          onChecked: () => {
            freezer.emit("autoaccept:enable");
          },
          onUnchecked: () => {
             freezer.emit("autoaccept:disable");
          }
      });
      if(freezer.get().autoaccept) {
        $('#autoaccept').checkbox("check");
      }
      // Force event again, in case api connection is slower than ddragon requests
      freezer.on("api:connected", () => {
        if(freezer.get().autochamp) {
          freezer.emit("autochamp:enable");
        }
      })
    })

    function handleDDRes(ddres) {
      var res = [];
      
      $.each(ddres, function(index, item) {
        res.push({ id: item.id, title: item.name });
        if(item.name == "Blitzcrank") res[res.length - 1].info = "22";
        if(item.name == "Warwick") res[res.length - 1].info = "urf";
      });

      return res;
    }

  </script>

</select-champion>