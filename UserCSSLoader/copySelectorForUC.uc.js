// ==UserScript==
// @name           copySelectorForUC
// @description    Selector, XPath をコピーするメニューを追加する
// @namespace      http://d.hatena.ne.jp/Griever/
// @author         Griever
// @include        chrome://inspector/content/viewers/dom/dom.xul
// @compatibility  Firefox 5
// @version        0.0.1
// @note           uc でのみ動作する https://addons.mozilla.org/ja/firefox/addon/uc/
// ==/UserScript==

(function(){

let { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

window.copyXXX = {
	init: function() {
		var xul = $E(<>
			<menu id="copy-xpath-menu" label="Copy XPath">
				<menupopup id="copy-xpath-menupopup"
				           onpopupshowing="copyXXX.onXPathPopupshowing(event);" />
			</menu>
			<menu id="copy-selector-menu" label="Copy Selector">
				<menupopup id="copy-selector-menupopup"
				           onpopupshowing="copyXXX.onSelectorPopupshowing(event);" />
			</menu>
		</>, document);
		let ins = document.getElementById("mnEditPasteMenu");
		ins.parentNode.insertBefore(xul, ins.nextSibling);

		this.xmenu = document.getElementById("copy-xpath-menu");
		this.smenu = document.getElementById("copy-selector-menu");
		this.context = document.getElementById("ppDOMContext");
		this.context.addEventListener("popupshown", this, false);
	},
	uninit: function () {
		this.context.removeEventListener("popupshown", this, false);
	},
	handleEvent: function(event) {
		switch(event.type) {
			case "popupshown":
				if (event.target != event.currentTarget) return;
				this.xmenu.removeAttribute("disabled");
				this.smenu.removeAttribute("disabled");
				break;
		}
	},
	onXPathPopupshowing: function(event) {
		var popup = event.target;
		this.cleanContents(popup);

		var node = window.viewer.selectedNode;
		if (node instanceof Text) node = node.parentNode;
		if (!(node instanceof Element)) return;

		var array = this.getXPathAll(node);
		this.createMenuitem(popup, array);
	},
	onSelectorPopupshowing: function(event) {
		var popup = event.target;
		this.cleanContents(popup);

		var node = window.viewer.selectedNode;
		if (node instanceof Text) node = node.parentNode;
		if (!(node instanceof Element)) return;

		var array = this.getSelectorAll(node);
		this.createMenuitem(popup, array);
	},
	cleanContents: function(popup) {
		var range = document.createRange();
		range.selectNodeContents(popup);
		range.deleteContents();
		range.detach();
	},
	createMenuitem: function(popup, items) {
		items.forEach(function(str, i, a) {
			if (a.indexOf(str) !== i) return;
			let m = document.createElement("menuitem");
			m.setAttribute("label", str);
			m.setAttribute("tooltiptext", str);
			m.setAttribute("style", "max-width: 63em !important;");
			m.setAttribute("oncommand", "copyXXX.copyToClipboard(event)");
			popup.appendChild(m);
		}, this);
	},
	copyToClipboard: function(event) {
		Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper).copyString(event.target.getAttribute("label"));
	},
	getXPathAll: function(node) {
		var res = [];
		var localName = node.localName.toLowerCase();

		var id = node.getAttribute("id");
		if (id) res.push('id("' + id + '")');
		var cls = node.getAttribute("class");
		if (cls) {
			res.push('//' + localName + '[@class="'+ cls +'"]');
			let cs = cls.trim().split(/\s+/).map(function(c) {
				let contains = 'contains(concat(" ",normalize-space(@class)," "), " '+ c +' ")';
				res.push('//' + localName + '[' + contains + ']');
				return contains;
			}, this);
			res.push('//' + localName + '[' + cs.join(' and ') + ']');
		}
		var attrs = [
			"@"+ n +'="'+ v +'"'
				for each({ nodeName:n, nodeValue:v} in $A(node.attributes))
					if (!/^(?:id|class)$/i.test(n))];
		if (attrs.length)
			res.push('//' + localName + '[' + attrs.join(' and ') + ']');
		if (node.firstChild instanceof Text && node.firstChild.textContent.trim())
			res.push('//' + localName + '[text()=' + escapeXPathExpr(node.firstChild.textContent).replace(/\'/g, "\\\'") + ']');
		res.push('//' + localName);
		return res;
	},
	getSelectorAll: function(node) {
		var res = [];
		var localName = node.localName.toLowerCase();

		var id = node.getAttribute("id");
		if (id) res.push("#" + id);
		var cls = node.getAttribute("class");
		if (cls) res.push(localName + "." + Array.slice(node.classList).join("."));
		var attrs = [
			"["+ n +'="'+ v +'"]'
				for each({ nodeName:n, nodeValue:v} in $A(node.attributes))
					if (!/^(?:id|class)$/i.test(n))].join("");
		if (attrs) res.push(localName + attrs);
		res.push(localName);
		return res;
	},
};
window.copyXXX.init();


// http://gist.github.com/321205
function $A(arr) Array.slice(arr);
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

function addStyle(css, doc) {
	doc = doc || document;
	var pi = doc.createProcessingInstruction(
		'xml-stylesheet',
		'type="text/css" href="data:text/css;utf-8,' + encodeURIComponent(css) + '"'
	);
	return doc.insertBefore(pi, doc.documentElement);
}

// http://d.hatena.ne.jp/amachang/20090917/1253179486
function escapeXPathExpr(text) {
	var matches = text.match(/[^"]+|"/g);
	function esc(t) {
		return t == '"' ? ('\'' + t + '\'') : ('"' + t + '"');
	}
	if (matches) {
		if (matches.length == 1) {
			return esc(matches[0]);
		} else {
			var results = [];
			for (var i = 0, len = matches.length; i < len; i ++) {
				results.push(esc(matches[i]));
			}
			return 'concat(' + results.join(', ') + ')';
		}
	} else {
		return '""';
	}
}

})();
