const electron = require('electron');
const {Menu,app,BrowserWindow,ipcMain} = electron;
let config = {
    defaultEncoding: 'GBK',
    host: '112.126.83.105',
    port: 5555,
    enter: '\n',
    macroprefix: '!',
    innerCMD: {
        'exit': 'exit',
        'cnt': '!run connect',
        'rcnt': '!run removeConnect',
        'setdb': '!run setdb',
        'set': '!run set'
    },
    customOut: '<br><span>%s</span><br>',
    version: '1.2'
};

const fs = require('fs');
const util = require('util');
const net = require('net');
const ansi_up = require('ansi_up');
const iconv = require('iconv-lite');
const low = require('lowdb');
const db = low(app.getPath('userData') + "/db.json");
let mainWindow;
let connectList = {
    tab1: undefined
};
let innerfunc = {
    close: function () {
        app.quit();
    },
    connect: function (name, host, port) {
        connectServer(name, host, port);
    },
    removeConnect: function (name) {
        disconnectServer(name);
    },
    setdb: function (key, value) {
        db.get('config').set(key, value).value();
        updateConect(name, config.customOut.replace('%s', 'db set key :' + key + ' value :' + value));

    },
    set: function (key, value) {
        if (config.hasOwnProperty(key)) {
            updateConect(name, config.customOut.replace('%s', 'set key : ' + key + ' value :' + value));
            config[key] = value;
        }
    }
};
function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        //resizable: false,
        height: 630,
        "min-width": 800,
        "min-height": 630
    });

    // and load the index.html of the app.
    initDB();
    mainWindow.webContents.openDevTools();
    //console.log(app.getPath('userData'));
    mainWindow.loadURL(`file://${__dirname}/../index.html`);

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
        if (val['version'] != config.version) {
            console.log('update');
            db.setState({config: config});
        } else {
            config = val;
        }
    } else {
        console.log('new');
        db.setState({'config': config});
    }
}
function disconnectServer(name) {
    if (connectList[name]) {
        connectList[name].end();
    }
}

function connectServer(name, host, port) {
    host = host ? host : config.host;
    port = port ? port : config.port;
    disconnectServer(name);
    connectList[name] = net.connect({
        port: port,
        host: host
    }, function () {
        updateConect(name, '<br><span>已连接到[' + host + ':' + port + ']服务器！</span><br>');
    });

    connectList[name].on('data', function (data) {
        var result = iconv.decode(data, config.defaultEncoding).toString();
        result = ansi_up.ansi_to_html(result.toString());

        updateConect(name, result);
    });
    connectList[name].on('end', function () {
        console.log('end ' + name);
        connectList[name] = null;
        delete  connectList[name];
        updateConect(name, '断开与服务器的连接');
    });
}

function bindMessage() {
    ipcMain.on("send-server-commad", function (event, arg) {
        if (arg && arg.result) {
            connectSendCMD(arg.data.name, arg.data.content);
        }
    });
    ipcMain.on("disconnect-server", function (event, arg) {

        if (arg && arg.result && connectList[arg.data.name]) {
            connectList[arg.data.name].end();
        }

    });

}

function connectSendCMD(name, data) {
    if (data.substr(0, config.macroprefix.length) == config.macroprefix) {
        resloveMacro(name, data);
    } else {
        commonCMD(name, data);
    }
}

function commonCMD(name, cmd) {
    if (!connectList[name]) return;
    updateConect(name, '<br><span>>>' + cmd + '</span><br>');
    let encode = iconv.encode(cmd + config.enter, config.defaultEncoding);
    connectList[name].write(encode);
}
function resloveMacro(name, cmd) {
    var parseCMD = cmd.substr(1);
    var parseCMDArray = parseCMD.split(/\s+/);
    //解析快捷命令
    var matchCMD = config.innerCMD[parseCMDArray[0]];
    var rcmd = matchCMD ? matchCMD : parseCMDArray[0];
    parseCMDArray[0] = rcmd;
    switch (rcmd) {
        case 'run':
        {
            var func = parseCMDArray[1];
            if (func && innerfunc[func]) {
                parseCMDArray = parseCMDArray.slice(2);
                if (getFnParameters(innerfunc[func])[0] == 'name') {
                    console.log('has name');
                    parseCMDArray.splice(0, 0, name);
                }
                console.log('cmd :[' + parseCMDArray.join(' ') + ']');
                innerfunc[func].apply(this, parseCMDArray);
            }
            break;
        }
        default:
        {
            connectSendCMD(name, parseCMDArray.join(' '));
            break;
        }
    }
}


function updateConect(name, content) {
    mainWindow.webContents.send("content-update", {
        result: true,
        data: {
            name: name,
            content: content
        }
    });
}

function getFnParameters(func) {
    var funcString = func.toString();
    console.log('function string : ' + funcString);
    return funcString.substring(funcString.indexOf('(') + 1, funcString.indexOf(')')).split(/\s*,\s*/);
}