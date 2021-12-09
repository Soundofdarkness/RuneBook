var settings = require('./settings');
var freezer = require('./state');
var fs = require('fs');
const isDev = !require('electron').remote.require('electron').app.isPackaged;
const { groupBy } = require('lodash');

if(settings.get("darktheme") == null){
	const { nativeTheme } = require('electron').remote.require('electron')
	settings.set("darktheme", nativeTheme.shouldUseDarkColors ?? false);
}

freezer.get().configfile.set({
	name: settings.get("config.name") + settings.get("config.ext"),
	cwd: settings.get("config.cwd"),
	leaguepath: settings.get("leaguepath"),
	pathdiscovery: settings.get("pathdiscovery"),
	darktheme: settings.get("darktheme"),
	favautoupload: settings.get("favautoupload"),
	lang: settings.get("lang"),
	minimizetotray: settings.get("minimizetotray")
});

freezer.get().set("autochamp", settings.get("autochamp"));
freezer.get().tab.set({ active: settings.get("lasttab"), loaded: true });

var request = require('request');

var {ipcRenderer} = require('electron');
ipcRenderer.on('updateinfo:ready', (event, arg) => {
	// Determining whether an update is available
	var appVersion = require('electron').remote.app.getVersion();
	latestv = arg.tag_name.substring(1);
	isUpdateAvailable = latestv !== appVersion && !isDev;

	// Is this really necessary? => The log can only be seen by Dev anyway
	if(isUpdateAvailable){
		console.log("github new latest found");
	}

	// storage changelog and if an update is available
	freezer.get().set("updateready", isUpdateAvailable);
	freezer.get().set("changelogbody", arg.body);
});

ipcRenderer.on('update:downloaded', (event, arg) => {
	console.log("update downloaded")
	freezer.emit("update:downloaded");
});

var path = require('path');

freezer.on("configfile:change", (newPath) => {

	settings.set({
		config: {
			name: path.basename(newPath, path.extname(newPath)),
			cwd: path.dirname(newPath),
			ext: path.extname(newPath)
		}
	});
});

freezer.on("pathdiscovery:switch", (val) => {
	freezer.get().configfile.set("pathdiscovery", val);
	settings.set("pathdiscovery", val);
});

freezer.on("darktheme:switch", (val) => {
	freezer.get().configfile.set("darktheme", val);
	settings.set("darktheme", val);
});

freezer.on("favautoupload:switch", (val) => {
	freezer.get().configfile.set("favautoupload", val);
	settings.set("favautoupload", val);
	console.log('fav:', val);
});

freezer.on("lang:update", (val) => {
	freezer.get().configfile.set("lang", val);
	settings.set("lang", val);
});

(setMinimizeButtonBehaviour = () => {
	minimizetotray = settings.get("minimizetotray")

	if (minimizetotray === true)
		ipcRenderer.send("minimizetotray:enabled")
	else
		ipcRenderer.send("minimizetotray:disabled")
})()

freezer.on("minimizetotray:switch", (val) => {
	freezer.get().configfile.set("minimizetotray", val);
	settings.set("minimizetotray", val);

	setMinimizeButtonBehaviour()
});

freezer.on("leaguepath:change", (leaguepath) => {
	leaguepath = path.join(path.dirname(path.normalize(leaguepath)), (process.platform == 'darwin' ? 'LeagueClient.app' : 'LeagueClient.exe'));
	freezer.get().configfile.set("leaguepath", leaguepath);
	settings.set("leaguepath", leaguepath);
});

freezer.on("update:do", () => {
	ipcRenderer.send('update:do');
});

freezer.on("content:reload", () => {
	ipcRenderer.send('content:reload');
})

freezer.on("changelog:ready", () => {
	var appVersion = require('electron').remote.app.getVersion();
	console.log(appVersion, settings.get("changelogversion"))
	if(settings.get("changelogversion") != appVersion) {
		freezer.get().set("showchangelog", true);
		settings.set("changelogversion", appVersion);
	}
});

request('https://ddragon.leagueoflegends.com/api/versions.json', function (error, response, data) {
	if(!error && response && response.statusCode == 200) {
		var ver = JSON.parse(data);
		freezer.get().set('lolversions', ver);
		freezer.emit("version:set", ver[0]);
	}
	else throw Error("Couldn't get ddragon api version");
});

freezer.on('version:set', (ver) => {
	request('https://ddragon.leagueoflegends.com/cdn/'+ver+'/data/en_US/runesReforged.json', function(error, response, data) {
		if(!error && response && response.statusCode == 200){
			freezer.get().set('runesreforgedinfo', JSON.parse(data));
		}
		else throw Error("Couldn't fetch runesReforged.json from ddragon.")
	});

	request('https://ddragon.leagueoflegends.com/cdn/'+ver+'/data/en_US/champion.json', function(error, response, data) {
		if(!error && response && response.statusCode == 200){
			freezer.get().set('championsinfo', JSON.parse(data).data);
			freezer.emit("championsinfo:set");
		}
		else throw Error("Couldn't fetch champions.json from ddragon.")
	});
	request('https://ddragon.leagueoflegends.com/cdn/'+ver+'/data/en_US/item.json',
    function (error, response, data) {
      if (!error && response && response.statusCode == 200) {
        freezer.get().set("itemsinfo", JSON.parse(data).data);
        freezer.emit("itemsinfo:set");
      } else throw Error("Couldn't fetch item.json from ddragon.");
    }
  );
});

freezer.on('api:connected', () => {
	api.get("/lol-summoner/v1/current-summoner").then((res) => {
		updateConnectionData();
		if(!res) {
			console.log("no session response");
			return;
		}
		console.log("session success", res);
		freezer.get().session.set({ connected: res.connected, state: res.state });
	});
});

var plugins = require('../plugins');
console.log("plugins", plugins);
function loadPlugins() {
	var remote = {}, local = {};
	Object.keys(plugins).forEach((key) => {
		if(plugins[key].local === true) local[key] = {name: plugins[key].name};
		else remote[key] = {
			name: plugins[key].name,
			bookmarks: plugins[key].bookmarks || false,
			cache: {}
		};
	});
	freezer.get().plugins.set({ local, remote });
}
loadPlugins();

freezer.on('champion:choose', (champion) => {
	var state = freezer.get();
	var plugin = state.tab.active;

	// Check if champion is already been cached before asking the remote plugin
	if(state.plugins.remote[plugin] && state.plugins.remote[plugin].cache[champion]) {
		freezer.get().current.set({ champion, champ_data: state.plugins.remote[plugin].cache[champion] || {pages: {}} });
		console.log("CACHE HIT!");
		return;
	}

	freezer.get().tab.set({ active: freezer.get().tab.active, loaded: false });
	freezer.get().current.set({ champion }); // update champ portrait before the data response

	state = freezer.get();

	getPagesWrapper(plugins[state.tab.active], champion, (res) => {
		// Cache results obtained from a remote source
		if(freezer.get().plugins.remote[plugin])
			freezer.get().plugins.remote[plugin].cache.set(champion, res);

		if(freezer.get().tab.active != state.tab.active) return;
		freezer.get().current.set({ champion, champ_data: res || {pages: {}} });
		freezer.get().tab.set({ loaded: true });
	});
});

freezer.on("tab:switch", (tab) => {
	freezer.get().tab.set({ active: tab, loaded: true });
	settings.set("lasttab", tab);

	var state = freezer.get();
	var plugin = state.tab.active;
	var champion = state.current.champion;

	// Check if champion is already been cached before asking the remote plugin
	if(state.plugins.remote[plugin] && state.plugins.remote[plugin].cache[champion]) {
		freezer.get().current.set({ champ_data: state.plugins.remote[plugin].cache[champion] || {pages: {}} });
		console.log("CACHE HIT!");
		return;
	}

	freezer.get().tab.set({ active: tab, loaded: tab == "local" || !freezer.get().current.champion });

	state = freezer.get();

	if(!state.current.champion) return;
	getPagesWrapper(plugins[state.tab.active], state.current.champion, (res) => {
		// Cache results obtained from a remote source
		if(freezer.get().plugins.remote[plugin])
			freezer.get().plugins.remote[plugin].cache.set(champion, res);
		
		if(freezer.get().tab.active != state.tab.active) return;
		freezer.get().current.set({ champ_data: res || {pages: {}} });
		freezer.get().tab.set({ loaded: true });
	});
});

freezer.on('page:fav', (champion, pagename) => {
	var state = freezer.get();
	plugins[state.tab.active].favPage(champion, pagename);
	getPagesWrapper(plugins[state.tab.active], champion, (res) => {
		state.current.champ_data.set(res);	
	});
});

freezer.on('page:delete', (champion, pagename) => {
	var state = freezer.get();
	plugins[state.tab.active].deletePage(champion, pagename);
	getPagesWrapper(plugins[state.tab.active], champion, (res) => {
		state.current.champ_data.set(res);	
	});
});

freezer.on('page:unlinkbookmark', (champion, pagename) => {
	if(freezer.get().lastbookmarkedpage.champion == champion && freezer.get().lastbookmarkedpage.page == pagename)
		freezer.get().lastbookmarkedpage.set({page: null, champion: null});
	var state = freezer.get();
	plugins[state.tab.active].unlinkBookmark(champion, pagename);
	getPagesWrapper(plugins[state.tab.active], champion, (res) => {
		state.current.champ_data.set(res);	
	});
});

freezer.on('page:bookmark', (champion, pagename) => {
	var state = freezer.get();

	page = state.current.champ_data.pages[pagename];
	console.log(page)

	plugins["local"].setPage(champion, page);
	freezer.get().lastbookmarkedpage.set({ champion, page: pagename });
	freezer.get().lastsyncedpage.set({ champion: null, page: null, loading: false });
});

freezer.on('page:syncbookmark', (champion, pagename) => {
	freezer.get().lastsyncedpage.set({champion, page: pagename, loading: true});

	var state = freezer.get();

	page = state.current.champ_data.pages[pagename];
	console.log(page)

	plugins[page.bookmark.remote.id].syncBookmark(page.bookmark, (_page) => {
		if(!_page) {
			freezer.get().lastsyncedpage.set({champion: null, page: null, loading: false});
			return;
		}
		plugins[state.tab.active].setPage(champion, _page);
		getPagesWrapper(plugins[state.tab.active], champion, (res) => {
			state.current.champ_data.set(res);
			freezer.get().lastsyncedpage.set({champion, page: _page.name, loading: false});
		});
	});
});

freezer.on('page:upload', (champion, pagename) => {
	var state = freezer.get();
	console.log("Upload:", pagename);
	console.log("State pages", state.current.champ_data.pages);
    var page = state.current.champ_data.pages[pagename].prepareRunePage;
    console.log('upload2', page);

	console.log("page.id, page.isEditable", state.connection.page.id, state.connection.page.isEditable);
	if(state.connection.page.id && state.connection.page.isEditable && state.connection.summonerLevel >= 10) {
		freezer.off('/lol-perks/v1/currentpage:Update');
		freezer.get().lastuploadedpage.set({ champion, page: pagename, loading: true });
		api.del("/lol-perks/v1/pages/" + freezer.get().connection.page.id).then((res) => {
			console.log("api delete current page", res);
			api.post("/lol-perks/v1/pages/", page).then((res) => {
				if(!res) {
					console.log("Error: no response after page upload request.");
					api.get("/lol-perks/v1/currentpage").then((res) => {
						handleCurrentPageUpdate(res);
						freezer.on('/lol-perks/v1/currentpage:Update', handleCurrentPageUpdate);
					});
					return;
				}
				console.log("post res", res);
				api.get("/lol-perks/v1/currentpage").then((res) => {
					handleCurrentPageUpdate(res);
					freezer.on('/lol-perks/v1/currentpage:Update', handleCurrentPageUpdate);
				});
				freezer.on('/lol-perks/v1/currentpage:Update', handleCurrentPageUpdate);
				freezer.get().lastuploadedpage.set({ champion, page: pagename, valid: res.isValid === true, loading: false });
				
				var state = freezer.get();
				if(plugins[state.tab.active].local) {
					plugins[state.tab.active].confirmPageValidity(champion, pagename, res);
					getPagesWrapper(plugins[state.tab.active], champion, (res) => {
						state.current.champ_data.set(res);
					});
				}
			});
		});
	}
});
//upload items to client
freezer.on("items:upload", (champ, role, map,itemset) => {
  console.log(itemset);
  forgeItemSet(champ, role, map, itemset.raw_data);
});
freezer.on('currentpage:download', () => {
	var state = freezer.get();

	var champion = state.current.champion;
	var page = state.connection.page;

	plugins[state.tab.active].setPage(champion, page);
	getPagesWrapper(plugins[state.tab.active], champion, (res) => {
		state.current.champ_data.set(res);	
	});
});

freezer.on('/lol-summoner/v1/current-summoner:Update', (summoner) => {
	var state = freezer.get();

	state.session.set({ connected: true, state: null });
	if(!summoner.summonerLevel) {
		freezer.get().connection.set({ page: null, summonerLevel: 0 });
	}
	else {
		updateConnectionData();
	}
})

function handleCurrentPageUpdate(page) {
	var state = freezer.get();

	console.log("currentpage:Update", page.name);
	state.connection.set({ page });
	if(page.name != freezer.get().lastuploadedpage.page) freezer.get().lastuploadedpage.set({ champion: null, page: null, valid: false });
}

function updateConnectionData() {
	api.get("/lol-perks/v1/currentpage").then((page) => {
		if(!page) {
			console.log("Error: current page initialization failed");
			return;
		}
		freezer.get().connection.set({ page });
		freezer.get().lastuploadedpage.set({ champion: null, page: null, valid: false });
	});

	api.get("/lol-summoner/v1/current-summoner").then((summoner) => {
		if(!summoner) {
			console.log("no summoner response");
			return;
		}
		freezer.get().connection.set("summonerLevel", summoner.summonerLevel);
	});

	api.get("/lol-perks/v1/perks").then((data) => {		
		if(!data) return;		
		freezer.get().tooltips.set("rune", data);		
	});
}

freezer.on('/lol-perks/v1/perks:Update', (data) => {
	if(!data) return;
	freezer.get().tooltips.set("rune", data);
});

freezer.on('/lol-perks/v1/currentpage:Update', handleCurrentPageUpdate);

freezer.on('/lol-champ-select/v1/session:Delete', () => {
	freezer.get().champselect.set({ active: false, gameMode: null, favUploaded: false });
});

freezer.on('/lol-champ-select/v1/session:Update', (data) => {
    console.log(data);
    if (freezer.get().champselect.gameMode === null) {
        api.get('/lol-gameflow/v1/session').then((gameflowData) => {
            freezer.get().champselect.set({ gameMode: gameflowData.gameData.queue.gameMode });
            console.log(freezer.get().champselect.gameMode);
        });
    }
    handleChampionUpdate(data);
});

freezer.on("autochamp:enable", () => {
	freezer.get().set("autochamp", true);
	settings.set("autochamp", true);

	// Check if a champ was already selected in client
	api.get("/lol-champ-select/v1/session").then((data) => {
		console.log(data)
		if(!data) return;
		handleChampionUpdate(data);
	});
});

function handleChampionUpdate(data) {
    var state = freezer.get();
	var player = data.myTeam.find((el) => data.localPlayerCellId === el.cellId);
	if (!player) return;

	state.champselect.set({ active: ((data.timer.phase !== 'FINALIZATION') ? true : false) });

	if (player.championId === 0) return;		// no champ selected = do nothing
	var champions = state.championsinfo;
    var champion = Object.keys(champions).find((el) => champions[el].key == player.championId);

	// Detect champion hover
	if (state.autochamp === true) {
		console.log(champion);
		// Switch to local and dont query remote plugin. Undesirable for remote-only users, but prevents request spam
		// if(champion !== state.current.champion) state.tab.set("active", "local"); 
		freezer.emit('champion:choose', champion);
    }
    
    // Favpage autoupload works only in Classic SR games.
    // In ARAM & Rotating game modes such automation is disruptive
    if (state.champselect.gameMode !== 'CLASSIC') return;
    api.get('/lol-champ-select/v1/current-champion').then((championId) => {
        console.log('champ locked:', championId);
        if (championId !== 0)
            handleFavPageUpload(championId); 
    });
}

function handleFavPageUpload(championId) {
    var state = freezer.get();
    console.log(state);
    var champions = state.championsinfo;
    var champion = Object.keys(champions).find((el) => champions[el].key == championId);
    
    // If favpage upload is enabled & not ARAM
    if (!state.configfile.favautoupload) return;
    // Quit if favorite page was already uploaded, 
    // or current champion doesn't match what is hovered ingame
    if (state.champselect.favUploaded || state.current.champion !== champion) return;
    // Is there a favpage for current champ?
    var favpage = state.current.champ_data.fav;
    if (!favpage) return;
    
    // All checks passed
    console.log("Uploading Fav page:", favpage);
    freezer.emit('page:upload', champion, favpage);
    state.champselect.set({ favUploaded: true });
}

freezer.on("autochamp:disable", () => {
	freezer.get().set("autochamp", false);
	settings.set("autochamp", false);
});

const LCUConnector = require('lcu-connector');
console.log("config leaguepath", freezer.get().configfile.leaguepath)
console.log("config pathdiscovery", freezer.get().configfile.pathdiscovery)
const connector = new LCUConnector(freezer.get().configfile.pathdiscovery ? undefined : freezer.get().configfile.leaguepath);
const api = require('./lcu-api');
const { platform } = require('os');

connector.on('connect', (data) => {
    console.log("client found");
    api.bind(data);
});

connector.on('disconnect', () => {
	console.log("client closed");
	api.destroy();
    freezer.get().champselect.set({ active: false, gameMode: null, favUploaded: false });
	freezer.get().connection.set({ page: null, summonerLevel: 0 });
	freezer.get().session.set({ connected: false, state: "" });
});

// Start listening for the LCU client
connector.start();

// #region Helper

/**
 * Wrapper for the "getPages" function of the plugins
 * @param {string} champion Id of the champion for which the pages should be determined.
 * @param callback callback which is called for the return of the data.
 * @returns all possible rune pages for a particular champion.
 */
function getPagesWrapper(plugin, champion, callback){
	// Determine rune pages from the plugin for the champ
	plugin.getPages(champion, (res) => {
		// Go through all rune pages
        Object.keys(res.pages).forEach(function(key) {
			// Add a new property that contains a rune page adapted for delivery to LoL
			res.pages[key].prepareRunePage = prepareRunePage(key, res.pages[key].selectedPerkIds);

			// Take over sorting from "prepareRunePage" (if not sorted correctly by plugin)
			res.pages[key].selectedPerkIds = res.pages[key].prepareRunePage.selectedPerkIds;
        });

		// Return
		callback(res);
	});
}

/**
 * Creates a rune page based on the rune id and the name as it has to be passed to LoL.
 * @param {string} pageName - Name of the rune page
 * @param {Array} runes - A list of runes ids
 * @return {Array} A rune page as expected by LoL.
 */
 function prepareRunePage(pageName, runes) {
    // Minimal rune page as LoL expects it as a handover
    let runePageMeta = {
        name: pageName,
        current: true,
        primaryStyleId: -1,
        selectedPerkIds: [],
        subStyleId: -1,
    }

    // Index map for later sorting
    const indexes = new Map();

    // Sorting function that sorts the runes based on the index in the tree
    const sortingFunc = (a, b) => indexes.get(a) - indexes.get(b);

    // Creates a tree of style id and the matching runes
    const tree = freezer.get().runesreforgedinfo.reduce((obj, curr) => {
        obj[curr.id] = [].concat(...curr.slots.map(row => row.runes.map(i => i.id)));
        return obj;
    }, {});

    // Creates a list of style ids based on the tree
    const styleIds = Object.keys(tree).map(Number);

    // Filters style ids from the runes
    const filteredRunes = runes.filter(rune => !styleIds.includes(rune));

    // Groups the passed runes fit to the respective style id
    const groupedRunes = groupBy(filteredRunes, (rune) => {
        for (const style of styleIds) {
            const runeIndex = tree[style].indexOf(rune);
            if (runeIndex !== -1) {
                indexes.set(rune, runeIndex);
                return style;
            }
        }
    });

    // Variables for determining the 'primaryStyleId' and 'secondaryStyleId
    let primaryStyleLength = -1;
    let primaryStyleId = -1;
    let secondaryStyleLength = -1;
    let secondaryStyleId = -1;

    // Get 'primaryStyleId' and 'secondaryStyleId' based on the number of runes
    for (const styleId in groupedRunes) {
        if (styleId !== 'undefined') {
            if (groupedRunes[styleId].length > primaryStyleLength) {
                secondaryStyleId = primaryStyleId;
                primaryStyleId = styleId;
                primaryStyleLength = groupedRunes[styleId].length;
            } else if (groupedRunes[styleId].length >= secondaryStyleLength) {
                secondaryStyleId = styleId;
                secondaryStyleLength = groupedRunes[styleId].length;
            }
        }
    }

    // Sorts the groups for the respective style
    groupedRunes[primaryStyleId].sort(sortingFunc);
    groupedRunes[secondaryStyleId].sort(sortingFunc);

    // Merges primary and secondary runes in the correct order
    runePageMeta.selectedPerkIds = groupedRunes[primaryStyleId].concat(groupedRunes[secondaryStyleId], groupedRunes['undefined'] ?? []);

    // Set StyleIds
    runePageMeta.primaryStyleId = parseInt(primaryStyleId);
    runePageMeta.subStyleId = parseInt(secondaryStyleId);

    // Return rune page
    return runePageMeta;
}

function forgeItemSet(champ, role, map,itemset) {
  // https://static.developer.riotgames.com/docs/lol/maps.json
  const mapNameIds ={
	  aram: 12,
	  normal:11
  }
  if(platform == "linux"){
	path = freezer.get().configfile.leaguepath.replace("LeagueClient.exe", "") + `Config/Champions/${champ}/Recommended/`;
  }
  else{
	path = freezer.get().configfile.leaguepath.replace("LeagueClient.exe", "") + `Config\\Champions\\${champ}\\Recommended\\`;
  }
  const file = `${champ}_${role}.json`;
  data = {
    title: `${champ}_${role}`,
    type: "custom",
    map: "any",
    mode: "any",
    associatedMaps: [mapNameIds[map]],
    associatedChampions: [parseInt(freezer.get().championsinfo[champ].key, 10)], //Champ ID
    map: "any",
    mode: "any",
    preferredItemSlots: [],
    sortrank: 1,
    startedFrom: "blank",
    blocks: [],
  };
  Object.keys(itemset).forEach((category) => {
    data.blocks.push(createItemBlock(itemset[category], category));
  });
  console.log(JSON.stringify(data));
  fs.writeFile(path + file, JSON.stringify(data), "UTF8", (err) => {
    // Directory didn't exists so it must be created
    fs.mkdir(path, { recursive: true }, () => {
      fs.writeFile(path + file, JSON.stringify(data), "UTF8", (err) => {
        // couldn't write file missing permissions?
        if (err) console.log("Something is spocky about your pc");
      });
    });
  });
}
// Creates a block object for the json file
function createItemBlock(items, category) {
  return {
    type: category.replace('_', ' '),
    items: items.build.map((item) => {
      return {
        id: `${item}`,
        count: 1,
      };
    }),
  };
}
// #endregion
