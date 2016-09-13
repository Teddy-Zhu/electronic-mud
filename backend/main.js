const electron = require('electron')
const {
    Menu,
    app,
    BrowserWindow,
    ipcMain
    } = electron;
let config = {
    defaultEncoding: 'GBK',
    host: '112.126.83.105',
    port: 5555,
    enter: '\n',
    macroprefix: '!',
    innerCMD: {'exit': 'exit'},
    customOut: '<br><span>%s</span><br>'
};

const fs = require('fs');
const util = require('util');
const net = require('net');
const ansi_up = require('ansi_up');
const iconv = require('iconv-lite');
const low = require('lowdb');
const db = low(app.getPath('userData') + "/db.json");
let mainWindow;
let connect;
function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        //resizable: false,
        height: 600,
        "min-width": 800,
        "min-height": 600
    });

    // and load the index.html of the app.
    initDB();
    console.log(app.getPath('userData'));
    mainWindow.loadURL(`file://${__dirname}/../index.html`);
    mainWindow.webContents.on('connect-server', function () {
        connectServer();
    });
    mainWindow.webContents.on('dom-ready', function () {
        mainWindow.webContents.send('dom-ready-event');
        bindMessage();
    });

    // Create the Application's main menu
    var template = [{
        label: "Mud Client",
        submenu: [
            {label: "About Mud Client", selector: "orderFrontStandardAboutPanel:"},
            {type: "separator"},
            {
                label: "Quit", accelerator: "Command+Q", click: function () {
                app.quit();
            }
            }
        ]
    }, {
        label: "Edit",
        submenu: [
            {label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:"},
            {label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:"},
            {type: "separator"},
            {label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:"},
            {label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:"},
            {label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:"},
            {label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:"}
        ]
    }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));

    mainWindow.on('closed', function () {

        mainWindow = null
    })
}


app.on('ready', createWindow);

app.on('window-all-closed', function () {
    app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow()
    }
});

function initDB() {
    var val = db.get('config').value();
    if (val) {
        console.log('exist');
        config = val;
    } else {
        console.log('new');
        db.setState({'config': config});
    }
}
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

function commonCMD(cmd) {
    if (!connect) return;
    updateConect('<br><span>>>' + cmd + '</span><br>');
    let encode = iconv.encode(cmd + config.enter, config.defaultEncoding);
    connect.write(encode);
}
function resloveMacro(cmd) {
    var parseCMD = cmd.substr(1);
    var parseCMDArray = parseCMD.split(/\s+/);
    var matchCMD = config.innerCMD[parseCMDArray[0]];
    var rcmd = matchCMD ? matchCMD : parseCMDArray[0];
    parseCMDArray[0] = rcmd;
    switch (rcmd) {
        case 'cnt':
        {
            updateConect('<br><span>>>connect server</span><br>');
            connectServer();
            break;
        }
        case 'setdb':
        {
            var key = parseCMDArray[1];
            var value = parseCMDArray[2];
            db.get('config').set(key, value).value();
            updateConect(config.customOut.replace('%s', 'db set key :' + key + ' value :' + value));
            break;
        }
        case 'set':
        {
            var key = parseCMDArray[1];
            var value = parseCMDArray[2];
            if (config.hasOwnProperty(key)) {
                updateConect(config.customOut.replace('%s', 'set key : ' + key + ' value :' + value));
                config[key] = value;
            }
        }
        default:
        {
            commonCMD.apply(this, parseCMDArray);
            break;
        }
    }
}


function updateConect(contect) {
    mainWindow.webContents.send("content-update", {
        result: true,
        data: contect
    });
}