const electron = require('electron')
const {
    app,
    BrowserWindow,
    ipcMain
} = electron
let config = {
    dbname: 'mud.sqlite3',
    defaultEncoding: 'gbk',
    host: '112.126.83.105',
    port: 5555,
    enter: '\r\n'
};
//#session wx 112.126.83.105 5555
const fs = require('fs');
const util = require('util');
const encoding = require('encoding');
const sqlite3 = require('sqlite3');
const net = require('net');
const ansi_up = require('ansi_up');
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let connect

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        //resizable: false,
        height: 600
    });

    // and load the index.html of the app.
    mainWindow.loadURL(`file://${__dirname}/../index.html`)

    mainWindow.webContents.on('dom-ready', function() {
        mainWindow.webContents.send('dom-ready-event');
        connectServer();
    });

    mainWindow.on('closed', function() {

        mainWindow = null
    })
}


app.on('ready', createWindow)

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function() {
    if (mainWindow === null) {
        createWindow()
    }
})

function initDateBase() {
    fs.exists(config.dbname, function(exists) {
        if (exists) {
            // serve file
        } else {
            // mongodb
        }
    });
}

function connectServer() {
    ipcMain.on("send-server-commad", function(event, arg) {
        console.log('send-server-commad-recv');
        console.log(arg);
        if (connect) {
            if (arg && arg.result) {
                console.log('write data')
                console.log(arg.data);
                connect.write(arg.data + config.enter);
            }
        }
    })
    ipcMain.on("disconnect-server", function(event, arg) {
        if (connect) {
            if (arg && arg.result) {
                connect.end();
            }
        }
    })

    connect = net.connect({
        port: config.port,
        host: config.host
    }, function() {
        console.log('连接到服务器！');
    });
    connect.on('data', function(data) {
        var result = encoding.convert(data, "utf-8", config.defaultEncoding).toString();
        console.log(result.toString());
        result = ansi_up.ansi_to_html(result.toString());

        console.log('content-update-send');
        mainWindow.webContents.send('content-update', {
            result: true,
            data: result
        });
    });
    connect.on('end', function() {
        mainWindow.webContents.send('content-update', {
            result: true,
            data: '断开与服务器的连接'
        });
    });
}
