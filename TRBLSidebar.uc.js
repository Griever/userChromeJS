// ==UserScript==
// @name           TRBLSidebar
// @description    サイドバーを上下左右に移動させます
// @namespace      http://d.hatena.ne.jp/Griever/
// @author         Griever
// @license        MIT License
// @compatibility  Firefox 5
// @charset        UTF-8
// @include        main
// @version        0.0.1
// ==/UserScript==

(function(css){

if (window.TRBLSidebar) {
	window.TRBLSidebar.destroy();
	delete window.TRBLSidebar;
}

window.TRBLSidebar = {
	init: function() {
		var button = $E(<>
			<toolbarbutton id="TRBLSidebar-button"
			               type="menu-button"
			               context="TRBLSidebar-popup"
			               oncommand="if (event.target == this) TRBLSidebar.toggle();">
				<menupopup id="TRBLSidebar-popup">
					<menuitem label="Left" oncommand="TRBLSidebar.left();" />
					<menuitem label="Right" oncommand="TRBLSidebar.right();" />
					<menuitem label="Top" oncommand="TRBLSidebar.top();" />
					<menuitem label="Bottom" oncommand="TRBLSidebar.bottom();" />
					<menuseparator />
					<menuitem label="Close" oncommand="toggleSidebar();" />
				</menupopup>
			</toolbarbutton>
			<spacer id="TRBLSidebar-spacer" flex="1"/>
		</>);
		var ins =$("sidebar-throbber");
		ins.parentNode.insertBefore(button, ins);
		
		this.style = addStyle(css);
		window.addEventListener("unload", this, false);
	},
	uninit: function() {
		window.removeEventListener("unload", this, false);
		document.persist('browser', 'sidebar_position');
	},
	destroy: function() {
		this.uninit();
		var e = $("TRBLSidebar-button");
		if (e) e.parentNode.removeChild(e);
		var e = $("TRBLSidebar-spacer");
		if (e) e.parentNode.removeChild(e);
		this.style.parentNode.removeChild(this.style);
	},
	handleEvent: function(event) {
		switch(event.type){
			case "unload":
				this.uninit();
				break;
		}
	},
	toggle: function() {
		var pos = $("browser").getAttribute("sidebar_position");
		switch(pos) {
			case "right" : this.left(); break;
			case "top"   : this.bottom(); break;
			case "bottom": this.top(); break;
			default      : this.right(); break;
		}
	},
	left: function() {
		$("browser").setAttribute("sidebar_position", "left");
		$("sidebar-splitter").orient = "horizontal";
	},
	right: function() {
		$("browser").setAttribute("sidebar_position", "right");
		$("sidebar-splitter").orient = "horizontal";
	},
	top: function() {
		$("browser").setAttribute("sidebar_position", "top");
		$("sidebar-splitter").orient = "vertical";
	},
	bottom: function() {
		$("browser").setAttribute("sidebar_position", "bottom");
		$("sidebar-splitter").orient = "vertical";
	}
};
window.TRBLSidebar.init();


function $(id) { return document.getElementById(id); }
function $$(exp, doc) { return Array.prototype.slice.call((doc || document).querySelectorAll(exp)); }
function $A(args) { return Array.prototype.slice.call(args); }
function U(text) 1 < 'あ'.length ? decodeURIComponent(escape(text)) : text;
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
function addStyle(css) {
	var pi = document.createProcessingInstruction(
		'xml-stylesheet',
		'type="text/css" href="data:text/css;utf-8,' + encodeURIComponent(css) + '"'
	);
	return document.insertBefore(pi, document.documentElement);
}

})(<![CDATA[

#sidebar {
  max-width: none !important;
  min-width: 100px !important;
}

#browser[sidebar_position="right"]  > #browser-border-start,
#browser[sidebar_position="bottom"] > #browser-border-start { -moz-box-ordinal-group: 1 !important; }
#browser[sidebar_position="right"]  > #browser-border-end,
#browser[sidebar_position="bottom"] > #browser-border-end   { -moz-box-ordinal-group: 99 !important; }
#browser[sidebar_position="right"]  > #sidebar-box,
#browser[sidebar_position="bottom"] > #sidebar-box          { -moz-box-ordinal-group: 10 !important; }
#browser[sidebar_position="right"]  > #sidebar-splitter,
#browser[sidebar_position="bottom"] > #sidebar-splitter     { -moz-box-ordinal-group: 9 !important; }

#browser[sidebar_position="top"],
#browser[sidebar_position="bottom"],
#browser[sidebar_position="top"]    #sidebar-header,
#browser[sidebar_position="bottom"] #sidebar-header,
#browser[sidebar_position="top"]    #TRBLSidebar-button,
#browser[sidebar_position="bottom"] #TRBLSidebar-button { -moz-box-orient: vertical !important; }

#browser[sidebar_position="top"]    > #sidebar-box,
#browser[sidebar_position="bottom"] > #sidebar-box  { -moz-box-orient: horizontal !important; }

#browser[sidebar_position="top"]    #sidebar-title,
#browser[sidebar_position="bottom"] #sidebar-title,
#browser:not([sidebar_position="top"]):not([sidebar_position="bottom"]) #TRBLSidebar-spacer { display: none !important; }

#TRBLSidebar-button {
  /* icon http://www.famfamfam.com/lab/icons/silk/preview.php */
  list-style-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABEElEQVQ4jWNgGAUkAb/pbru1G7TZyDbAfYL9d4c2y9sYEsXH0/8XH0//X3Ao5X/O3oT/6dtj/iduCP8fvSLof+gCn/9+M9z+e0xw+J+4KPJ/9JyQ/8ZluhcxDFh7a8n/VTcW/l92be7/RVdm/p93aer/mecn/Z9ypvd//6mO/13HW/63HWn433iw5r//BM//6ukqJ+EGFBxK+b/i+vz/S67O/r/g8vT/cy5M/j/9XP//Sae7/veebPvfcbTxf/Oh2v/1Byr/V+8t/e/Z7fJfKUn+CNwAfM52bLf6b1Vv8t+l3e5/7IKI/x5dzv+VEuXPkxyAermaFurpyt+VkhRukqwZBpQTFXYwhDKQH43DFAAASWWTs0cQDHYAAAAASUVORK5CYII=");
}
#browser[sidebar_position="right"] #TRBLSidebar-button .toolbarbutton-icon {
  -moz-transform: rotate(180deg) !important;
}
#browser[sidebar_position="top"] #TRBLSidebar-button .toolbarbutton-icon {
  -moz-transform: rotate(90deg) !important;
}
#browser[sidebar_position="bottom"] #TRBLSidebar-button .toolbarbutton-icon {
  -moz-transform: rotate(270deg) !important;
}

]]>.toString());
