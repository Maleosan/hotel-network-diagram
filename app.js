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
let didDrag = false;

let offsetX = 0;
let offsetY = 0;

let selectedElement = null;
let selectedLink = null;
let linkEditHistoryRecorded = false;
let selectedWaypointIndex = null;
let waypointDrag = null;

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
let diagramName = "HOTEL NETWORK DIAGRAM";
let theme = "dark";
const DEVICE_TYPES = new Set(["router","switch","ap","pc","nas","camera","dvr","pabx","cloud"]);
const DEFAULT_PORTS = {router:5,switch:24,ap:1,pc:1,nas:2,camera:1,dvr:16,pabx:8,cloud:0};

function uniqueId(prefix){
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
}

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
            id:uniqueId("link"),
            from:link[0],
            to:link[1],
            sourcePort:null,
            targetPort:null,
            label:"",
            routing:"straight",
            route:[],
            appearance:createDefaultLinkAppearance()
        };

    }

    return{
        id:typeof link.id==="string" && link.id ? link.id : uniqueId("link"),
        from:link.from || link[0],
        to:link.to || link[1],
        sourcePort:Number.isInteger(Number(link.sourcePort)) ? Number(link.sourcePort) : null,
        targetPort:Number.isInteger(Number(link.targetPort)) ? Number(link.targetPort) : null,
        label:typeof link.label==="string" ? link.label.slice(0,80) : "",
        routing:link.routing==="custom" ? "custom" : "straight",
        route:Array.isArray(link.route) ? link.route
            .filter(point=>point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y)))
            .map(point=>({x:Number(point.x),y:Number(point.y)})) : [],
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
        meta:{...(normalized.meta || {})},
        route:normalized.route.map(point=>({...point}))
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

    // Inline styles intentionally override the default `.link` CSS rule.
    line.style.stroke=appearance.color;
    line.style.strokeWidth=String(appearance.width);
    line.style.strokeOpacity=String(appearance.opacity);
    line.style.strokeDasharray=getLinkDashArray(appearance);
    line.style.strokeLinecap=appearance.style==="dotted" ? "round" : "butt";

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
        links:links.map(cloneLink),
        diagramName

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
    diagramName=state.diagramName || diagramName;
    document.getElementById("diagramName").value=diagramName;

    selectedNode=null;
    selectedElement=null;
    selectedLink=null;
    selectedWaypointIndex=null;
    contextTarget=null;
    linkMode=false;
    document.getElementById("btnCancelLink").hidden=true;
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

function showFeedback(message,isError=false){
    const bar=document.getElementById("statusBar");
    bar.textContent=message;
    bar.style.color=isError ? "#ff8a80" : "";
    clearTimeout(showFeedback.timer);
    showFeedback.timer=setTimeout(()=>{bar.textContent="Ready";bar.style.color="";},4000);
}

function isEditingTarget(target){
    return target && (target.matches("input,textarea,select") || target.isContentEditable);
}

function cancelLinkMode(){
    linkMode=false; firstLinkNode=null;
    document.getElementById("btnCancelLink").hidden=true;
    showFeedback("Link mode dibatalkan");
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
    saveToLocalStorage();

}

function render(){

    nodesLayer.innerHTML="";
    linksLayer.innerHTML="";

    drawLinks();

    nodes.forEach(drawNode);

}

function getPortCount(node){
    const value=Number(node && node.portCount);
    return Number.isInteger(value) && value>=0 ? value : (DEFAULT_PORTS[node?.type] || 0);
}

function isPortUsed(nodeId,port,exceptId){
    if(!port) return false;
    return links.some(link=>link.id!==exceptId &&
        ((link.from===nodeId && link.sourcePort===port) || (link.to===nodeId && link.targetPort===port)));
}

function firstFreePort(nodeId,exceptId){
    const node=nodes.find(n=>n.id===nodeId);
    for(let port=1;port<=getPortCount(node);port++) if(!isPortUsed(nodeId,port,exceptId)) return port;
    return null;
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

    if(didDrag){ didDrag=false; return; }

    selectedElement=g;

    selectNode(e);

});
g.addEventListener("contextmenu",function(e){

    e.preventDefault();
    e.stopPropagation();

    contextTarget=node;

    contextMenu.style.display="block";

    const left=Math.min(e.clientX,window.innerWidth-160);
    const top=Math.min(e.clientY,window.innerHeight-120);
    contextMenu.style.left=Math.max(0,left)+"px";
    contextMenu.style.top=Math.max(0,top)+"px";

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

    const idx=links.findIndex(link=>link.id===selectedLink.id);

    if(idx>=0){

        recordHistory();
        links.splice(idx,1);
        selectedLink=null;
        selectedWaypointIndex=null;
        showNodeProperties();
        render();
        saveToLocalStorage();

    }

}

function selectLinkById(id){

    selectedLink=links.find(link=>link.id===id);

    if(!selectedLink) return;

    selectedNode=null;
    selectedElement=null;
    linkEditHistoryRecorded=false;
    selectedWaypointIndex=null;

    document
        .querySelectorAll(".node")
        .forEach(n=>n.classList.remove("selected"));

    const appearance=getLinkAppearance(selectedLink);

    document.getElementById("propLinkName").value=`${getNodeLabel(selectedLink.from)}${selectedLink.sourcePort?` [P${selectedLink.sourcePort}]`:""} → ${getNodeLabel(selectedLink.to)}${selectedLink.targetPort?` [P${selectedLink.targetPort}]`:""}`;
    document.getElementById("propLinkLabel").value=selectedLink.label || "";
    document.getElementById("propLabelFollowsLine").checked=appearance.labelFollowsLine!==false;
    populatePortSelect("propSourcePort",selectedLink.from,selectedLink.sourcePort,selectedLink.id);
    populatePortSelect("propTargetPort",selectedLink.to,selectedLink.targetPort,selectedLink.id);
    document.getElementById("propLinkColor").value=appearance.color;
    document.getElementById("propLinkWidth").value=appearance.width;
    document.getElementById("propLinkStyle").value=appearance.style;
    document.getElementById("propLinkOpacity").value=appearance.opacity;
    document.getElementById("propLinkRouting").value=selectedLink.routing;
    syncRoutingControls();

    showLinkProperties();
    render();

}

function syncRoutingControls(){
    const routing=document.getElementById("propLinkRouting");
    const controls=document.getElementById("routeControls");
    if(!routing||!controls) return;
    routing.value=selectedLink?.routing||"straight";
    controls.hidden=!selectedLink||selectedLink.routing!=="custom";
}

function populatePortSelect(id,nodeId,current,linkId){
    const select=document.getElementById(id);
    const node=nodes.find(n=>n.id===nodeId);
    select.innerHTML='<option value="">Automatic / none</option>';
    for(let port=1;port<=getPortCount(node);port++){
        if(!isPortUsed(nodeId,port,linkId) || port===current){
            const option=document.createElement("option");
            option.value=port; option.textContent=`Port ${port}`; select.appendChild(option);
        }
    }
    select.value=current || "";
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

function getOrthogonalPoints(link,from,to){
    if(link.routing!=="custom") return [from,to];
    const points=[from];
    let current=from;
    link.route.forEach(anchor=>{
        if(current.x!==anchor.x) points.push({x:anchor.x,y:current.y});
        if(current.y!==anchor.y) points.push({x:anchor.x,y:anchor.y});
        current=anchor;
    });
    if(current.x!==to.x) points.push({x:to.x,y:current.y});
    if(current.y!==to.y) points.push({x:to.x,y:to.y});
    if(points[points.length-1].x!==to.x || points[points.length-1].y!==to.y) points.push(to);
    return points.filter((point,index,array)=>index===0||point.x!==array[index-1].x||point.y!==array[index-1].y);
}

function getLinkPathData(link,from,to){
    return getOrthogonalPoints(link,from,to).map((point,index)=>`${index?"L":"M"} ${point.x} ${point.y}`).join(" ");
}

function getRouteLabelPoint(link,from,to){
    const points=getOrthogonalPoints(link,from,to);
    let total=0;
    const lengths=[];
    for(let i=1;i<points.length;i++){const length=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);lengths.push(length);total+=length;}
    let remaining=total/2;
    for(let i=0;i<lengths.length;i++){
        if(remaining<=lengths[i]){const ratio=lengths[i]?remaining/lengths[i]:0;return{x:points[i].x+(points[i+1].x-points[i].x)*ratio,y:points[i].y+(points[i+1].y-points[i].y)*ratio,angle:Math.atan2(points[i+1].y-points[i].y,points[i+1].x-points[i].x)*180/Math.PI};}
        remaining-=lengths[i];
    }
    return{x:(from.x+to.x)/2,y:(from.y+to.y)/2,angle:0};
}

/* ==========================================================
   DRAW LINKS
========================================================== */

function drawLinks(){

    links.forEach(link=>{

        const from=findCenter(link.from);
        const to=findCenter(link.to);

        // garis klik (tidak terlihat)
        const hit=document.createElementNS(SVGNS,"path");

        hit.setAttribute("d",getLinkPathData(link,from,to));
        hit.setAttribute("fill","none");

        hit.setAttribute("stroke","transparent");
        hit.setAttribute("stroke-width","16");
        hit.style.pointerEvents="stroke";

        hit.dataset.linkId=link.id;

        hit.addEventListener("click",function(e){

            e.stopPropagation();

            selectLinkById(this.dataset.linkId);

        });
        hit.addEventListener("dblclick",function(e){e.stopPropagation();selectLinkById(link.id);addWaypointAt(getViewportPoint(e));});

        // garis yang terlihat
        const line=document.createElementNS(SVGNS,"path");

        line.classList.add("link");
        line.style.pointerEvents="none";

        line.setAttribute("d",getLinkPathData(link,from,to));
        line.dataset.from=link.from;
        line.dataset.to=link.to;
        applyLinkAppearance(line,link);

        if(selectedLink && selectedLink.id===link.id){

            line.classList.add("selectedLink");

        }

        linksLayer.appendChild(hit);
        linksLayer.appendChild(line);
        drawLinkLabel(link,from,to);
        drawWaypointHandles(link);

    });

}

function drawLinkLabel(link,from,to){
    if(!link.label) return;
    const appearance=getLinkAppearance(link);
    const labelPoint=getRouteLabelPoint(link,from,to);
    const text=document.createElementNS(SVGNS,"text");
    text.classList.add("linkLabel");
    text.textContent=link.label;
    if(appearance.labelFollowsLine!==false){
        const angle=labelPoint.angle;
        text.setAttribute("transform",`translate(${labelPoint.x},${labelPoint.y-7}) rotate(${angle>90||angle< -90?angle+180:angle})`);
    }else{
        text.setAttribute("x",labelPoint.x);
        text.setAttribute("y",labelPoint.y-7);
        text.setAttribute("text-anchor","middle");
    }
    linksLayer.appendChild(text);
}

function drawWaypointHandles(link){
    if(!selectedLink || selectedLink.id!==link.id || link.routing!=="custom") return;
    link.route.forEach((point,index)=>{
        const handle=document.createElementNS(SVGNS,"circle");
        handle.classList.add("waypointHandle");
        if(selectedWaypointIndex===index) handle.classList.add("selectedWaypoint");
        handle.setAttribute("cx",point.x);handle.setAttribute("cy",point.y);handle.setAttribute("r",6);
        handle.dataset.linkId=link.id;handle.dataset.waypointIndex=index;
        handle.addEventListener("pointerdown",startWaypointDrag);
        handle.addEventListener("click",e=>{e.stopPropagation();selectedWaypointIndex=index;drawLinksOnly();});
        linksLayer.appendChild(handle);
    });
}

function startWaypointDrag(e){
    e.preventDefault();e.stopPropagation();
    const link=links.find(item=>item.id===e.currentTarget.dataset.linkId);
    if(!link) return;
    selectedLink=link;selectedWaypointIndex=Number(e.currentTarget.dataset.waypointIndex);
    waypointDrag={link,index:selectedWaypointIndex,pointerId:e.pointerId,startRoute:link.route.map(point=>({...point}))};
    e.currentTarget.setPointerCapture?.(e.pointerId);
}

function moveWaypoint(e){
    if(!waypointDrag || e.pointerId!==waypointDrag.pointerId) return false;
    e.preventDefault();
    const point=getViewportPoint(e);
    waypointDrag.link.route[waypointDrag.index]=getSnappedPosition(point.x,point.y);
    drawLinksOnly();
    return true;
}

function stopWaypointDrag(e){
    if(!waypointDrag || (e&&e.pointerId!==waypointDrag.pointerId)) return;
    const {link,startRoute}=waypointDrag;
    const endRoute=link.route.map(point=>({...point}));
    if(!statesAreEqual(startRoute,endRoute)){
        link.route=startRoute.map(point=>({...point}));recordHistory();link.route=endRoute;
        saveToLocalStorage();
    }
    waypointDrag=null;drawLinksOnly();
}

function addWaypointAt(point){
    if(!selectedLink) return;
    recordHistory();
    selectedLink.routing="custom";
    const snapped=getSnappedPosition(point.x,point.y);
    const controls=[findCenter(selectedLink.from),...selectedLink.route,findCenter(selectedLink.to)];
    let insertAt=selectedLink.route.length,best=Infinity;
    for(let i=0;i<controls.length-1;i++){
        const a=controls[i],b=controls[i+1],dx=b.x-a.x,dy=b.y-a.y;
        const t=Math.max(0,Math.min(1,((snapped.x-a.x)*dx+(snapped.y-a.y)*dy)/(dx*dx+dy*dy||1)));
        const distance=Math.hypot(snapped.x-(a.x+t*dx),snapped.y-(a.y+t*dy));
        if(distance<best){best=distance;insertAt=i;}
    }
    selectedLink.route.splice(insertAt,0,snapped);
    selectedWaypointIndex=insertAt;
    syncRoutingControls();render();saveToLocalStorage();
}

function addDefaultWaypoint(){
    if(!selectedLink) return;
    const from=findCenter(selectedLink.from),to=findCenter(selectedLink.to);
    const points=getOrthogonalPoints(selectedLink,from,to);
    let a=from,b=to,max=-1;
    for(let i=1;i<points.length;i++){
        const length=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
        if(length>max){max=length;a=points[i-1];b=points[i];}
    }
    addWaypointAt({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
}

function deleteSelectedWaypoint(){
    if(!selectedLink || selectedWaypointIndex===null || !selectedLink.route[selectedWaypointIndex]) return false;
    recordHistory();selectedLink.route.splice(selectedWaypointIndex,1);selectedWaypointIndex=null;
    render();saveToLocalStorage();return true;
}

function resetSelectedRoute(){
    if(!selectedLink) return;
    recordHistory();selectedLink.route=[];selectedLink.routing="straight";selectedWaypointIndex=null;
    syncRoutingControls();render();saveToLocalStorage();
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
    selectedWaypointIndex=null;
if(linkMode){

    if(firstLinkNode==null){

        firstLinkNode=selectedNode;

        document.getElementById("statusBar").textContent=
        "LINK MODE : pilih device kedua";

        return;

    }

    let linkError=false;
    const firstStillExists=nodes.some(n=>n.id===firstLinkNode.id);
    const duplicate=links.some(link=>(link.from===firstLinkNode.id && link.to===selectedNode.id) ||
        (link.from===selectedNode.id && link.to===firstLinkNode.id));

    if(firstStillExists && firstLinkNode.id!==selectedNode.id && !duplicate){

        const sourcePort=firstFreePort(firstLinkNode.id);
        const targetPort=firstFreePort(selectedNode.id);

        if((getPortCount(firstLinkNode)>0 && sourcePort===null) || (getPortCount(selectedNode)>0 && targetPort===null)){
            showFeedback("Tidak ada port kosong untuk koneksi ini",true);
            linkError=true;
        }else{

        recordHistory();

        links.push(normalizeLink({from:firstLinkNode.id,to:selectedNode.id,sourcePort,targetPort}));
        }

    }else if(firstLinkNode.id===selectedNode.id){
        showFeedback("Device tidak dapat dihubungkan ke dirinya sendiri",true);
        linkError=true;
    }else if(duplicate){
        showFeedback("Koneksi antara kedua device sudah ada",true);
        linkError=true;

    }

    firstLinkNode=null;

    linkMode=false;
    document.getElementById("btnCancelLink").hidden=true;

    render();
    saveToLocalStorage();

    if(!linkError) document.getElementById("statusBar").textContent="Ready";

    return;

}

    document.getElementById("propName").value=
        selectedNode.text;

    document.getElementById("propIP").value=
        selectedNode.ip || "";

    document.getElementById("propModel").value=
        selectedNode.model || "";

    document.getElementById("propPortCount").value=getPortCount(selectedNode);

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

    const name=document.getElementById("propName").value.trim();
    const ip=document.getElementById("propIP").value.trim();
    const nextPortCount=Math.min(512,Math.max(0,Number(document.getElementById("propPortCount").value)||0));
    if(!name){ showFeedback("Nama device tidak boleh kosong",true); return; }
    if(ip && !isValidIP(ip)){ showFeedback("Format IP address tidak valid",true); return; }
    if(links.some(link=>(link.from===selectedNode.id&&link.sourcePort>nextPortCount)||(link.to===selectedNode.id&&link.targetPort>nextPortCount))){
        showFeedback("Jumlah port lebih kecil dari port yang sedang digunakan",true); return;
    }
    const nextState=cloneDiagramState();
    const nextNode=nextState.nodes.find(node=>node.id===selectedNode.id);

    if(nextNode){

        nextNode.text=name;
        nextNode.ip=ip;
        nextNode.model=document.getElementById("propModel").value;
        nextNode.portCount=nextPortCount;
        nextNode.location=document.getElementById("propLocation").value;
        nextNode.notes=document.getElementById("propNotes").value;

    }

    if(!statesAreEqual(cloneDiagramState(),nextState)){

        recordHistory();

    }

    selectedNode.text=name;

    selectedNode.ip=
        ip;

    selectedNode.model=
        document.getElementById("propModel").value;

    selectedNode.portCount=nextPortCount;

    selectedNode.location=
        document.getElementById("propLocation").value;

    selectedNode.notes=
        document.getElementById("propNotes").value;

    render();
    saveToLocalStorage();

};
function isValidIP(value){
    if(/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(value)) return true;
    const parts=value.split(".");
    return parts.length===4 && parts.every(part=>/^\d{1,3}$/.test(part)&&Number(part)<=255);
}
/* ==========================================================
   DRAG ENGINE
========================================================== */
svg.addEventListener("mousedown",function(e){

    if(e.button!==2 || e.target.closest?.(".node")) return;

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
    didDrag=false;

}
svg.addEventListener("contextmenu",function(e){
    e.preventDefault();

});
svg.addEventListener("pointermove",function(e){

    if(moveWaypoint(e)) return;

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

    if(Math.hypot(snappedPosition.x-dragStartPosition.x,snappedPosition.y-dragStartPosition.y)>3) didDrag=true;

    selectedNode.x=snappedPosition.x;
    selectedNode.y=snappedPosition.y;

    dragging.setAttribute(
        "transform",
        `translate(${selectedNode.x},${selectedNode.y})`
    );

    drawLinksOnly();

});

function stopDrag(e){

    const wasPanning=panMode;
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
    if(wasPanning) saveToLocalStorage();

}

window.addEventListener("pointerup",stopDrag);
window.addEventListener("pointercancel",stopDrag);
window.addEventListener("pointerup",stopWaypointDrag);
window.addEventListener("pointercancel",stopWaypointDrag);

/* ==========================================================
   REDRAW LINKS ONLY
========================================================== */

function drawLinksOnly(){

    linksLayer.innerHTML="";

    links.forEach(link=>{

        const from=findCenter(link.from);
        const to=findCenter(link.to);

        const hit=document.createElementNS(SVGNS,"path");

        hit.setAttribute("d",getLinkPathData(link,from,to));
        hit.setAttribute("fill","none");

        hit.setAttribute("stroke","transparent");
        hit.setAttribute("stroke-width","16");
        hit.style.pointerEvents="stroke";

        hit.dataset.linkId=link.id;

        hit.addEventListener("click",function(e){

            e.stopPropagation();

            selectLinkById(this.dataset.linkId);

        });
        hit.addEventListener("dblclick",function(e){e.stopPropagation();selectLinkById(link.id);addWaypointAt(getViewportPoint(e));});

        const line=document.createElementNS(SVGNS,"path");

        line.classList.add("link");
        line.style.pointerEvents="none";

        line.setAttribute("d",getLinkPathData(link,from,to));
        line.dataset.from=link.from;
        line.dataset.to=link.to;
        applyLinkAppearance(line,link);

        if(selectedLink && selectedLink.id===link.id){

            line.classList.add("selectedLink");

        }

        linksLayer.appendChild(hit);
        linksLayer.appendChild(line);
        drawLinkLabel(link,from,to);
        drawWaypointHandles(link);

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

    if(!e.ctrlKey || !svg.contains(e.target)) return;

    e.preventDefault();

    const rect=svg.getBoundingClientRect();
    const px=e.clientX-rect.left;
    const py=e.clientY-rect.top;
    const worldX=(px-viewX)/zoom;
    const worldY=(py-viewY)/zoom;
    const next=Math.min(4,Math.max(.3,zoom*(e.deltaY<0?1.1:1/1.1)));
    zoom=next;
    viewX=px-worldX*zoom;
    viewY=py-worldY*zoom;

    updateView();
    clearTimeout(updateView.persistTimer);
    updateView.persistTimer=setTimeout(saveToLocalStorage,150);

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
            portCount:getPortCount(node),
            location:node.location || "",
            notes:node.notes || "",
            x:node.x,
            y:node.y

        })),

        links:links.map(cloneLink),

        zoom:zoom,
        viewX:viewX,
        viewY:viewY
        ,diagramName:diagramName
        ,theme:theme
        ,gridEnabled:gridEnabled
        ,snapEnabled:snapEnabled

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
    a.download=safeFilename(diagramName,"json");

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);

}


/* ==========================================================
   LOAD LAYOUT
========================================================== */

function loadLayout(data){

    if(!data) throw new Error("File kosong");
    const parsed=typeof data==="string" ? JSON.parse(data) : data;
    const legacy=Array.isArray(parsed);
    const layout=legacy ? {nodes:parsed,links:[]} : parsed;
    if(!layout || !Array.isArray(layout.nodes)) throw new Error("Struktur JSON harus memiliki daftar nodes");

    const nextNodes=[];
    const ids=new Set();
    layout.nodes.forEach((n,index)=>{
        if(!n || typeof n!=="object") throw new Error(`Node ke-${index+1} tidak valid`);
        const type=DEVICE_TYPES.has(n.type) ? n.type : "pc";
        let id=typeof n.id==="string" && n.id.trim() ? n.id.trim() : uniqueId(type);
        while(ids.has(id)) id=uniqueId(type);
        const x=Number(n.x), y=Number(n.y);
        if(!Number.isFinite(x)||!Number.isFinite(y)) throw new Error(`Koordinat node ${id} tidak valid`);
        ids.add(id);
        nextNodes.push({id,type,text:String(n.text||type.toUpperCase()).slice(0,80),ip:String(n.ip||""),
            model:String(n.model||""),portCount:Math.min(512,Math.max(0,Number.isInteger(Number(n.portCount))?Number(n.portCount):(DEFAULT_PORTS[type]||0))),
            location:String(n.location||""),notes:String(n.notes||""),x,y});
    });

    const nextLinks=[];
    const pairs=new Set();
    const linkIds=new Set();
    (Array.isArray(layout.links)?layout.links:[]).forEach(raw=>{
        const link=normalizeLink(raw);
        if(!ids.has(link.from)||!ids.has(link.to)||link.from===link.to) return;
        const pair=[link.from,link.to].sort().join("::");
        if(pairs.has(pair)) return;
        pairs.add(pair);
        while(linkIds.has(link.id)) link.id=uniqueId("link");
        linkIds.add(link.id);
        const appearance=link.appearance;
        appearance.color=/^#[0-9a-f]{6}$/i.test(appearance.color)?appearance.color:"#cfcfcf";
        appearance.width=Math.min(16,Math.max(1,Number(appearance.width)||2));
        appearance.style=["solid","dashed","dotted"].includes(appearance.style)?appearance.style:"solid";
        appearance.opacity=Math.min(1,Math.max(.1,Number(appearance.opacity)||1));
        appearance.labelFollowsLine=appearance.labelFollowsLine!==false;
        const fromNode=nextNodes.find(n=>n.id===link.from), toNode=nextNodes.find(n=>n.id===link.to);
        if(link.sourcePort<1||link.sourcePort>getPortCount(fromNode)||isPortUsedIn(nextLinks,link.from,link.sourcePort)) link.sourcePort=null;
        if(link.targetPort<1||link.targetPort>getPortCount(toNode)||isPortUsedIn(nextLinks,link.to,link.targetPort)) link.targetPort=null;
        nextLinks.push(link);
    });

    nodes.splice(0,nodes.length,...nextNodes);
    links.splice(0,links.length,...nextLinks);
    zoom=Number.isFinite(Number(layout.zoom))?Math.min(4,Math.max(.3,Number(layout.zoom))):1;
    viewX=Number.isFinite(Number(layout.viewX))?Number(layout.viewX):0;
    viewY=Number.isFinite(Number(layout.viewY))?Number(layout.viewY):0;
    diagramName=String(layout.diagramName||"HOTEL NETWORK DIAGRAM").slice(0,80);
    theme=layout.theme==="light"?"light":"dark";
    gridEnabled=layout.gridEnabled!==false;
    snapEnabled=layout.snapEnabled!==false;
    selectedNode=null; selectedElement=null; selectedLink=null; contextTarget=null; firstLinkNode=null; linkMode=false;
    const cancelButton=document.getElementById("btnCancelLink");
    if(cancelButton) cancelButton.hidden=true;
    applyTheme();
    document.getElementById("diagramName").value=diagramName;

    undoHistory.splice(0,undoHistory.length);
    redoHistory.splice(0,redoHistory.length);
    updateHistoryButtons();

}

function isPortUsedIn(list,nodeId,port){
    if(!port) return false;
    return list.some(l=>(l.from===nodeId&&l.sourcePort===port)||(l.to===nodeId&&l.targetPort===port));
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
        .linkLabel{fill:#ffffff;font-family:Segoe UI,Arial,sans-serif;font-size:12px;text-anchor:middle;paint-order:stroke;stroke:#202020;stroke-width:4px;stroke-linejoin:round;}
    `;

    return style;

}

function buildExportSVG(){
    render();
    const bounds=getDiagramBounds();
    const exportSvg=document.createElementNS(SVGNS,"svg");
    exportSvg.setAttribute("xmlns",SVGNS);
    exportSvg.setAttribute("width",bounds.width);
    exportSvg.setAttribute("height",bounds.height);
    exportSvg.setAttribute("viewBox",`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
    exportSvg.setAttribute("aria-label",diagramName);
    exportSvg.appendChild(createExportStyles());
    const group=document.createElementNS(SVGNS,"g");
    const exportLinks=linksLayer.cloneNode(true);
    exportLinks.querySelectorAll('[stroke="transparent"]').forEach(hit=>hit.remove());
    exportLinks.querySelectorAll(".waypointHandle").forEach(handle=>handle.remove());
    const exportNodes=nodesLayer.cloneNode(true);
    exportNodes.querySelectorAll(".selected").forEach(node=>node.classList.remove("selected"));
    group.append(exportLinks,exportNodes); exportSvg.appendChild(group);
    return {exportSvg,bounds};
}

function downloadBlob(blob,filename){
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),0);
}

function safeFilename(value,extension){
    return `${value.replace(/[^a-z0-9_-]+/gi,"-").replace(/^-|-$/g,"")||"hotel-network-diagram"}.${extension}`;
}

function exportSVG(){
    try{
        const {exportSvg}=buildExportSVG();
        const text=new XMLSerializer().serializeToString(exportSvg);
        downloadBlob(new Blob([text],{type:"image/svg+xml;charset=utf-8"}),safeFilename(diagramName,"svg"));
        showFeedback("SVG berhasil diekspor");
    }catch(error){console.error(error);showFeedback("Export SVG gagal",true);}
}

function applyTheme(){
    document.body.classList.toggle("lightTheme",theme==="light");
    const button=document.getElementById("btnTheme");
    if(button){button.setAttribute("aria-pressed",String(theme==="light"));button.textContent=theme==="light"?"Use Dark":"Use Light";}
    document.querySelectorAll("#smallGrid path,#grid path").forEach(path=>path.setAttribute("stroke",theme==="light"?"#506070":"#ffffff"));
}

function exportPNG(){

    let bounds;
    try{bounds=buildExportSVG().bounds;}catch(error){showFeedback("Diagram tidak dapat diekspor",true);return;}
    const scale=4;

    if(bounds.width*scale>16384 || bounds.height*scale>16384){showFeedback("Diagram terlalu besar untuk PNG",true);return;}

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

        if(!ctx){URL.revokeObjectURL(url);showFeedback("Canvas tidak didukung browser",true);return;}

        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(img,0,0,canvas.width,canvas.height);

        URL.revokeObjectURL(url);

        canvas.toBlob(function(pngBlob){

            if(!pngBlob){showFeedback("Pembuatan PNG gagal",true);return;}

            const pngUrl=URL.createObjectURL(pngBlob);
            const a=document.createElement("a");

            a.href=pngUrl;
            a.download=safeFilename(diagramName,"png");

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(pngUrl);

        },"image/png");

    };

    img.onerror=function(){URL.revokeObjectURL(url);showFeedback("SVG gagal dimuat untuk PNG",true);};

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

    syncModelPortOptions();

}
function syncModelPortOptions(){
    const option=deviceModel.selectedOptions[0];
    if(!option) return;
    const ports=Number(option.dataset.ports);
    devicePortCount.innerHTML="";
    const portOption=document.createElement("option");
    portOption.value=ports; portOption.textContent=ports;
    devicePortCount.appendChild(portOption);
}
loadFromLocalStorage();
render();
updateView();
updateHistoryButtons();
updateLayoutTools();
applyTheme();
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
const btnCancelLink=document.getElementById("btnCancelLink");
const btnTheme=document.getElementById("btnTheme");
const btnExportSVG=document.getElementById("btnExportSVG");

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
deviceModel.addEventListener("change",syncModelPortOptions);

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
const propLinkLabel=document.getElementById("propLinkLabel");
const propSourcePort=document.getElementById("propSourcePort");
const propTargetPort=document.getElementById("propTargetPort");
const propLabelFollowsLine=document.getElementById("propLabelFollowsLine");
const propLinkRouting=document.getElementById("propLinkRouting");
const btnAddWaypoint=document.getElementById("btnAddWaypoint");
const btnResetRoute=document.getElementById("btnResetRoute");

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

[propLinkLabel,propSourcePort,propTargetPort,propLabelFollowsLine].forEach(input=>input.addEventListener("change",function(){
    if(!selectedLink) return;
    const source=Number(propSourcePort.value)||null;
    const target=Number(propTargetPort.value)||null;
    if(isPortUsed(selectedLink.from,source,selectedLink.id)||isPortUsed(selectedLink.to,target,selectedLink.id)){
        showFeedback("Port tersebut sudah digunakan",true); selectLinkById(selectedLink.id); return;
    }
    recordHistory();
    selectedLink.label=propLinkLabel.value.trim().slice(0,80);
    selectedLink.sourcePort=source; selectedLink.targetPort=target;
    selectedLink.appearance={...getLinkAppearance(selectedLink),labelFollowsLine:propLabelFollowsLine.checked};
    render(); saveToLocalStorage();
}));

propLinkRouting.addEventListener("change",function(){
    if(!selectedLink) return;
    recordHistory();selectedLink.routing=this.value;
    if(this.value==="custom" && selectedLink.route.length===0){
        const from=findCenter(selectedLink.from),to=findCenter(selectedLink.to);
        selectedLink.route=[getSnappedPosition((from.x+to.x)/2,(from.y+to.y)/2)];
    }
    selectedWaypointIndex=null;syncRoutingControls();render();saveToLocalStorage();
});
btnAddWaypoint.onclick=addDefaultWaypoint;
btnResetRoute.onclick=resetSelectedRoute;

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
    deviceType.focus();

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
    saveToLocalStorage();

};
btnSnap.onclick=function(){

    snapEnabled=!snapEnabled;
    updateLayoutTools();
    saveToLocalStorage();

};
btnAddLink.onclick=function(){

    linkMode=true;

    firstLinkNode=null;
    btnCancelLink.hidden=false;

    document.getElementById("statusBar").textContent=
        "LINK MODE : pilih device pertama";

};
btnCancelLink.onclick=cancelLinkMode;
btnExportSVG.onclick=exportSVG;
btnTheme.onclick=function(){theme=theme==="dark"?"light":"dark";applyTheme();saveToLocalStorage();};

const diagramNameInput=document.getElementById("diagramName");
diagramNameInput.addEventListener("change",function(){
    const value=this.value.trim();
    if(!value){this.value=diagramName;showFeedback("Nama diagram tidak boleh kosong",true);return;}
    if(value!==diagramName) recordHistory();
    diagramName=value; saveToLocalStorage();
});

btnCloseDevice.onclick=function(){

    deviceModal.style.display="none";
    btnAddDevice.focus();

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
        model:(type==="router"||type==="switch") ? deviceModel.value : "",
        portCount:(type==="router"||type==="switch") ? Number(devicePortCount.value) : (DEFAULT_PORTS[type]||0),
        x:getNextDevicePosition().x,
        y:getNextDevicePosition().y

    });

    deviceModal.style.display="none";

    render();
    saveToLocalStorage();

};

function getNextDevicePosition(){
    const rect=svg.getBoundingClientRect();
    const center={x:(rect.width/2-viewX)/zoom-NODE_WIDTH/2,y:(rect.height/2-viewY)/zoom-NODE_HEIGHT/2};
    for(let i=0;i<20;i++){
        const p=getSnappedPosition(center.x+(i%5)*40,center.y+Math.floor(i/5)*40);
        if(!nodes.some(n=>Math.abs(n.x-p.x)<30&&Math.abs(n.y-p.y)<30)) return p;
    }
    return getSnappedPosition(center.x+nodes.length*20,center.y+nodes.length*20);
}
/* ==========================================================
   DELETE DEVICE
========================================================== */

document.addEventListener("keydown",function(e){

    if(e.key==="Escape"){
        if(deviceModal.style.display==="flex"){deviceModal.style.display="none";btnAddDevice.focus();}
        contextMenu.style.display="none";
        if(linkMode) cancelLinkMode();
        return;
    }

    if(isEditingTarget(e.target)) return;

    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==="z" && !e.shiftKey){

        e.preventDefault();
        undo();
        return;

    }

    if((e.ctrlKey || e.metaKey) && (e.key.toLowerCase()==="y" || (e.key.toLowerCase()==="z"&&e.shiftKey))){

        e.preventDefault();
        redo();
        return;

    }

    if(e.key!=="Delete") return;

    if(deleteSelectedWaypoint()) return;

    if(selectedLink){

        deleteSelectedLink();
        return;

    }

    if(!selectedNode) return;

    deleteNodeById(selectedNode.id);

});
document.addEventListener("click",function(){

    contextMenu.style.display="none";

});

[cmRename,cmDuplicate,cmDelete].forEach(item=>item.addEventListener("keydown",e=>{
    if(e.key==="Enter"||e.key===" "){e.preventDefault();item.click();}
}));

cmDelete.onclick=function(){

    if(!contextTarget) return;

    deleteNodeById(contextTarget.id);

};
function deleteNodeById(id){
    const idx=nodes.findIndex(n=>n.id===id);
    if(idx<0) return;
    recordHistory();
    nodes.splice(idx,1);
    for(let i=links.length-1;i>=0;i--) if(links[i].from===id||links[i].to===id) links.splice(i,1);
    if(firstLinkNode?.id===id) cancelLinkMode();
    selectedNode=null; selectedElement=null; selectedLink=null; selectedWaypointIndex=null; contextTarget=null;
    showNodeProperties(); render(); saveToLocalStorage();
}
cmRename.onclick=function(){

    if(!contextTarget) return;

    const nama=prompt(
        "Nama Device",
        contextTarget.text
    );

    if(nama===null) return;

    if(!nama.trim()){showFeedback("Nama device tidak boleh kosong",true);return;}

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
