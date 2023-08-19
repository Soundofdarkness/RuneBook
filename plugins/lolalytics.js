const rp = require('request-promise-native');
const { removePerkIds } = require('./utils');

// #region Settings
const supported_modes = [{
    key: 420,
    name: "Ranked",
    positions: ['top', 'jungle', 'middle', 'bottom', 'support']
},
{
    key: 450,
    name: 'ARAM',
    positions: ['middle']
}
];

const runesModeMap = {
    'win': 'HW',
    'pick': 'MP',
};

const baseApiUrl = `https://ax.lolalytics.com`;
const usedTier = 'platinum_plus';
const usedRegion = 'all';
// #endregion

/**
 * Get the Champions-JSON from the LoLalytics-API.
 * 
 * @param {number} championId Id of the champion for which the data should be determined.
 * @param {string} gameMode The game mode for which the rune pages should be determined.
 * @param {string} position The position for which the rune pages should be determined.
 * @returns The full Champions-JSON for the champion in the specified game mode.
 */
async function getChampionsJsonAsync(championId, gameMode, position) {
    // Try the last two LOL versions (this is necessary because LoLalytics is currently updating with a delay on Patch-Day)
    for (const lolVersion of freezer.get().lolversions.slice(0, 2)) {
        // Convert LOL version into a format suitable for LoLalytics
        const lolalyticsLoLVersion = lolVersion.split('.').splice(0, 2).join('.');

        // Create URL based on the parameters
        var requestUri = `${baseApiUrl}/mega/?ep=rune&p=d&v=1&patch=${lolalyticsLoLVersion}&cid=${championId}&lane=${position}&tier=${usedTier}&queue=${gameMode.key}&region=${usedRegion}`;

        // Query URL and get the result
        var result = await rp({
                uri: requestUri,
                json: true
            })
            .then(function(response) {
                return response;
            })
            .catch(function(err) {
                if (err.statusCode === 403)
                    console.log("JSON was not found => " + err);
                else
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
 * @param {string} runesJson LoLalytics JSON that is being processed.
 * @param {string} champion Name of the champion for which the page should be determined.
 * @param {string} gameMode The game mode for which the rune page should be determined.
 * @param {string} position The position for which the rune pages should be determined.
 * @param {string} runesMode Rune mode for which the rune page should be determined.
 * @returns A rune page matches the given parameters.
 */
function getPage(runesJson, champInfo, gameMode, position, runesMode) {
    try {
        // Break Json down to the perks data and stat shards
        const perksPriData = runesJson["set"]["pri"];
        const perksSecData = runesJson["set"]["sec"];
        const statShards = runesJson["set"]["mod"];
    
        // Merge all runes
        const perksData = [].concat(perksPriData, perksSecData);

        // Determine selected perk ids
        const selectedPerkIds = removePerkIds(perksData).concat(statShards);

        // Determine the name of the position
        let positionString = gameMode.positions.length <= 1 ? '' : position;
        if(positionString)
            positionString = positionString[0].toUpperCase() + positionString.slice(1);

        // Return rune page
        return {
            name: `[${gameMode.name}] ${champInfo.name} ${positionString} - ${runesModeMap[runesMode]}`.trim(),
            selectedPerkIds: selectedPerkIds,
            bookmark: {
                champId: champInfo.id,
                gameModeKey: gameMode.key,
                position: position,
                runesMode: runesMode,
                remote: {
                    name: plugin.name,
                    id: plugin.id
                }
            }
        };
    } catch (e) {
        throw Error(e);
    }
}

/**
 * Determines all possible rune pages for a given champion for the specified game mode.
 * 
 * @param {string} champion Name of the champion for which the pages should be determined.
 * @param {string} gameMode The game mode for which the rune pages should be determined.
 * @param {number} position Returns the position to which the data is to be returned.
 * @param {number} force_runesMode Rune mode for which the rune page should be determined.
 * @returns all possible rune pages for a particular champion for the specified game mode.
 */
async function getPagesForGameModeAsync(champInfo, gameMode, position, force_runesMode = null) {
    // Return variable (List of rune pages)
    var returnVal = [];

    try {
        // get json for the given champ and game mode
        var result = await getChampionsJsonAsync(champInfo.key, gameMode, position);

        // if a result was found, parse it and add it to the return
        if (result && result["summary"]) {
            // break down json to runes
            result = result["summary"]["runes"];

            // check if runes are present in the summary (occurs when Insufficient data is available)
            if(result){
                if(force_runesMode){
                    // Determine page for forced runes mode
                    returnVal.push(getPage(result[force_runesMode], champInfo, gameMode, position, force_runesMode));
                }else{
                    // Determine all possible pages
                    for (const runesMode in result) 
                        returnVal.push(getPage(result[runesMode], champInfo, gameMode, position, runesMode));
                }
                
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
            // go through all supported positions
            for (const position of gameMode.positions) {
                // determine rune pages for the respective game mode and add them to the return
                for (const runePage of await getPagesForGameModeAsync(champInfo, gameMode, position)) {
                    runePages.pages[runePage.name] = runePage;
                }
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
            // go through all supported positions
            for (const position of gameMode.positions) {
                // determine rune pages for the respective game mode and add them to the return
                for (const runePage of await getPagesForGameModeAsync(champInfo, gameMode, position)) {
                    runePages.pages[runePage.name] = runePage;
                }
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
 * @param {string} runesMode Rune mode for which the rune page should be determined.
 * @param callback callback which is called for the return of the data.
 */
async function _syncBookmarkAsync(champId, position, gameModeKey, runesMode, callback) {
    try {
        // Determine champion information based on the name
        const champInfo = freezer.get().championsinfo[champId];

        // Determine game mode on the basis of the key
        const gameMode = supported_modes.filter(i => i.key == gameModeKey)[0];

        // determine all pages for the selected game mode and position
        const pages = await getPagesForGameModeAsync(champInfo, gameMode, position, runesMode);

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
    id: "lolalytics",
    name: "LoLalytics",
    active: true,
    bookmarks: true,

    getPages(champion, callback) {
        // Find all rune pages
        _getPagesAsync(champion, callback);
    },
    syncBookmark(bookmark, callback) {
        // Find and update a rune page based on the bookmark
        _syncBookmarkAsync(bookmark.champId, bookmark.position, bookmark.gameModeKey, bookmark.runesMode, callback);
    }
};

module.exports = {
    plugin
};
// #endregion
