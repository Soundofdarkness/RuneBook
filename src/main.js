const electron = require('electron');
const { app, BrowserWindow, Tray, Menu, ipcMain, shell, dialog } = electron;
const { autoUpdater } = require("electron-updater");
const url = require('url');
const request = require('request');
const windowStateKeeper = require("electron-window-state");
const os = require("os");

require('electron-debug')({ enabled: true });
require('electron-store').initRenderer();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let splash;

let latestv = null;

function createWindow() {

    let width = 768;
    let height = 760;
    let minWidth = 768;
    let minHeight = 560;

    let mainWindowState = windowStateKeeper({
        defaultWidth: width,
        defaultHeight: height
    });

    let options = {
        title: 'RuneBook',
        width: mainWindowState.width,
        height: mainWindowState.height,
        minWidth: minWidth,
        minHeight: minHeight,
        maximizable: false,
        resizable: true,
        fullScreenable: false,
        x: mainWindowState.x,
        y: mainWindowState.y,
        frame: false,
        useContentSize: false,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    };

    // Create a copy of the 'normal' options
    let splashOptions = JSON.parse(JSON.stringify(options));
    splashOptions.transparent = true;

    // Create the splash window
    splash = new BrowserWindow(splashOptions);

    splash.loadURL(url.format({
        pathname: `${__dirname}/../splashscreen.html`,
        protocol: "file",
        slashes: true
    }));

    splash.webContents.on("did-finish-load", () => {
        splash.show();
    });

    // Create the browser window.
    win = new BrowserWindow(options);

    mainWindowState.manage(win);
    win.setMenu(null);

    // and load the index.html of the app.
    win.loadURL(url.format({
        pathname: `${__dirname}/../index.html`,
        protocol: 'file:',
        slashes: true
    }));

    win.webContents.on("did-finish-load", () => {
        if (splash) splash.close();
        splash = null;
        win.show();
    });

    // ToDo: if we upgrade to Electron 12: https://stackoverflow.com/questions/32402327/how-can-i-force-external-links-from-browser-window-to-open-in-a-default-browser/67409223#67409223
    win.webContents.on('new-window', function(e, url) {
        e.preventDefault();
        require('electron').shell.openExternal(url);
      });

    // Open the DevTools.
    // win.webContents.openDevTools()

    win.on('minimize', () => {
        win.minimize()
    })

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null
    });

    const isOnADisplay = electron.screen.getAllDisplays()
        .map(display => mainWindowState.x >= display.bounds.x
            && mainWindowState.x <= display.bounds.x + display.bounds.width
            && mainWindowState.y >= display.bounds.y
            && mainWindowState.y <= display.bounds.y + display.bounds.height)
        .some(display => display);

    if (!isOnADisplay) {
        win.center();
    }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
let tray = null

app.on('ready', function () {
    createWindow();

    if(os.platform() !== "linux"){ 
        tray = new Tray(`${__dirname}/../img/logo.png`);
        tray.setTitle('RuneBook');

        tray.on('click', () => {
            if (win.isVisible()) {
                win.hide()
            } else {
                win.show()
            }
        });

        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Show RuneBook', click: () => {
                    win.show()
                }
            },
            {
                label: 'Exit', click: () => {
                    app.isQuiting = true
                    app.quit()
                }
            }
        ]);

        tray.setContextMenu(contextMenu);
    }

    win.webContents.on("did-finish-load", () => {
        request({
            url: 'https://api.github.com/repos/Soundofdarkness/RuneBook/releases/latest',
            headers: {
                'User-Agent': 'request'
            }
        },
            function (error, response, data) {
                if (!error && response && response.statusCode === 200) {
                    win.webContents.send('updateinfo:ready', JSON.parse(data));
                }
                else throw Error("github api error");
            })
    });
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow();
    }
    else if (process.platform === "darwin") {
        win.show();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// when the update has been downloaded and is ready to be installed, notify the BrowserWindow
autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update:downloaded');
    dialog.showMessageBox({
        title: 'Install update',
        message: 'Update downloaded, RuneBook will quit for update...'
    }, () => {
        setImmediate(() => autoUpdater.quitAndInstall())
    })
});

// when receiving a quitAndInstall signal, quit and install the new version ;)
ipcMain.on("update:do", (event, arg) => {
    if (process.platform !== 'darwin') {
        autoUpdater.checkForUpdatesAndNotify();
    }
    else {
        win.webContents.send('update:downloaded');
        shell.openExternal(`https://github.com/Soundofdarkness/RuneBook/releases/download/v${latestv}/RuneBook-${latestv}-mac.zip`)
    }
});

ipcMain.on("content:reload", () => {
    win.reload();
});

const forceHide = (evt) => {
    if(os.platform() === "linux"){
        win.minimize();
        return;
    }
    evt.preventDefault();
    win.hide();
}

const forceMinimize = () => {
    win.minimize();
}

ipcMain.on("minimizetotray:enabled", () => {
    // console.log("set to tray icon on minimize")
    win.removeListener('minimize', forceMinimize);
    win.on('minimize', forceHide);
});

ipcMain.on("minimizetotray:disabled", () => {
    // console.log("set to minimize on minimize")
    win.removeListener('minimize', forceHide);
    win.on('minimize', () => {forceMinimize(); });
});