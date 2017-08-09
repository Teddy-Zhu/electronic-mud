// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
let cmdHistory = [], index = 0, activeTab = DomById('tab1'), tabIndex = 1;
const {
    ipcRenderer
    } = require('electron');
ipcRenderer.on('content-update', function (event, arg) {
    console.log(arg);
    if (arg && arg.result) {
        var content = getContent(arg.data.name);
        if(!content) return;
        content.appendHTML(arg.data.content);
        content.scrollTop = content.scrollHeight;
    }
});
ipcRenderer.on('content-replace', function (event, arg) {
    if (arg && arg.result) {
        var content = getContent(arg.data.name);
        content.innerHTML = arg.data.content;
        content.scrollTop = content.scrollHeight;
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
    HTMLElement.prototype.removeClass = function (value) {
        var newClass = this.className;
        if (newClass.indexOf(value) != -1) {
            this.className = newClass.replace(value, '');
        }
    };
    HTMLElement.prototype.addClass = function (value) {
        if (!this.className) {
            this.className = value;
        } else {
            var newClassName = this.className;
            if (newClassName.indexOf(value) != -1) return;
            newClassName += " ";
            newClassName += value;

            this.className = newClassName;
        }
    };
    DomById("tab_bar").addEventListener('click', function (e) {
        if (e.target.tagName != 'LI' || e.target == activeTab) return;

        var liLen = this.children[0].children.length, id = e.target.id;
        for (var i = 0; i < liLen; i++) {
            var cur = this.children[0].children[i];
            if (id == cur.id) {
                activeTab = cur;
                cur.style.backgroundColor = 'orange';
            } else {
                cur.style.backgroundColor = 'gray';
            }
        }
        var divs = document.getElementsByClassName("tab_css");
        for (var i = 0; i < divs.length; i++) {
            var divv = divs[i];
            if (divv == DomById(id + "_content")) {
                divv.style.display = "block";
            } else {
                divv.style.display = "none";
            }
        }
    });
    DomById('tab_content_all').addEventListener('keydown', function (e) {
        if (e.target.tagName != 'INPUT' || e.target.className.indexOf('cmd') == -1) return;
        resolveKeyDown(e.target, e.keyCode, e.target.parentNode.parentNode.id.replace('_content', ''));
    });

    DomById('add').addEventListener('click', function (e) {
        addTab();
    });

    DomById('reduce').addEventListener('click', function (e) {
        reduceTab();
    });
    DomById('quickLink').addEventListener('click', function (e) {
        showModel();
    });
    DomById('ok').addEventListener('click', function (e) {
        var host = DomById('host').value.trim();
        var port = DomById('port').value.trim();

        if (!host) return;

        port = port ? port : '23';

        addTab(host);
        console.log('quick link tab'+tabIndex);
        ipcRenderer.send('send-server-commad', {
            result: true,
            data: {
                name: 'tab' + tabIndex,
                content: "!run connect " + host + " " + port
            }
        });
        hideModel();
    });

    DomById('cancel').addEventListener('click', function (e) {
        hideModel();
    });
});

function addTab(name) {
    tabIndex += 1;
    name = name ? name : ('tab' + tabIndex);
    DomById('tab_bar').children[0].appendHTML('<li id="tab' + tabIndex + '">' + name + '</li>');

    DomById('tab_content_all').appendHTML('<div class="tab_css" id="tab' + tabIndex
        + '_content" style="display: none"><div><span class="cmd_content"></span><input class="cmd" type="text"/></div></div>')

    if (tabIndex > 1) {
        DomById('reduce').style.display = 'block';
        DomById('tab_bar').addClass('has_reduce');
    }
    resetLayout();
}

function reduceTab() {
    ipcRenderer.send('send-server-commad', {
        result: true,
        data: {
            name: 'tab' + tabIndex,
            content: "!rcnt"
        }
    });
    var tab = DomById('tab' + tabIndex);
    var tabcontent = DomById('tab' + tabIndex + '_content');
    if (tab.parentNode) {
        tab.parentNode.removeChild(tab);
    }
    if (tabcontent.parentNode) {
        tabcontent.parentNode.removeChild(tabcontent);
    }
    tabIndex -= 1;
    if (tabIndex == 1) {
        DomById('tab_bar').removeClass('has_reduce');
        DomById('reduce').style.display = 'none';
    }
    resetLayout();
}

function DomById(id) {
    return document.getElementById(id);
}

function resetLayout() {
    var children = DomById('tab_bar').children[0].children;
    var length = children.length;
    var width = 100 / length;
    for (var i = 0; i < length; i++) {
        children[i].style.width = width + '%';
    }
}

function resolveKeyDown(obj, code, name) {
    switch (code) {
        case 13:
        {
            let val = obj.value.trim();
            if (!val) return;
            cmdHistory.push(val);
            index = cmdHistory.length;
            ipcRenderer.send('send-server-commad', {
                result: true,
                data: {
                    name: name,
                    content: val
                }
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
            index = index > cmdHistory.length ? cmdHistory.length : index;
            obj.value = cmdHistory[index - 1];
            break;
        }
        default:
        {
            return;
        }
    }
}

function showModel() {
    DomById('host').value = '';
    DomById('port').value = '';
    DomById('modal-overlay').style.visibility = 'visible';
}
function hideModel() {
    DomById('modal-overlay').style.visibility = 'hidden';
}
function getContent(name) {
    var content = DomById(name + '_content');
    return content ? content.children[0].children[0] : undefined;
}