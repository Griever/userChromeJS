// ==UserScript==
// @name           UserScriptLoader.uc.js
// @author         Griever
// @include        main
// @description    Greasemonkey っぽいもの
// @version        0.1.6.1
// @note           0.1.6.1 uAutoPagerize との連携ができなかったのを修正
// @note           0.1.6.1 .user.js 間での連携は多分できません。。
// @note           0.1.6 色々修正。unsafeWindow 使ってて動かなかった物が動くかも
// @note           0.1.6 Firefox 3.6 は切り捨てた
// ==/UserScript==

(function() {

const OPEN_FOLDER_MENU = false;
const SAVE_SCRIPT_MENU = true;

// User setting （pref.js に設定があればそちらを利用）
const EDITOR = 'C:\\Program Files\\EmEditor\\EmEditor.exe'; //\→\\
const SCRIPTS_FOLDER  = ''; // 空白なら chrome\\UserScriptLoader フォルダ
                            // 例: 'D:\\UserScriptLoader'


const ON_IMAGE = "data:image/png;base64," + 
	"iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACOElEQVQ4ja3Q3UtTcRgH8N8f" + 
	"4K11FaRrVGumlTXndPYiyQqkCyPoLroOCbyJSCGJUhOGUSnShVqtFpYlW/lCKiPmy5zinObZ" + 
	"dJtn29nZcW7nnB39TapvF+WdI4W+95/n+zwPIf8zwnRFt+AyIj5VDn7CAN5ZiphDD25Mh+jI" + 
	"aUSGixEePAnWXhTaeYCr/OdWogMZoR2Z2DPQyBNsrpqxEWiF4muG4LwK9nOhvCOOT5Y1iks3" + 
	"sSV0IP29CrLnAkS3EalxPRR/CxJTN8Dai35kXZ+fNGQyfBs2Q7chz1dCcp9FasIAxd+E5Gwt" + 
	"woNl8H3QqnZuHy+tSc5fRybejvTCRUiz55CaKoPsvQV5sR7ciAnBvoJLWdtjTn1aCTWARlsh" + 
	"z52HOG1E0lkCxd+C+LdrCH7S1mXHjhLd2nQ1MvxzyF4TxJlKpCYrsD6mQ3rpEUL92l+BPg1d" + 
	"6T1Kl98dpr43asq8OkSZ7nyeEEII59DzElMHGm3DJmvGRvAxFH8TFF8T0osPIXkaIc7UI+W6" + 
	"i+TEHbD9VWC68hRPx4E//+BGz6QiX4tpeOgUZQdO0FV7IQ3ZCqi8+ACC7TjWhkwQ3Q2IfrmC" + 
	"ZcsxMF0HX2Q9ZzuBj9rRdVctpLn7EN33ELaZwPSoRE/nvv3/xIQQEnivgeRpBDdcg5W3BWB6" + 
	"8s27gn/xDDdUjejAZfheqxOezrzdtRJCiNeamxPo1WLFqgHzUtW8a7idZesRr9+i5r1Pc3P2" + 
	"jAkhhLGodXs1vwEkf3FKAtNVEwAAAABJRU5ErkJggg==";

const OFF_IMAGE = "data:image/png;base64," + 
	"iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACrElEQVQ4ja2QXUhTARzFb3f5" + 
	"5kuB2EOBplLJTCtrzs/pJNHEJ03orXyIHkQkFSvSSKTmB5hRKfWSVJZhWX5MvZIuiemc05zT" + 
	"3Obm3Ny8m7rP6+7MdnoIQWF76zwe+J3z/x+C+J+yTWd02OTpsE6lgZ5MAS1Nxvo4HxYJD+bR" + 
	"i1gbSYRp+DyMAwmGwAHytD87m+3w2drgW38Odu0pvKst2NY3g9E0wCYtglEc7w4IW2Wpdc6l" + 
	"EuzY2uH5lQO3UginIh2OCT4YbSM2p67DOJCwG/R8Wpbi89Gt8BrK4Z7PhkshgGMyBYxWBPts" + 
	"GUzDqdB85kYFbp9ILrTPX4PP2gbPwmW4ZjPhmEqFW1UK92INLKO5WOmJywvavi7lexhDLVhz" + 
	"M9xzWXBOp8MuTQKjbYT1RzFWvnIrgsPjSbyN6QL46Bdwq3LhnMmGQ5aBLQkPnqXHMPRy/fqe" + 
	"WFbXfYZd/niK1byPYdVvo1l1x0maIAiCsIzzaZe6Aqy5FV5jC7ZXmsBoRWA0IngWH8GlrINz" + 
	"pgYO+T3YJ+/A2JsD9etIRtl+4t8elrFLjrVviayJusAah86xqwPxrKE/jnUv1sPWfxYbVC6c" + 
	"ilosNCThe/FRUJmHMZhNroqzyeqgb+m/cMe25GVwzT2EU3EfKlEift7mwdvXBP+CGExnOWS3" + 
	"uLtDWWRp4IBPsXAp62AZKYTuQxyovBDHdl8T8CQfqDoC1EfAJsrAoJDUBYJnLFQBzENXoHkX" + 
	"s6l8GRlOCTh+/3Q39steEw5KwPEfgFVdYaH6bi50XbFQv4lq2PPFQtLoeXUDqAkHW0lgq5KA" + 
	"4SYHYiFpOhCw3HVape2MoVXPwkL3+5Krxx5MlET/NldFwFodguWSQ6DyObsDQvLugQB1Zwwv" + 
	"2LCSouPVYiGppwQcv1hIGvfgv6X5zFaYeSAgAAAAAElFTkSuQmCC";


const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;
if (!window.Services)
	Cu.import("resource://gre/modules/Services.jsm");


var database = {
	pref: {},
	resource: {}
};

var hasDatabase = false;

var observer = (function(){
	let list = Services.wm.getEnumerator('navigator:browser');
	while(list.hasMoreElements()) {
		let win = list.getNext();
		if (win.UserScriptLoader && win.UserScriptLoader.observer) {
			return win.UserScriptLoader.observer;
		}
	}

	return {
		disabled: true,
		observe: function(subject, topic, data){
			var doc = subject.document;
			var evt = doc.createEvent("Events");
			evt.initEvent("USL_DocumentStart", true, false);
			doc.dispatchEvent(evt);
		},
		register: function(){
			Services.obs.addObserver(this, "content-document-global-created", false);
			this.disabled = false;
			this.log('USL observer start');
			try {
				var data = loadFile('UserScriptLoader.json');
				data = JSON.parse(data);
				database.pref = data.pref;
				database.resource = data.resource;
			} catch(e){
				debug('can not load UserScriptLoader.json');
			}
		},
		unregister: function(){
			Services.obs.removeObserver(this, "content-document-global-created");
			this.disabled = true;
			this.log('USL observer end');
			saveFile('UserScriptLoader.json', JSON.stringify(database));
		},
		log: log,
		loadFile: loadFile,
		saveFile: saveFile
	};

})();

if (typeof window.UserScriptLoader != 'undefined') {
	database = window.UserScriptLoader.database;
	hasDatabase = true;
	window.UserScriptLoader.theEnd();
}

var ns = window.UserScriptLoader = {
	OPEN_FOLDER_MENU : OPEN_FOLDER_MENU,
	SAVE_SCRIPT_MENU : SAVE_SCRIPT_MENU,
	USE_STORAGE_NAME : ['cache', 'cacheInfo'],
	ON_IMAGE         : ON_IMAGE,
	OFF_IMAGE        : OFF_IMAGE,
	AUTO_REBUILD     : false,
	database         : database,

	readScripts      : [],
	runAtStartScripts: [],
	runAtEndScripts  : [],

	_disabled        : null,
	observer         : observer,

	get pref() {
		delete this.pref;
		return this.pref = new PrefManager();
	},
	get SCRIPTS_FOLDER() {
		let folderPath = this.pref.getValue('SCRIPTS_FOLDER', SCRIPTS_FOLDER);
		let aFolder = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile)
		if (!folderPath) {
			let UChrm = Services.dirsvc.get("UChrm", Ci.nsIFile);
			aFolder.initWithPath(UChrm.path);
			aFolder.appendRelativePath('UserScriptLoader');
		}
		else {
			aFolder.initWithPath(folderPath);
		}
		try {
			if( !aFolder.exists() || !aFolder.isDirectory() ) {
				aFolder.create(Ci.nsIFile.DIRECTORY_TYPE, 0664);
			}
		} catch (e) {
			return error('importScripts error.')
		}
		delete this.SCRIPTS_FOLDER;
		return this.SCRIPTS_FOLDER = aFolder;
	},
	get EDITOR() {
		delete this.EDITOR;
		return this.EDITOR = this.pref.getValue('EDITOR', EDITOR);
	},
	get HIDE_EXCLUDE() {
		delete this.HIDE_EXCLUDE;
		return this.HIDE_EXCLUDE = this.pref.getValue('HIDE_EXCLUDE', false);
	},
	get DEBUG() {
		delete this.DEBUG;
		return this.DEBUG = this.pref.getValue('DEBUG', false);
	},
	get disabled_scripts() {
		let ds = this.pref.getValue('script.disabled', '');
		delete this.disabled_scripts;
		return this.disabled_scripts = ds? ds.split('|') : [];
	},
	get disabled () this._disabled,
	set disabled (bool) {
		this._disabled = bool;
		if (bool) {
			gBrowser.mPanelContainer.removeEventListener('USL_DocumentStart', this.onDocumentStart, false);
			this.icon.setAttribute('src', this.OFF_IMAGE);
		} else {
			gBrowser.mPanelContainer.addEventListener('USL_DocumentStart', this.onDocumentStart, false);
			this.icon.setAttribute('src', this.ON_IMAGE);
		}
		return bool;
	},
	getFocusedWindow: function(){
		var win = document.commandDispatcher.focusedWindow;
		if (!win || win == window)
			win = content;
		return win;
	},
	init: function() {

		if (!hasDatabase) {
			try {
				var data = loadFile('UserScriptLoader.json');
				data = JSON.parse(data);
				database.pref = data.pref;
				database.resource = data.resource;
				debug('loaded UserScriptLoader.json');
			} catch(e){
				debug('can not load UserScriptLoader.json');
			}
		}

		ns._disabled = ns.pref.getValue('disabled', ns._disabled);

		if (ns.observer.disabled)
			ns.observer.register();
/*
		ns.icon = $('status-bar').appendChild($E(
			<statusbarpanel id="UserScriptLoader-icon" 
			                class="statusbarpanel-iconic"
			                context="UserScriptLoader-popup" 
			                onclick="UserScriptLoader.iconClick(event);" 
			                style="text-decoration: none;"/>
		));
*/
		ns.icon = $('urlbar-icons').appendChild($E(
			<image id="UserScriptLoader-icon" 
			       context="UserScriptLoader-popup" 
			       onclick="UserScriptLoader.iconClick(event);"
			       style="padding: 0px 2px;"/>
		));
		
		ns.popup = $('mainPopupSet').appendChild($E(
			<menupopup id="UserScriptLoader-popup" 
			           onpopupshowing="UserScriptLoader.onPopupShowing(event);"
			           onpopuphidden="UserScriptLoader.onPopupHidden(event);"
			           onclick="UserScriptLoader.menuClick(event);">
				<menuseparator id="UserScriptLoader-menuseparator"/>
				<menu label="User Script Command"
				      id="UserScriptLoader-register-menu" accesskey="C">
					<menupopup id="UserScriptLoader-register-popup"/>
				</menu>
				<menuitem label="Save Script"
				          id="UserScriptLoader-saveMenu"
				          accesskey="S"
				          oncommand="UserScriptLoader.saveScript();"
				          collapsed={!ns.SAVE_SCRIPT_MENU}/>
				<menu label="Menu" id="UserScriptLoader-submenu">
					<menupopup id="UserScriptLoader-submenu-popup">
						<menuitem label="delete resource / require" oncommand="UserScriptLoader.deleteStorage('resource');"/>
						<menuitem label="delete pref storage" oncommand="UserScriptLoader.deleteStorage('pref');"/>
						<menuseparator/>
						<menuitem label="Hide exclude script"
						          id="UserScriptLoader-hide-exclude"
						          accesskey="N"
						          type="checkbox"
						          checked={ns.HIDE_EXCLUDE}
						          oncommand="UserScriptLoader.HIDE_EXCLUDE = !UserScriptLoader.HIDE_EXCLUDE;"/>
						<menuitem label="Open Scripts Folder"
						          id="UserScriptLoader-openFolderMenu"
						          accesskey="O"
						          oncommand="UserScriptLoader.openFolder();"
						          collapsed={!ns.OPEN_FOLDER_MENU}/>
						<menuitem label="Rebuild"
						          accesskey="R"
						          oncommand="UserScriptLoader.rebuild();"/>
						<menuitem label="Auto Rebuild"
						          id="UserScriptLoader-auto-rebuild"
						          accesskey="A"
						          type="checkbox"
						          checked={ns.AUTO_REBUILD}
						          oncommand="UserScriptLoader.AUTO_REBUILD = !UserScriptLoader.AUTO_REBUILD;"/>
					</menupopup>
				</menu>
			</menupopup>
		));

		ns.menuseparator   = $('UserScriptLoader-menuseparator');
		ns.registMenu      = $('UserScriptLoader-register-menu');
		ns.registPopup     = $('UserScriptLoader-register-popup');
		ns.openFolderMenu  = $('UserScriptLoader-openFolderMenu');
		ns.saveMenu        = $('UserScriptLoader-saveMenu');
		ns.hideExcludeMenu = $('UserScriptLoader-hide-exclude');
		ns.autoRebuildMenu = $('UserScriptLoader-auto-rebuild');

		ns.importScripts();
		ns.disabled = ns._disabled;
		window.addEventListener('unload', ns.uninit, false);
	},
	uninit: function(event) {
		let disabledScripts = ns.readScripts.reduce(function(ret, script) {
			if (script._disabled)
				ret.push(script._leafName);
			return ret;
		}, []);
		var pref = ns.pref || new PrefManager();
		pref.setValue('script.disabled', disabledScripts.join('|'));
		pref.setValue('disabled', ns._disabled);
		pref.setValue('HIDE_EXCLUDE', ns.HIDE_EXCLUDE);
		if (!ns.disabled) ns.disabled = true;
		if (event) {
			let list = Services.wm.getEnumerator('navigator:browser');
			while(list.hasMoreElements()) {
				if (list.getNext() != window)
					return
			}
			ns.observer.unregister();
		}
	},
	theEnd: function() {
		ns.uninit();
		ns.icon.parentNode.removeChild(ns.icon);
		ns.popup.parentNode.removeChild(ns.popup);
	},
	importScripts: function() {
		ns.readScripts = [];
		ns.runAtStartScripts = [];
		ns.runAtEndScripts = [];

		let ext = /\.user\.js$/i;
		let files = ns.SCRIPTS_FOLDER.directoryEntries.QueryInterface(Ci.nsISimpleEnumerator);
		while (files.hasMoreElements()) {
			let file = files.getNext().QueryInterface(Ci.nsIFile);
			if (ext.test(file.leafName))
				ns.loadScript(file);
		}
	},
	rebuild: function() {
		let disabledScripts = ns.readScripts.reduce(function(ret, script) {
			if (script._disabled)
				ret.push(script._leafName);
			return ret;
		}, []);
		ns.disabled_scripts = disabledScripts;
		ns.importScripts();
		ns.DEBUG = ns.pref.getValue('DEBUG', ns.DEBUG);
	},
	openFolder: function() {
		ns.SCRIPTS_FOLDER.launch();
	},
	saveScript: function() {
		var win = ns.getFocusedWindow();

		var url = win.location.href;
		var doc = win.document;
		var pre = doc.querySelector('body > pre');
		var filename = pre && /@name\s+([^\n]+)/i.test(pre.textContent)?
			RegExp.$1 + '.user.js':
			/[^/]+$/i.exec(url)[0];

		var lastDir = gPrefService.getCharPref('browser.download.lastDir');
		gPrefService.setCharPref('browser.download.lastDir', ns.SCRIPTS_FOLDER.path);
		saveURL( url, filename, null, true, false, makeURI(url, doc.characterSet) );
		gPrefService.setCharPref('browser.download.lastDir', lastDir);
	},
	deleteStorage: function(type) {
		var data = database[type];
		var list = [x for(x in data)];
		if (list.length == 0)
			return alert(type + ' is none.');

		list.push('All ' + type);
		var selected = {};
		var ok = Services.prompt.select(
			window, "UserScriptLoader " + type, "Select delete URL.", list.length, list, selected);

		if (!ok) return;
		if (selected.value == list.length -1) {
			list.pop();
			list.forEach(function(url, i, a) {
				delete data[url]
			});
			return;
		}
		delete data[list[selected.value]];
	},
	loadScript: function(aFile) {
		var script = new ScriptEntry(aFile);
		script._disabled = ns.disabled_scripts.indexOf(script._leafName) >= 0;
		ns.readScripts.push(script);
		var runat = script['run-at'];
		if (runat === 'document-start') {
			ns.runAtStartScripts.push(script);
		}
		else {
			ns.runAtEndScripts.push(script);
		}
		return;
	},
	onPopupShowing: function(event) {
		var win = ns.getFocusedWindow();
		var popup = event.target;

		switch(popup.id) {
			case 'UserScriptLoader-popup':
				var run = win.USL_run;
				ns.readScripts.forEach(function(script) {
					if (ns.HIDE_DISABLED_SCRIPT && script._disabled) return;
					if (ns.HIDE_EXCLUDE && !script._isURLMatching(win.location.href)) return;

					let m = document.createElement('menuitem');
					m.setAttribute('label', script.name || script._leafName);
					m.setAttribute('checked', !script._disabled);
					m.setAttribute('type', 'checkbox');
					m.setAttribute('oncommand', 'this.script._disabled = !this.script._disabled;');
					m.script = script;
					
					if (run && run.indexOf(script) >= 0)
						m.style.fontWeight = 'bold';
					ns.popup.insertBefore(m, ns.menuseparator);
				}, ns);
				
				ns.saveMenu.hidden = win.location.href.indexOf('.js') == -1;
				ns.registMenu.hidden = win.USL_registerCommands && win.USL_registerCommands.length == 0;
				break;

			case 'UserScriptLoader-register-popup':
				var registers = win.USL_registerCommands;
				if (!registers) return;
				registers.forEach(function(item, i, a) {
					let m = document.createElement('menuitem');
					m.setAttribute('label', item.label);
					m.setAttribute('tooltiptext', item.tooltiptext);
					m.setAttribute('oncommand', 'this.registCommand();');
					m.registCommand = item.func;
					popup.appendChild(m);
				}, ns);
				break;

			case 'UserScriptLoader-submenu-popup':
				ns.hideExcludeMenu.setAttribute('checked', ns.HIDE_EXCLUDE);
				ns.autoRebuildMenu.setAttribute('checked', ns.AUTO_REBUILD);
				break;
		}
	},
	onPopupHidden: function(event) {
		var popup = event.target;
		switch(popup.id) {
			case 'UserScriptLoader-popup':
			case 'UserScriptLoader-register-popup':
				var child = popup.firstChild;
				while (child && child.localName == 'menuitem') {
					popup.removeChild(child);
					child = popup.firstChild;
				}
				break;
		}
	},
	menuClick: function(event){
		var menuitem = event.target;
		if (event.button == 0 || menuitem.getAttribute('type') != 'checkbox')
			return;

		event.preventDefault();
		event.stopPropagation();
		if (event.button == 1) {
			menuitem.doCommand();
			menuitem.setAttribute('checked', menuitem.getAttribute('checked') == 'true'? 'false' : 'true');
		} else if (event.button == 2 && ns.EDITOR && menuitem.script) {
			var app = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
			app.initWithPath(ns.EDITOR);
			var process = Cc['@mozilla.org/process/util;1'].createInstance(Ci.nsIProcess);
			process.init(app);
			process.run(false, [menuitem.script._path], 1);
		}
	},
	iconClick: function(event){
		if (event.button == 0) {
			ns.disabled = !ns.disabled;
			ns.pref.setValue('disabled', ns.disabled);
		} else if (event.button == 1) {
			ns.rebuild();
		}
	},
	onDocumentStart: function(event) {
		var doc = event.target;
		var win = doc.defaultView;
		win.USL_registerCommands = [];
		win.USL_run = [];
		ns.injectScripts(ns.readScripts, doc);
	},
	sidebarDocumentStart: function(event) {
		return;
	},
	injectScripts: function(scripts, aDocument) {
		if (scripts.length === 0) return;
		var contentWindow = aDocument.defaultView;

		function run(script, safeWindow) {
			safeWindow || (safeWindow = contentWindow);
			if (!/^(?:https?|data|file|chrome):/.test(safeWindow.location.protocol))
				return;

			if ("noframes" in script && 
			    safeWindow.frameElement && 
			    !(safeWindow.frameElement instanceof HTMLFrameElement))
				return false;

			if (!script._isURLMatching(safeWindow.location.href))
				return false;

			if (safeWindow.USL_run.indexOf(script) >= 0) {
				debug('DABUTTAYO!!!!! ' + script.name + safeWindow.location.href);
				return false;
			}

			let sandbox = new Cu.Sandbox(safeWindow);
			sandbox.GM_log = log;
			sandbox.GM_xmlhttpRequest = GM_xmlhttpRequest;
			sandbox.GM_openInTab = function(url) { openNewTabWith(url); };
			sandbox.GM_registerMenuCommand = function(label, func) {
				safeWindow.USL_registerCommands.push({ label:label, func:func, tooltiptext:(script.name || script._leafName) });
			}
			sandbox.GM_getResourceText = function(name) {
				let obj = script._resourceValues[name];
				if (obj) {
					return obj.bytes;
				}
			}
			sandbox.GM_getResourceURL  = function(name) {
				let obj = script._resourceValues[name];
				if (obj) {
					return 'data:' + obj.contentType + ';base64,' + btoa(obj.bytes);
				}
			}
			sandbox.GM_addStyle = function(code) GM_addStyle(code, sandbox.document);
			sandbox.GM_setValue = function(name, value) {
				return ns.USE_STORAGE_NAME.indexOf(name) >= 0?
					database.pref[script._prefName + name] = value:
					script._pref.setValue(name, value);
			}
			sandbox.GM_getValue = function(name, def) {
				return ns.USE_STORAGE_NAME.indexOf(name) >= 0?
					database.pref[script._prefName + name] || def:
					script._pref.getValue(name, def);
			}
			sandbox.GM_listValues = function() {
				var p = script._pref.listValues();
				var s = [x for(x in database.pref[script._prefName + name])];
				s.forEach(function(e, i, a) a[i] = e.replace(script._prefName, ''));
				p.push.apply(p, s);
				return p;
			}
			sandbox.GM_deleteValue = function(name) {
				return ns.USE_STORAGE_NAME.indexOf(name) >= 0?
					delete database.pref[script._prefName + name]:
					script._pref.deleteValue(name);
			}
			sandbox.GM_setClipboard = function(str) {
				if (str.constructor === String ||
				    str.constructor === Number) {
					Cc['@mozilla.org/widget/clipboardhelper;1'].getService(Ci.nsIClipboardHelper).copyString(str);
					return;
				}
				return error('GM_setClipboard error.');
			}
			sandbox.unsafeWindow = safeWindow.wrappedJSObject;
			sandbox.window       = {
				get AutoPagerize() {
					return safeWindow.AutoPagerize;
				},
				set AutoPagerize(a) {
					delete this.AutoPagerize;
					return this.AutoPagerize = a;
				},
				__proto__: safeWindow
			};
			sandbox.document     = safeWindow.document;
			sandbox.XPathResult  = Ci.nsIDOMXPathResult;
			sandbox.console      = sandbox.unsafeWindow.console || new Console();
			sandbox.__proto__    = safeWindow;
			ns.evalInSandbox(script, sandbox);
			safeWindow.USL_run.push(script);
		}

		scripts.filter(function(script, index) {
			if (script["run-at"] === "document-start") {
				if (contentWindow.location.href) {
					run(script, contentWindow);
				} else {
					contentWindow.addEventListener('readystatechange', function(event){
						if (!contentWindow.location.href) return;
						event.currentTarget.removeEventListener(event.type, arguments.callee, true);
						run(script, event.target.defaultView);
					}, true);
				}
			} else if (script["run-at"] === "window-load"){
				contentWindow.addEventListener("load", function(event) {
					event.currentTarget.removeEventListener(event.type, arguments.callee, false);
					run(script, event.target);
				}, false);
			} else {
				contentWindow.addEventListener("DOMContentLoaded", function(event) {
					event.currentTarget.removeEventListener(event.type, arguments.callee, true);
					if (script['run-at'] === 'document-idle') {
						setTimeout(run, 0, script, event.target.defaultView);
					} else {
						run(script, event.target.defaultView);
					}
				}, true);
			}
		});

	},
	evalInSandbox: function(aScript, aSandbox) {
		try{
			var lineFinder = new Error();
			Cu.evalInSandbox('(function() {' + aScript._requireSrc + '\n' + aScript._code + '\n})();', aSandbox, "1.8");
		} catch(e) {
			error([
				aScript.name
				,'line:' + (e.lineNumber - lineFinder.lineNumber)
				,e
			].join("\n"));
		}
	},
}


// Class
function PrefManager(str) {
	var root = 'UserScriptLoader.';
	if (str)
		root += str;
	this.pref = Services.prefs.getBranch(root);
}
PrefManager.prototype = {
	setValue: function(name, value) {
		try {
			switch(typeof value) {
				case 'string' :
					var str = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
					str.data = value;
					this.pref.setComplexValue(name, Ci.nsISupportsString, str);
					break;
				case 'number' : this.pref.setIntPref(name, value); break;
				case 'boolean': this.pref.setBoolPref(name, value); break;
			}
		} catch(e) { }
	},
	getValue: function(name, defaultValue){
		var value = defaultValue;
		try {
			switch(this.pref.getPrefType(name)) {
				case Ci.nsIPrefBranch.PREF_STRING: value = this.pref.getComplexValue(name, Ci.nsISupportsString).data; break;
				case Ci.nsIPrefBranch.PREF_INT   : value = this.pref.getIntPref(name); break;
				case Ci.nsIPrefBranch.PREF_BOOL  : value = this.pref.getBoolPref(name); break;
			}
		} catch(e) { }
		return value;
	},
	deleteValue: function(name) {
		try {
			this.pref.deleteBranch(name);
		} catch(e) { }
	},
	listValues: function() this.pref.getChildList("", {}),
};

function ScriptEntry(aFile) {
	this._readFile(aFile);
	this._getMetadata();
	this._init();

	this._includeRegExp = !this.include || this.include == '*'?
		new RegExp("^https?://") :
		this._createRegExp(this.include);
	this._excludeRegExp = !this.exclude || this.exclude == '*'?
		null :
		this._createRegExp(this.exclude);
	this._prefName = 'scriptival.' + (this.namespace || 'nonamespace/') + '/' + (this.name || this._leafName) + '.';

	this._getResource();
}
ScriptEntry.prototype = {
	_init: function() {
		this._disabled = false;
		this._requires = this.require? this.require.split('\n') : [];
		this._requireSrc = '';
		this._resources = {};
		this._resourceValues = {};
		if (!this['run-at'])
			this['run-at'] = 'document-end';
		if (this.resource) {
			let resource = this.resource.split('\n');
			for (let i = 0, l = resource.length; i < l; i++) {
				let res = resource[i].split(/\s+/);
				this._resources[res[0]] = res[1];
			}
		}

		this.__defineGetter__('_pref', function() {
			delete this._pref;
			return this._pref = new PrefManager(this._prefName);
		});
	},
	_readFile: function(aFile) {
		var stream = Cc['@mozilla.org/network/file-input-stream;1'].createInstance(Ci.nsIFileInputStream);
		stream.init(aFile,1,0,false);
		var ss = Cc['@mozilla.org/scriptableinputstream;1'].createInstance(Ci.nsIScriptableInputStream);
		ss.init(stream);
		var data = ss.read(ss.available());
		ss.close();
		stream.close();
		try {
			data = decodeURIComponent(escape(data));
		} catch(e) {  }
		this._code = data;
		this._leafName = aFile.leafName;
		this._path = aFile.path;
	},
	_getMetadata: function() {
		let m = this._code.match(/\/\/\s*==UserScript==[\s\S]+?\/\/\s*==\/UserScript==/);
		if (!m)
			return;
		m = (m+'').split(/[\r\n]+/);
		for (let i = 0; i < m.length; i++) {
			if (!/\/\/\s*?@(\S+)($|\s+([^\r\n]+))/.test(m[i]))
				continue;
			let name  = RegExp.$1;
			let value = RegExp.$3;
			if (this[name]) {
				this[name] += '\n' + value;
			} else {
				this[name] = value;
			}
		}
	},
	_createRegExp: function(urlstr) {
		let regstr = urlstr.split('\n').map(function(str) {
			var res = '^' + str.replace(/([()[\]{}|+.,^$?\\])/g, "\\$1").replace(/\*/g, '.*');

			// from UCJSToolkit wildcardToRegex
			var tldRegExp = new RegExp("^(\\^(?:[^/]*)(?://)?(?:[^/]*))(\\\\\\.tld)((?:/.*)?)$");
			var tldRes = res.match(tldRegExp);
			if (tldRes) {
				var tldStr = "\.(?:demon\\.co\\.uk|esc\\.edu\\.ar|(?:c[oi]\\.)?[^\\.]\\.(?:vt|ne|ks|il|hi|sc|nh|ia|wy|or|ma|vi|tn|in|az|id|nc|co|dc|nd|me|al|ak|de|wv|nm|mo|pr|nj|sd|md|va|ri|ut|ct|pa|ok|ky|mt|ga|la|oh|ms|wi|wa|gu|mi|tx|fl|ca|ar|mn|ny|nv)\\.us|[^\\.]\\.(?:(?:pvt\\.)?k12|cc|tec|lib|state|gen)\\.(?:vt|ne|ks|il|hi|sc|nh|ia|wy|or|ma|vi|tn|in|az|id|nc|co|dc|nd|me|al|ak|de|wv|nm|mo|pr|nj|sd|md|va|ri|ut|ct|pa|ok|ky|mt|ga|la|oh|ms|wi|wa|gu|mi|tx|fl|ca|ar|mn|ny|nv)\\.us|[^\\.]\\.vt|ne|ks|il|hi|sc|nh|ia|wy|or|ma|vi|tn|in|az|id|nc|co|dc|nd|me|al|ak|de|wv|nm|mo|pr|nj|sd|md|va|ri|ut|ct|pa|ok|ky|mt|ga|la|oh|ms|wi|wa|gu|mi|tx|fl|ca|ar|mn|ny|nvus|ne|gg|tr|mm|ki|biz|sj|my|hn|gl|ro|tn|co|br|coop|cy|bo|ck|tc|bv|ke|aero|cs|dm|km|bf|af|mv|ls|tm|jm|pg|ky|ga|pn|sv|mq|hu|za|se|uy|iq|ai|com|ve|na|ba|ph|xxx|no|lv|tf|kz|ma|in|id|si|re|om|by|fi|gs|ir|li|tz|td|cg|pa|am|tv|jo|bi|ee|cd|pk|mn|gd|nz|as|lc|ae|cn|ag|mx|sy|cx|cr|vi|sg|bm|kh|nr|bz|vu|kw|gf|al|uz|eh|int|ht|mw|gm|bg|gu|info|aw|gy|ac|ca|museum|sk|ax|es|kp|bb|sa|et|ie|tl|org|tj|cf|im|mk|de|pro|md|fm|cl|jp|bn|vn|gp|sm|ar|dj|bd|mc|ug|nu|ci|dk|nc|rw|aq|name|st|hm|mo|gq|ps|ge|ao|gr|va|is|mt|gi|la|bh|ms|bt|gb|it|wf|sb|ly|ng|gt|lu|il|pt|mh|eg|kg|pf|um|fr|sr|vg|fj|py|pm|sn|sd|au|sl|gh|us|mr|dz|ye|kn|cm|arpa|bw|lk|mg|tk|su|sc|ru|travel|az|ec|mz|lb|ml|bj|edu|pr|fk|lr|nf|np|do|mp|bs|to|cu|ch|yu|eu|mu|ni|pw|pl|gov|pe|an|ua|uk|gw|tp|kr|je|tt|net|fo|jobs|yt|cc|sh|io|zm|hk|th|so|er|cz|lt|mil|hr|gn|be|qa|cv|vc|tw|ws|ad|sz|at|tg|zw|nl|info\\.tn|org\\.sd|med\\.sd|com\\.hk|org\\.ai|edu\\.sg|at\\.tt|mail\\.pl|net\\.ni|pol\\.dz|hiroshima\\.jp|org\\.bh|edu\\.vu|net\\.im|ernet\\.in|nic\\.tt|com\\.tn|go\\.cr|jersey\\.je|bc\\.ca|com\\.la|go\\.jp|com\\.uy|tourism\\.tn|com\\.ec|conf\\.au|dk\\.org|shizuoka\\.jp|ac\\.vn|matsuyama\\.jp|agro\\.pl|yamaguchi\\.jp|edu\\.vn|yamanashi\\.jp|mil\\.in|sos\\.pl|bj\\.cn|net\\.au|ac\\.ae|psi\\.br|sch\\.ng|org\\.mt|edu\\.ai|edu\\.ck|ac\\.yu|org\\.ws|org\\.ng|rel\\.pl|uk\\.tt|com\\.py|aomori\\.jp|co\\.ug|video\\.hu|net\\.gg|org\\.pk|id\\.au|gov\\.zw|mil\\.tr|net\\.tn|org\\.ly|re\\.kr|mil\\.ye|mil\\.do|com\\.bb|net\\.vi|edu\\.na|co\\.za|asso\\.re|nom\\.pe|edu\\.tw|name\\.et|jl\\.cn|gov\\.ye|ehime\\.jp|miyazaki\\.jp|kanagawa\\.jp|gov\\.au|nm\\.cn|he\\.cn|edu\\.sd|mod\\.om|web\\.ve|edu\\.hk|medecin\\.fr|org\\.cu|info\\.au|edu\\.ve|nx\\.cn|alderney\\.gg|net\\.cu|org\\.za|mb\\.ca|com\\.ye|edu\\.pa|fed\\.us|ac\\.pa|alt\\.na|mil\\.lv|fukuoka\\.jp|gen\\.in|gr\\.jp|gov\\.br|gov\\.ac|id\\.fj|fukui\\.jp|hu\\.com|org\\.gu|net\\.ae|mil\\.ph|ltd\\.je|alt\\.za|gov\\.np|edu\\.jo|net\\.gu|g12\\.br|org\\.tn|store\\.co|fin\\.tn|ac\\.nz|gouv\\.fr|gov\\.il|org\\.ua|org\\.do|org\\.fj|sci\\.eg|gov\\.tt|cci\\.fr|tokyo\\.jp|net\\.lv|gov\\.lc|ind\\.br|ca\\.tt|gos\\.pk|hi\\.cn|net\\.do|co\\.tv|web\\.co|com\\.pa|com\\.ng|ac\\.ma|gov\\.bh|org\\.zw|csiro\\.au|lakas\\.hu|gob\\.ni|gov\\.fk|org\\.sy|gov\\.lb|gov\\.je|ed\\.cr|nb\\.ca|net\\.uy|com\\.ua|media\\.hu|com\\.lb|nom\\.pl|org\\.br|hk\\.cn|co\\.hu|org\\.my|gov\\.dz|sld\\.pa|gob\\.pk|net\\.uk|guernsey\\.gg|nara\\.jp|telememo\\.au|k12\\.tr|org\\.nz|pub\\.sa|edu\\.ac|com\\.dz|edu\\.lv|edu\\.pk|com\\.ph|net\\.na|net\\.et|id\\.lv|au\\.com|ac\\.ng|com\\.my|net\\.cy|unam\\.na|nom\\.za|net\\.np|info\\.pl|priv\\.hu|rec\\.ve|ac\\.uk|edu\\.mm|go\\.ug|ac\\.ug|co\\.dk|net\\.tt|oita\\.jp|fi\\.cr|org\\.ac|aichi\\.jp|org\\.tt|edu\\.bh|us\\.com|ac\\.kr|js\\.cn|edu\\.ni|com\\.mt|fam\\.pk|experts-comptables\\.fr|or\\.kr|org\\.au|web\\.pk|mil\\.jo|biz\\.pl|org\\.np|city\\.hu|org\\.uy|auto\\.pl|aid\\.pl|bib\\.ve|mo\\.cn|br\\.com|dns\\.be|sh\\.cn|org\\.mo|com\\.sg|me\\.uk|gov\\.kw|eun\\.eg|kagoshima\\.jp|ln\\.cn|seoul\\.kr|school\\.fj|com\\.mk|e164\\.arpa|rnu\\.tn|pro\\.ae|org\\.om|gov\\.my|net\\.ye|gov\\.do|co\\.im|org\\.lb|plc\\.co\\.im|net\\.jp|go\\.id|net\\.tw|gov\\.ai|tlf\\.nr|ac\\.im|com\\.do|net\\.py|tozsde\\.hu|com\\.na|tottori\\.jp|net\\.ge|gov\\.cn|org\\.bb|net\\.bs|ac\\.za|rns\\.tn|biz\\.pk|gov\\.ge|org\\.uk|org\\.fk|nhs\\.uk|net\\.bh|tm\\.za|co\\.nz|gov\\.jp|jogasz\\.hu|shop\\.pl|media\\.pl|chiba\\.jp|city\\.za|org\\.ck|net\\.id|com\\.ar|gon\\.pk|gov\\.om|idf\\.il|net\\.cn|prd\\.fr|co\\.in|or\\.ug|red\\.sv|edu\\.lb|k12\\.ec|gx\\.cn|net\\.nz|info\\.hu|ac\\.zw|info\\.tt|com\\.ws|org\\.gg|com\\.et|ac\\.jp|ac\\.at|avocat\\.fr|org\\.ph|sark\\.gg|org\\.ve|tm\\.pl|net\\.pg|gov\\.co|com\\.lc|film\\.hu|ishikawa\\.jp|hotel\\.hu|hl\\.cn|edu\\.ge|com\\.bm|ac\\.om|tec\\.ve|edu\\.tr|cq\\.cn|com\\.pk|firm\\.in|inf\\.br|gunma\\.jp|gov\\.tn|oz\\.au|nf\\.ca|akita\\.jp|net\\.sd|tourism\\.pl|net\\.bb|or\\.at|idv\\.tw|dni\\.us|org\\.mx|conf\\.lv|net\\.jo|nic\\.in|info\\.vn|pe\\.kr|tw\\.cn|org\\.eg|ad\\.jp|hb\\.cn|kyonggi\\.kr|bourse\\.za|org\\.sb|gov\\.gg|net\\.br|mil\\.pe|kobe\\.jp|net\\.sa|edu\\.mt|org\\.vn|yokohama\\.jp|net\\.il|ac\\.cr|edu\\.sb|nagano\\.jp|travel\\.pl|gov\\.tr|com\\.sv|co\\.il|rec\\.br|biz\\.om|com\\.mm|com\\.az|org\\.vu|edu\\.ng|com\\.mx|info\\.co|realestate\\.pl|mil\\.sh|yamagata\\.jp|or\\.id|org\\.ae|greta\\.fr|k12\\.il|com\\.tw|gov\\.ve|arts\\.ve|cul\\.na|gov\\.kh|org\\.bm|etc\\.br|or\\.th|ch\\.vu|de\\.tt|ind\\.je|org\\.tw|nom\\.fr|co\\.tt|net\\.lc|intl\\.tn|shiga\\.jp|pvt\\.ge|gov\\.ua|org\\.pe|net\\.kh|co\\.vi|iwi\\.nz|biz\\.vn|gov\\.ck|edu\\.eg|zj\\.cn|press\\.ma|ac\\.in|eu\\.tt|art\\.do|med\\.ec|bbs\\.tr|gov\\.uk|edu\\.ua|eu\\.com|web\\.do|szex\\.hu|mil\\.kh|gen\\.nz|okinawa\\.jp|mob\\.nr|edu\\.ws|edu\\.sv|xj\\.cn|net\\.ru|dk\\.tt|erotika\\.hu|com\\.sh|cn\\.com|edu\\.pl|com\\.nc|org\\.il|arts\\.co|chirurgiens-dentistes\\.fr|net\\.pa|takamatsu\\.jp|net\\.ng|org\\.hu|net\\.in|net\\.vu|gen\\.tr|shop\\.hu|com\\.ae|tokushima\\.jp|za\\.com|gov\\.eg|co\\.jp|uba\\.ar|net\\.my|biz\\.et|art\\.br|ac\\.fk|gob\\.pe|com\\.bs|co\\.ae|de\\.net|net\\.eg|hyogo\\.jp|edunet\\.tn|museum\\.om|nom\\.ve|rnrt\\.tn|hn\\.cn|com\\.fk|edu\\.dz|ne\\.kr|co\\.je|sch\\.uk|priv\\.pl|sp\\.br|net\\.hk|name\\.vn|com\\.sa|edu\\.bm|qc\\.ca|bolt\\.hu|per\\.kh|sn\\.cn|mil\\.id|kagawa\\.jp|utsunomiya\\.jp|erotica\\.hu|gd\\.cn|net\\.tr|edu\\.np|asn\\.au|com\\.gu|ind\\.tn|mil\\.br|net\\.lb|nom\\.co|org\\.la|mil\\.pl|ac\\.il|gov\\.jo|com\\.kw|edu\\.sh|otc\\.au|gmina\\.pl|per\\.sg|gov\\.mo|int\\.ve|news\\.hu|sec\\.ps|ac\\.pg|health\\.vn|sex\\.pl|net\\.nc|qc\\.com|idv\\.hk|org\\.hk|gok\\.pk|com\\.ac|tochigi\\.jp|gsm\\.pl|law\\.za|pro\\.vn|edu\\.pe|info\\.et|sch\\.gg|com\\.vn|gov\\.bm|com\\.cn|mod\\.uk|gov\\.ps|toyama\\.jp|gv\\.at|yk\\.ca|org\\.et|suli\\.hu|edu\\.my|org\\.mm|co\\.yu|int\\.ar|pe\\.ca|tm\\.hu|net\\.sb|org\\.yu|com\\.ru|com\\.pe|edu\\.kh|edu\\.kw|org\\.qa|med\\.om|net\\.ws|org\\.in|turystyka\\.pl|store\\.ve|org\\.bs|mil\\.uy|net\\.ar|iwate\\.jp|org\\.nc|us\\.tt|gov\\.sh|nom\\.fk|go\\.th|gov\\.ec|com\\.br|edu\\.do|gov\\.ng|pro\\.tt|sapporo\\.jp|net\\.ua|tm\\.fr|com\\.lv|com\\.mo|edu\\.uk|fin\\.ec|edu\\.ps|ru\\.com|edu\\.ec|ac\\.fj|net\\.mm|veterinaire\\.fr|nom\\.re|ingatlan\\.hu|fr\\.vu|ne\\.jp|int\\.co|gov\\.cy|org\\.lv|de\\.com|nagasaki\\.jp|com\\.sb|gov\\.za|org\\.lc|com\\.fj|ind\\.in|or\\.cr|sc\\.cn|chambagri\\.fr|or\\.jp|forum\\.hu|tmp\\.br|reklam\\.hu|gob\\.sv|com\\.pl|saitama\\.jp|name\\.tt|niigata\\.jp|sklep\\.pl|nom\\.ni|co\\.ma|net\\.la|co\\.om|pharmacien\\.fr|port\\.fr|mil\\.gu|au\\.tt|edu\\.gu|ngo\\.ph|com\\.ve|ac\\.th|gov\\.fj|barreau\\.fr|net\\.ac|ac\\.je|org\\.kw|sport\\.hu|ac\\.cn|net\\.bm|ibaraki\\.jp|tel\\.no|org\\.cy|edu\\.mo|gb\\.net|kyoto\\.jp|sch\\.sa|com\\.au|edu\\.lc|fax\\.nr|gov\\.mm|it\\.tt|org\\.jo|nat\\.tn|mil\\.ve|be\\.tt|org\\.az|rec\\.co|co\\.ve|gifu\\.jp|net\\.th|hokkaido\\.jp|ac\\.gg|go\\.kr|edu\\.ye|qh\\.cn|ab\\.ca|org\\.cn|no\\.com|co\\.uk|gov\\.gu|de\\.vu|miasta\\.pl|kawasaki\\.jp|co\\.cr|miyagi\\.jp|org\\.jp|osaka\\.jp|web\\.za|net\\.za|gov\\.pk|gov\\.vn|agrar\\.hu|asn\\.lv|org\\.sv|net\\.sh|org\\.sa|org\\.dz|assedic\\.fr|com\\.sy|net\\.ph|mil\\.ge|es\\.tt|mobile\\.nr|co\\.kr|ltd\\.uk|ac\\.be|fgov\\.be|geek\\.nz|ind\\.gg|net\\.mt|maori\\.nz|ens\\.tn|edu\\.py|gov\\.sd|gov\\.qa|nt\\.ca|com\\.pg|org\\.kh|pc\\.pl|com\\.eg|net\\.ly|se\\.com|gb\\.com|edu\\.ar|sch\\.je|mil\\.ac|mil\\.ar|okayama\\.jp|gov\\.sg|ac\\.id|co\\.id|com\\.ly|huissier-justice\\.fr|nic\\.im|gov\\.lv|nu\\.ca|org\\.sg|com\\.kh|org\\.vi|sa\\.cr|lg\\.jp|ns\\.ca|edu\\.co|gov\\.im|edu\\.om|net\\.dz|org\\.pl|pp\\.ru|tm\\.mt|org\\.ar|co\\.gg|org\\.im|edu\\.qa|org\\.py|edu\\.uy|targi\\.pl|com\\.ge|gub\\.uy|gov\\.ar|ltd\\.gg|fr\\.tt|net\\.qa|com\\.np|ass\\.dz|se\\.tt|com\\.ai|org\\.ma|plo\\.ps|co\\.at|med\\.sa|net\\.sg|kanazawa\\.jp|com\\.fr|school\\.za|net\\.pl|ngo\\.za|net\\.sy|ed\\.jp|org\\.na|net\\.ma|asso\\.fr|police\\.uk|powiat\\.pl|govt\\.nz|sk\\.ca|tj\\.cn|mil\\.ec|com\\.jo|net\\.mo|notaires\\.fr|avoues\\.fr|aeroport\\.fr|yn\\.cn|gov\\.et|gov\\.sa|gov\\.ae|com\\.tt|art\\.dz|firm\\.ve|com\\.sd|school\\.nz|edu\\.et|gob\\.pa|telecom\\.na|ac\\.cy|gz\\.cn|net\\.kw|mobil\\.nr|nic\\.uk|co\\.th|com\\.vu|com\\.re|belgie\\.be|nl\\.ca|uk\\.com|com\\.om|utazas\\.hu|presse\\.fr|co\\.ck|xz\\.cn|org\\.tr|mil\\.co|edu\\.cn|net\\.ec|on\\.ca|konyvelo\\.hu|gop\\.pk|net\\.om|info\\.ve|com\\.ni|sa\\.com|com\\.tr|sch\\.sd|fukushima\\.jp|tel\\.nr|atm\\.pl|kitakyushu\\.jp|com\\.qa|firm\\.co|edu\\.tt|games\\.hu|mil\\.nz|cri\\.nz|net\\.az|org\\.ge|mie\\.jp|net\\.mx|sch\\.ae|nieruchomosci\\.pl|int\\.vn|edu\\.za|com\\.cy|wakayama\\.jp|gov\\.hk|org\\.pa|edu\\.au|gov\\.in|pro\\.om|2000\\.hu|szkola\\.pl|shimane\\.jp|co\\.zw|gove\\.tw|com\\.co|net\\.ck|net\\.pk|net\\.ve|org\\.ru|uk\\.net|org\\.co|uu\\.mt|com\\.cu|mil\\.za|plc\\.uk|lkd\\.co\\.im|gs\\.cn|sex\\.hu|net\\.je|kumamoto\\.jp|mil\\.lb|edu\\.yu|gov\\.ws|sendai\\.jp|eu\\.org|ah\\.cn|net\\.vn|gov\\.sb|net\\.pe|nagoya\\.jp|geometre-expert\\.fr|net\\.fk|biz\\.tt|org\\.sh|edu\\.sa|saga\\.jp|sx\\.cn|org\\.je|org\\.ye|muni\\.il|kochi\\.jp|com\\.bh|org\\.ec|priv\\.at|gov\\.sy|org\\.ni|casino\\.hu|res\\.in|uy\\.com)"
				//var tldStr = "\.(?:(?:[a-z0-9]{2}\.)?[a-z0-9]{2,3}|(?:[a-z]+\.)?jp)";
				res = tldRes[1] + tldStr + tldRes[3];
			}
			return res + "$";
		}).join('|');
		return new RegExp(regstr);
	},
	_isURLMatching: function(url) {
		return  !this._disabled && 
		         this._includeRegExp.test(url) &&
		       (!this._excludeRegExp || 
		        !this._excludeRegExp.test(url));
	},
	_getResource: function() {
		var self = this;
		if (this._requires.length) {
			for (let i = 0, l = this._requires.length; i < l; i++) {
				let requireURL = this._requires[i];
				let obj = database.resource[requireURL];
				if (obj) {
					let val = obj.bytes;
					try {
						val = decodeURIComponent(escape(val));
					} catch (e) { }
					this._requireSrc += val + '\n';
					continue;
				}
				getContents(requireURL, function(bytes, contentType){
					var obj = {
						bytes: bytes,
						contentType: contentType
					};
					database.resource[requireURL] = obj;
					let val = bytes;
					try {
						val = decodeURIComponent(escape(val));
					} catch (e) { }
					self._requireSrc += val + '\n';
				});
			}
		}

		for (let n in this._resources) {
			let nn = n;
			let resourceURL = this._resources[nn];
			let obj = database.resource[resourceURL];
			if (obj) {
				self._resourceValues[nn] = obj;
				continue;
			}
			getContents(resourceURL, function(bytes, contentType){
				let obj = {
					bytes: bytes,
					contentType: contentType
				};
				database.resource[resourceURL] = obj;
				self._resourceValues[nn] = obj;
			});
		}
	}
};

function Console() {}
Console.prototype = {
	log: function(str){ Application.console.log(str); },
	dir: function(obj){ window.inspectObject? inspectObject(obj): this.log(obj); },
	time: function(name) { this['_' + name] = new Date().getTime(); },
	timeEnd: function(name) {
		if (typeof this['_' + name] == 'undefined')
			return this.log('timeEnd: Error' + name);
		this.log(name + ':' + (new Date().getTime() - this['_' + name]));
		delete this['_' + name];
	},
	__noSuchMethod__: function(id, args){ this.log('console.' + id + ' is not function'); }
};

function getContents(aURL, callback){
	try{
		urlSecurityCheck(aURL, gBrowser.contentPrincipal,Ci.nsIScriptSecurityManager.DISALLOW_INHERIT_PRINCIPAL);
	}catch(ex){
		return;
	}

	var ioService = Services.io;

	var channel = ioService.newChannel(aURL,null,null);
	if (channel.URI.scheme != 'http' && channel.URI.scheme != 'https')
		return error('getContents is "http" or "https" only');

	var listener = {
		data: "",
		onStartRequest: function (request, context) {
			this.data = "";
		},
		onDataAvailable: function (request, context, inputStream, offset, count)  {
			var bs = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);
			bs.setInputStream(inputStream);
			var n =  bs.available();
			var bytes = bs.readBytes(n);
			this.data += bytes;
			bs.close();
		},
		onStopRequest: function (request, context, statusCode) {
			if (Components.isSuccessCode(statusCode)) {
				this.callback.apply(this, [this.data, channel.contentType]);
			} else {
				
			}
		},
		callback: callback
	};
	channel.asyncOpen(listener, null);
	debug("getContents: " + aURL);
}

function loadFile(name) {
	var file = Services.dirsvc.get('UChrm', Ci.nsIFile);
	file.append(name);
	var fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
	var sstream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
	fstream.init(file, -1, 0, 0);
	sstream.init(fstream);

	var data = sstream.read(sstream.available());
	try {
		data = decodeURIComponent(escape(data));
	} catch(e) {  }
	sstream.close();
	fstream.close();
	return data;
}

function saveFile(name, data) {
	var file = Services.dirsvc.get('UChrm', Ci.nsIFile);
	file.append(name);

	var suConverter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
	suConverter.charset = 'UTF-8';
	data = suConverter.ConvertFromUnicode(data);

	var foStream = Cc['@mozilla.org/network/file-output-stream;1'].createInstance(Ci.nsIFileOutputStream);
	foStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
	foStream.write(data, data.length);
	foStream.close();
};


function GM_addStyle(code, doc) {
	var head = doc.getElementsByTagName('head')[0];
	if (head) {
		var style = doc.createElement('style');
		style.type = 'text/css';
		style.appendChild(doc.createTextNode(code+''));
		head.appendChild(style);
		return style;
	}
}

function GM_xmlhttpRequest(obj) {
	if(typeof(obj) != 'object' || (typeof(obj.url) != 'string' && !(obj.url instanceof String))) return;

	var req = new XMLHttpRequest();
	req.open(obj.method || 'GET',obj.url,true);
	if(typeof(obj.headers) == 'object') for(var i in obj.headers) req.setRequestHeader(i,obj.headers[i]);
	['onload','onerror','onreadystatechange'].forEach(function(k) {
		if(obj[k] && (typeof(obj[k]) == 'function' || obj[k] instanceof Function)) req[k] = function() {
			obj[k]({
				status          : (req.readyState == 4) ? req.status : 0,
				statusText      : (req.readyState == 4) ? req.statusText : '',
				responseHeaders : (req.readyState == 4) ? req.getAllResponseHeaders() : '',
				responseText    : req.responseText,
				readyState      : req.readyState,
				finalUrl        : (req.readyState == 4) ? req.channel.URI.spec : '' });
		};
	});

	if(obj.overrideMimeType) req.overrideMimeType(obj.overrideMimeType);
	var c = 0;
	var timer = setInterval(function() { if(req.readyState == 1 || ++c > 100) { clearInterval(timer); req.send(obj.data || null); } },10);
	debug('GM_xmlhttpRequest ' + obj.url);
}

function log(str) { Application.console.log(Array.slice(arguments)); }

function debug() { if (ns.DEBUG) Application.console.log('DEBUG: ' + Array.slice(arguments));}

function error(str) {
	var err = Cc["@mozilla.org/scripterror;1"].createInstance(Ci.nsIScriptError);
	err.init(str, null, null, null, null, err.errorFlag, null);
	Services.console.logMessage(err);
}

// http://gist.github.com/321205
function $(id) document.getElementById(id);
function $E(xml, doc) {
	doc = doc || document;
	xml = <root xmlns={doc.documentElement.namespaceURI}/>.appendChild(xml);
	var settings = XML.settings();
	XML.prettyPrinting = false;
	var root = new DOMParser().parseFromString(xml.toXMLString(), 'application/xml').documentElement;
	XML.setSettings(settings);
	doc.adoptNode(root);
	var range = doc.createRange();
	range.selectNodeContents(root);
	var frag = range.extractContents();
	range.detach();
	return frag.childNodes.length < 2 ? frag.firstChild : frag;
}

})();

window.UserScriptLoader.init();
