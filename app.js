/* ==========================================================
   HOTEL NETWORK DIAGRAM
   Engine V3
   Part 6A
========================================================== */

const svg = document.getElementById("diagram");
const viewport = document.getElementById("viewport");
const gridLayer = document.getElementById("gridLayer");

const nodesLayer = document.getElementById("nodes");
const linksLayer = document.getElementById("links");

const SVGNS = "http://www.w3.org/2000/svg";

let selectedNode = null;
let dragging = null;
let dragStartPosition = null;
let draggingPointerId = null;

let offsetX = 0;
let offsetY = 0;

let selectedElement = null;
let selectedLink = null;
let linkEditHistoryRecorded = false;

let linkMode=false;
let firstLinkNode=null;

let contextTarget=null;
let panMode=false;

let panStartX=0;

let panStartY=0;

let viewX=0;

let viewY=0;
const NODE_WIDTH = 90;
const NODE_HEIGHT = 90;
const GRID_SIZE = 20;

let gridEnabled = true;
let snapEnabled = true;

/* ==========================================================
   DATA
========================================================== */

const DEFAULT_NODES = [

{
    id:"isp1",
    type:"cloud",
    text:"ISP-1",
    x:80,
    y:70
},

{
    id:"isp2",
    type:"cloud",
    text:"ISP-2",
    x:80,
    y:220
},

{
    id:"router",
    type:"router",
    text:"Firewall",
    x:250,
    y:170
},

{
    id:"core",
    type:"switch",
    text:"Core Switch",
    x:470,
    y:170
},

{
    id:"bo",
    type:"switch",
    text:"BO Switch",
    x:700,
    y:20
},

{
    id:"guest",
    type:"switch",
    text:"sw Guest",
    x:620,
    y:150
},

{
    id:"cctv",
    type:"switch",
    text:"sw CCTV",
    x:620,
    y:280
},

{
    id:"server1",
    type:"pc",
    text:"Server",
    x:900,
    y:20
},

{
    id:"nas1",
    type:"nas",
    text:"NAS",
    x:900,
    y:120
},

{
    id:"dvr1",
    type:"dvr",
    text:"DVR",
    x:900,
    y:220
},

{
    id:"pabx1",
    type:"pabx",
    text:"PABX",
    x:900,
    y:320
}

];

const DEFAULT_LINKS = [

["isp1","router"],
["isp2","router"],

["router","core"],

["core","bo"],
["core","guest"],
["core","cctv"],

["bo","server1"],
["bo","nas1"],
["bo","dvr1"],
["bo","pabx1"]

];

const nodes = DEFAULT_NODES.map(node=>({...node}));
const DEFAULT_LINK_APPEARANCE = {
    color:"#cfcfcf",
    width:2,
    style:"solid",
    opacity:1,
    labelFollowsLine:true
};

function createDefaultLinkAppearance(){

    return {...DEFAULT_LINK_APPEARANCE};

}

function normalizeLink(link){

    if(Array.isArray(link)){

        return{
            from:link[0],
            to:link[1],
            appearance:createDefaultLinkAppearance()
        };

    }

    return{
        from:link.from || link[0],
        to:link.to || link[1],
        appearance:{
            ...createDefaultLinkAppearance(),
            ...(link.appearance || link.style || {})
        },
        meta:{...(link.meta || {})}
    };

}

function cloneLink(link){

    const normalized=normalizeLink(link);

    return{
        ...normalized,
        appearance:{...normalized.appearance},
        meta:{...(normalized.meta || {})}
    };

}

function getLinkAppearance(link){

    return normalizeLink(link).appearance;

}

function getLinkDashArray(appearance){

    if(appearance.style==="dashed") return "10 7";
    if(appearance.style==="dotted") return "2 7";

    return "";

}

function applyLinkAppearance(line,link){

    const appearance=getLinkAppearance(link);

    line.setAttribute("stroke",appearance.color);
    line.setAttribute("stroke-width",appearance.width);
    line.setAttribute("stroke-opacity",appearance.opacity);
    line.setAttribute("stroke-dasharray",getLinkDashArray(appearance));
    line.setAttribute("stroke-linecap",appearance.style==="dotted" ? "round" : "butt");

}

const links = DEFAULT_LINKS.map(normalizeLink);

/* ==========================================================
   UNDO / REDO HISTORY
========================================================== */

const HISTORY_LIMIT = 100;
const undoHistory = [];
const redoHistory = [];

function cloneDiagramState(){

    return{

        nodes:nodes.map(node=>({...node})),
        links:links.map(cloneLink)

    };

}

function restoreDiagramState(state,shouldPersist=true){

    nodes.splice(0,nodes.length);

    state.nodes.forEach(node=>{

        nodes.push({...node});

    });

    links.splice(0,links.length);

    state.links.forEach(link=>{

        links.push(cloneLink(link));

    });

    selectedNode=null;
    selectedElement=null;
    selectedLink=null;
    contextTarget=null;
    linkMode=false;
    firstLinkNode=null;

    render();
    updateHistoryButtons();

    if(shouldPersist){

        saveToLocalStorage();

    }

}

function statesAreEqual(a,b){

    return JSON.stringify(a)===JSON.stringify(b);

}

function recordHistory(){

    const snapshot=cloneDiagramState();

    if(undoHistory.length>0 && statesAreEqual(undoHistory[undoHistory.length-1],snapshot)){

        return;

    }

    undoHistory.push(snapshot);

    if(undoHistory.length>HISTORY_LIMIT){

        undoHistory.shift();

    }

    redoHistory.splice(0,redoHistory.length);
    updateHistoryButtons();

}

function undo(){

    if(undoHistory.length===0) return;

    redoHistory.push(cloneDiagramState());

    const previous=undoHistory.pop();

    restoreDiagramState(previous);

}

function redo(){

    if(redoHistory.length===0) return;

    undoHistory.push(cloneDiagramState());

    if(undoHistory.length>HISTORY_LIMIT){

        undoHistory.shift();

    }

    const next=redoHistory.pop();

    restoreDiagramState(next);

}

function updateHistoryButtons(){

    const btnUndo=document.getElementById("btnUndo");
    const btnRedo=document.getElementById("btnRedo");

    if(btnUndo){

        btnUndo.disabled=undoHistory.length===0;

    }

    if(btnRedo){

        btnRedo.disabled=redoHistory.length===0;

    }

}

/* ==========================================================
   RENDER
========================================================== */

function snapToGrid(value){

    return Math.round(value/GRID_SIZE)*GRID_SIZE;

}

function getSnappedPosition(x,y){

    if(!snapEnabled){

        return{x:x,y:y};

    }

    return{
        x:snapToGrid(x),
        y:snapToGrid(y)
    };

}

function updateToggleButton(button,isActive){

    if(!button) return;

    button.classList.toggle("active",isActive);
    button.setAttribute("aria-pressed",String(isActive));

}

function updateLayoutTools(){

    if(gridLayer){

        gridLayer.classList.toggle("hidden",!gridEnabled);
        gridLayer.setAttribute(
            "transform",
            `translate(${viewX},${viewY}) scale(${zoom})`
        );

    }

    updateToggleButton(document.getElementById("btnGrid"),gridEnabled);
    updateToggleButton(document.getElementById("btnSnap"),snapEnabled);

}

function resetView(){

    zoom=1;
    viewX=0;
    viewY=0;
    updateView();

}

function render(){

    nodesLayer.innerHTML="";
    linksLayer.innerHTML="";

    drawLinks();

    nodes.forEach(drawNode);

}

/* ==========================================================
   DRAW NODE
========================================================== */

function drawNode(node){

    const g=document.createElementNS(SVGNS,"g");

    g.classList.add("node");
    g.dataset.id=node.id;

    g.setAttribute(
        "transform",
        `translate(${node.x},${node.y})`
    );

    //------------------------------------
    // Background
    //------------------------------------

    const circle=document.createElementNS(SVGNS,"circle");

    circle.setAttribute("cx",45);
    circle.setAttribute("cy",30);
    circle.setAttribute("r",26);

    circle.setAttribute("class","deviceIcon");

    g.appendChild(circle);

    //------------------------------------
    // ICON GROUP
    //------------------------------------

    const icon=document.createElementNS(SVGNS,"g");

    icon.setAttribute("stroke","#ffffff");
    icon.setAttribute("stroke-width","2");
    icon.setAttribute("fill","none");
    icon.setAttribute("stroke-linecap","round");
    icon.setAttribute("stroke-linejoin","round");

   if(node.type==="cloud"){
    drawCloud(icon);
}

if(node.type==="router"){
    drawRouter(icon);
}

if(node.type==="switch"){
    drawSwitch(icon);
}

    //------------------------------------
    // AP
    //------------------------------------

    if(node.type==="ap"){

        const c=document.createElementNS(SVGNS,"circle");

        c.setAttribute("cx",45);
        c.setAttribute("cy",31);
        c.setAttribute("r",4);

        icon.appendChild(c);

        [10,16,22].forEach(r=>{

            const arc=document.createElementNS(SVGNS,"path");

            arc.setAttribute(
                "d",
                `M${45-r} 31 A${r} ${r} 0 0 1 ${45+r} 31`
            );

            icon.appendChild(arc);

        });

    }
//------------------------------------
// PC
//------------------------------------

if(node.type==="pc"){

    const s=document.createElementNS(SVGNS,"rect");

    s.setAttribute("x",34);
    s.setAttribute("y",20);
    s.setAttribute("width",22);
    s.setAttribute("height",16);
    s.setAttribute("rx",2);

    icon.appendChild(s);

    const stand=document.createElementNS(SVGNS,"line");

    stand.setAttribute("x1",45);
    stand.setAttribute("y1",36);
    stand.setAttribute("x2",45);
    stand.setAttribute("y2",42);

    icon.appendChild(stand);

    const base=document.createElementNS(SVGNS,"line");

    base.setAttribute("x1",39);
    base.setAttribute("y1",42);
    base.setAttribute("x2",51);
    base.setAttribute("y2",42);

    icon.appendChild(base);

}

/*----------------------------------*/
// NAS
/*----------------------------------*/

if(node.type==="nas"){

    const body=document.createElementNS(SVGNS,"rect");

    body.setAttribute("x",36);
    body.setAttribute("y",18);
    body.setAttribute("width",18);
    body.setAttribute("height",24);
    body.setAttribute("rx",2);

    icon.appendChild(body);

    for(let i=0;i<3;i++){

        const d=document.createElementNS(SVGNS,"circle");

        d.setAttribute("cx",40);
        d.setAttribute("cy",24+i*6);
        d.setAttribute("r",1);

        d.setAttribute("fill","#ffffff");

        icon.appendChild(d);

    }

}

/*----------------------------------*/
// CAMERA
/*----------------------------------*/

if(node.type==="camera"){

    const body=document.createElementNS(SVGNS,"rect");

    body.setAttribute("x",34);
    body.setAttribute("y",26);
    body.setAttribute("width",18);
    body.setAttribute("height",8);

    icon.appendChild(body);

    const lens=document.createElementNS(SVGNS,"line");

    lens.setAttribute("x1",52);
    lens.setAttribute("y1",30);

    lens.setAttribute("x2",60);
    lens.setAttribute("y2",26);

    icon.appendChild(lens);

}

/*----------------------------------*/
// DVR
/*----------------------------------*/

if(node.type==="dvr"){

    const body=document.createElementNS(SVGNS,"rect");

    body.setAttribute("x",31);
    body.setAttribute("y",23);

    body.setAttribute("width",28);
    body.setAttribute("height",16);

    icon.appendChild(body);

    const h=document.createElementNS(SVGNS,"circle");

    h.setAttribute("cx",53);
    h.setAttribute("cy",31);

    h.setAttribute("r",2);

    h.setAttribute("fill","#ffffff");

    icon.appendChild(h);

}

/*----------------------------------*/
// PABX
/*----------------------------------*/

if(node.type==="pabx"){

    const body=document.createElementNS(SVGNS,"rect");

    body.setAttribute("x",34);
    body.setAttribute("y",20);

    body.setAttribute("width",22);
    body.setAttribute("height",20);

    icon.appendChild(body);

    const line=document.createElementNS(SVGNS,"line");

    line.setAttribute("x1",45);
    line.setAttribute("y1",20);

    line.setAttribute("x2",45);
    line.setAttribute("y2",40);

    icon.appendChild(line);

}
    //------------------------------------

    g.appendChild(icon);

    //------------------------------------

    const text=document.createElementNS(SVGNS,"text");

    text.setAttribute("x",45);
    text.setAttribute("y",80);

    text.setAttribute("text-anchor","middle");

    const lines=node.text.split("\n");

    if(lines.length===1){

        text.textContent=node.text;

    }else{

        lines.forEach((line,index)=>{

            const t=document.createElementNS(SVGNS,"tspan");

            t.setAttribute("x",45);

            t.setAttribute(
                "dy",
                index===0?"0":"1.2em"
            );

            t.textContent=line;

            text.appendChild(t);

        });

    }

    g.appendChild(text);

    g.addEventListener("pointerdown",startDrag);

    g.addEventListener("click",function(e){

    selectedElement=g;

    selectNode(e);

});
g.addEventListener("contextmenu",function(e){

    e.preventDefault();

    contextTarget=node;

    contextMenu.style.display="block";

    contextMenu.style.left=e.pageX+"px";

    contextMenu.style.top=e.pageY+"px";

});
nodesLayer.appendChild(g);

}

function showNodeProperties(){

    document.getElementById("nodeProperties").style.display="";
    document.getElementById("linkProperties").style.display="none";

}

function showLinkProperties(){

    document.getElementById("nodeProperties").style.display="none";
    document.getElementById("linkProperties").style.display="";

}

function getNodeLabel(id){

    const node=nodes.find(item=>item.id===id);

    return node ? node.text : id;

}

function deleteSelectedLink(){

    if(!selectedLink) return;

    const idx=links.findIndex(link=>
        link.from===selectedLink.from &&
        link.to===selectedLink.to
    );

    if(idx>=0){

        recordHistory();
        links.splice(idx,1);
        selectedLink=null;
        showNodeProperties();
        render();
        saveToLocalStorage();

    }

}

function selectLinkByEndpoints(from,to){

    selectedLink=links.find(link=>link.from===from && link.to===to);

    if(!selectedLink) return;

    selectedNode=null;
    selectedElement=null;
    linkEditHistoryRecorded=false;

    document
        .querySelectorAll(".node")
        .forEach(n=>n.classList.remove("selected"));

    const appearance=getLinkAppearance(selectedLink);

    document.getElementById("propLinkName").value=`${getNodeLabel(from)} → ${getNodeLabel(to)}`;
    document.getElementById("propLinkColor").value=appearance.color;
    document.getElementById("propLinkWidth").value=appearance.width;
    document.getElementById("propLinkStyle").value=appearance.style;
    document.getElementById("propLinkOpacity").value=appearance.opacity;

    showLinkProperties();
    render();

}
function drawCloud(icon){

    const path=document.createElementNS(SVGNS,"path");

    path.setAttribute(
        "d",
        "M30 35 Q30 28 37 28 Q39 21 47 23 Q53 20 58 26 Q65 26 65 34 Q65 39 59 39 L36 39 Q30 39 30 35"
    );

    icon.appendChild(path);

}

function drawRouter(icon){

    const r=document.createElementNS(SVGNS,"rect");

    r.setAttribute("x",33);
    r.setAttribute("y",22);
    r.setAttribute("width",24);
    r.setAttribute("height",16);
    r.setAttribute("rx",3);

    icon.appendChild(r);

    for(let i=0;i<4;i++){

        const l=document.createElementNS(SVGNS,"line");

        l.setAttribute("x1",36+i*6);
        l.setAttribute("y1",41);

        l.setAttribute("x2",36+i*6);
        l.setAttribute("y2",46);

        icon.appendChild(l);

    }

}

function drawSwitch(icon){

    const r=document.createElementNS(SVGNS,"rect");

    r.setAttribute("x",31);
    r.setAttribute("y",24);

    r.setAttribute("width",28);
    r.setAttribute("height",14);

    icon.appendChild(r);

    for(let i=0;i<6;i++){

        const p=document.createElementNS(SVGNS,"line");

        p.setAttribute("x1",34+i*4);
        p.setAttribute("y1",28);

        p.setAttribute("x2",34+i*4);
        p.setAttribute("y2",34);

        icon.appendChild(p);

    }

}

/* ==========================================================
   DRAW LINKS
========================================================== */

function drawLinks(){

    links.forEach(link=>{

        const from=findCenter(link.from);
        const to=findCenter(link.to);

        // garis klik (tidak terlihat)
        const hit=document.createElementNS(SVGNS,"line");

        hit.setAttribute("x1",from.x);
        hit.setAttribute("y1",from.y);
        hit.setAttribute("x2",to.x);
        hit.setAttribute("y2",to.y);

        hit.setAttribute("stroke","transparent");
        hit.setAttribute("stroke-width","16");
        hit.style.pointerEvents="stroke";

        hit.dataset.from=link.from;
        hit.dataset.to=link.to;

        hit.addEventListener("click",function(e){

            e.stopPropagation();

            selectLinkByEndpoints(this.dataset.from,this.dataset.to);

        });

        // garis yang terlihat
        const line=document.createElementNS(SVGNS,"line");

        line.classList.add("link");
        line.style.pointerEvents="none";

        line.setAttribute("x1",from.x);
        line.setAttribute("y1",from.y);
        line.setAttribute("x2",to.x);
        line.setAttribute("y2",to.y);
        line.dataset.from=link.from;
        line.dataset.to=link.to;
        applyLinkAppearance(line,link);

        if(selectedLink && selectedLink.from===link.from && selectedLink.to===link.to){

            line.classList.add("selectedLink");

        }

        linksLayer.appendChild(hit);
        linksLayer.appendChild(line);

    });

}

/* ==========================================================
   FIND CENTER
========================================================== */

function findCenter(id){

    const n=nodes.find(x=>x.id===id);

    return{

        x:n.x+(NODE_WIDTH/2),
        y:n.y+32

    };

}

/* ==========================================================
   SELECT NODE
========================================================== */

function selectNode(e){

    document
        .querySelectorAll(".node")
        .forEach(n=>n.classList.remove("selected"));

    e.currentTarget.classList.add("selected");

    const id=e.currentTarget.dataset.id;

    selectedNode=nodes.find(x=>x.id===id);
    selectedLink=null;
if(linkMode){

    if(firstLinkNode==null){

        firstLinkNode=selectedNode;

        document.getElementById("statusBar").textContent=
        "LINK MODE : pilih device kedua";

        return;

    }

    if(firstLinkNode.id!==selectedNode.id){

        recordHistory();

        links.push(normalizeLink([
            firstLinkNode.id,
            selectedNode.id
        ]));

    }

    firstLinkNode=null;

    linkMode=false;

    render();
    saveToLocalStorage();

    document.getElementById("statusBar").textContent="Ready";

    return;

}

    document.getElementById("propName").value=
        selectedNode.text;

    document.getElementById("propIP").value=
        selectedNode.ip || "";

    document.getElementById("propModel").value=
        selectedNode.model || "";

    document.getElementById("propLocation").value=
        selectedNode.location || "";

    document.getElementById("propNotes").value=
        selectedNode.notes || "";

    showNodeProperties();

}

/* ==========================================================
   UPDATE PROPERTY
========================================================== */

document
.getElementById("btnUpdate")
.onclick=function(){

    if(!selectedNode) return;

    const nextState=cloneDiagramState();
    const nextNode=nextState.nodes.find(node=>node.id===selectedNode.id);

    if(nextNode){

        nextNode.text=document.getElementById("propName").value;
        nextNode.ip=document.getElementById("propIP").value;
        nextNode.model=document.getElementById("propModel").value;
        nextNode.location=document.getElementById("propLocation").value;
        nextNode.notes=document.getElementById("propNotes").value;

    }

    if(!statesAreEqual(cloneDiagramState(),nextState)){

        recordHistory();

    }

    selectedNode.text=
        document.getElementById("propName").value;

    selectedNode.ip=
        document.getElementById("propIP").value;

    selectedNode.model=
        document.getElementById("propModel").value;

    selectedNode.location=
        document.getElementById("propLocation").value;

    selectedNode.notes=
        document.getElementById("propNotes").value;

    render();
    saveToLocalStorage();

};
/* ==========================================================
   DRAG ENGINE
========================================================== */
svg.addEventListener("mousedown",function(e){

    if(e.button!==2) return;

    panMode=true;

    panStartX=e.clientX-viewX;

    panStartY=e.clientY-viewY;

});
function getViewportPoint(e){

    const pt=svg.createSVGPoint();

    pt.x=e.clientX;
    pt.y=e.clientY;

    return pt.matrixTransform(
        viewport.getScreenCTM().inverse()
    );

}

function startDrag(e){

    if(e.pointerType==="mouse" && e.button!==0) return;

    e.preventDefault();

    dragging=e.currentTarget;
    draggingPointerId=e.pointerId;

    if(dragging.setPointerCapture){

        dragging.setPointerCapture(e.pointerId);

    }

    const id=dragging.dataset.id;

    selectedNode=nodes.find(n=>n.id===id);

    const p=getViewportPoint(e);

    offsetX=p.x-selectedNode.x;
    offsetY=p.y-selectedNode.y;

    dragStartPosition={
        x:selectedNode.x,
        y:selectedNode.y
    };

}
svg.addEventListener("contextmenu",function(e){

    if(panMode){

        e.preventDefault();

    }

});
svg.addEventListener("pointermove",function(e){

    if(panMode){

    viewX=e.clientX-panStartX;

    viewY=e.clientY-panStartY;

    updateView();

    return;

}

if(!dragging || e.pointerId!==draggingPointerId) return;

    e.preventDefault();

    const p=getViewportPoint(e);

    const snappedPosition=getSnappedPosition(p.x-offsetX,p.y-offsetY);

    selectedNode.x=snappedPosition.x;
    selectedNode.y=snappedPosition.y;

    dragging.setAttribute(
        "transform",
        `translate(${selectedNode.x},${selectedNode.y})`
    );

    drawLinksOnly();

});

function stopDrag(e){

    panMode=false;

    if(e && draggingPointerId!==null && e.pointerId!==draggingPointerId) return;

    if(dragging && dragging.releasePointerCapture && e){

        dragging.releasePointerCapture(e.pointerId);

    }

    if(dragging && selectedNode && dragStartPosition &&
        (selectedNode.x!==dragStartPosition.x || selectedNode.y!==dragStartPosition.y)){

        const movedNode=selectedNode;
        const endX=selectedNode.x;
        const endY=selectedNode.y;

        selectedNode.x=dragStartPosition.x;
        selectedNode.y=dragStartPosition.y;
        recordHistory();
        movedNode.x=endX;
        movedNode.y=endY;
        saveToLocalStorage();

    }

    dragging=null;
    draggingPointerId=null;
    dragStartPosition=null;
    updateHistoryButtons();

}

window.addEventListener("pointerup",stopDrag);
window.addEventListener("pointercancel",stopDrag);

/* ==========================================================
   REDRAW LINKS ONLY
========================================================== */

function drawLinksOnly(){

    linksLayer.innerHTML="";

    links.forEach(link=>{

        const from=findCenter(link.from);
        const to=findCenter(link.to);

        const hit=document.createElementNS(SVGNS,"line");

        hit.setAttribute("x1",from.x);
        hit.setAttribute("y1",from.y);
        hit.setAttribute("x2",to.x);
        hit.setAttribute("y2",to.y);

        hit.setAttribute("stroke","transparent");
        hit.setAttribute("stroke-width","16");
        hit.style.pointerEvents="stroke";

        hit.dataset.from=link.from;
        hit.dataset.to=link.to;

        hit.addEventListener("click",function(e){

            e.stopPropagation();

            selectLinkByEndpoints(this.dataset.from,this.dataset.to);

        });

        const line=document.createElementNS(SVGNS,"line");

        line.classList.add("link");
        line.style.pointerEvents="none";

        line.setAttribute("x1",from.x);
        line.setAttribute("y1",from.y);
        line.setAttribute("x2",to.x);
        line.setAttribute("y2",to.y);
        line.dataset.from=link.from;
        line.dataset.to=link.to;
        applyLinkAppearance(line,link);

        if(selectedLink && selectedLink.from===link.from && selectedLink.to===link.to){

            line.classList.add("selectedLink");

        }

        linksLayer.appendChild(hit);
        linksLayer.appendChild(line);

    });

}
/* ==========================================================
   ZOOM ENGINE
========================================================== */

let zoom = 1;
function updateView(){

    viewport.setAttribute(
        "transform",
        `translate(${viewX},${viewY}) scale(${zoom})`
    );

    updateLayoutTools();

}


document.addEventListener("wheel",function(e){

    if(!e.ctrlKey) return;

    e.preventDefault();

    if(e.deltaY<0){

        zoom*=1.1;

    }else{

        zoom/=1.1;

    }

    if(zoom<0.3) zoom=0.3;
    if(zoom>4) zoom=4;

    updateView();

},{passive:false});


/* ==========================================================
   SAVE LAYOUT
========================================================== */

function createLayoutData(){

    return{

        nodes:nodes.map(node=>({

            id:node.id,
            type:node.type,
            text:node.text,
            ip:node.ip || "",
            model:node.model || "",
            location:node.location || "",
            notes:node.notes || "",
            x:node.x,
            y:node.y

        })),

        links:links.map(cloneLink),

        zoom:zoom,
        viewX:viewX,
        viewY:viewY

    };

}

const LOCAL_STORAGE_KEY="hotelNetworkDiagram.latest";

function saveToLocalStorage(){

    try{

        localStorage.setItem(
            LOCAL_STORAGE_KEY,
            JSON.stringify(createLayoutData())
        );

    }catch(e){

        console.warn("Unable to auto-save diagram",e);

    }

}

function loadFromLocalStorage(){

    try{

        const saved=localStorage.getItem(LOCAL_STORAGE_KEY);

        if(saved){

            loadLayout(saved);
            return true;

        }

    }catch(e){

        console.warn("Unable to load saved diagram",e);

    }

    return false;

}

function resetToDefaultDiagram(){

    localStorage.removeItem(LOCAL_STORAGE_KEY);

    loadLayout(JSON.stringify({
        nodes:DEFAULT_NODES,
        links:DEFAULT_LINKS,
        zoom:1,
        viewX:0,
        viewY:0
    }));

    selectedNode=null;
    selectedElement=null;
    selectedLink=null;

    render();
    updateView();

}

function saveLayout(){

    const data=createLayoutData();

    const blob=new Blob(
        [JSON.stringify(data,null,4)],
        {type:"application/json"}
    );

    const url=URL.createObjectURL(blob);

    const a=document.createElement("a");

    a.href=url;
    a.download="hotel-network-diagram.json";

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);

}


/* ==========================================================
   LOAD LAYOUT
========================================================== */

function loadLayout(data){

    if(!data) return;

    const layout=JSON.parse(data);

    const loadedNodes=Array.isArray(layout) ? layout : layout.nodes;

    if(Array.isArray(loadedNodes)){

        nodes.splice(0,nodes.length);

        loadedNodes.forEach(n=>{

            nodes.push({

                id:n.id,
                type:n.type,
                text:n.text,
                ip:n.ip || "",
                model:n.model || "",
                location:n.location || "",
                notes:n.notes || "",
                x:n.x,
                y:n.y

            });

        });

    }

    if(Array.isArray(layout.links)){

        links.splice(0,links.length);

        layout.links.forEach(link=>{

            if((Array.isArray(link) && link.length>=2) || (link && link.from && link.to)){

                links.push(normalizeLink(link));

            }

        });

    }

    if(typeof layout.zoom==="number"){

        zoom=layout.zoom;

    }

    if(typeof layout.viewX==="number"){

        viewX=layout.viewX;

    }

    if(typeof layout.viewY==="number"){

        viewY=layout.viewY;

    }

    undoHistory.splice(0,undoHistory.length);
    redoHistory.splice(0,redoHistory.length);
    updateHistoryButtons();

}



/* ==========================================================
   HIGH QUALITY PNG EXPORT
========================================================== */

function getDiagramBounds(){

    const padding=50;

    if(nodes.length===0){

        return{
            x:-padding,
            y:-padding,
            width:padding*2,
            height:padding*2
        };

    }

    let minX=Infinity;
    let minY=Infinity;
    let maxX=-Infinity;
    let maxY=-Infinity;

    nodes.forEach(node=>{

        minX=Math.min(minX,node.x);
        minY=Math.min(minY,node.y);
        maxX=Math.max(maxX,node.x+NODE_WIDTH);
        maxY=Math.max(maxY,node.y+NODE_HEIGHT);

    });

    return{
        x:minX-padding,
        y:minY-padding,
        width:(maxX-minX)+(padding*2),
        height:(maxY-minY)+(padding*2)
    };

}

function createExportStyles(){

    const style=document.createElementNS(SVGNS,"style");

    style.textContent=`
        .node rect{fill:#2f3b52;stroke:#5ea8ff;stroke-width:2;rx:8;}
        .node circle,.deviceIcon{fill:#2f3136;stroke:#00c8ff;stroke-width:2;}
        .node text{fill:#ffffff;font-family:Segoe UI,Arial,sans-serif;font-size:13px;text-anchor:middle;dominant-baseline:middle;user-select:none;pointer-events:none;}
        .link{fill:none;}
    `;

    return style;

}

function exportPNG(){

    render();

    const bounds=getDiagramBounds();
    const scale=4;

    const exportSvg=document.createElementNS(SVGNS,"svg");

    exportSvg.setAttribute("xmlns",SVGNS);
    exportSvg.setAttribute("width",bounds.width);
    exportSvg.setAttribute("height",bounds.height);
    exportSvg.setAttribute("viewBox",`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);

    exportSvg.appendChild(createExportStyles());

    const exportViewport=document.createElementNS(SVGNS,"g");
    const exportLinks=linksLayer.cloneNode(true);
    const exportNodes=nodesLayer.cloneNode(true);

    exportNodes
        .querySelectorAll(".selected")
        .forEach(node=>node.classList.remove("selected"));

    exportViewport.appendChild(exportLinks);
    exportViewport.appendChild(exportNodes);

    exportSvg.appendChild(exportViewport);

    const svgText=new XMLSerializer().serializeToString(exportSvg);
    const blob=new Blob([svgText],{type:"image/svg+xml;charset=utf-8"});
    const url=URL.createObjectURL(blob);

    const img=new Image();

    img.onload=function(){

        const canvas=document.createElement("canvas");

        canvas.width=Math.ceil(bounds.width*scale);
        canvas.height=Math.ceil(bounds.height*scale);

        const ctx=canvas.getContext("2d");

        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(img,0,0,canvas.width,canvas.height);

        URL.revokeObjectURL(url);

        canvas.toBlob(function(pngBlob){

            const pngUrl=URL.createObjectURL(pngBlob);
            const a=document.createElement("a");

            a.href=pngUrl;
            a.download="Hotel-Network.png";

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(pngUrl);

        },"image/png");

    };

    img.src=url;

}

/* ==========================================================
   INITIALIZE
========================================================== */
function updateDeviceOptions(){

    const type = deviceType.value;

    // sembunyikan dulu semuanya
    lblModel.style.display = "none";
    deviceModel.style.display = "none";

    lblPortCount.style.display = "none";
    devicePortCount.style.display = "none";

    deviceModel.innerHTML = "";

    // kalau bukan router / switch selesai
    if(type !== "router" && type !== "switch"){
        return;
    }

    // tampilkan lagi
    lblModel.style.display = "";
    deviceModel.style.display = "";

    lblPortCount.style.display = "";
    devicePortCount.style.display = "";

    DEVICE_MODELS[type].forEach(model=>{

        const option=document.createElement("option");

        option.textContent=model.name;
        option.value=model.name;
        option.dataset.ports=model.ports;

        deviceModel.appendChild(option);

    });

    devicePortCount.value =
        DEVICE_MODELS[type][0].ports;

}
loadFromLocalStorage();
render();
updateView();
updateHistoryButtons();
updateLayoutTools();
/* ==========================================================
   ADD DEVICE
========================================================== */

const btnOpen=document.getElementById("btnOpen");
const btnSave=document.getElementById("btnSave");
const btnUndo=document.getElementById("btnUndo");
const btnRedo=document.getElementById("btnRedo");
const fileOpen=document.getElementById("fileOpen");

const btnAddDevice=document.getElementById("btnAddDevice");
const btnAddLink=document.getElementById("btnAddLink");
const btnExportPNG=document.getElementById("btnExportPNG");
const btnReset=document.getElementById("btnReset");
const btnResetDefault=document.getElementById("btnResetDefault");
const btnGrid=document.getElementById("btnGrid");
const btnSnap=document.getElementById("btnSnap");

const deviceModal=document.getElementById("deviceModal");

const btnCreateDevice=document.getElementById("btnCreateDevice");
const btnCloseDevice=document.getElementById("btnCloseDevice");

const deviceType=document.getElementById("deviceType");

const deviceModel=document.getElementById("deviceModel");
const devicePortCount=document.getElementById("devicePortCount");

const lblModel=document.getElementById("lblModel");
const lblPortCount=document.getElementById("lblPortCount");
const DEVICE_MODELS = {

    router: [
        { name: "MikroTik RB1100AHx2", ports: 13 },
        { name: "MikroTik RB4011", ports: 10 },
        { name: "MikroTik hEX", ports: 5 },
        { name: "Cisco ISR", ports: 4 },
        { name: "Generic Router", ports: 1 }
    ],

    switch: [
        { name: "Generic Switch", ports: 24 },
        { name: "Cisco Catalyst", ports: 24 },
        { name: "Cisco SG350", ports: 48 },
        { name: "MikroTik CRS", ports: 24 },
        { name: "TP-Link", ports: 24 },
        { name: "D-Link", ports: 24 }
    ]

};
deviceType.addEventListener("change", updateDeviceOptions);

updateDeviceOptions();
const contextMenu=document.getElementById("contextMenu");

const cmRename=document.getElementById("cmRename");
const cmDuplicate=document.getElementById("cmDuplicate");
const cmDelete=document.getElementById("cmDelete");
const propLinkColor=document.getElementById("propLinkColor");
const propLinkWidth=document.getElementById("propLinkWidth");
const propLinkStyle=document.getElementById("propLinkStyle");
const propLinkOpacity=document.getElementById("propLinkOpacity");
const btnDeleteLink=document.getElementById("btnDeleteLink");

function updateSelectedLinkAppearance(){

    if(!selectedLink) return;

    if(!linkEditHistoryRecorded){

        recordHistory();
        linkEditHistoryRecorded=true;

    }

    selectedLink.appearance={
        ...createDefaultLinkAppearance(),
        ...(selectedLink.appearance || {}),
        color:propLinkColor.value,
        width:Number(propLinkWidth.value) || DEFAULT_LINK_APPEARANCE.width,
        style:propLinkStyle.value,
        opacity:Number(propLinkOpacity.value) || DEFAULT_LINK_APPEARANCE.opacity
    };

    drawLinksOnly();
    saveToLocalStorage();

}

[propLinkColor,propLinkWidth,propLinkStyle,propLinkOpacity].forEach(input=>{

    input.addEventListener("input",updateSelectedLinkAppearance);
    input.addEventListener("change",function(){

        linkEditHistoryRecorded=false;

    });

});

btnDeleteLink.onclick=function(){

    deleteSelectedLink();

};

btnSave.onclick=function(){

    saveLayout();

};
btnUndo.onclick=function(){

    undo();

};
btnRedo.onclick=function(){

    redo();

};
btnOpen.onclick=function(){

    fileOpen.click();

};
fileOpen.onchange=function(){

    const file=fileOpen.files[0];

    if(!file) return;

    const reader=new FileReader();

    reader.onload=function(){

        try{

            loadLayout(reader.result);

            selectedNode=null;
            selectedElement=null;

            render();
            updateView();
            saveToLocalStorage();

            document.getElementById("statusBar").textContent="Loaded "+file.name;

        }catch(e){

            alert("File JSON tidak valid");

        }

        fileOpen.value="";

    };

    reader.readAsText(file);

};
btnAddDevice.onclick=function(){

    deviceType.selectedIndex = 0;

    updateDeviceOptions();

    deviceModal.style.display="flex";

};
btnExportPNG.onclick=function(){

    exportPNG();

};
btnReset.onclick=function(){

    resetView();

};
btnResetDefault.onclick=function(){

    if(confirm("Reset to the built-in default diagram?")){

        resetToDefaultDiagram();

    }

};
btnGrid.onclick=function(){

    gridEnabled=!gridEnabled;
    updateLayoutTools();

};
btnSnap.onclick=function(){

    snapEnabled=!snapEnabled;
    updateLayoutTools();

};
btnAddLink.onclick=function(){

    linkMode=true;

    firstLinkNode=null;

    document.getElementById("statusBar").textContent=
        "LINK MODE : pilih device pertama";

};

btnCloseDevice.onclick=function(){

    deviceModal.style.display="none";

};

btnCreateDevice.onclick=function(){

    const type=deviceType.value;

    const count=nodes.filter(n=>n.type===type).length+1;

    const id=type+"_"+Date.now();

    const label=type.toUpperCase()+"-"+String(count).padStart(3,"0");

    recordHistory();

    nodes.push({

        id:id,

        type:type,

        text:label,

        x:getSnappedPosition(350,220).x,

        y:getSnappedPosition(350,220).y

    });

    deviceModal.style.display="none";

    render();
    saveToLocalStorage();

};
/* ==========================================================
   DELETE DEVICE
========================================================== */

document.addEventListener("keydown",function(e){

    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==="z"){

        e.preventDefault();
        undo();
        return;

    }

    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==="y"){

        e.preventDefault();
        redo();
        return;

    }

    if(e.key!=="Delete") return;

    if(selectedLink){

        deleteSelectedLink();
        return;

    }

    if(!selectedNode) return;

    const idx=nodes.findIndex(n=>n.id===selectedNode.id);

    if(idx>=0){

        recordHistory();

        nodes.splice(idx,1);

    }

    for(let i=links.length-1;i>=0;i--){

        if(
            links[i].from===selectedNode.id ||
            links[i].to===selectedNode.id
        ){

            links.splice(i,1);

        }

    }

    selectedNode=null;
    selectedElement=null;
    selectedLink=null;

    render();
    saveToLocalStorage();

});
document.addEventListener("click",function(){

    contextMenu.style.display="none";

});

cmDelete.onclick=function(){

    if(!contextTarget) return;

    const idx=nodes.findIndex(n=>n.id===contextTarget.id);

    if(idx>=0){

        recordHistory();

        nodes.splice(idx,1);

    }

    for(let i=links.length-1;i>=0;i--){

        if(
            links[i].from===contextTarget.id ||
            links[i].to===contextTarget.id
        ){

            links.splice(i,1);

        }

    }

    contextTarget=null;

    contextMenu.style.display="none";

    render();
    saveToLocalStorage();

};
cmRename.onclick=function(){

    if(!contextTarget) return;

    const nama=prompt(
        "Nama Device",
        contextTarget.text
    );

    if(nama===null) return;

    if(contextTarget.text!==nama.trim()){

        recordHistory();

    }

    contextTarget.text=nama.trim();

    contextMenu.style.display="none";

    render();
    saveToLocalStorage();

};
cmDuplicate.onclick=function(){

    if(!contextTarget) return;

    const copy={

        ...contextTarget,

        id:contextTarget.type+"_"+Date.now(),

        x:getSnappedPosition(contextTarget.x+40,contextTarget.y+40).x,

        y:getSnappedPosition(contextTarget.x+40,contextTarget.y+40).y

    };

    recordHistory();

    nodes.push(copy);

    contextMenu.style.display="none";

    render();
    saveToLocalStorage();

};
