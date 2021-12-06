<item-set>
    <div class='ui modal' id={opts.page.split(" ").pop().replace(/[^a-zA-Z ]/g, '')}>
        <div class="content" >
            <div class="ui horizontal divider"><i1-8n>items.title</i1-8n></div>
            <div class="ui form"  style="height: 100%">
                <div class="row">
                    <div class="column">
                        <div class="ui middle aligned relaxed divided runepage list"  style="overflow-x:hidden; overflow-y:auto;">
                            <div class="ui icon button" onclick={upload_items}><i1-8n>items.upload_items</i1-8n></div>
                            <p class="ui horizontal divider"><i1-8n>items.start_items</i1-8n></p>
                            <div class="item itemlist">
                                <div each={item, key in opts.current.champ_data.pages[opts.page].itemSet.start_items}>
                                    {item}
                                </div>
                            </div>
                            <p class="ui horizontal divider"><i1-8n>items.core_items</i1-8n></p>
                            <div class="item itemlist">
                                <div class="item" each={item, key in opts.current.champ_data.pages[opts.page].itemSet.core_items}>
                                    {item}
                                </div>
                            </div>
                            <p class="ui horizontal divider"><i1-8n>items.big_items</i1-8n></p>
                            <div class="item itemlist">
                                <div class="item" each={item, key in opts.current.champ_data.pages[opts.page].itemSet.big_items}>
                                    {item}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script>
    upload_items(evt){
        freezer.emit("items:upload", opts.current.champion, opts.current.champ_data.pages[opts.page].itemSet);
    }
    </script>
</item-set>