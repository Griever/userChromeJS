// ==UserScript==
// @name           KeyChanger.uc.js
// @namespace      http://d.hatena.ne.jp/Griever/
// @include        main
// @description    keyconfig の代わり
// @version        0.0.1
// ==/UserScript==

var KeyChanger = {
	filename : '_keychanger.js',
	chromePath : Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties)
		.get("UChrm", Ci.nsILocalFile).path + '\\',
	makeKeyset : function(isAlert){
		var s = new Date();
		var keys = this.makeKeys();
		if (!keys)
			return this.alert('KeyChanger', 'Load error.')

		var keyset = document.getElementById('keychanger-keyset');
		if (keyset)
			keyset.parentNode.removeChild(keyset);
		keyset = document.createElement('keyset');
		keyset.setAttribute('id', 'keychanger-keyset');
		keyset.appendChild(keys);

		var df = document.createDocumentFragment();
		Array.slice(document.getElementsByTagName('keyset')).forEach(function(elem){
			df.appendChild(elem);
		});
		var insPos = document.getElementById('mainPopupSet');
		insPos.parentNode.insertBefore(keyset, insPos);
		insPos.parentNode.insertBefore(df, insPos);
		var e = new Date() - s;

		if (isAlert){
			this.alert('KeyChanger: Loaded', e + 'ms');
		}
	},
	makeKeys : function(){
		var str = this.readFile(this.chromePath + this.filename);
		if (!str)
			return null;

		var sandbox = new Components.utils.Sandbox( new XPCNativeWrapper(window) );
		var keys = Components.utils.evalInSandbox('var keys = {};' + str + ';keys;', sandbox);
		if (!keys)
			return null;
		var dFrag = document.createDocumentFragment();

		for (let n in keys){
			let keyString = n.toUpperCase().split('+');
			let modifiers = '', key, keycode, k;
			
			for (let i = 0, l = keyString.length; i < l ; i++){
				k = keyString[i];
				if (k == 'CTRL' || k == 'CONTROL' || k == 'ACCEL'){
					modifiers += 'accel,';
				}else 
				if (k == 'SHIFT'){
					modifiers += 'shift,';
				}else 
				if (k == 'ALT'){
					modifiers += 'alt,';
				}else 
				{
					if (k == ''){
						key = '+';
					}else 
					if (k.length == 1){
						key = k;
					}else
					{
						switch(k){
						case 'BACKSPACE':
						case 'BKSP':
						case 'BS':
							keycode = 'VK_BACK'; break;
						case 'RET':
						case 'ENTER':
							keycode = 'VK_RETURN'; break;
						case 'ESC':
							keycode = 'VK_ESCAPE'; break;
						case 'PAGEUP':
						case 'PAGE UP':
						case 'PGUP':
						case 'PUP':
							keycode = 'VK_PAGE_UP'; break;
						case 'PAGEDOWN':
						case 'PAGE DOWN':
						case 'PGDN':
						case 'PDN':
							keycode = 'VK_PAGE_DOWN'; break;
						case 'TOP':
							keycode = 'VK_UP'; break;
						case 'BOTTOM':
							keycode = 'VK_DOWN'; break;
						case 'INS':
							keycode = 'VK_INSERT'; break;
						case 'DEL':
							keycode = 'VK_DELETE'; break;
						default:
							keycode = k.indexOf('VK_') == -1? keycode = 'VK_' + k : k;
						}
					}
				}
			}

			let elem = document.createElement('key');
			if (modifiers !== '')
				elem.setAttribute('modifiers', modifiers.slice(0, -1));
			if (key)
				elem.setAttribute('key', key);
			else if (keycode)
				elem.setAttribute('keycode', keycode);

			let cmd = keys[n];
			switch(typeof cmd){
			case 'function': elem.setAttribute('oncommand', cmd.toSource() + '(event)'); break;
			case 'object': for (let a in cmd) elem.setAttribute(a, cmd[a]); break;
			default: elem.setAttribute('oncommand', cmd);
			}
			dFrag.appendChild(elem);
		}
		return dFrag;
	},
	createMenuitem : function(){
		var menuitem = document.createElement('menuitem');
		menuitem.setAttribute('label', 'Reload KeyChanger script');
		menuitem.setAttribute('oncommand', 'KeyChanger.makeKeyset(true);');
		var insPos = document.getElementById('devToolsSeparator');
		insPos.parentNode.insertBefore(menuitem, insPos);
	},
	readFile: function (aPath) {
		try{
			var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
			file.initWithPath(aPath);

			var fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
			var sstream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
			fstream.init(file, -1, 0, 0);
			sstream.init(fstream); 
			var data = "";
			var str = sstream.read(4096);
			while (str.length > 0) {
				data += str;
				str = sstream.read(4096);
			}
			sstream.close();
			fstream.close();

			var UI = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
			UI.charset = "UTF-8";
			return UI.ConvertToUnicode(data);
		}catch(e){
			return null;
		}
	},
	alert : function(aTitle, aString){
		Cc['@mozilla.org/alerts-service;1'].getService(Ci.nsIAlertsService)
			.showAlertNotification('', aTitle, aString, false, "", null);
	},
};

KeyChanger.createMenuitem();
KeyChanger.makeKeyset();



/* ********** KeyChanger について **********

***** 使い方 *****
_keychanger.js ファイルを chrome フォルダにおいてください。
.uc.js の方はどこでも構いません。


***** 書式について *****
keys["Ctrl+Shift+A"] = "alert(this)"; のように + で区切って記述。
不要なスペースは入れないでください。
Ctrl 等を使用しない場合は keys.VK_F1 でも可。

キーは大文字小文字区別せず、多少柔軟性を持たせてあります。
例：
	f1 → VK_F1
	Esc → VK_ESCAPE
	backspace, bksp → VK_BACK

正確に書くならこちらを参考に。
・https://developer.mozilla.org/ja/XUL_Tutorial/Keyboard_Shortcuts


***** 代入できるもの *****
string はそのまま oncommand 属性に。

object は for in でそのまま属性に。
	例：keys.f1 = { id : 'test', oncommand : 'alert(this.id)' };
	
function は func.toSource() + "(event)" で oncommand 属性に。
	this が key 要素ではなく ChromeWindow を返すので注意。


スクリプトはこの辺を参考に調達してください。
・http://www.xuldev.org/blog/?p=76
・http://www.xuldev.org/firegestures/getscripts.php



*/
