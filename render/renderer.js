// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const {
    ipcRenderer
} = require('electron');
ipcRenderer.on('content-update', function(event, arg) {
    console.log('content-update-recv')
    console.log(arg)
    if (arg && arg.result) {
        var that = document.getElementById('content');
        that.appendHTML(arg.data);
        that.scrollTop = that.scrollHeight;
    }
});
ipcRenderer.on('dom-ready-event', function() {
    HTMLElement.prototype.appendHTML = function(html) {
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
    document.getElementById('cmd').addEventListener('keydown', function(e) {
        if (e.keyCode == 13) {
            ipcRenderer.send('send-server-commad', {
                result: true,
                data: this.value
            });
            this.value ='';
        }
    })


})
