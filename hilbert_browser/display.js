//<![CDATA[

var legends=[];

var baselayers = [];
var lrr = datasets[0];
for (var i=0, ds; ds=datasets[i]; ++i) {
  var l = new OpenLayers.Layer.TMS('base', ds.path, {
      tileSize   : new OpenLayers.Size(256, 256),
      format     : "image/png",
      type       : "png",
      visibility : true,
      animate : false,
      isBaseLayer: true,
      getURL     : getURL,
      buffer:0
    });
  ds.layer = l;
  l.lander_legend = legends[ds.kind];
  l.lander_legend8= legends[ds.kind + "8"];
  baselayers.push(l);

}

function getURL(bounds) {
  bounds = this.adjustBounds(bounds);
  var z = this.map.getZoom();
  if (z > 8) z=8; //hack: for zoom levels >8 use same tiles as for 8, but stretch them


  var max = 1 << z;
  var res = this.map.getResolution();
  var my = this.map.maxExtent.top/res/this.tileSize.h - 1;
  var x = Math.round((bounds.left - this.tileOrigin.lon) / (res * this.tileSize.w));
  var y = Math.round(my - (bounds.bottom - this.tileOrigin.lat) / (res * this.tileSize.h));
  if (x < 0 || x >= max || y < 0 || y >= max)
    return;

  if(z >= 2 ){

    if(z==2){var val = 0.25;}
    if(z==3){var val = 0.5;}
    if(z==4){var val = 1;}
    if(z==5){var val = 2;}
    if(z>=6){
        var val = 1;
        if(z==7){val =2;}
        if(z==8){val =4;}

        for(var i=0;i<val;i++){
            for(var j=0;j<val;j++){
                if(x==(62*val)+i && y == (55*val)+j){ return "img/private_space.png"} // 172.16.0.0 /12
            }
        }
        val = 4;
    }
    if(z==7){var val = 8;}
    if(z==8){var val = 16;
        if(x==241 && y == 113){ return  "img/private_space.png"} // 192.168.0.0 / 16
        if(x==238 && y == 240){ return  "img/private_space.png"} // 169.254.0.0 / 16
    }
    for(var i=0;i<val;i++){
        for(var j=0;j<val;j++){
            if(z>=4){
                if(x==(0*val)+i && y == (0*val)+j){ return "img/private_space.png"} // 0.
                if(x==(7*val)+i && y == (8*val)+j){ return "img/private_space.png"} // 127.
                if(x==(3*val)+i && y == (3*val)+j){ return "img/private_space.png"} // 10.
            }
        }
    }
    if(x>=(8*val) && y < (4*val)){ return "img/private_space.png"} // > 224.

  }

  var path = z + "/" + y + "/" + x + "." + this.type;
  return this.url + path;
};

var NUMZOOMS =11;
var map;
var clientip = "unknown"
var clientip_ull;
var clientip_ull_masked;
var nlctl = new OpenLayers.Control.NetLocator({linkDiv:OpenLayers.Util.getElement("loc_link")});
function getfoo(){
    return nlctl
}

function init()
{
  var options = {
    maxExtent     : new OpenLayers.Bounds(0,0, 1<<16, 1<<16),
    maxResolution : 256,
    projection    : "RASTER", //"EPSG:4326",
    //maxZoomLevel  : NUMZOOMS,
    controls      : [],
    numZoomLevels : NUMZOOMS,
    panRatio      : 256,
    buffer: 0
  };

  map = new OpenLayers.Map( "ipMap", options);
  map.currentds = lrr;
  map.addLayer(lrr.layer);
  map.addControl(new OpenLayers.Control.Navigation());

  var pz = new OpenLayers.Control.PanZoomBar();
  pz.zoomStopHeight = NUMZOOMS;
  map.addControl(pz);
  var msgctl = new OpenLayers.Control.Msg();
  map.addControl(msgctl);


  map.addControl(nlctl);
  // Does nnot exists anymore
  //map.addControl(new OpenLayers.Control.MouseDefaults());
  map.addControl(new OpenLayers.Control.PrefixScaleLine());

  map.datasets = datasets;

   map.addControl(new OpenLayers.Control.Selector({
      div            :"add_marker",
      "activeColor"  :"gray",
      "position"     : "right",
      "selectionType":"none",
       "headertxt":"Add Marker<div style=\"width:150px;\"id=\"markerinput\"></div>",
       "datasets"     :  [],
      "topOffset"    : 5,
      "msgctl"       : msgctl
  }));

 map.addControl(new OpenLayers.Control.Selector({
      div            :"sel_kind",
      "activeColor"  :"gray",
      "position"     : "left",
      "selectionType":"kind",
      "datasets"     : datasets,
      "topOffset"    : 100,
      "msgctl"       : msgctl,

  }));



 map.addControl(new OpenLayers.Control.Selector({
      div            :"mylegend",
      "activeColor"  :"gray",
      "position"     : "left",
      "selectionType":"kind",
      "datasets"     : [],
       "headertxt" : "<div  style=\"height:60px\" id=\"mylegenddiv\"></div>",
      "topOffset"    : 5,
      "msgctl"       : msgctl
  }));


 map.addControl(new OpenLayers.Control.Selector({
      div            :"info",
      "activeColor"  :"gray",
      "position"     : "left",
      "selectionType":"none",
      "headertxt" : "<span style=\"padding-left:20px\">Info</span><div id=\"infotxt\"></div>",
      "datasets"     : [],
      "topOffset"    : 245,
      "msgctl"       : msgctl
  }));


     map.addControl(new OpenLayers.Control.Selector({
      div            :"showranges",
      "activeColor"  :"gray",
      "position"     : "right",
      "selectionType":"none",
      "headertxt":"Highlighted range<div id=\"mouserange\">none</div><div id=\"ranges\">none</div><div>enable overlay (slow)<input type=checkbox id=\"overlay_enable\"  onclick=\"map.events.triggerEvent('zoomend')\"></div>",
       "datasets"     :  [],
      "topOffset"    : 80,
      "msgctl"       : msgctl
  }));


    $("#markerinput").append( $("#inputip") );
    $("#markerinput").append($("#addbutton") );


    map.setCenter(new OpenLayers.LonLat(1<<15, 1<<15), 1);
    map._onZoomEnd = function() {
    if( $('#overlay_enable').attr('checked')){
        jQuery("#ranges").html("right drag to select ranges");
    }else{
        jQuery("#ranges").html("");
    }

    var z = this.getZoom();

    var sz= 256;
    var l = this.baseLayer;
    if (z > 8) {
      sz = 1<<z;

    } else {

    }
    this.netbits = (z<<1)+8;

    this.netmask = new Ull(1, (0x7fffffff >> (this.netbits-1))^0x7fffffff);
    jQuery("#infotxt").html(this.currentds.info);



    if (l.tileSize != sz) {
      var size = new OpenLayers.Size(sz,sz);
      this.tileSize = size;
      l.setTileSize(size);
      l.clearGrid();
      l.redraw();
    }


    $("#mylegenddiv").append($(".olControlPanZoomBar") );
    if(z>8){z=8;}
    $(".z_img").hide();
    $("#z"+z+"_img").show();
    $("#mylegenddiv").append($("#z"+z+""))

  };

  map.events.on({
      "zoomend" : map._onZoomEnd,
      scope : map
  });

  nlctl.rePosition();
  setSize();
  map.events.triggerEvent("zoomend");
  setTimeout(function(){openPopups(nlctl)}, 200); //beats me why it has to be done in timeout


}


function openPopups(nlctl) {
  for (var i=0, len=nlctl.currentMarkers.length; i<len; ++i) {
    nlctl.currentMarkers[i].togglePopup();
  }
}

function setSize() {
  var e = document.getElementById('ipMap');
  var h = (window.innerHeight != null)
        ? window.innerHeight
        : document.documentElement.clientHeight;
  e.style.height = (h) + "px";
  map.layers[0].redraw();
  var n = document.createTextNode(' ');
  e.appendChild(n);
  n.parentNode.removeChild(n);
  map.setCenter(map.getCenter());
}
//]]>
