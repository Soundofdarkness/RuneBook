<changelog-modal>
  
  <div class="ui small modal changelog-modal">
    <i class="close icon"></i>
    <div class="header">
      <i1-8n>whatsnew.title</i1-8n> { require('electron-is-dev') === true ? "DEV" : require('electron').remote.app.getVersion(); }
    </div>
    <div class="scrolling content">
      <img class="ui fluid rounded centered image" src="./img/backdrop.png">
      <h3 class="ui section horizontal divider">Greetings, Summoner!</h3>
      <h4 class="centered">RuneBook has been updated to version { require('electron-is-dev') === true ? "DEV" : require('electron').remote.app.getVersion(); }</h4>

      <p>You can read about new features and bugfixes on our <a href="https://github.com/Soundofdarkness/RuneBook/releases">download page at Github</a></p>

      <div class="ui divider"></div>

      <p>Remember, RuneBook is pretty much complete for what it has to offer, but new small features might be added from time to time, and it will still be updated to support the latest game patch.</p>
      <h4 class="ui header right floated"><a href="https://github.com/Soundofdarkness/RuneBook">RuneBook community</a></h4>
    </div>
  </div>

  <script>
    
    this.on('mount', () => {
      $('.changelog-modal').modal({
        duration: 200,
        autofocus: false,
      });

      freezer.emit("changelog:ready");
    });

  </script>

</changelog-modal>