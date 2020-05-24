<update-button>

  <div if={ !opts.updateready }>
    <i class="link setting small icon" style="position: absolute; top: 37%; right: 11%; -webkit-app-region: no-drag;" onclick="$('.settings-modal').modal('show')"></i>
  </div>

  <div if={ opts.updateready } style="position: absolute; top: 25%; right: 11%; -webkit-app-region: no-drag;">
    <div class="ui teal label" style="cursor: pointer;" onclick="$('.settings-modal').modal('show')">
      <i class="link setting  icon"></i>
      <div class="detail"><i1-8n>settings.newversion</i1-8n></div>
    </div>
  </div>

</update-button>