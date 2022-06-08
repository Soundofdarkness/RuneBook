const rp = require('request-promise-native');
const { removePerkIds } = require('./utils');

// #region Settings
// No longer supported
const supported_modes = [
    {
        role: ["MID","SUPPORT","ADC","JUNGLE","TOP"],
        queue: "RANKED_SOLO_5X5",

    },
    {
        role: null,
        queue: 'HOWLING_ABYSS_ARAM',
    }
];
const friendly_names = {
    "HOWLING_ABYSS_ARAM": "ARAM",
    "RANKED_SOLO_5X5": "Ranked",
}
baseUrl = 'https://league-champion-aggregate.iesdev.com/graphql?query=query ChampionBuilds($championId:Int!,$queue:Queue!,$role:Role,$opponentChampionId:Int,$key:ChampionBuildKey){championBuildStats(championId:$championId,queue:$queue,role:$role,opponentChampionId:$opponentChampionId,key:$key){championId opponentChampionId queue role builds{completedItems{games index averageIndex itemId wins}games mythicId mythicAverageIndex primaryRune runes{games index runeId wins treeId}skillOrders{games skillOrder wins}startingItems{games startingItemIds wins}summonerSpells{games summonerSpellIds wins}wins}}}&variables='

// #endregion

/**
 * Get the Champions-JSON from the BLITZ.GG-API.
 * 
 * @param {number} championId Id of the champion for which the data should be determined.
 * @param {string} queue The queue aka mode pages should be determined.
 * @param {string} roleThe position for which the rune pages should be determined.
 * @returns The full Champions-JSON for the champion in the specified game mode.
 */
async function getChampionsJsonAsync(championId, queue, role) {
    // Create URL based on the parameters
    if (role == null){
        var requestUri = baseUrl + `{"championId":${championId},"queue":"${queue}","opponentChampionId":null,"key":"PUBLIC"}`
    }
    else{
        var requestUri = baseUrl + `{"championId":${championId},"role":"${role}","queue":"${queue}","opponentChampionId":null,"key":"PUBLIC"}`

    }

    // Query URL and get the result
    var result = await rp({
        uri: requestUri,
        json: true
    })
        .then(function (response) {
            if (response["errors"] != undefined)
                throw response["errors"][0]["message"]
            // precheck if data is present (currently blitz.gg sends an empty array if no data is present)
            if (response["data"] != null)
                return response["data"]["championBuildStats"]["builds"][0];
        })
        .catch(function (err) {
            if (err.statusCode === 400 || err.statusCode === 403 || err.statusCode === 404 || err.statusCode === 500)
                console.log("JSON was not found => " + err);
            else if (err.statusCode === 418) {
                // If the altenative server has not been tried yet, do it. Otherwise only output error
                if (useAltApi === false)
                    result = getChampionsJsonAsync(championId, gameMode, position, true);
                else
                    console.log("API-Error => " + err);
            } else
                throw Error("Error when determining json => " + err);
        });
    // is there a result? => return result
    if (result)
        return result
}

/**
 * Returns a rune page based on the JSON and with the given data.
 * 
 * @param {string} runesJson Blitz.GG JSON that is being processed.
 * @param {string} champion Name of the champion for which the page should be determined.
 * @param {string} queue The queue for which the rune page should be determined.
 * @param {string} role The role for which the page should be determined.
 * @returns A rune page matches the given parameters.
 */
function getPage(runesJson, champInfo, queue, role) {
    try {
        // Break Json down to the perks data and stat shards
        const perksData = runesJson["runes"];
        // console.log(perksData);

        const runes = [];
        // Select highest winrate out of all options (unfortunately sofar I think I have to ignore how many matches are played, since that would need better evaluation)
        for(let i = 0; i < 8; i++){
            // Grab candidates for each slot and calculate their winrate
            const candidates = perksData.filter(x => x.index === i).map(x => {
                const wr = x.wins / x.games;
                x.winrate = wr;
                return x;
            });
            // Select the highest winrate
            const highestWr = candidates.reduce((prev, curr) => (prev.winrate > curr.winrate) ? prev : curr);
            // Return only the ID
            runes.push(highestWr.runeId);
        }

        //const statShards = runesJson["championBuildStats"]["most_common_rune_stat_shards"]["build"];
        
        // Add the primary rune 
        runes.push(runesJson["primaryRune"]);
         //console.log(runesJson["primaryRune"]);
        // Determine selected perk ids
        const selectedPerkIds = removePerkIds(runes);//.concat(statShards);
        // console.log(selectedPerkIds);
        // Determine if a role exists (for display purposes, otherwise ARAM would show "null" as role.)
        let roleString = role ? role : "";

        // And capitalize it for consistency (should not care in case its an empty string)
        roleString = roleString.charAt(0).toUpperCase() + roleString.slice(1).toLowerCase();

        // Return rune page
        return {
            name: `[${friendly_names[queue]}] ${champInfo.name} ${roleString}`.trim(),
            selectedPerkIds: selectedPerkIds,
            bookmark: {
                champId: champInfo.id,
                position: role? role: "ARAM",
                remote: {
                    name: plugin.name,
                    id: plugin.id
                }
            },
            itemSet: {
                start_items: {"build" :runesJson["startingItems"][0]["startingItemIds"]},
                core_items:  {"build" :runesJson["completedItems"].sort((a, b) => (a.index < b.index ? 1 : -1)).map(itemInfo => itemInfo.itemId)},
                big_items:  {"build" :[runesJson["mythicId"]]},
            },
        };
    } catch (e) {
        throw Error(e);
    }
}
/**
 * Determines all possible rune pages for a given champion for the specified game mode.
 * 
 * @param {string} champion Name of the champion for which the pages should be determined.
 * @param {string} queue The name of the queue for which the pages should be determined.
 * @param {string} role The name of the role for which the pages should be determined.
 * @returns all possible rune pages for a particular champion for the specified game mode.
 */
async function getPagesForGameModeAsync(champInfo, queue, role) {
    // Return variable (List of rune pages)
    var returnVal = {};
    try {
        // get json for the given champ and game mode
        var result = await getChampionsJsonAsync(champInfo.key, queue, role);

        // if a result was found, parse it and add it to the return
        if (result) {
            // Determine possible page
            returnVal= getPage(result, champInfo, queue, role);
        }
    } catch (e) {
        throw Error(e);
    }
    // Return list of the rune page
    return returnVal;
}

/**
 * Determines all possible rune pages for a particular champion for all supported game modes.
 * 
 * @param {string} champion Id of the champion for which the pages should be determined.
 * @param callback callback which is called for the return of the data.
 * @returns all possible rune pages for a particular champion for all supported game modes.
 */
async function _getPagesAsync(champion, callback) {
    const runePages = {
        pages: {}
    };

    // Determine champion information based on the name
    const champInfo = freezer.get().championsinfo[champion];

    try {
        const runePages = {
            pages: {}
        };
        // Iterate through supported_modes
        for (const gameMode of supported_modes){
            if (gameMode.role == null){
                page = await getPagesForGameModeAsync(champInfo, gameMode.queue,null)
                runePages.pages[page.name] = page
            }else{
                for (const role of gameMode.role){
                    page = await getPagesForGameModeAsync(champInfo, gameMode.queue, role)
                    runePages.pages[page.name] = page
                }
            }
        }
        // sort rune pages based on the key (name)
        const ordered = {};
        Object.keys(runePages.pages).sort().forEach(function (key) {
            ordered[key] = runePages.pages[key];
        });
        runePages.pages = ordered;
        // return rune pages
        callback(runePages);
    } catch (e) {
        // In case of error, return all rune pages determined up to this point
        callback(runePages);
        throw Error(e);
    }
}



/**
 * It averages a special rune page based on the given parameters to update the bookmark.
 * 
 * @param {string} champId Id of the champion for which the rune page should be determined.
 * @param {number} position Position for which the rune page should be determined.
 * @param {string} gameModeKey Key of the game mode for which the rune page should be determined.
 * @param callback callback which is called for the return of the data.
 */
async function _syncBookmarkAsync(champId, position, gameModeKey, callback) {
    try {
        // Determine champion information based on the name
        const champInfo = freezer.get().championsinfo[champId];

        // Determine game mode on the basis of the key
        const gameMode = supported_modes.filter(i => i.key == gameModeKey)[0];

        // determine all pages for the selected game mode and position
        const pages = await getPagesForGameModeAsync(champInfo, gameMode, position);

        // return rune page
        callback(pages[0]);
    } catch (e) {
        // If there is an error still callback so the UI does not hang
        callback();
        throw Error(e);
    }
}

// #region Plugin-Funktionen
var plugin = {
    id: "blitzgg",
    name: "BLITZ.GG",
    active: true,
    bookmarks: true,

    getPages(champion, callback) {
        // Find all rune pages
        _getPagesAsync(champion, callback);
    },
    syncBookmark(bookmark, callback) {
        // Find and update a rune page based on the bookmark
        _syncBookmarkAsync(bookmark.champId, bookmark.position, bookmark.gameModeKey, callback);
    }
};

module.exports = {
    plugin
};
// #endregion