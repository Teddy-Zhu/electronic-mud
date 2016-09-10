// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
let cmdHistory = [], index = 0;
const {
    ipcRenderer
    } = require('electron');
ipcRenderer.on('content-update', function (event, arg) {
    console.log('content-update-recv')
    console.log(arg)
    if (arg && arg.result) {
        var that = document.getElementById('content');
        that.appendHTML(arg.data);
        that.scrollTop = that.scrollHeight;
    }
});
ipcRenderer.on('dom-ready-event', function () {
    String.prototype.trim = function () {
        return this.replace(/(^\s*)|(\s*$)/g, "");
    };
    HTMLElement.prototype.appendHTML = function (html) {
        var divTemp = document.createElement("div"),
            nodes = null,
            fragment = document.createDocumentFragment();
        divTemp.innerHTML = html;
        nodes = divTemp.childNodes;
        for (var i = 0, length = nodes.length; i < length; i += 1) {
            fragment.appendChild(nodes[i].cloneNode(true));
        }
        this.appendChild(fragment);
        nodes = null;
        fragment = null;
    };
    document.getElementById('cmd').addEventListener('keydown', function (e) {
        resolveKeyDown(this, e.keyCode);
    })
});

function resolveKeyDown(obj, code) {
    switch (code) {
        case 13:
        {
            let val = obj.value.trim();
            if (!val) return;
            cmdHistory.push(val);
            index = cmdHistory.length ;
            ipcRenderer.send('send-server-commad', {
                result: true,
                data: val
            });
            obj.value = '';
            break;
        }
        case 38:
        {
            //上
            if (cmdHistory.length == 0) {
                obj.value = '';
                break;
            }
            index--;
            index = index < 0 ? 0 : index;
            obj.value = cmdHistory[index];
            break;
        }
        case 40:
        {
            //下
            if (cmdHistory.length == 0) {
                obj.value = '';
                break;
            }
            index++;
            index = index > cmdHistory.length ? cmdHistory.length  : index;
            obj.value = cmdHistory[index - 1];
            break;
        }
        default:
        {
            return;
        }
    }
}
function connectServer() {
    document.getElementById('content').innerHTML = "";
    cmdHistory = [];
    ipcRenderer.send("connect-server")
}
