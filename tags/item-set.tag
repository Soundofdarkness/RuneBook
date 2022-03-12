<item-set>
    <div class='ui modal' id={opts.page.split(" ").pop().replace(/[^a-zA-Z ]/g, '')}>
        <div class="content" >
            <div class="ui horizontal divider"><i1-8n>items.title</i1-8n></div>
            <div class="ui form"  style="height: 100%">
                <div class="row">
                    <div class="column">
                        <div class="ui middle aligned relaxed divided runepage list">
                            <div class="item-buttons">
                            <div class="ui icon button" onclick={upload_items}><i1-8n>items.upload_items</i1-8n></div>
                            <div class="ui icon button" onclick={delete_items}><i1-8n>items.delete_items</i1-8n></div>
                            </div>
                            <p class="ui horizontal divider"><i1-8n>items.start_items</i1-8n></p>
                            <div class="item item-list">
                                <virtual each={item, key in opts.current.champ_data.pages[opts.page].itemSet.start_items.build}>
                                    <div class="item" style="width: 100%; height:100%;">
                                        <img class="item-img" draggable="false"  src={'http://ddragon.leagueoflegends.com/cdn/'+freezer.get().lolversions[0] + '/img/item/'+ item +'.png'}></img>
                                        <div style="height: 30px;">{freezer.get().itemsinfo[item].name}</div>
                                        <div style="height: 15px;">Price: {freezer.get().itemsinfo[item].gold.base}</div>
                                    </div>
                                    <div class="item" if={opts.current.champ_data.pages[opts.page].itemSet.start_items.build.length == 0} style="width: 100%;">
                                        <P style="text-align: center;"><i1-8n>items.emptyCategory</i1-8n></P>
                                    </div>
                                </virtual>
                            </div>
                            <p class="ui horizontal divider"><i1-8n>items.core_items</i1-8n></p>
                            <div class="item item-list">
                                <virtual each={item, key in opts.current.champ_data.pages[opts.page].itemSet.core_items.build}>
                                    <div class="item"   style="width: 100%;  height:100%;">
                                        <img class="item-img" draggable="false"  src={'http://ddragon.leagueoflegends.com/cdn/'+freezer.get().lolversions[0] +'/img/item/'+ item+'.png'}></img>
                                        <div style="height: 30px;">{freezer.get().itemsinfo[item].name}</div>
                                        <div style="height: 15px;">Price: {freezer.get().itemsinfo[item].gold.base}</div>
                                    </div>
                                    <div class="item" if={opts.current.champ_data.pages[opts.page].itemSet.core_items.build.length == 0} style="width: 100%;">
                                        <P style="text-align: center;"><i1-8n>items.emptyCategory</i1-8n></P>
                                    </div>
                                </virtual>
                            </div>
                            <p class="ui horizontal divider"><i1-8n>items.big_items</i1-8n></p>
                            <div class="item item-list">
                                <virtual each={item, key in opts.current.champ_data.pages[opts.page].itemSet.big_items.build}>
                                    <div class="item"  style="width: 100%; height:100%;">
                                        <img height="64px" width="64px" class="item-img" draggable="false" src={'http://ddragon.leagueoflegends.com/cdn/'+freezer.get().lolversions[0]+'/img/item/'+ item+'.png'}></img>
                                        <div style="height: 30px;">{freezer.get().itemsinfo[item].name}</div>
                                        <div style="height: 15px;">Price: {freezer.get().itemsinfo[item].gold.base}</div>
                                    </div>
                                    <div class="item" if={opts.current.champ_data.pages[opts.page].itemSet.big_items.build.length == 0} style="width: 100%;">
                                        <P style="text-align: center;"><i1-8n>items.emptyCategory</i1-8n></P>
                                    </div>
                                </virtual>
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