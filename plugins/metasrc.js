var cheerio = require('cheerio');

const baseUrl = "https://www.metasrc.com/";
const rankFilter = "?ranks=platinum,diamond,master,grandmaster,challenger";
const modesToIgnore = ['tft'];

var perksMap = {
    "electrocute": 8112,
    "predator": 8124,
    "darkharvest": 8128,
    "hailofblades": 9923,
    "cheapshot": 8126,
    "greenterror_tasteofblood": 8139,
    "suddenimpact": 8143,
    "zombieward": 8136,
    "ghostporo": 8120,
    "eyeballcollection": 8138,
    "ravenoushunter": 8135,
    "ingenioushunter": 8134,
    "relentlesshunter": 8105,
    "ultimatehunter": 8106,
    "glacialaugment": 8351,
    "unsealedspellbook": 8360,
    "masterkey": 8358,
    "hextechflashtraption": 8306,
    "magicalfootwear": 8304,
    "perfecttiming": 8313,
    "futuresmarket": 8321,
    "miniondematerializer": 8316,
    "biscuitdelivery": 8345,
    "cosmicinsight": 8347,
    "approachvelocity": 8410,
    "timewarptonic": 8352,
    "presstheattack": 8005,
    "lethaltempotemp": 8008,
    "fleetfootwork": 8021,
    "conqueror": 8010,
    "overheal": 9101,
    "triumph": 9111,
    "presenceofmind": 8009,
    "legendalacrity": 9104,
    "legendtenacity": 9105,
    "legendbloodline": 9103,
    "coupdegrace": 8014,
    "cutdown": 8017,
    "laststand": 8299,
    "graspoftheundying": 8437,
    "veteranaftershock": 8439,
    "guardian": 8465,
    "demolish": 8446,
    "fontoflife": 8463,
    "mirrorshell": 8401,
    "conditioning": 8429,
    "secondwind": 8444,
    "boneplating": 8473,
    "overgrowth": 8451,
    "revitalize": 8453,
    "unflinching": 8242,
    "summonaery": 8214,
    "arcanecomet": 8229,
    "phaserush": 8230,
    "pokeshield": 8224,
    "manaflowband": 8226,
    "6361": 8275,
    "transcendence": 8210,
    "celeritytemp": 8234,
    "absolutefocus": 8233,
    "scorch": 8237,
    "waterwalking": 8232,
    "gatheringstorm": 8236,

    "statmodshealthscalingicon": 5001,
    "statmodsarmoricon": 5002,
    "statmodsmagicresicon": 5003,
    "statmodsattackspeedicon": 5005,
    "statmodscdrscalingicon": 5007,
    "statmodsadaptiveforceicon": 5008
};

async function getPage(requestUri, champInfo) {
    var page = {
        "name": name,
        "primaryStyleId": -1,
        "selectedPerkIds": [0, 0, 0, 0, 0, 0, 0, 0, 0],
        "subStyleId": -1,
        "bookmark": {
            "src": requestUri,
            "remote": {
                "name": plugin.name,
                "id": plugin.id
            }
        }
    };

    try {
        var modeUrlBase = baseUrl + requestUri + rankFilter;
        modeUrlBase = modeUrlBase.replace(/([^:]\/)\/+/g, "$1");
        var urlParts = requestUri.split('/');

        if (!champInfo) {
            champInfo = freezer.get().championsinfo;
            champInfo = champInfo[Object.keys(champInfo).find(k => k.toLowerCase() === urlParts[3].toLowerCase())];
        }

        if (urlParts[3].search(new RegExp(champInfo.id, "i")) == -1) {
            return;
        }

        page.name = "[" + urlParts[1].toUpperCase() + "] " + champInfo.name;
        if (urlParts.length > 4){
            var lane = urlParts[4];
            page.name += ` ${lane[0].toUpperCase()}${lane.slice(1)}`;
        }

        var response = await getResponseFromUrl(modeUrlBase, "Error when determining the rune page");
        if(response.ok){
            var body = await response.text();
            var $ = cheerio.load(body);

            var ids = $('svg > image[data-xlink-href]').map((i, x) => getIdFromImageUrl($(x).attr('data-xlink-href'))).toArray();

            page['primaryStyleId'] = ids[0];
            page.selectedPerkIds[0] = ids[1];
            page.selectedPerkIds[1] = ids[2];
            page.selectedPerkIds[2] = ids[3];
            page.selectedPerkIds[3] = ids[4];
            page['subStyleId'] = ids[5];
            page.selectedPerkIds[4] = ids[6];
            page.selectedPerkIds[5] = ids[7];
            page.selectedPerkIds[6] = ids[8];
            page.selectedPerkIds[7] = ids[9];
            page.selectedPerkIds[8] = ids[10];
        }
    } catch (e) {
        throw Error(e);
    }

    return page;
}

function getIdFromImageUrl(url) {
    var perkId = -1;

    var fileName = url.split('/').pop().replace(/\.[^/.]+$/, "");

    if (url.includes('perks')) {
        perkId = parseInt(fileName);
    } else {
        perkId = perksMap[fileName];
    }

    return perkId || -1;
}

async function getModeUrls(champion) {
    var returnVals = [];

    try {
        var response = await getResponseFromUrl(baseUrl, "Error when determining the modes");
        if(response.ok){
            var body = await response.text();
            var $ = cheerio.load(body);

            $('div[id=mode-nav] a[href]').each((index, elem) => {
                var modeUrlBase = $(elem).attr('href');

                if (modesToIgnore.some(element => modeUrlBase.includes(element))) {
                    return;
                }

                // ToDo: create helper for combine pathes
                var modeUrl = baseUrl + modeUrlBase + '/champion/' + champion;
                modeUrl = modeUrl.replace(/([^:]\/)\/+/g, "$1");

                returnVals.push(modeUrl);
            });
        }
    } catch (e) {
        throw Error(e);
    }

    return returnVals;
}

// ToDo: maybe we should put this in a helper
async function getResponseFromUrl(requestUri, errorMsg = '') {
    return await fetch(requestUri).catch(function(err) {
            throw Error(errorMsg + " => " + err);
        });
}

async function _getPages(champion, callback) {
    const runePages = {
        pages: {}
    };

    var champInfo = freezer.get().championsinfo[champion];

    try {
        var gameModeUrls = await getModeUrls(champInfo.id);

        // determine last 3 LoL versions
        var versions = freezer.get().lolversions.slice(0,10).map(versItem => {
            return versItem.split('.').slice(0, 2).join('.');
        }).filter(function(elem, index, self) {
            return index === self.indexOf(elem);
        }).slice(0,3);

        for (var i = 0, len = gameModeUrls.length; i < len; i++) {
            var response = await getResponseFromUrl(gameModeUrls[i], "Error when determining lanes");
            if(!response.ok)
                continue;

            var body = await response.text();
            var $ = cheerio.load(body);

            // Determine available versions
            let modeVersions = $('select[id=patch] > option').map(function() {
                return $(this).text().trim();
            }).toArray()[0];

            if(!versions.includes(modeVersions))
                continue;

            for (let [index, elem] of Object.entries($('div[id=splash-content] > div > div > div > a'))){
                if(isNaN(index))
                    continue;
                var runePage = await getPage($(elem).attr('href').trim(), champInfo);
                if (runePage) {
                    runePages.pages[runePage.name] = runePage;
                }
            }          
        }

        const ordered = {};
        Object.keys(runePages.pages).sort().forEach(function(key) {
            ordered[key] = runePages.pages[key];
        });
        runePages.pages = ordered;

        callback(runePages);
    } catch (e) {
        callback(runePages);
        throw Error(e);
    }
}

var plugin = {
    id: "metasrc",
    name: "METAsrc",
    active: true,
    bookmarks: false,

    getPages(champion, callback) {
        _getPages(champion, callback);
    },

    syncBookmark(bookmark, callback) {
        getPage(bookmark.src).then(function(runePage) {
            callback(runePage);
        }).catch(function(err) {
            throw Error("rune page not loaded");
        });
    }
};

module.exports = {
    plugin
};