<item-set>
    <div class='ui modal' id={opts.page.split(" ").pop().replace(/[^a-zA-Z ]/g, '')}>
        <div class="content" >
            <div class="ui horizontal divider"><i1-8n>items.title</i1-8n></div>
            <div class="ui form"  style="height: 100%">
                <div class="row">
                    <div class="column">
                        <div class="ui middle aligned relaxed divided runepage list">
                            <div class="itembuttons">
                            <div class="ui icon button" onclick={upload_items}><i1-8n>items.upload_items</i1-8n></div>
                            <div class="ui icon button" onclick={delete_items}><i1-8n>items.delete_items</i1-8n></div>
                            </div>
                            <p class="ui horizontal divider"><i1-8n>items.start_items</i1-8n></p>\
                              <div class="item itemlist">
                                <div class="item" each={item, key in opts.current.champ_data.pages[opts.page].itemSet.start_items} style={'width:' + 100 / opts.current.champ_data.pages[opts.page].itemSet.start_items.length + '%;'}>
                                        {item}
                                    </div>
                                <div class="item" if={opts.current.champ_data.pages[opts.page].itemSet.start_items.length == 0} style="width: 100%;">
                                    <P style="text-align: center;"><i1-8n>items.emptyCategory</i1-8n></P>
                                </div>
                            </div>
                            <p class="ui horizontal divider"><i1-8n>items.core_items</i1-8n></p>
                            <div class="item itemlist">
                                <div class="item"  each={item, key in opts.current.champ_data.pages[opts.page].itemSet.core_items} style={'width:' + 100 / opts.current.champ_data.pages[opts.page].itemSet.core_items.length + '%;'}>
                                    {item}
                                </div>
                                <div class="item" if={opts.current.champ_data.pages[opts.page].itemSet.core_items.length == 0} style="width: 100%;">
                                    <P style="text-align: center;"><i1-8n>items.emptyCategory</i1-8n></P>
                                </div>
                            </div>
                            <p class="ui horizontal divider"><i1-8n>items.big_items</i1-8n></p>
                            <div class="item itemlist">
                                <div class="item" each={item, key in opts.current.champ_data.pages[opts.page].itemSet.big_items} style={'width:' + 100 / opts.current.champ_data.pages[opts.page].itemSet.big_items.length + '%;'}>
                                    {item}
                                </div>
                                <div class="item" if={opts.current.champ_data.pages[opts.page].itemSet.big_items.length == 0} style="width: 100%;">
                                    <P style="text-align: center;"><i1-8n>items.emptyCategory</i1-8n></P>
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
        // At least for blitzgg this gets the role
        role = opts.page.split(" ").pop().replace(/[^a-zA-Z ]/g, '');
        map = opts.page.split(" ")[0].replace(/[^a-zA-Z ]/g, ''); // either ARAM or RANKED if its ranked than the map is Summoner's Rift
        // checks if its aram or not 
        if (map == 'ARAM'){
            freezer.emit("items:upload", opts.current.champion, 'any','aram', opts.current.champ_data.pages[opts.page].itemSet);
        }
        else{
            freezer.emit("items:upload", opts.current.champion, role,"normal", opts.current.champ_data.pages[opts.page].itemSet);
        }
    }
    delete_items(evt){
        role = opts.page.split(" ").pop().replace(/[^a-zA-Z ]/g, '');
        if(role == opts.current.champion) {
        freezer.emit("items:delete", opts.current.champion, "any");
        }
        else{
        freezer.emit("items:delete", opts.current.champion, role);
        }
    }
    </script>
</item-set>