const cheerio = require('cheerio');
const { toUpper } = require('lodash');
const request = require('request');

const urlChamp = 'http://www.op.gg/champions/';
const urlModes = 'http://www.op.gg/modes/';
const positions = ["top", 'mid', "jungle", "adc", "support"];
const gameModes = ["aram", "urf"];

function extractSinglePage(html, champion, name,pageIndex, buildIndex, src){
  const $ = cheerio.load(html);
  const runeIds = [];
  const data = JSON.parse($("#__NEXT_DATA__")["0"]["children"]["0"]["data"])["props"]["pageProps"]["data"];
  data["rune_pages"][pageIndex]["builds"][buildIndex]["primary_rune_ids"].forEach((id) => runeIds.push(id));
  data["rune_pages"][pageIndex]["builds"][buildIndex]["secondary_rune_ids"].forEach((id) => runeIds.push(id));
  data["rune_pages"][pageIndex]["builds"][buildIndex]["stat_mod_ids"].forEach((id) => runeIds.push(id));
  return buildPluginObject(name,src,pageIndex, buildIndex,runeIds, champion);
}

function extractPages(html, champion, position,gameMode,src,callback) {
  const $ = cheerio.load(html);
  let runeIds = [];
  const data = JSON.parse($("#__NEXT_DATA__")["0"]["children"]["0"]["data"])["props"]["pageProps"]["data"];
  if(data["rune_pages"].length){
    const limitPages = data["rune_pages"].length < 2? data["rune_pages"].length : 2;
    for (let i = 0; i < limitPages; i++) {
        for (let j = 0; j < 1; j++) {
          try {
                data["rune_pages"][i]["builds"][j]["primary_rune_ids"].forEach((id) => runeIds.push(id));
                data["rune_pages"][i]["builds"][j]["secondary_rune_ids"].forEach((id) => runeIds.push(id));
                data["rune_pages"][i]["builds"][j]["stat_mod_ids"].forEach((id) => runeIds.push(id));
                callback(buildPluginObject((gameMode? "["+ toUpper(gameMode) + "]" : "[NORMAL]" ) + champion +" "+ toUpper(position) +" Wins "+ data["rune_pages"][i]["builds"][j]["win"] +" "+ data["meta"]['runePages'].filter((page) => page["id"] ==data["rune_pages"][0]["builds"][0].primary_page_id )[0]["name"],src,i, j,runeIds, champion));
          } catch (error) {
            callback(undefined);
          }
          runeIds = [];
        }
      }
  } else {
    callback(undefined);
  }
}

function _getPages(champion, callback) {
  console.log(champion, callback)
  const runePages = { pages: {} };
  positions.forEach((pos) =>{
    let url =urlChamp +"/" + champion +"/" + pos + "/build";
    request.get(url, (error, response, html) =>{
      if (!error && response.statusCode === 200) {
        extractPages(html, champion,pos,"",url,page => {
        if( page != undefined) runePages.pages[page.name] = page;
        callback(runePages);
        })
      } else {
      callback(runePages);
      throw Error('rune page not loaded');
    }});
  });
  gameModes.forEach((mode) => {
    let url = urlModes +"/"+ mode+"/"+ champion + "/build"
    request.get(url, (error, response, html) =>{
      if (!error && response.statusCode === 200) {
        extractPages(html, champion,"",mode,url ,page => {
        if( page != undefined) runePages.pages[page.name] = page;
        callback(runePages);
        })
      }else {
      callback(runePages);
      throw Error('rune page not loaded');
    }});
  });
}

function buildPluginObject(name, src,pageIndex,buildIndex, runeIds,champion){
  return {
            name,
            selectedPerkIds: runeIds,
            bookmark: {
                name,
                src,
                meta: {
                  pageIndex,
                  buildIndex,
                  champion
                },
                remote: {
                  name: 'OP.GG',
                  id: 'opgg'
                }
            }
          }
}
const plugin = {
  id: 'opgg',
  name: 'OP.GG',
  active: true,
  bookmarks: true,
  getPages(champion, callback) {
    _getPages(champion, callback);
  },
  syncBookmark(bookmark, callback) {
    request.get(bookmark.src, (error, response, html) => {
      if (!error && response.statusCode == 200) {
        callback(extractSinglePage(html, bookmark.meta.champion, bookmark.name , bookmark.meta.pageIndex,bookmark.meta.buildIndex, bookmark.src));
      } else {
        throw Error('rune page not loaded');
      }
    });
  }
};

module.exports = { plugin };
