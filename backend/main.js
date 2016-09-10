const electron = require('electron')
const {
    app,
    BrowserWindow,
    ipcMain
    } = electron;
let config = {
    dbname: 'mud.sqlite3',
    defaultEncoding: 'GBK',
    host: '112.126.83.105',
    port: 5555,
    enter: '\n',
    macroprefix: '!'
};
const fs = require('fs');
const util = require('util');
const encoding = require('encoding');
const sqlite3 = require('sqlite3');
const net = require('net');
const ansi_up = require('ansi_up');

let mainWindow;
let connect;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        //resizable: false,
        height: 600
    });

    // and load the index.html of the app.
    mainWindow.loadURL(`file://${__dirname}/../index.html`)
    mainWindow.webContents.on('connect-server', function () {
        connectServer();
    });
    mainWindow.webContents.on('dom-ready', function () {
        mainWindow.webContents.send('dom-ready-event');
        bindMessage();
    });


    mainWindow.on('closed', function () {

        mainWindow = null
    })
}


app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow()
    }
});

function disconnectServer() {
    if (connect) {
        connect.end();
        connect = null;
    }
}

function connectServer() {
    disconnectServer();
    connect = net.connect({
        port: config.port,
        host: config.host
    }, function () {
        mainWindow.webContents.send("content-update", {
            result: true,
            data: '已连接到[' + config.host + ':' + config.port + ']服务器！<br>'
        });
    });

    connect.on('data', function (data) {
        var result = encoding.convert(data, "utf-8", config.defaultEncoding).toString();

        result = ansi_up.ansi_to_html(result.toString());

        mainWindow.webContents.send('content-update', {
            result: true,
            data: result
        });
    });
    connect.on('end', function () {
        connect = null;
        mainWindow.webContents.send('content-update', {
            result: true,
            data: '断开与服务器的连接'
        });
    });
}
function initDateBase() {
    fs.exists(config.dbname, function (exists) {
        if (exists) {
            // serve file
        } else {
            // mongodb
        }
    });

}

function bindMessage() {
    ipcMain.on("send-server-commad", function (event, arg) {
        if (connect) {
            if (arg && arg.result) {
                let encode = encoding.convert(arg.data + config.enter, config.defaultEncoding,"UTF-8");
                console.log("ASD"+encode.toString());
                connect.write(encode.toString() , config.defaultEncoding);
            }
        }
    });
    ipcMain.on("disconnect-server", function (event, arg) {
        if (connect) {
            if (arg && arg.result) {
                connect.end();
            }
        }
    });

    connectServer();
}


function resloveMacro(cmd){

}