// ==UserScript==
// @name           UserScriptLoader.uc.js
// @description    Greasemonkey っぽいもの
// @namespace      http://d.hatena.ne.jp/Griever/
// @include        main
// @compatibility  Firefox 5.0
// @license        MIT License
// @version        0.1.8.1
// @note           0.1.8.1 Save Script が機能していないのを修正
// @note           0.1.8.0 Remove E4X
// @note           0.1.8.0 @match, @unmatch に超テキトーに対応
// @note           0.1.8.0 .tld を Scriptish を参考にテキトーに改善
// @note           0.1.7.9 __exposedProps__ を付けた
// @note           0.1.7.9 uAutoPagerize との連携をやめた
// @note           0.1.7.8 window.open や target="_blank" で実行されないのを修正
// @note           0.1.7.7 @delay 周りのバグを修正
// @note           0.1.7.6 require で外部ファイルの取得がうまくいかない場合があるのを修正
// @note           0.1.7.5 0.1.7.4 にミスがあったので修正
// @note           0.1.7.4 GM_xmlhttpRequest の url が相対パスが使えなかったのを修正
// @note           0.1.7.3 Google Reader NG Filterがとりあえず動くように修正
// @note           0.1.7.2 document-startが機能していなかったのを修正
// @note           0.1.7.1 .tld がうまく動作していなかったのを修正
// @note           書きなおした
// @note           スクリプトを編集時に日本語のファイル名のファイルを開けなかったのを修正
// @note           複数のウインドウを開くとバグることがあったのを修正
// @note           .user.js 間で window を共有できるように修正
// @note           .tld を簡略化した
// @note           スクリプトをキャッシュしないオプションを追加
// @note           GM_safeHTMLParser, GM_generateUUID に対応
// @note           GM_unregisterMenuCommand, GM_enableMenuCommand, GM_disableMenuCommand に対応
// @note           GM_getMetadata に対応(返り値は Array or undefined)
// @note           GM_openInTab に第２引数を追加
// @note           @require, @resource のファイルをフォルダに保存するようにした
// @note           @delay に対応
// @note           @bookmarklet に対応（from NinjaKit）
// @note           GLOBAL_EXCLUDES を用意した
// @note           セキュリティを軽視してみた
// ==/UserScript==

(function (css) {

const GLOBAL_EXCLUDES = [
	"chrome:*"
	,"jar:*"
	,"resource:*"
];


const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;
if (!window.Services) Cu.import("resource://gre/modules/Services.jsm");

if (window.USL) {
	window.USL.destroy();
	delete window.USL;
}

var USL = {};

// Class
USL.PrefManager = function (str) {
	var root = 'UserScriptLoader.';
	if (str)
		root += str;
	this.pref = Services.prefs.getBranch(root);
};
USL.PrefManager.prototype = {
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

USL.ScriptEntry = function (aFile) {
	this.init.apply(this, arguments);
};
USL.ScriptEntry.prototype = {
	includeRegExp: /^https?:\/\/.*/,
	excludeRegExp: /^$/,
	init: function(aFile) {
		this.file = aFile;
		this.leafName = aFile.leafName;
		this.path = aFile.path;
		this.lastModifiedTime = aFile.lastModifiedTime;
		this.code = USL.loadText(aFile);
		this.getMetadata();
		this.disabled = false;
		this.requireSrc = "";
		this.resources = {};

		this.run_at = "run-at" in this.metadata ? this.metadata["run-at"][0] : "document-end";
		this.name = "name" in this.metadata ? this.metadata.name[0] : this.leafName;
		if (this.metadata.delay) {
			let delay = parseInt(this.metadata.delay[0], 10);
			this.delay = isNaN(delay) ? 0 : Math.max(delay, 0);
		} else if (this.run_at === "document-idle") {
			this.delay = 0;
		}

		if (this.metadata.match) {
			this.includeRegExp = this.createRegExp(this.metadata.match, true);
			this.includeTLD = this.isTLD(this.metadata.match);
		} else if (this.metadata.include) {
			this.includeRegExp = this.createRegExp(this.metadata.include);
			this.includeTLD = this.isTLD(this.metadata.include);
		}
		if (this.metadata.unmatch) {
			this.excludeRegExp = this.createRegExp(this.metadata.unmatch, true);
			this.excludeTLD = this.isTLD(this.metadata.unmatch);
		} else if (this.metadata.exclude) {
			this.excludeRegExp = this.createRegExp(this.metadata.exclude);
			this.excludeTLD = this.isTLD(this.metadata.exclude);
		}

		this.prefName = 'scriptival.' + (this.metadata.namespace || 'nonamespace/') + '/' + this.name + '.';
		this.__defineGetter__('pref', function() {
			delete this.pref;
			return this.pref = new USL.PrefManager(this.prefName);
		});

		if (this.metadata.resource) {
			this.metadata.resource.forEach(function(r){
				let res = r.split(/\s+/);
				this.resources[res[0]] = { url: res[1] };
			}, this);
		}

		this.getRequire();
		this.getResource();
	},
	getMetadata: function() {
		this.metadata = {};
		let m = this.code.match(/\/\/\s*==UserScript==[\s\S]+?\/\/\s*==\/UserScript==/);
		if (!m)
			return;
		m = (m+'').split(/[\r\n]+/);
		for (let i = 0; i < m.length; i++) {
			if (!/\/\/\s*?@(\S+)($|\s+([^\r\n]+))/.test(m[i]))
				continue;
			let name  = RegExp.$1.toLowerCase().trim();
			let value = RegExp.$3;
			if (this.metadata[name]) {
				this.metadata[name].push(value);
			} else {
				this.metadata[name] = [value];
			}
		}
	},
	createRegExp: function(urlarray, isMatch) {
		let regstr = urlarray.map(function(url) {
			url = url.replace(/([()[\]{}|+.,^$?\\])/g, "\\$1");
			if (isMatch) {
				url = url.replace(/\*+|:\/\/\*\\\./g, function(str, index, full){
					if (str === "\\^") return "(?:^|$|\\b)";
					if (str === "://*\\.") return "://(?:[^/]+\\.)?";
					if (str[0] === "*" && index === 0) return "(?:https?|ftp|file)";
					if (str[0] === "*") return ".*";
					return str;
				});
			} else {
				url = url.replace(/\*+/g, ".*");
				url = url.replace(/^\.\*\:?\/\//, "https?://");
				url = url.replace(/^\.\*/, "https?:.*");
			}
			//url = url.replace(/^([^:]*?:\/\/[^\/\*]+)\.tld\b/,"$1\.(?:com|net|org|info|(?:(?:co|ne|or)\\.)?jp)");
			//url = url.replace(/\.tld\//,"\.(?:com|net|org|info|(?:(?:co|ne|or)\\.)?jp)/");
			return "^" + url + "$";
		}).join('|');
		return new RegExp(regstr);
	},
	isTLD: function(urlarray) {
		return urlarray.some(function(url) /^.+?:\/{2,3}?[^\/]+\.tld\b/.test(url));
	},
	makeTLDURL: function(aURL) {
		try {
			var uri = Services.io.newURI(aURL, null, null);
			uri.host = uri.host.slice(0, -Services.eTLD.getPublicSuffix(uri).length) + "tld";
			return uri.spec;
		} catch (e) {}
		return "";
	},
	isURLMatching: function(url) {
		if (this.disabled) return false;
		if (this.excludeRegExp.test(url)) return false;
		
		var tldurl = this.excludeTLD || this.includeTLD ? this.makeTLDURL(url) : "";
		if (this.excludeTLD && tldurl && this.excludeRegExp.test(tldurl)) return false;
		if (this.includeRegExp.test(url)) return true;
		if (this.includeTLD && tldurl && this.includeRegExp.test(tldurl)) return true;
		return false;
	},
	getResource: function() {
		if (!this.metadata.resource) return;
		var self = this;
		for (let [name, aaa] in Iterator(this.resources)) {
			let obj = aaa;
			let url = obj.url;
			let aFile = USL.REQUIRES_FOLDER.clone();
			aFile.QueryInterface(Ci.nsILocalFile);
			aFile.appendRelativePath(encodeURIComponent(url));
			if (aFile.exists() && aFile.isFile()) {
				let fileURL = Services.io.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler).getURLSpecFromFile(aFile);
				USL.getLocalFileContents(fileURL, function(bytes, contentType){
					let ascii = /^text|javascript/.test(contentType);
					if (ascii) {
						try { bytes = decodeURIComponent(escape(bytes)); } catch(e) {}
					}
					obj.bytes = bytes;
					obj.contentType = contentType;
				});
				continue;
			}
			USL.getContents(url, function(bytes, contentType){
				let ascii = /^text|javascript/.test(contentType);
				if (ascii) {
					try { bytes = decodeURIComponent(escape(bytes)); } catch(e) {}
				}
				let data = ascii ? USL.saveText(aFile, bytes) : USL.saveFile(aFile, bytes);
				obj.bytes = data;
				obj.contentType = contentType;
			});
		}
	},
	getRequire: function() {
		if (!this.metadata.require) return;
		var self = this;
		this.metadata.require.forEach(function(url){
			let aFile = USL.REQUIRES_FOLDER.clone();
			aFile.QueryInterface(Ci.nsILocalFile);
			aFile.appendRelativePath(encodeURIComponent(url));
			if (aFile.exists() && aFile.isFile()) {
				self.requireSrc += USL.loadText(aFile) + ";\r\n";
				return;
			}
			USL.getContents(url, function(bytes, contentType){
				let ascii = /^text|javascript/.test(contentType);
				if (ascii) {
					try { bytes = decodeURIComponent(escape(bytes)); } catch(e) {}
				}
				let data = ascii ? USL.saveText(aFile, bytes) : USL.saveFile(aFile, bytes);
				self.requireSrc += data + ';\r\n';
			});
		}, this);
	},
};

USL.Console = function Console() {};
USL.Console.prototype = {
	__exposedProps__: {
		log: "r",
		dir: "r",
		time: "r",
		timeEnd: "r",
	},
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

USL.API = function(script, sandbox, win, doc) {
	var self = this;

	this.GM_log = function() {
		Services.console.logStringMessage("["+ script.name +"] " + Array.slice(arguments).join(", "));
	};

	this.GM_xmlhttpRequest = function(obj) {
		if(typeof(obj) != 'object' || (typeof(obj.url) != 'string' && !(obj.url instanceof String))) return;

		var baseURI = Services.io.newURI(win.location.href, null, null);
		obj.url = Services.io.newURI(obj.url, null, baseURI).spec;
		var req = new XMLHttpRequest();
		req.open(obj.method || 'GET',obj.url,true);
		if(typeof(obj.headers) == 'object') for(var i in obj.headers) req.setRequestHeader(i,obj.headers[i]);
		['onload','onerror','onreadystatechange'].forEach(function(k) {
			if(obj[k] && (typeof(obj[k]) == 'function' || obj[k] instanceof Function)) req[k] = function() {
				obj[k]({
					__exposedProps__: {
						status: "r",
						statusText: "r",
						responseHeaders: "r",
						responseText: "rw",
						readyState: "r",
						finalUrl: "r"
					},
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
		USL.debug(script.name + ' GM_xmlhttpRequest ' + obj.url);
	};

	this.GM_addStyle = function GM_addStyle(code) {
		var head = doc.getElementsByTagName('head')[0];
		if (head) {
			var style = doc.createElement('style');
			style.type = 'text/css';
			style.appendChild(doc.createTextNode(code+''));
			head.appendChild(style);
			return style;
		}
	};

	this.GM_setValue = function(name, value) {
		return USL.USE_STORAGE_NAME.indexOf(name) >= 0?
			USL.database.pref[script.prefName + name] = value:
			script.pref.setValue(name, value);
	};

	this.GM_getValue = function(name, def) {
		return USL.USE_STORAGE_NAME.indexOf(name) >= 0?
			USL.database.pref[script.prefName + name] || def:
			script.pref.getValue(name, def);
	};

	this.GM_listValues = function() {
		var p = script.pref.listValues();
		var s = [x for(x in USL.database.pref[script.prefName + name])];
		s.forEach(function(e, i, a) a[i] = e.replace(script.prefName, ''));
		p.push.apply(p, s);
		return p;
	};

	this.GM_deleteValue = function(name) {
		return USL.USE_STORAGE_NAME.indexOf(name) >= 0?
			delete USL.database.pref[script.prefName + name]:
			script.pref.deleteValue(name);
	};

	this.GM_registerMenuCommand = function(label, func, aAccelKey, aAccelModifiers, aAccessKey) {
		let uuid = self.GM_generateUUID();
		win.USL_registerCommands[uuid] = {
			label: label,
			func: func,
			accelKey: aAccelKey,
			accelModifiers: aAccelModifiers,
			accessKey: aAccessKey,
			tooltiptext: script.name
		};
		return uuid;
	};
	
	this.GM_unregisterMenuCommand = function(aUUID) {
		return delete win.USL_registerCommands[aUUID];
	};

	this.GM_enableMenuCommand = function(aUUID) {
		let item = win.USL_registerCommands[aUUID];
		if (item) delete item.disabled;
	};
	
	this.GM_disableMenuCommand = function(aUUID) {
		let item = win.USL_registerCommands[aUUID];
		if (item) item.disabled = "true";
	};

	this.GM_getResourceText = function(name) {
		let obj = script.resources[name];
		if (obj) return obj.bytes;
	};

	this.GM_getResourceURL = function(name) {
		let obj = script.resources[name];
		try {
			if (obj) return 'data:' + obj.contentType + ';base64,' + btoa(obj.bytes);
		} catch (e) {
			USL.error(e);
		}
	};

	this.GM_getMetadata = function(key) {
		return script.metadata[key] ? script.metadata[key].slice() : void 0;
	};
};
USL.API.prototype = {
	GM_openInTab: function(url, loadInBackground, reuseTab) {
		openLinkIn(url, loadInBackground ? "tabshifted" : "tab", {});
	},
	GM_setClipboard: function(str) {
		if (str.constructor === String || str.constructor === Number) {
			Cc['@mozilla.org/widget/clipboardhelper;1'].getService(Ci.nsIClipboardHelper).copyString(str);
		}
	},
	GM_safeHTMLParser: function(code) {
		let HTMLNS = "http://www.w3.org/1999/xhtml";
		let gUnescapeHTML = Cc["@mozilla.org/feed-unescapehtml;1"].getService(Ci.nsIScriptableUnescapeHTML);
		let doc = document.implementation.createDocument(HTMLNS, "html", null);
		let body = document.createElementNS(HTMLNS, "body");
		doc.documentElement.appendChild(body);
		body.appendChild(gUnescapeHTML.parseFragment(code, false, null, body));
		return doc;
	},
	GM_generateUUID: function() {
		return Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator).generateUUID().toString();
	},
};


USL.database = { pref: {}, resource: {} };
USL.readScripts = [];
USL.USE_STORAGE_NAME = ['cache', 'cacheInfo'];
USL.initialized = false;
USL.eventName = "USL_DocumentStart" + Math.random();

USL.__defineGetter__("pref", function(){
	delete this.pref;
	return this.pref = new USL.PrefManager();
});

USL.__defineGetter__("SCRIPTS_FOLDER", function(){
	let folderPath = this.pref.getValue('SCRIPTS_FOLDER', "");
	let aFolder = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile)
	if (!folderPath) {
		aFolder.initWithPath(Services.dirsvc.get("UChrm", Ci.nsIFile).path);
		aFolder.appendRelativePath('UserScriptLoader');
	} else {
		aFolder.initWithPath(folderPath);
	}
	if ( !aFolder.exists() || !aFolder.isDirectory() ) {
		aFolder.create(Ci.nsIFile.DIRECTORY_TYPE, 0664);
	}
	delete this.SCRIPTS_FOLDER;
	return this.SCRIPTS_FOLDER = aFolder;
});

USL.__defineGetter__("REQUIRES_FOLDER", function(){
	let aFolder = this.SCRIPTS_FOLDER.clone();
	aFolder.QueryInterface(Ci.nsILocalFile);
	aFolder.appendRelativePath('require');
	if ( !aFolder.exists() || !aFolder.isDirectory() ) {
		aFolder.create(Ci.nsIFile.DIRECTORY_TYPE, 0664);
	}
	delete this.REQUIRES_FOLDER;
	return this.REQUIRES_FOLDER = aFolder;
});

USL.__defineGetter__("EDITOR", function(){
	delete this.EDITOR;
	return this.EDITOR = this.pref.getValue('EDITOR', "") || Services.prefs.getCharPref("view_source.editor.path");
});

USL.__defineGetter__("disabled_scripts", function(){
	let ds = this.pref.getValue('script.disabled', '');
	delete this.disabled_scripts;
	return this.disabled_scripts = ds? ds.split('|') : [];
});

USL.__defineGetter__("GLOBAL_EXCLUDES_REGEXP", function(){
	let regexp = null;
	let ge = USL.pref.getValue('GLOBAL_EXCLUDES', null);
	ge = ge ? ge.trim().split(/\s*\,\s*/) : GLOBAL_EXCLUDES;
	try {
		regexp = new RegExp(ge.map(USL.wildcardToRegExpStr).join("|"));
	} catch (e) {
		regexp = /^(?:chrome|resource|jar):/;
	}
	delete this.GLOBAL_EXCLUDES_REGEXP;
	return this.GLOBAL_EXCLUDES_REGEXP = regexp;
});

var DISABLED = true;
USL.__defineGetter__("disabled", function() DISABLED);
USL.__defineSetter__("disabled", function(bool){
	if (bool) {
		this.icon.setAttribute("state", "disable");
		gBrowser.mPanelContainer.removeEventListener(USL.eventName, this, false);
	} else {
		this.icon.setAttribute("state", "enable");
		gBrowser.mPanelContainer.addEventListener(USL.eventName, this, false);
	}
	return DISABLED = bool;
});

var DEBUG = USL.pref.getValue('DEBUG', false);
USL.__defineGetter__("DEBUG", function() DEBUG);
USL.__defineSetter__("DEBUG", function(bool) {
	DEBUG = !!bool;
	let elem = $("UserScriptLoader-debug-mode");
	if (elem) elem.setAttribute("checked", DEBUG);
	return bool;
});

var HIDE_EXCLUDE = USL.pref.getValue('HIDE_EXCLUDE', false);
USL.__defineGetter__("HIDE_EXCLUDE", function() HIDE_EXCLUDE);
USL.__defineSetter__("HIDE_EXCLUDE", function(bool){
	HIDE_EXCLUDE = !!bool;
	let elem = $("UserScriptLoader-hide-exclude");
	if (elem) elem.setAttribute("checked", HIDE_EXCLUDE);
	return bool;
});

var CACHE_SCRIPT = USL.pref.getValue('CACHE_SCRIPT', true);
USL.__defineGetter__("CACHE_SCRIPT", function() CACHE_SCRIPT);
USL.__defineSetter__("CACHE_SCRIPT", function(bool){
	CACHE_SCRIPT = !!bool;
	let elem = $("UserScriptLoader-cache-script");
	if (elem) elem.setAttribute("checked", CACHE_SCRIPT);
	return bool;
});

USL.getFocusedWindow = function () {
	var win = document.commandDispatcher.focusedWindow;
	return (!win || win == window) ? content : win;
};

USL.init = function(){
	USL.loadSetting();
	USL.style = addStyle(css);
/*
	USL.icon = $('status-bar').appendChild($C("statusbarpanel", {
		id: "UserScriptLoader-icon",
		class: "statusbarpanel-iconic",
		context: "UserScriptLoader-popup",
		onclick: "USL.iconClick(event);"
	}));
*/
	USL.icon = $('urlbar-icons').appendChild($C("image", {
		id: "UserScriptLoader-icon",
		context: "UserScriptLoader-popup",
		onclick: "USL.iconClick(event);",
		style: "padding: 0px 2px;",
	}));

	var xml = '\
		<menupopup id="UserScriptLoader-popup" \
		           onpopupshowing="USL.onPopupShowing(event);"\
		           onpopuphidden="USL.onPopupHidden(event);"\
		           onclick="USL.menuClick(event);">\
			<menuseparator id="UserScriptLoader-menuseparator"/>\
			<menu label="User Script Command"\
			      id="UserScriptLoader-register-menu"\
			      accesskey="C">\
				<menupopup id="UserScriptLoader-register-popup"/>\
			</menu>\
			<menuitem label="Save Script"\
			          id="UserScriptLoader-saveMenu"\
			          accesskey="S"\
			          oncommand="USL.saveScript();"/>\
			<menu label="Menu" id="UserScriptLoader-submenu">\
				<menupopup id="UserScriptLoader-submenu-popup">\
					<menuitem label="delete pref storage"\
					          oncommand="USL.deleteStorage(\'pref\');" />\
					<menuseparator/>\
					<menuitem label="Hide exclude script"\
					          id="UserScriptLoader-hide-exclude"\
					          accesskey="N"\
					          type="checkbox"\
					          checked="' + USL.HIDE_EXCLUDE + '"\
					          oncommand="USL.HIDE_EXCLUDE = !USL.HIDE_EXCLUDE;" />\
					<menuitem label="Open Scripts Folder"\
					          id="UserScriptLoader-openFolderMenu"\
					          accesskey="O"\
					          oncommand="USL.openFolder();" />\
					<menuitem label="Rebuild"\
					          accesskey="R"\
					          oncommand="USL.rebuild();" />\
					<menuitem label="Cache Script"\
					          id="UserScriptLoader-cache-script"\
					          accesskey="C"\
					          type="checkbox"\
					          checked="' + USL.CACHE_SCRIPT + '"\
					          oncommand="USL.CACHE_SCRIPT = !USL.CACHE_SCRIPT;" />\
					<menuitem label="DEBUG MODE"\
					          id="UserScriptLoader-debug-mode"\
					          accesskey="D"\
					          type="checkbox"\
					          checked="' + USL.DEBUG + '"\
					          oncommand="USL.DEBUG = !USL.DEBUG;" />\
				</menupopup>\
			</menu>\
		</menupopup>\
	';
	var range = document.createRange();
	range.selectNodeContents($('mainPopupSet'));
	range.collapse(false);
	range.insertNode(range.createContextualFragment(xml.replace(/\n|\t/g, '')));
	range.detach();

	USL.popup         = $('UserScriptLoader-popup');
	USL.menuseparator = $('UserScriptLoader-menuseparator');
	USL.registMenu    = $('UserScriptLoader-register-menu');
	USL.saveMenu      = $('UserScriptLoader-saveMenu');

	USL.rebuild();
	USL.disabled = USL.pref.getValue('disabled', false);
	window.addEventListener('unload', USL, false);
	Services.obs.addObserver(USL, "content-document-global-created", false);
	USL.debug('observer start');
	USL.initialized = true;
};

USL.uninit = function () {
	window.removeEventListener('unload', USL, false);
	Services.obs.removeObserver(USL, "content-document-global-created");
	USL.debug('observer end');
	USL.saveSetting();
};

USL.destroy = function () {
	window.removeEventListener('unload', USL, false);
	Services.obs.removeObserver(USL, "content-document-global-created");
	USL.log('observer end');

	let disabledScripts = [x.leafName for each(x in USL.readScripts) if (x.disabled)];
	USL.pref.setValue('script.disabled', disabledScripts.join('|'));
	USL.pref.setValue('disabled', USL.disabled);
	USL.pref.setValue('HIDE_EXCLUDE', USL.HIDE_EXCLUDE);

	var e = document.getElementById("UserScriptLoader-icon");
	if (e) e.parentNode.removeChild(e);
	var e = document.getElementById("UserScriptLoader-popup");
	if (e) e.parentNode.removeChild(e);
	if (USL.style) USL.style.parentNode.removeChild(USL.style);
	USL.disabled = true;
};

USL.handleEvent = function (event) {
	switch(event.type) {
		case USL.eventName:
			var win = event.target.defaultView;
			win.USL_registerCommands = {};
			win.USL_run = [];
			if (USL.disabled) return;
			if (USL.readScripts.length === 0) return;
			this.injectScripts(win);
			break;
		case "unload":
			this.uninit();
			break;
	}
};

USL.observe = function (subject, topic, data) {
	if (topic === "content-document-global-created") {
		var doc = subject.document;
		var evt = doc.createEvent("Events");
		evt.initEvent(USL.eventName, true, false);
		doc.dispatchEvent(evt);
	}
};

USL.createMenuitem = function () {
	if (USL.popup.firstChild != USL.menuseparator) {
		var range = document.createRange();
		range.setStartBefore(USL.popup.firstChild);
		range.setEndBefore(USL.menuseparator);
		range.deleteContents();
		range.detach();
	}
	USL.readScripts.forEach(function(script){
		let m = document.createElement('menuitem');
		m.setAttribute('label', script.name);
		m.setAttribute("class", "UserScriptLoader-item");
		m.setAttribute('checked', !script.disabled);
		m.setAttribute('type', 'checkbox');
		m.setAttribute('oncommand', 'this.script.disabled = !this.script.disabled;');
		m.script = script;
		USL.popup.insertBefore(m, USL.menuseparator);
	});
};

USL.rebuild = function() {
	USL.disabled_scripts = [x.leafName for each(x in USL.readScripts) if (x.disabled)];
	USL.pref.setValue('script.disabled', USL.disabled_scripts.join('|'));

	let newScripts = [];
	let ext = /\.user\.js$/i;
	let files = USL.SCRIPTS_FOLDER.directoryEntries.QueryInterface(Ci.nsISimpleEnumerator);

	while (files.hasMoreElements()) {
		let file = files.getNext().QueryInterface(Ci.nsIFile);
		if (!ext.test(file.leafName)) continue;
		let script = loadScript(file);
		newScripts.push(script);
	}
	USL.readScripts = newScripts;
	USL.createMenuitem();

	function loadScript(aFile) {
		var script,
		    leafName = aFile.leafName,
		    lastModifiedTime = aFile.lastModifiedTime;
		USL.readScripts.some(function(s, i){
			if (s.leafName === leafName) {
				if (s.lastModifiedTime !== lastModifiedTime && USL.initialized) {
					USL.log(s.name + " reload.");
					return true;
				}
				script = s;
				return true;
			}
		});

		if (!script) {
			script = new USL.ScriptEntry(aFile);
			if (USL.disabled_scripts.indexOf(leafName) !== -1)
				script.disabled = true;
		}
		return script;
	}
};

USL.reloadScripts = function() {
	USL.readScripts.forEach(function(script){
		let aFile = script.file;
		if (aFile.exists() && script.lastModifiedTime !== aFile.lastModifiedTimeOfLink) {
			script.init(aFile);
			USL.log(script.name + " reload.");
		}
	});
};

USL.openFolder = function() {
	USL.SCRIPTS_FOLDER.launch();
};

USL.saveScript = function() {
	var win = USL.getFocusedWindow();
	var doc = win.document;
	var name = /\/\/\s*@name\s+(.*)/i.exec(doc.body.textContent);
	var filename = (name && name[1] ? name[1] : win.location.href.split("/").pop()).replace(/\.user\.js$|$/i, ".user.js");

	// https://developer.mozilla.org/ja/XUL_Tutorial/Open_and_Save_Dialogs
	var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
	fp.init(window, "", Ci.nsIFilePicker.modeSave);
	fp.appendFilter("JS Files","*.js");
	fp.appendFilters(Ci.nsIFilePicker.filterAll);
	fp.displayDirectory = USL.SCRIPTS_FOLDER; // nsILocalFile
	fp.defaultExtension = "js";
	fp.defaultString = filename;
	var callbackObj = {
		done: function(res) {
			if (res != fp.returnOK && res != fp.returnReplace) return;

			var wbp = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Ci.nsIWebBrowserPersist);
			wbp.persistFlags = wbp.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
			var uri = doc.documentURIObject;
			var loadContext = win.QueryInterface(Ci.nsIInterfaceRequestor)
				.getInterface(Ci.nsIWebNavigation)
				.QueryInterface(Ci.nsILoadContext);
			wbp.saveURI(uri, null, uri, null, null, fp.file, loadContext);
		}
	}
	fp.open(callbackObj);
};

USL.deleteStorage = function(type) {
	var data = USL.database[type];
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
};

USL.onPopupShowing = function(event) {
	var win = USL.getFocusedWindow();
	var popup = event.target;

	switch(popup.id) {
		case 'UserScriptLoader-popup':
			let run = win.USL_run;
			Array.slice(popup.children).some(function(menuitem){
				if (!menuitem.classList.contains("UserScriptLoader-item")) return true;
				let index = run ? run.indexOf(menuitem.script) : -1;
				menuitem.style.fontWeight = index !== -1 ? "bold" : "";
				menuitem.hidden = USL.HIDE_EXCLUDE && index === -1;
			});
			USL.saveMenu.hidden = win.document.contentType.indexOf("javascript") === -1;
			b:if (win.USL_registerCommands) {
				for (let n in win.USL_registerCommands) {
					USL.registMenu.disabled = false;
					break b;
				}
				USL.registMenu.disabled = true;
			} else {
				USL.registMenu.disabled = true;
			}
			break;

		case 'UserScriptLoader-register-popup':
			var registers = win.USL_registerCommands;
			if (!registers) return;
			for (let [uuid, item] in Iterator(registers)) {
				let m = document.createElement('menuitem');
				m.setAttribute('label', item.label);
				m.setAttribute('tooltiptext', item.tooltiptext);
				m.setAttribute('oncommand', 'this.registCommand();');
				if (item.accessKey)
					m.setAttribute("accesskey", item.accessKey);
				if (item.disabled)
					m.setAttribute("disabled", item.disabled);
				m.registCommand = item.func;
				popup.appendChild(m);
			}
			break;
	}
};

USL.onPopupHidden = function(event) {
	var popup = event.target;
	switch(popup.id) {
		case 'UserScriptLoader-register-popup':
			var child = popup.firstChild;
			while (child && child.localName == 'menuitem') {
				popup.removeChild(child);
				child = popup.firstChild;
			}
			break;
	}
};

USL.menuClick = function(event){
	var menuitem = event.target;
	if (event.button == 0 || menuitem.getAttribute('type') != 'checkbox')
		return;

	event.preventDefault();
	event.stopPropagation();
	if (event.button == 1) {
		menuitem.doCommand();
		menuitem.setAttribute('checked', menuitem.getAttribute('checked') == 'true'? 'false' : 'true');
	} else if (event.button == 2 && USL.EDITOR && menuitem.script) {
		USL.edit(menuitem.script.path);
	}
};

USL.edit = function(path) {
	if (!USL.EDITOR) return;
	try {
		var UI = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
		UI.charset = window.navigator.platform.toLowerCase().indexOf("win") >= 0? "Shift_JIS": "UTF-8";
		path = UI.ConvertFromUnicode(path);
		var app = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
		app.initWithPath(USL.EDITOR);
		var process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
		process.init(app);
		process.run(false, [path], 1);
	} catch (e) {}
};

USL.iconClick = function(event){
	if (!event || !event.button) {
		USL.disabled = !USL.disabled;
		USL.pref.setValue('disabled', USL.disabled);
	} else if (event.button == 1) {
		USL.rebuild();
	}
};

USL.retryInject = function(safeWin) {
	function func(event) {
		safeWin.removeEventListener("readystatechange", func, true);
		if (event.target.URL === "about:blank") return;
		USL.injectScripts(event.target.defaultView, true);
	}
	safeWin.addEventListener("readystatechange", func, true);
};

USL.injectScripts = function(safeWindow, rsflag) {
	var aDocument = safeWindow.document;
	var locationHref = safeWindow.location.href;

	// document-start でフレームを開いた際にちょっとおかしいので…
	if (!rsflag && locationHref == "" && safeWindow.frameElement)
		return USL.retryInject(safeWindow);
	// target="_blank" で about:blank 状態で開かれるので…
	if (!rsflag && locationHref == 'about:blank')
		return USL.retryInject(safeWindow);

	if (USL.GLOBAL_EXCLUDES_REGEXP.test(locationHref)) return;

	if (!USL.CACHE_SCRIPT)
		USL.reloadScripts();

	var console = new USL.Console();
	var documentEnds = [];
	var windowLoads = [];

	USL.readScripts.filter(function(script, index) {
		//if (!/^(?:https?|data|file|chrome):/.test(locationHref)) return;
		if (!script.isURLMatching(locationHref)) return false;
		if ("noframes" in script && 
		    safeWindow.frameElement && 
		    !(safeWindow.frameElement instanceof HTMLFrameElement))
			return false;

		if (script.run_at === "document-start") {
			"delay" in script ? safeWindow.setTimeout(run, script.delay, script) : run(script)
		} else if (script.run_at === "window-load") {
			windowLoads.push(script);
		} else {
			documentEnds.push(script);
		}
	});
	if (documentEnds.length) {
		safeWindow.addEventListener("DOMContentLoaded", function(event){
			event.currentTarget.removeEventListener(event.type, arguments.callee, false);
			documentEnds.forEach(function(s) "delay" in s ? 
				safeWindow.setTimeout(run, s.delay, s) : run(s));
		}, false);
	}
	if (windowLoads.length) {
		safeWindow.addEventListener("load", function(event) {
			event.currentTarget.removeEventListener(event.type, arguments.callee, false);
			windowLoads.forEach(function(s) "delay" in s ? 
				safeWindow.setTimeout(run, s.delay, s) : run(s));
		}, false);
	}

	function run(script) {
		if (safeWindow.USL_run.indexOf(script) >= 0) {
			USL.debug('DABUTTAYO!!!!! ' + script.name + locationHref);
			return false;
		}
		if ("bookmarklet" in script.metadata) {
			let func = new Function(script.code);
			safeWindow.location.href = "javascript:" + func.toSource() + "();";
			safeWindow.USL_run.push(script);
			return;
		}

		let sandbox = new Cu.Sandbox(safeWindow, {sandboxPrototype: safeWindow});
		let GM_API = new USL.API(script, sandbox, safeWindow, aDocument);
		for (let n in GM_API)
			sandbox[n] = GM_API[n];

		sandbox.XPathResult  = Ci.nsIDOMXPathResult;
		sandbox.unsafeWindow = safeWindow.wrappedJSObject;
		sandbox.document     = safeWindow.document;
		sandbox.console      = console;
		sandbox.window       = safeWindow;

		sandbox.__proto__ = safeWindow;
		USL.evalInSandbox(script, sandbox);
		safeWindow.USL_run.push(script);
	}
};

USL.evalInSandbox = function(aScript, aSandbox) {
	try{
		var lineFinder = new Error();
		Cu.evalInSandbox('(function() {' + aScript.requireSrc + '\r\n' + aScript.code + '\r\n})();', aSandbox, "1.8");
	} catch(e) {
		let line = e.lineNumber - lineFinder.lineNumber - aScript.requireSrc.split("\n").length;
		USL.error(aScript.name + ' / line:' + line + "\n" + e);
	}
};

USL.log = function() {
	Services.console.logStringMessage("[USL] " + Array.slice(arguments));
};

USL.debug = function() {
	if (USL.DEBUG) Services.console.logStringMessage('[USL DEBUG] ' + Array.slice(arguments));
};

USL.error = function() {
	var err = Cc["@mozilla.org/scripterror;1"].createInstance(Ci.nsIScriptError);
	err.init(Array.slice(arguments), null, null, null, null, err.errorFlag, null);
	Services.console.logMessage(err);
};

USL.loadText = function(aFile) {
	var fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
	var sstream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
	fstream.init(aFile, -1, 0, 0);
	sstream.init(fstream);
	var data = sstream.read(sstream.available());
	try { data = decodeURIComponent(escape(data)); } catch(e) {}
	sstream.close();
	fstream.close();
	return data;
};

USL.loadBinary = function(aFile){
	var istream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
	istream.init(aFile, -1, -1, false);
	var bstream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);
	bstream.setInputStream(istream);
	return bstream.readBytes(bstream.available());
};

USL.saveText = function(aFile, data) {
	var suConverter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
	suConverter.charset = "UTF-8";
	data = suConverter.ConvertFromUnicode(data);
	return USL.saveFile(aFile, data);
};

USL.saveFile = function (aFile, data) {
	var foStream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
	foStream.init(aFile, 0x02 | 0x08 | 0x20, 0664, 0);
	foStream.write(data, data.length);
	foStream.close();
	return data;
};

USL.loadSetting = function() {
	try {
		var aFile = Services.dirsvc.get('UChrm', Ci.nsILocalFile);
		aFile.appendRelativePath("UserScriptLoader.json");
		var data = USL.loadText(aFile);
		data = JSON.parse(data);
		USL.database.pref = data.pref;
		//USL.database.resource = data.resource;
		USL.debug('loaded UserScriptLoader.json');
	} catch(e) {
		USL.debug('can not load UserScriptLoader.json');
	}
};

USL.saveSetting = function() {
	let disabledScripts = [x.leafName for each(x in USL.readScripts) if (x.disabled)];
	USL.pref.setValue('script.disabled', disabledScripts.join('|'));
	USL.pref.setValue('disabled', USL.disabled);
	USL.pref.setValue('HIDE_EXCLUDE', USL.HIDE_EXCLUDE);
	USL.pref.setValue('CACHE_SCRIPT', USL.CACHE_SCRIPT);
	USL.pref.setValue('DEBUG', USL.DEBUG);

	var aFile = Services.dirsvc.get('UChrm', Ci.nsILocalFile);
	aFile.appendRelativePath("UserScriptLoader.json");
	USL.saveText(aFile, JSON.stringify(USL.database));
};

USL.getContents = function(aURL, aCallback){
	try {
		urlSecurityCheck(aURL, gBrowser.contentPrincipal, Ci.nsIScriptSecurityManager.DISALLOW_INHERIT_PRINCIPAL);
	} catch(ex) {
		return;
	}
	var uri = Services.io.newURI(aURL, null, null);
	if (uri.scheme != 'http' && uri.scheme != 'https')
		return USL.error('getContents is "http" or "https" only');

	let aFile = USL.REQUIRES_FOLDER.clone();
	aFile.QueryInterface(Ci.nsILocalFile);
	aFile.appendRelativePath(encodeURIComponent(aURL));

	var wbp = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Ci.nsIWebBrowserPersist);
	if (aCallback) {
		wbp.progressListener = {
			onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
				if (aStateFlags & Ci.nsIWebProgressListener.STATE_STOP){
					let channel = aRequest.QueryInterface(Ci.nsIHttpChannel);
					let bytes = USL.loadBinary(aFile);
					aCallback(bytes, channel.contentType);
					return;
				}
			},
			onLocationChange: function(aProgress, aRequest, aURI){},
			onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {},
			onStatusChange: function(aWebProgress, aRequest, aStatus, aMessage) {},
			onSecurityChange: function(aWebProgress, aRequest, aState) {},
			onLinkIconAvailable: function(aIconURL) {},
		}
	}
	wbp.saveURI(uri, null, null, null, null, aFile);
	USL.debug("getContents: " + aURL);
};

USL.getLocalFileContents = function(aURL, callback) {
	var channel = Services.io.newChannel(aURL, null, null);
	if (channel.URI.scheme != 'file')
		return USL.error('getLocalFileContents is "file" only');

	var input = channel.open();
	var binaryStream = Cc['@mozilla.org/binaryinputstream;1'].createInstance(Ci.nsIBinaryInputStream);
	binaryStream.setInputStream(input);
	var bytes = binaryStream.readBytes(input.available());
	binaryStream.close();
	input.close();
	callback(bytes, channel.contentType);
};

USL.wildcardToRegExpStr = function(urlstr) {
	if (urlstr instanceof RegExp) return urlstr.source;
	let reg = urlstr.replace(/[()\[\]{}|+.,^$?\\]/g, "\\$&").replace(/\*+/g, function(str){
		return str === "*" ? ".*" : "[^/]*";
	});
	return "^" + reg + "$";
};

USL.init();
window.USL = USL;


function log(str) { Application.console.log(Array.slice(arguments)); }
function debug() { if (USL.DEBUG) Application.console.log('[USL DEBUG] ' + Array.slice(arguments));}

function $(id) document.getElementById(id);
function $C(name, attr) {
	var el = document.createElement(name);
	if (attr) Object.keys(attr).forEach(function(n) el.setAttribute(n, attr[n]));
	return el;
}

function addStyle(css) {
	var pi = document.createProcessingInstruction(
		'xml-stylesheet',
		'type="text/css" href="data:text/css;utf-8,' + encodeURIComponent(css) + '"'
	);
	return document.insertBefore(pi, document.documentElement);
}


})('\
/* http://www.famfamfam.com/lab/icons/silk/preview.php */\
#UserScriptLoader-icon {\
	list-style-image: url(data:image/png;base64,\
		iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACOElEQVQ4ja3Q3UtTcRgH8N8f4K11\
		FaRrVGumlTXndPYiyQqkCyPoLroOCbyJSCGJUhOGUSnShVqtFpYlW/lCKiPmy5zinObZdJtn29nZ\
		cW7nnB39TapvF+WdI4W+95/n+zwPIf8zwnRFt+AyIj5VDn7CAN5ZiphDD25Mh+jIaUSGixEePAnW\
		XhTaeYCr/OdWogMZoR2Z2DPQyBNsrpqxEWiF4muG4LwK9nOhvCOOT5Y1iks3sSV0IP29CrLnAkS3\
		EalxPRR/CxJTN8Dai35kXZ+fNGQyfBs2Q7chz1dCcp9FasIAxd+E5GwtwoNl8H3QqnZuHy+tSc5f\
		RybejvTCRUiz55CaKoPsvQV5sR7ciAnBvoJLWdtjTn1aCTWARlshz52HOG1E0lkCxd+C+LdrCH7S\
		1mXHjhLd2nQ1MvxzyF4TxJlKpCYrsD6mQ3rpEUL92l+BPg1d6T1Kl98dpr43asq8OkSZ7nyeEEII\
		59DzElMHGm3DJmvGRvAxFH8TFF8T0osPIXkaIc7UI+W6i+TEHbD9VWC68hRPx4E//+BGz6QiX4tp\
		eOgUZQdO0FV7IQ3ZCqi8+ACC7TjWhkwQ3Q2IfrmCZcsxMF0HX2Q9ZzuBj9rRdVctpLn7EN33ELaZ\
		wPSoRE/nvv3/xIQQEnivgeRpBDdcg5W3BWB68s27gn/xDDdUjejAZfheqxOezrzdtRJCiNeamxPo\
		1WLFqgHzUtW8a7idZesRr9+i5r1Pc3P2jAkhhLGodXs1vwEkf3FKAtNVEwAAAABJRU5ErkJggg==\
		);\
}\
\
#UserScriptLoader-icon[state="disable"] {\
	list-style-image: url(data:image/png;base64,\
		iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACrElEQVQ4ja2QXUhTARzFb3f55kuB\
		2EOBplLJTCtrzs/pJNHEJ03orXyIHkQkFSvSSKTmB5hRKfWSVJZhWX5MvZIuiemc05zT3Obm3Ny8\
		m7rP6+7MdnoIQWF76zwe+J3z/x+C+J+yTWd02OTpsE6lgZ5MAS1Nxvo4HxYJD+bRi1gbSYRp+DyM\
		AwmGwAHytD87m+3w2drgW38Odu0pvKst2NY3g9E0wCYtglEc7w4IW2Wpdc6lEuzY2uH5lQO3Ugin\
		Ih2OCT4YbSM2p67DOJCwG/R8Wpbi89Gt8BrK4Z7PhkshgGMyBYxWBPtsGUzDqdB85kYFbp9ILrTP\
		X4PP2gbPwmW4ZjPhmEqFW1UK92INLKO5WOmJywvavi7lexhDLVhzM9xzWXBOp8MuTQKjbYT1RzFW\
		vnIrgsPjSbyN6QL46Bdwq3LhnMmGQ5aBLQkPnqXHMPRy/fqeWFbXfYZd/niK1byPYdVvo1l1x0ma\
		IAiCsIzzaZe6Aqy5FV5jC7ZXmsBoRWA0IngWH8GlrINzpgYO+T3YJ+/A2JsD9etIRtl+4t8elrFL\
		jrVviayJusAah86xqwPxrKE/jnUv1sPWfxYbVC6cilosNCThe/FRUJmHMZhNroqzyeqgb+m/cMe2\
		5GVwzT2EU3EfKlEift7mwdvXBP+CGExnOWS3uLtDWWRp4IBPsXAp62AZKYTuQxyovBDHdl8T8CQf\
		qDoC1EfAJsrAoJDUBYJnLFQBzENXoHkXs6l8GRlOCTh+/3Q39steEw5KwPEfgFVdYaH6bi50XbFQ\
		v4lq2PPFQtLoeXUDqAkHW0lgq5KA4SYHYiFpOhCw3HVape2MoVXPwkL3+5Krxx5MlET/NldFwFod\
		guWSQ6DyObsDQvLugQB1Zwwv2LCSouPVYiGppwQcv1hIGvfgv6X5zFaYeSAgAAAAAElFTkSuQmCC\
		);\
}\
'.replace(/[\r\n\t]/g, ''));


