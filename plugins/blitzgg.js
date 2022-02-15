const rp = require('request-promise-native');
const { removePerkIds } = require('./utils');

// #region Settings
const supported_modes = [{
        key: 420,
        name: "Ranked",
        tier: 'PLATINUM_PLUS'
    },
    {
        key: 450,
        name: 'ARAM',
        tier: '',
    }
];

const baseApiUrl = 'https://league-champion-aggregate.iesdev.com';
const baseApiUrlAlt = 'https://backend-alt.iesdev.com';
const usedRegion = 'world';
// #endregion

/**
 * Get the Champions-JSON from the BLITZ.GG-API.
 * 
 * @param {number} championId Id of the champion for which the data should be determined.
 * @param {string} gameMode The game mode for which the rune pages should be determined.
 * @param {string} position The position for which the rune pages should be determined.
 * @param {string} useAltApi Specifies whether to try the alternate server.
 * @returns The full Champions-JSON for the champion in the specified game mode.
 */
async function getChampionsJsonAsync(championId, gameMode, position = null, useAltApi = false) {
    // Try the last two LOL versions (this is necessary because Blitz.GG is currently updating with a delay on Patch-Day)
    for (const lolVersion of freezer.get().lolversions.slice(0, 2)) {
        // Convert LOL version into a format suitable for BLITZ.GG
        const blitzggLoLVersion = lolVersion.split('.').splice(0, 2).join('.');

        // Determine server URL
        var usedServerUrl = useAltApi ? baseApiUrlAlt : baseApiUrl;

        // Create URL based on the parameters
        var requestUri = `${usedServerUrl}/api/champions/${championId}?patch=${blitzggLoLVersion}&queue=${gameMode.key}&region=${usedRegion}`;

        // add additional parameters
        if (position)
            requestUri += `&role=${position}`;
        if (gameMode.tier)
            requestUri += `&tier=${gameMode.tier}`;

        // Query URL and get the result
        var result = await rp({
                uri: requestUri,
                json: true
            })
            .then(function(response) {
                // precheck if data is present (currently blitz.gg sends an empty array if no data is present)
                if(response["data"] && response["data"].length > 0)
                    return response;
            })
            .catch(function(err) {
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

    // fallback
    return null;
}

/**
 * Returns a rune page based on the JSON and with the given data.
 * 
 * @param {string} runesJson Blitz.GG JSON that is being processed.
 * @param {string} champion Name of the champion for which the page should be determined.
 * @param {string} gameMode The game mode for which the rune page should be determined.
 * @returns A rune page matches the given parameters.
 */
function getPage(runesJson, champInfo, gameMode) {
    try {
        // Break Json down to the perks data and stat shards
        const perksData = runesJson["stats"]["most_common_runes"]["build"];
        const statShards = runesJson["stats"]["most_common_rune_stat_shards"]["build"];

        // Determine selected perk ids
        const selectedPerkIds = removePerkIds(perksData).concat(statShards);
        //gets an array for with items name for every category
        const start_items = getItemArray(runesJson, "most_common_starting_items");
        const core_items = getItemArray(runesJson, "most_common_core_builds");
        const big_items = getItemArray(runesJson, "most_common_big_item_builds");
        // Return rune page
        return {
            name: `[${gameMode.name}] ${champInfo.name} ${runesJson.role}`.trim(),
            selectedPerkIds: selectedPerkIds,
            bookmark: {
                champId: champInfo.id,
                gameModeKey: gameMode.key,
                position: runesJson.role,
                remote: {
                    name: plugin.name,
                    id: plugin.id
                }
            },
            itemSet: {
                start_items: start_items,
                core_items: core_items,
                big_items: big_items,
                raw_data: {
                start_items: runesJson["stats"]["most_common_starting_items"],
                core_items: runesJson["stats"]["most_common_core_builds"],
                big_items: runesJson["stats"]["most_common_big_item_builds"],
                },
            },
        };
    } catch (e) {
        throw Error(e);
    }
}
/**
 * A helper methode to get the name of an item per id
 * @param {object} runesJson The object that contains the page and item set info
 * @param {string} key The key to get from the object
 * @returns An array of item names or an empty array if the key wasn't found
 */
function getItemArray(runesJson, key) {
  const itemsmap = freezer.get().itemsinfo;
  if (runesJson["stats"][key].build != null) {
    return runesJson["stats"][key].build.map((item) => {
      try {
        return itemsmap[item].name;
      } catch (error) {
        return "Unknown Item";
      }
    });
  } else return [];
}
/**
 * Determines all possible rune pages for a given champion for the specified game mode.
 * 
 * @param {string} champion Name of the champion for which the pages should be determined.
 * @param {string} gameMode The game mode for which the rune pages should be determined.
 * @param {number} force_position Returns the position to which the data is to be returned. In case of NULL all are returned.
 * @returns all possible rune pages for a particular champion for the specified game mode.
 */
async function getPagesForGameModeAsync(champInfo, gameMode, force_position = null) {
    // Return variable (List of rune pages)
    var returnVal = [];

    try {
        // get json for the given champ and game mode
        var result = await getChampionsJsonAsync(champInfo.key, gameMode, force_position);

        // if a result was found, parse it and add it to the return
        if (result) {
            // Determine all possible pages
            for (const champInfoJson of result["data"]) {
                returnVal.push(getPage(champInfoJson, champInfo, gameMode));
            }
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
        // go through all supported game modes
        for (const gameMode of supported_modes) {
            // determine rune pages for the respective game mode and add them to the return
            for (const runePage of await getPagesForGameModeAsync(champInfo, gameMode)) {
                runePages.pages[runePage.name] = runePage;
            }
        }

        // sort rune pages based on the key (name)
        const ordered = {};
        Object.keys(runePages.pages).sort().forEach(function(key) {
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
        // go through all supported game modes
        for (const gameMode of supported_modes) {
            // determine rune pages for the respective game mode and add them to the return
            for (const runePage of await getPagesForGameModeAsync(champInfo, gameMode)) {
                runePages.pages[runePage.name] = runePage;
            }
        }

        // sort rune pages based on the key (name)
        const ordered = {};
        Object.keys(runePages.pages).sort().forEach(function(key) {
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