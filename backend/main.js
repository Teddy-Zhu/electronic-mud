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
    macroprefix: '!',
    innerCMD: {'exit': 'exit'}
};
const fs = require('fs');
const util = require('util');
const sqlite3 = require('sqlite3');
const net = require('net');
const ansi_up = require('ansi_up');
const iconv = require('iconv-lite');

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
    mainWindow.loadURL(`file://${__dirname}/../index.html`);
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
        updateConect('<br><span>已连接到[' + config.host + ':' + config.port + ']服务器！</span><br>');
    });

    connect.on('data', function (data) {
        var result = iconv.decode(data, config.defaultEncoding).toString();

        result = ansi_up.ansi_to_html(result.toString());

        updateConect(result);
    });
    connect.on('end', function () {
        connect = null;

        updateConect('断开与服务器的连接');
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
            if (arg && arg.result) {
                connectSendCMD(arg.data);
            }
    });
    ipcMain.on("disconnect-server", function (event, arg) {
        if (connect) {
            if (arg && arg.result) {
                connect.end();
            }
        }
    });

}

function connectSendCMD(data) {
    if (data.substr(0, config.macroprefix.length) == config.macroprefix) {
        resloveMacro(data);
    } else {
        commonCMD(data);
    }
}

function commonCMD(cmd){
    if(!connect) return;
    updateConect('<br><span>>>' + cmd + '</span><br>');
    let encode = iconv.encode(cmd + config.enter, config.defaultEncoding);
    connect.write(encode);
}
function resloveMacro(cmd) {
    var parseCMD = cmd.substr(1);
    var matchCMD = config.innerCMD[cmd];
    parseCMD = matchCMD ? matchCMD : parseCMD;
    switch (parseCMD) {
        case 'cnt':
        {
            updateConect('<br><span>>>connect server</span><br>');
            connectServer();
            break;
        }
        default:
        {
            commonCMD(parseCMD);
            break;
        }
    }
}


function updateConect(contect){
    mainWindow.webContents.send("content-update", {
        result: true,
        data: contect
    });
}