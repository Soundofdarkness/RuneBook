<item-set>
    <div class='ui modal' id={opts.page.split(" ").pop().replace(/[^a-zA-Z ]/g, '')}>
        <div class="content" >
            <div class="ui horizontal divider"><i1-8n>items.title</i1-8n></div>
            <div class="ui form"  style="height: 100%">
                <div class="row">
                    <div class="column">
                        <div class="ui middle aligned relaxed divided runepage list"  style="overflow-x:hidden; overflow-y:auto;">
                            <p class="ui horizontal divider">Start items</p>
                            <div class="item itemlist">
                                <div each={item, key in opts.current.champ_data.pages[opts.page].itemSet.start_items}>
                                    {item}
                                </div>
                            </div>
                            <p class="ui horizontal divider">Core items</p>
                            <div class="item itemlist">
                                <div class="item" each={item, key in opts.current.champ_data.pages[opts.page].itemSet.core_items}>
                                    {item}
                                </div>
                            </div>
                            <p class="ui horizontal divider">Big items</p>
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
</item-set>