var settings = require('./settings');
var freezer = require('./state');

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
	lang: settings.get("lang")
});

freezer.get().set("autochamp", settings.get("autochamp"));
freezer.get().tab.set({ active: settings.get("lasttab"), loaded: true });

var {ipcRenderer} = require('electron');
ipcRenderer.on('update:ready', (event, arg) => {
	console.log("github new latest found")
	freezer.get().set("updateready", true);
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

freezer.on("lang:update", (val) => {
	freezer.get().configfile.set("lang", val);
	settings.set("lang", val);
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

(async () => {
	let response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
	if(response.ok) {
		let ver = await response.json();
		freezer.get().set('lolversions', ver);
		freezer.emit("version:set", ver[0]);
	}
	else throw Error("Couldn't get ddragon api version");
})();

freezer.on('version:set', async (ver) => {
	let response = await fetch('https://ddragon.leagueoflegends.com/cdn/'+ver+'/data/en_US/champion.json');
	if(response.ok){
		let jsonData = await response.json();
		freezer.get().set('championsinfo', jsonData.data);
		freezer.emit("championsinfo:set");
	}else throw Error("Couldn't fetch champions.json from ddragon.");
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

	plugins[state.tab.active].getPages(champion, (res) => {
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
	var champion = freezer.get().current.champion;

	// Check if champion is already been cached before asking the remote plugin
	if(state.plugins.remote[plugin] && state.plugins.remote[plugin].cache[champion]) {
		freezer.get().current.set({ champion, champ_data: state.plugins.remote[plugin].cache[champion] || {pages: {}} });
		console.log("CACHE HIT!");
		return;
	}

	freezer.get().tab.set({ active: tab, loaded: tab == "local" || !freezer.get().current.champion });

	state = freezer.get();

	if(!state.current.champion) return;
	plugins[state.tab.active].getPages(state.current.champion, (res) => {
		// Cache results obtained from a remote source
		if(freezer.get().plugins.remote[plugin])
			freezer.get().plugins.remote[plugin].cache.set(champion, res);
		
		if(freezer.get().tab.active != state.tab.active) return;
		freezer.get().current.set({ champion: freezer.get().current.champion, champ_data: res || {pages: {}} });
		freezer.get().tab.set({ loaded: true });
	});
});

freezer.on('page:fav', (champion, page) => {
	var state = freezer.get();
	plugins[state.tab.active].favPage(champion, page);
	plugins[state.tab.active].getPages(champion, (res) => {
		state.current.champ_data.set(res);	
	});
});

freezer.on('page:delete', (champion, page) => {
	var state = freezer.get();
	plugins[state.tab.active].deletePage(champion, page);
	plugins[state.tab.active].getPages(champion, (res) => {
		state.current.champ_data.set(res);	
	});
});

freezer.on('page:unlinkbookmark', (champion, page) => {
	if(freezer.get().lastbookmarkedpage.champion == champion && freezer.get().lastbookmarkedpage.page == page)
		freezer.get().lastbookmarkedpage.set({page: null, champion: null});
	var state = freezer.get();
	plugins[state.tab.active].unlinkBookmark(champion, page);
	plugins[state.tab.active].getPages(champion, (res) => {
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

freezer.on('page:syncbookmark', (champion, page) => {
	freezer.get().lastsyncedpage.set({champion, page, loading: true});

	var state = freezer.get();

	page = state.current.champ_data.pages[page];
	console.log(page)

	plugins[page.bookmark.remote.id].syncBookmark(page.bookmark, (_page) => {
		if(!_page) {
			freezer.get().lastsyncedpage.set({champion: null, page: null, loading: false});
			return;
		}
		plugins[state.tab.active].setPage(champion, _page);
		plugins[state.tab.active].getPages(champion, (res) => {
			state.current.champ_data.set(res);
			freezer.get().lastsyncedpage.set({champion, page: _page.name, loading: false});
		});
	});
});

freezer.on('page:upload', (champion, page) => {
	var state = freezer.get();
	console.log("DEV page", page);
	console.log("DEV page data", state.current.champ_data.pages[page]);
	console.log("DEV state pages", state.current.champ_data.pages);
	page_data = state.current.champ_data.pages[page];
	page_data.name = page;
	page_data.current = true;

	console.log("page.id, page.isEditable", state.connection.page.id, state.connection.page.isEditable);
	if(state.connection.page.id && state.connection.page.isEditable && state.connection.summonerLevel >= 10) {
		freezer.off('/lol-perks/v1/currentpage:Update');
		freezer.get().lastuploadedpage.set({ champion, page, loading: true });
		api.del("/lol-perks/v1/pages/" + freezer.get().connection.page.id).then((res) => {
			console.log("api delete current page", res);

			// stat shards check
			page_data = freezer.get().current.champ_data.pages[page].toJS();
			if(!page_data.selectedPerkIds[6] && !page_data.selectedPerkIds[7] && !page_data.selectedPerkIds[8]) {
				page_data.selectedPerkIds = page_data.selectedPerkIds.concat([5008, 5002, 5003]);
			}

			api.post("/lol-perks/v1/pages/", page_data).then((res) => {
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
				freezer.get().lastuploadedpage.set({ champion, page, valid: res.isValid === true, loading: false });
				
				var state = freezer.get();
				if(plugins[state.tab.active].local) {
					plugins[state.tab.active].confirmPageValidity(champion, page, res);
					plugins[state.tab.active].getPages(champion, (res) => {
						state.current.champ_data.set(res);
					});
				}
			});
		});
	}
});

freezer.on('currentpage:download', () => {
	var state = freezer.get();

	var champion = state.current.champion;
	var page = state.connection.page;

	plugins[state.tab.active].setPage(champion, page);
	plugins[state.tab.active].getPages(champion, (res) => {
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
	freezer.get().set("champselect", false);
});

freezer.on('/lol-champ-select/v1/session:Update', (data) => {
	console.log(data);
	var action = data.myTeam.find((el) => data.localPlayerCellId === el.cellId);
	if(!action) return;
	if(data.timer.phase !== "FINALIZATION") freezer.get().set("champselect", true);
	else freezer.get().set("champselect", false);
	if(freezer.get().autochamp === false) return;
	if(action.championId === 0) return;
	var champions = freezer.get().championsinfo;
	var champion = Object.keys(champions).find((el) => champions[el].key == action.championId);
	console.log(champion);
	freezer.emit('champion:choose', champion);
});

freezer.on("autochamp:enable", () => {
	freezer.get().set("autochamp", true);
	settings.set("autochamp", true);

	// Check if a champ was already selected in client
	api.get("/lol-champ-select/v1/session").then((data) => {
		console.log(data)
		if(!data) return;
		var action = data.myTeam.find((el) => data.localPlayerCellId === el.cellId);
		if(!action) return;
		if(data.timer.phase !== "FINALIZATION") freezer.get().set("champselect", true);
		var champions = freezer.get().championsinfo;
		var champion = Object.keys(champions).find((el) => champions[el].key == action.championId);
		console.log(champion)
		// if(champion !== freezer.get().current.champion) freezer.get().tab.set("active", "local"); // Avoid request spamming
		freezer.emit('champion:choose', champion);
	});
});

freezer.on("autochamp:disable", () => {
	freezer.get().set("autochamp", false);
	settings.set("autochamp", false);
});

var shell = require('electron').shell;
//open links externally by default
$(document).on('click', 'a[href^="http"]', function(event) {
	event.preventDefault();
	shell.openExternal(this.href);
});

const LCUConnector = require('lcu-connector');
console.log("config leaguepath", freezer.get().configfile.leaguepath)
console.log("config pathdiscovery", freezer.get().configfile.pathdiscovery)
const connector = new LCUConnector(freezer.get().configfile.pathdiscovery ? undefined : freezer.get().configfile.leaguepath);
const api = require('./lcu-api');

connector.on('connect', (data) => {
    console.log("client found");
    api.bind(data);
});

connector.on('disconnect', () => {
	console.log("client closed");
	api.destroy();
	freezer.get().connection.set({ page: null, summonerLevel: 0 });
	freezer.get().session.set({ connected: false, state: "" });
	freezer.get().set("champselect", false);
});

// Start listening for the LCU client
connector.start();