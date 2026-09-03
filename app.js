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
const annotationsLayer = document.getElementById("annotations");

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
let selectedAnnotation = null;
let pendingAnnotation = null;
let annotationDrag = null;
let linkEditHistoryRecorded = false;
let selectedWaypointIndex = null;
let waypointDrag = null;

let linkMode=false;
let firstLinkNode=null;

let contextTarget=null;
let panMode=false;
let panPointerId=null;
let spacePressed=false;
const touchPoints=new Map();
let pinchState=null;

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
let diagramBackground={type:"theme",color:"#202020",data:"",fit:"cover",customized:false};
let pendingDeviceIconData="";
const DEVICE_LIBRARY={
    router:{category:"Network",label:"Router",icon:"router",ports:5,models:["Generic Router","Branch Router"]},
    core_router:{category:"Network",label:"Core Router",icon:"router",ports:8,models:["Core Router","High Capacity Router"]},
    edge_router:{category:"Network",label:"Edge Router",icon:"router",ports:5,models:["Edge Router","WAN Router"]},
    switch:{category:"Network",label:"Switch",icon:"switch",ports:24,models:["Generic Switch","Managed Switch","PoE Switch","Layer 3 Switch"]},
    l3_switch:{category:"Network",label:"Layer 3 Switch",icon:"switch",ports:24,models:["24-Port L3","48-Port L3"]},
    managed_switch:{category:"Network",label:"Managed Switch",icon:"switch",ports:24,models:["8-Port Managed","24-Port Managed","48-Port Managed"]},
    unmanaged_switch:{category:"Network",label:"Unmanaged Switch",icon:"switch",ports:8,models:["5-Port Unmanaged","8-Port Unmanaged","16-Port Unmanaged"]},
    poe_switch:{category:"Network",label:"PoE Switch",icon:"poe_switch",ports:24,models:["8-Port PoE","16-Port PoE","24-Port PoE","48-Port PoE"]},
    l2_switch:{category:"Network",label:"Layer 2 Switch",icon:"switch",ports:24,models:["24-Port L2","48-Port L2"]},
    firewall:{category:"Security",label:"Firewall",icon:"firewall",ports:6,models:["Network Firewall","Next-Gen Firewall"]},
    ids:{category:"Security",label:"IDS",icon:"security",ports:2,models:["Intrusion Detection System"]},
    ips:{category:"Security",label:"IPS",icon:"security",ports:2,models:["Intrusion Prevention System"]},
    utm:{category:"Security",label:"UTM",icon:"firewall",ports:6,models:["Unified Threat Management"]},
    vpn_gateway:{category:"Security",label:"VPN Gateway",icon:"gateway",ports:4,models:["VPN Gateway"]},
    security_gateway:{category:"Security",label:"Security Gateway",icon:"firewall",ports:6,models:["Security Gateway"]},
    ap:{category:"Wireless",label:"Access Point",icon:"wireless",ports:1,status:true,models:["Indoor AP","Ceiling AP","Guest Wi-Fi AP","Staff Wi-Fi AP"]},
    outdoor_ap:{category:"Wireless",label:"Outdoor Access Point",icon:"outdoor_ap",ports:1,status:true,models:["Outdoor AP"]},
    wireless_controller:{category:"Wireless",label:"Wireless Controller",icon:"controller",ports:4,models:["Wi-Fi Controller"]},
    mesh_node:{category:"Wireless",label:"Wi-Fi Mesh Node",icon:"mesh",ports:1,status:true,models:["Mesh Node"]},
    wireless_bridge:{category:"Wireless",label:"Wireless Bridge",icon:"wireless_bridge",ports:2,models:["Wireless Bridge"]},
    repeater:{category:"Wireless",label:"Repeater",icon:"wireless",ports:1,models:["Wi-Fi Repeater"]},
    gateway:{category:"Network",label:"Gateway",icon:"gateway",ports:4,models:["Network Gateway"]},
    modem:{category:"WAN",label:"Modem",icon:"modem",ports:2,models:["Broadband Modem"]},
    ont:{category:"WAN",label:"ONT / ONU",icon:"ont",ports:4,models:["Fiber ONT","ONU"]},
    media_converter:{category:"Infrastructure",label:"Media Converter",icon:"converter",ports:2,models:["Fiber Media Converter"]},
    network_bridge:{category:"Network",label:"Network Bridge",icon:"gateway",ports:2,models:["Network Bridge"]},
    pc:{category:"Computing",label:"Desktop PC",icon:"desktop",ports:1,status:true,models:["Desktop PC","Workstation"]},
    server:{category:"Server & Storage",label:"Server",icon:"server",ports:2,models:["Application Server","Database Server","File Server"]},
    rack_server:{category:"Server & Storage",label:"Rack Server",icon:"rack_server",ports:4,models:["1U Rack Server","2U Rack Server"]},
    tower_server:{category:"Server & Storage",label:"Tower Server",icon:"tower",ports:2,models:["Tower Server"]},
    virtual_server:{category:"Server & Storage",label:"Virtual Server",icon:"virtual",ports:1,models:["Virtual Machine","Hypervisor"]},
    laptop:{category:"Computing",label:"Laptop",icon:"laptop",ports:1,models:["Laptop"]},
    thin_client:{category:"Computing",label:"Thin Client",icon:"terminal",ports:1,models:["Thin Client"]},
    terminal:{category:"Computing",label:"Network Terminal",icon:"terminal",ports:1,models:["Network Terminal"]},
    nas:{category:"Server & Storage",label:"NAS",icon:"storage",ports:2,models:["2-Bay NAS","4-Bay NAS","Rack NAS"]},
    san:{category:"Server & Storage",label:"SAN",icon:"storage",ports:4,models:["Storage Area Network"]},
    storage_server:{category:"Server & Storage",label:"Storage Server",icon:"storage",ports:4,models:["Storage Server"]},
    backup_server:{category:"Server & Storage",label:"Backup Server",icon:"server",ports:2,models:["Backup Server"]},
    disk_storage:{category:"Server & Storage",label:"Disk Storage",icon:"storage",ports:2,models:["Disk Array"]},
    camera:{category:"CCTV & Access",label:"IP Camera",icon:"camera",ports:1,status:true,models:["IP Camera","Bullet Camera"]},
    dome_camera:{category:"CCTV & Access",label:"Dome Camera",icon:"dome_camera",ports:1,status:true,models:["Indoor Dome","Outdoor Dome"]},
    ptz_camera:{category:"CCTV & Access",label:"PTZ Camera",icon:"ptz_camera",ports:1,status:true,models:["PTZ Camera"]},
    dvr:{category:"CCTV & Access",label:"DVR",icon:"recorder",ports:16,connectionUnit:"Channel",models:["8-Channel DVR","16-Channel DVR","32-Channel DVR"],modelCapabilities:{"8-Channel DVR":{channelCount:8},"16-Channel DVR":{channelCount:16},"32-Channel DVR":{channelCount:32}}},
    nvr:{category:"CCTV & Access",label:"NVR",icon:"recorder",ports:16,connectionUnit:"Channel",models:["8-Channel NVR","16-Channel NVR","32-Channel NVR"],modelCapabilities:{"8-Channel NVR":{channelCount:8},"16-Channel NVR":{channelCount:16},"32-Channel NVR":{channelCount:32}}},
    cctv_monitor:{category:"CCTV & Access",label:"CCTV Monitor",icon:"monitor",ports:2,models:["CCTV Monitor"]},
    access_control:{category:"CCTV & Access",label:"Access Control",icon:"access",ports:4,models:["Access Control Panel"]},
    door_controller:{category:"CCTV & Access",label:"Door Controller",icon:"door",ports:4,models:["Door Lock Controller"]},
    card_reader:{category:"CCTV & Access",label:"RFID / Card Reader",icon:"card",ports:1,models:["RFID Reader","Card Reader"]},
    pabx:{category:"Telephony",label:"PABX / IP-PBX",icon:"pbx",ports:8,models:["PABX","IP-PBX"]},
    ip_phone:{category:"Telephony",label:"IP Phone",icon:"phone",ports:2,models:["IP Phone","VoIP Phone"]},
    analog_phone:{category:"Telephony",label:"Analog Phone",icon:"phone",ports:1,models:["Analog Phone"]},
    voip_gateway:{category:"Telephony",label:"VoIP Gateway",icon:"gateway",ports:4,models:["VoIP Gateway","SIP Gateway"]},
    iptv_server:{category:"Hotel",label:"IPTV Server",icon:"server",ports:2,models:["IPTV Server"]},
    iptv_headend:{category:"Hotel",label:"IPTV Headend",icon:"rack_server",ports:8,models:["IPTV Headend"]},
    stb:{category:"Hotel",label:"IPTV Box / STB",icon:"stb",ports:2,models:["Set-Top Box"]},
    hotel_tv:{category:"Hotel",label:"Hotel TV",icon:"tv",ports:2,models:["Smart Hotel TV"]},
    pos_terminal:{category:"Hotel",label:"POS Terminal",icon:"pos",ports:1,models:["POS Terminal"]},
    pos_server:{category:"Hotel",label:"POS Server",icon:"server",ports:2,models:["POS Server"]},
    kiosk:{category:"Hotel",label:"Kiosk",icon:"kiosk",ports:1,models:["Self-Service Kiosk"]},
    digital_signage:{category:"Hotel",label:"Digital Signage",icon:"tv",ports:1,models:["Digital Signage Player"]},
    printer:{category:"Peripheral",label:"Network Printer",icon:"printer",ports:1,models:["Network Printer","Laser Printer"]},
    scanner:{category:"Peripheral",label:"Scanner",icon:"scanner",ports:1,models:["Network Scanner"]},
    copier:{category:"Peripheral",label:"Copier / MFP",icon:"printer",ports:1,models:["Multifunction Printer"]},
    barcode_scanner:{category:"Peripheral",label:"Barcode Scanner",icon:"scanner",ports:1,models:["Barcode Scanner"]},
    cloud:{category:"WAN",label:"Cloud / Internet",icon:"cloud",ports:0,models:["Internet","ISP","Cloud","VPN Cloud"]},
    wan:{category:"WAN",label:"WAN",icon:"cloud",ports:0,models:["Wide Area Network"]},
    data_center:{category:"WAN",label:"Data Center",icon:"datacenter",ports:8,models:["Data Center"]},
    branch_office:{category:"WAN",label:"Branch Office",icon:"building",ports:4,models:["Branch Office"]},
    patch_panel:{category:"Infrastructure",label:"Patch Panel",icon:"patch",ports:24,models:["24-Port Patch Panel","48-Port Patch Panel"]},
    rack:{category:"Infrastructure",label:"Server Rack",icon:"rack",ports:0,models:["Network Rack","Server Rack"]},
    fiber_odf:{category:"Infrastructure",label:"Fiber ODF",icon:"fiber",ports:24,models:["Fiber ODF","Fiber Distribution Box"]},
    cabinet:{category:"Infrastructure",label:"Network Cabinet",icon:"rack",ports:0,models:["Network Cabinet"]},
    ups:{category:"Infrastructure",label:"UPS",icon:"ups",ports:2,models:["Rack UPS","Tower UPS"]}
};
const DEVICE_TYPES=new Set(Object.keys(DEVICE_LIBRARY));
const DEFAULT_PORTS=Object.fromEntries(Object.entries(DEVICE_LIBRARY).map(([id,item])=>[id,item.ports]));

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
const annotations=[];

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

        annotations:annotations.map(annotation=>({...annotation})),
        diagramName,
        background:{...diagramBackground}

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
    annotations.splice(0,annotations.length,...(state.annotations||[]).map(annotation=>({...annotation})));
    diagramName=state.diagramName || diagramName;
    diagramBackground={...diagramBackground,...(state.background||{})};
    applyDiagramBackground();
    document.getElementById("diagramName").value=diagramName;

    selectedNode=null;
    selectedElement=null;
    selectedLink=null;
    selectedAnnotation=null;
    pendingAnnotation=null;
    selectedWaypointIndex=null;
    contextTarget=null;
    linkMode=false;
    document.getElementById("propertyPanel").hidden=true;
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

function isSafeImageData(value){
    return typeof value==="string" && /^data:image\/(png|jpeg|webp|svg\+xml);base64,/i.test(value);
}

function processImageFile(file,maxWidth,maxHeight,quality=.82){
    return new Promise((resolve,reject)=>{
        if(!file || !/^image\/(png|jpeg|webp|svg\+xml)$/i.test(file.type)) return reject(new Error("Pilih file PNG, JPG, SVG, atau WEBP"));
        if(file.size>8*1024*1024) return reject(new Error("Ukuran gambar maksimal 8 MB"));
        const reader=new FileReader();
        reader.onerror=()=>reject(new Error("File gambar tidak dapat dibaca"));
        reader.onload=()=>{
            const image=new Image();
            image.onerror=()=>reject(new Error("File gambar rusak atau tidak didukung"));
            image.onload=()=>{
                const sourceWidth=image.naturalWidth||maxWidth,sourceHeight=image.naturalHeight||maxHeight;
                const scale=Math.min(1,maxWidth/sourceWidth,maxHeight/sourceHeight);
                const canvas=document.createElement("canvas");
                canvas.width=Math.max(1,Math.round(sourceWidth*scale));canvas.height=Math.max(1,Math.round(sourceHeight*scale));
                const context=canvas.getContext("2d");
                if(!context) return reject(new Error("Browser tidak mendukung pemrosesan gambar"));
                context.drawImage(image,0,0,canvas.width,canvas.height);
                try{resolve(canvas.toDataURL(file.type==="image/jpeg"?"image/jpeg":"image/png",quality));}
                catch(error){reject(new Error("Gambar gagal diproses"));}
            };
            image.src=reader.result;
        };
        reader.readAsDataURL(file);
    });
}

function normalizeBackground(background){
    const value=background&&typeof background==="object"?background:{};
    const type=["theme","dark","light","color","image","transparent"].includes(value.type)?value.type:"theme";
    const customized=value.customized===true||["color","image","transparent"].includes(type);
    return{type:customized?type:"theme",color:/^#[0-9a-f]{6}$/i.test(value.color)?value.color:"#202020",data:type==="image"&&isSafeImageData(value.data)?value.data:"",fit:["cover","contain","center","repeat"].includes(value.fit)?value.fit:"cover",customized};
}

function getEffectiveBackgroundType(){return !diagramBackground.customized||diagramBackground.type==="theme"?theme:diagramBackground.type;}

function getDiagramContrastColor(){
    const type=getEffectiveBackgroundType();
    return type==="light"||(type==="color"&&isLightColor(diagramBackground.color))?"#17202a":"#ffffff";
}

function applyDiagramBackground(){
    const container=document.getElementById("canvasContainer");
    if(!container) return;
    const bg=diagramBackground,type=getEffectiveBackgroundType();
    container.style.backgroundColor=type==="light"?"#eef3f7":type==="dark"?"#202020":type==="color"?bg.color:"transparent";
    container.style.backgroundImage=type==="image"&&bg.data?`url("${bg.data}")`:"none";
    container.style.backgroundRepeat=bg.fit==="repeat"?"repeat":"no-repeat";
    container.style.backgroundPosition="center";
    container.style.backgroundSize=bg.fit==="center"?"auto":bg.fit==="repeat"?"auto":bg.fit;
    const light=type==="light"||(type==="color"&&isLightColor(bg.color));
    document.querySelectorAll("#smallGrid path,#grid path").forEach(path=>path.setAttribute("stroke",light?"#506070":"#ffffff"));
    updateBackgroundPreview();
}

function isLightColor(color){
    const value=parseInt(String(color).slice(1),16);if(!Number.isFinite(value))return false;
    return (((value>>16)&255)*299+((value>>8)&255)*587+(value&255)*114)/1000>170;
}

function updateBackgroundPreview(){
    const preview=document.getElementById("backgroundPreview");
    if(!preview) return;
    const bg=diagramBackground,type=getEffectiveBackgroundType();
    preview.style.backgroundColor=type==="light"?"#eef3f7":type==="dark"?"#202020":type==="color"?bg.color:"transparent";
    preview.style.backgroundImage=type==="image"&&bg.data?`url("${bg.data}")`:"none";
    preview.style.backgroundSize=bg.fit==="center"||bg.fit==="repeat"?"auto":bg.fit;
    preview.style.backgroundRepeat=bg.fit==="repeat"?"repeat":"no-repeat";
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

function fitView(){
    const bounds=getDiagramBounds(),rect=svg.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    const padding=30,nextZoom=Math.min(4,Math.max(.3,Math.min((rect.width-padding*2)/bounds.width,(rect.height-padding*2)/bounds.height)));
    zoom=nextZoom;viewX=rect.width/2-(bounds.x+bounds.width/2)*zoom;viewY=rect.height/2-(bounds.y+bounds.height/2)*zoom;updateView();saveToLocalStorage();showFeedback("Diagram fitted to view");
}

function render(){

    nodesLayer.innerHTML="";
    linksLayer.innerHTML="";
    annotationsLayer.innerHTML="";

    annotations.forEach(drawAnnotation);
    drawLinks();

    nodes.forEach(drawNode);

}

function getPortCount(node){
    const definition=node?getDeviceDefinition(node.type):null;
    const modelCount=definition?.connectionUnit==="Channel"?getModelConnectionCount(definition,node.model):null;
    if(Number.isInteger(modelCount)&&modelCount>=0) return modelCount;
    const value=Number(node && node.portCount);
    return Number.isInteger(value) && value>=0 ? value : (DEFAULT_PORTS[node?.type] || 0);
}

function getModelConnectionCount(definition,model){
    const capability=definition?.modelCapabilities?.[model];
    if(Number.isInteger(capability?.channelCount)) return capability.channelCount;
    if(Number.isInteger(capability?.portCount)) return capability.portCount;
    const match=String(model||"").match(/(\d+)[- ](?:Channel|Port)/i);
    return match ? Number(match[1]) : Number(definition?.ports)||0;
}

function getConnectionUnit(node){
    return getDeviceDefinition(node?.type).connectionUnit || "Port";
}

function formatConnectionPoint(node,port,short=false){
    if(!port) return "Automatic / none";
    const unit=getConnectionUnit(node);
    return `${short&&unit==="Channel"?"Ch":unit} ${port}`;
}

function escapeHtml(value){
    return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
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

function getActivePortCount(node){
    const used=new Set();
    links.forEach(link=>{
        if(link.from===node.id&&link.sourcePort) used.add(link.sourcePort);
        if(link.to===node.id&&link.targetPort) used.add(link.targetPort);
    });
    return used.size;
}

function getConnectedDeviceStatus(node){
    const visited=new Set([node.id]),queue=[node.id],connected=[];
    while(queue.length){
        const currentId=queue.shift();
        links.forEach(link=>{
            const remoteId=link.from===currentId?link.to:link.to===currentId?link.from:null;
            if(!remoteId||visited.has(remoteId))return;
            visited.add(remoteId);
            const remote=nodes.find(item=>item.id===remoteId);if(!remote)return;
            if(getDeviceDefinition(remote.type).status)connected.push(remote);
            else if(getPortCount(remote)>1)queue.push(remoteId);
        });
    }
    const summary={active:0,problem:0,inactive:0,total:connected.length,label:"Device"};
    connected.forEach(remote=>{const status=["active","problem","inactive"].includes(remote.status)?remote.status:"active";summary[status]++;});
    const types=new Set(connected.map(remote=>remote.type));
    if(types.size===1&&types.has("pc"))summary.label="PC";
    else if(connected.length&&connected.every(remote=>["camera","dome_camera","ptz_camera"].includes(remote.type)))summary.label="Camera";
    else if(connected.length&&connected.every(remote=>["pc","laptop","thin_client","terminal"].includes(remote.type)))summary.label="Client";
    return summary;
}

function drawAnnotation(annotation){
    const group=document.createElementNS(SVGNS,"g");
    group.classList.add("annotation");
    if(selectedAnnotation?.id===annotation.id) group.classList.add("selectedAnnotation");
    group.dataset.annotationId=annotation.id;
    group.setAttribute("transform",`translate(${annotation.x},${annotation.y})`);
    if(annotation.type==="image"){
        const clipId=`annotationClip_${annotation.id.replace(/[^a-z0-9_-]/gi,"_")}`;
        const defs=document.createElementNS(SVGNS,"defs"),clip=document.createElementNS(SVGNS,"clipPath"),clipRect=document.createElementNS(SVGNS,"rect");clip.id=clipId;clipRect.setAttribute("width",annotation.width);clipRect.setAttribute("height",annotation.height);clip.appendChild(clipRect);defs.appendChild(clip);group.appendChild(defs);
        const imageGroup=document.createElementNS(SVGNS,"g"),zoom=Math.min(4,Math.max(1,Number(annotation.cropZoom)||1)),cropX=Number.isFinite(Number(annotation.cropX))?Number(annotation.cropX):50,cropY=Number.isFinite(Number(annotation.cropY))?Number(annotation.cropY):50,shiftX=(cropX-50)*annotation.width/100,shiftY=(cropY-50)*annotation.height/100;
        imageGroup.setAttribute("clip-path",`url(#${clipId})`);imageGroup.setAttribute("transform",`translate(${annotation.width/2-shiftX} ${annotation.height/2-shiftY}) scale(${zoom}) translate(${-annotation.width/2} ${-annotation.height/2})`);
        const image=document.createElementNS(SVGNS,"image");
        image.setAttribute("href",annotation.data);image.setAttribute("width",annotation.width);image.setAttribute("height",annotation.height);image.setAttribute("preserveAspectRatio","xMidYMid slice");imageGroup.appendChild(image);
        const frame=document.createElementNS(SVGNS,"rect");frame.classList.add("annotationImageFrame");frame.setAttribute("width",annotation.width);frame.setAttribute("height",annotation.height);
        group.append(imageGroup,frame);
    }else{
        const text=document.createElementNS(SVGNS,"text");text.classList.add("annotationText");
        text.style.fontSize=`${Math.min(96,Math.max(8,Number(annotation.fontSize)||18))}px`;text.style.fill=/^#[0-9a-f]{6}$/i.test(annotation.color)?annotation.color:"#ffffff";text.style.fontWeight=annotation.bold===false?"400":"700";text.style.fontStyle=annotation.italic?"italic":"normal";text.style.textAnchor=["start","middle","end"].includes(annotation.align)?annotation.align:"start";
        String(annotation.text||"").split("\n").forEach((line,index)=>{const span=document.createElementNS(SVGNS,"tspan");span.setAttribute("x",0);span.setAttribute("dy",index?"1.25em":"0");span.textContent=line;text.appendChild(span);});
        group.appendChild(text);
    }
    group.addEventListener("pointerdown",startAnnotationDrag);
    group.addEventListener("click",event=>{event.stopPropagation();selectedNode=null;selectedLink=null;selectedAnnotation=annotation;showAnnotationProperties(annotation);group.classList.add("selectedAnnotation");});
    group.addEventListener("dblclick",event=>{event.stopPropagation();if(annotation.type!=="text")return;const value=prompt("Edit text",annotation.text);if(value===null||!value.trim())return;recordHistory();annotation.text=value.trim().slice(0,500);render();showAnnotationProperties(annotation);saveToLocalStorage();});
    annotationsLayer.appendChild(group);
}

function startAnnotationDrag(event){
    if(event.pointerType==="mouse"&&event.button!==0)return;
    event.preventDefault();event.stopPropagation();
    const annotation=annotations.find(item=>item.id===event.currentTarget.dataset.annotationId);if(!annotation)return;
    selectedAnnotation=annotation;selectedNode=null;selectedLink=null;document.getElementById("propertyPanel").hidden=true;
    const point=getViewportPoint(event);annotationDrag={annotation,pointerId:event.pointerId,offsetX:point.x-annotation.x,offsetY:point.y-annotation.y,startX:annotation.x,startY:annotation.y,element:event.currentTarget};
    annotationsLayer.querySelectorAll(".selectedAnnotation").forEach(item=>item.classList.remove("selectedAnnotation"));event.currentTarget.classList.add("selectedAnnotation");event.currentTarget.setPointerCapture?.(event.pointerId);
}

function moveAnnotation(event){
    if(!annotationDrag||event.pointerId!==annotationDrag.pointerId)return;
    event.preventDefault();const point=getViewportPoint(event),position=getSnappedPosition(point.x-annotationDrag.offsetX,point.y-annotationDrag.offsetY);
    annotationDrag.annotation.x=position.x;annotationDrag.annotation.y=position.y;
    const current=annotationsLayer.querySelector(`[data-annotation-id="${CSS.escape(annotationDrag.annotation.id)}"]`);if(current)current.setAttribute("transform",`translate(${position.x},${position.y})`);
}

function stopAnnotationDrag(event){
    if(!annotationDrag||event.pointerId!==annotationDrag.pointerId)return;
    const drag=annotationDrag;annotationDrag=null;
    if(drag.startX!==drag.annotation.x||drag.startY!==drag.annotation.y){const end={x:drag.annotation.x,y:drag.annotation.y};drag.annotation.x=drag.startX;drag.annotation.y=drag.startY;recordHistory();drag.annotation.x=end.x;drag.annotation.y=end.y;saveToLocalStorage();render();}
}

/* ==========================================================
   DRAW NODE
========================================================== */

function drawNode(node){

    const g=document.createElementNS(SVGNS,"g");

    g.classList.add("node");
    if(node.iconType==="custom")g.classList.add("customIconNode");
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

    icon.style.stroke=getDiagramContrastColor();
    icon.setAttribute("stroke-width","2");
    icon.setAttribute("fill","none");
    icon.setAttribute("stroke-linecap","round");
    icon.setAttribute("stroke-linejoin","round");

    if(node.iconType==="custom" && isSafeImageData(node.iconData)){
        const customIcon=document.createElementNS(SVGNS,"image");
        customIcon.setAttribute("x",19);customIcon.setAttribute("y",4);
        customIcon.setAttribute("width",52);customIcon.setAttribute("height",52);
        customIcon.setAttribute("preserveAspectRatio","xMidYMid meet");
        customIcon.setAttribute("href",node.iconData);
        customIcon.style.pointerEvents="none";
        g.appendChild(customIcon);
        icon.style.display="none";
    }

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

    if(node.iconType!=="custom") drawProfessionalIcon(icon,getNodeIconKey(node));
    icon.querySelectorAll('[fill="#ffffff"]').forEach(element=>element.style.fill=getDiagramContrastColor());
    g.appendChild(icon);

    if(getDeviceDefinition(node.type).status){
        const badge=document.createElementNS(SVGNS,"circle");
        const status=["active","inactive","problem"].includes(node.status)?node.status:"active";
        badge.setAttribute("cx",68);badge.setAttribute("cy",12);badge.setAttribute("r",6);
        badge.classList.add("statusBadge",status);badge.style.pointerEvents="none";
        const title=document.createElementNS(SVGNS,"title");title.textContent=`${status}${node.statusNote?`: ${node.statusNote}`:""}`;badge.appendChild(title);g.appendChild(badge);
    }

    const portCount=getPortCount(node);
    if(portCount>1){
        const usage=document.createElementNS(SVGNS,"text");usage.classList.add("portUsageText");usage.setAttribute("x",45);usage.setAttribute("y",61);usage.setAttribute("text-anchor","middle");usage.textContent=`${getActivePortCount(node)}/${portCount}`;g.appendChild(usage);
    }

    //------------------------------------

    const text=document.createElementNS(SVGNS,"text");

    text.setAttribute("x",45);
    text.setAttribute("y",80);

    text.setAttribute("text-anchor","middle");
    text.style.fontSize=`${Math.min(48,Math.max(8,Number(node.labelSize)||13))}px`;
    if(/^#[0-9a-f]{6}$/i.test(node.labelColor))text.style.fill=node.labelColor;
    text.style.fontWeight=node.labelBold?"700":"400";

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

    if(portCount>1){
        const health=getConnectedDeviceStatus(node);
        if(health.total>0){
            const statusY=84+lines.length*Math.max(14,(Number(node.labelSize)||13)*1.15);
            const statusText=document.createElementNS(SVGNS,"text");statusText.classList.add("connectionHealthText");statusText.setAttribute("x",45);statusText.setAttribute("y",statusY);statusText.setAttribute("text-anchor","middle");
            [["activeCount",`${health.label} Active = ${health.active}`],["problemCount",`${health.label} Broken = ${health.problem}`],["inactiveCount",`${health.label} Inactive = ${health.inactive}`]].forEach(([className,value],index)=>{const span=document.createElementNS(SVGNS,"tspan");span.classList.add(className);span.setAttribute("x",45);span.setAttribute("dy",index?"1.25em":"0");span.textContent=value;statusText.appendChild(span);});
            g.appendChild(statusText);
        }
    }

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

    document.getElementById("propertyPanel").hidden=false;
    document.getElementById("nodeProperties").style.display="";
    document.getElementById("linkProperties").style.display="none";
    document.getElementById("annotationProperties").style.display="none";

}

function showLinkProperties(){

    document.getElementById("propertyPanel").hidden=false;
    document.getElementById("nodeProperties").style.display="none";
    document.getElementById("linkProperties").style.display="";
    document.getElementById("annotationProperties").style.display="none";

}

function showAnnotationProperties(annotation){
    document.getElementById("propertyPanel").hidden=false;document.getElementById("nodeProperties").style.display="none";document.getElementById("linkProperties").style.display="none";document.getElementById("annotationProperties").style.display="";
    const isText=annotation.type==="text";document.getElementById("textAnnotationProperties").hidden=!isText;document.getElementById("imageAnnotationProperties").hidden=isText;
    if(isText){propAnnotationText.value=annotation.text||"";propAnnotationFontSize.value=annotation.fontSize||18;propAnnotationColor.value=/^#[0-9a-f]{6}$/i.test(annotation.color)?annotation.color:"#ffffff";propAnnotationBold.checked=annotation.bold!==false;propAnnotationItalic.checked=Boolean(annotation.italic);propAnnotationAlign.value=["start","middle","end"].includes(annotation.align)?annotation.align:"start";}
    else{propAnnotationWidth.value=annotation.width||240;propAnnotationHeight.value=annotation.height||160;propAnnotationCropZoom.value=annotation.cropZoom||1;propAnnotationCropX.value=annotation.cropX??50;propAnnotationCropY.value=annotation.cropY??50;}
}

function hideProperties(){
    document.getElementById("propertyPanel").hidden=true;
    selectedNode=null;
    selectedElement=null;
    selectedLink=null;
    selectedAnnotation=null;
    selectedWaypointIndex=null;
    document.querySelectorAll(".node").forEach(node=>node.classList.remove("selected"));
    drawLinksOnly();
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
        const localNodeId=selectedLink.from;
        links.splice(idx,1);
        selectedLink=null;
        selectedWaypointIndex=null;
        showNodeProperties();
        render();
        selectNodeById(localNodeId);
        saveToLocalStorage();

    }

}

function selectNodeById(id){
    const element=nodesLayer.querySelector(`.node[data-id="${CSS.escape(id)}"]`);
    if(element) element.dispatchEvent(new MouseEvent("click",{bubbles:true}));
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

    const sourceNode=nodes.find(node=>node.id===selectedLink.from),targetNode=nodes.find(node=>node.id===selectedLink.to);
    document.getElementById("propLinkName").value=`${getNodeLabel(selectedLink.from)}${selectedLink.sourcePort?` [${formatConnectionPoint(sourceNode,selectedLink.sourcePort,true)}]`:""} → ${getNodeLabel(selectedLink.to)}${selectedLink.targetPort?` [${formatConnectionPoint(targetNode,selectedLink.targetPort,true)}]`:""}`;
    document.getElementById("propSourcePortLabel").textContent=`Source ${getConnectionUnit(sourceNode)}`;
    document.getElementById("propTargetPortLabel").textContent=`Target ${getConnectionUnit(targetNode)}`;
    document.getElementById("connectionDetail").innerHTML=`<dt>Local Device</dt><dd>${escapeHtml(getNodeLabel(sourceNode.id))}</dd><dt>Local ${getConnectionUnit(sourceNode)}</dt><dd>${escapeHtml(formatConnectionPoint(sourceNode,selectedLink.sourcePort))}</dd><dt>Remote Device</dt><dd>${escapeHtml(getNodeLabel(targetNode.id))}</dd><dt>Remote ${getConnectionUnit(targetNode)}</dt><dd>${escapeHtml(formatConnectionPoint(targetNode,selectedLink.targetPort))}</dd><dt>Status</dt><dd>Connected</dd>${targetNode.status?`<dt>Remote Device Status</dt><dd>${escapeHtml(targetNode.status)}</dd>`:""}`;
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
            option.value=port; option.textContent=formatConnectionPoint(node,port); select.appendChild(option);
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

const PROFESSIONAL_ICONS={
 router:'<rect x="27" y="20" width="36" height="22" rx="5"/><path d="M34 27h22m-22 8h22M37 24l-4 3 4 3m16 2 4 3-4 3"/>',
 switch:'<rect x="24" y="22" width="42" height="20" rx="3"/><path d="M29 28h5v5h-5zm8 0h5v5h-5zm8 0h5v5h-5zm8 0h5v5h-5z"/><circle cx="61" cy="31" r="1" fill="#fff"/>',
 poe_switch:'<rect x="24" y="22" width="42" height="20" rx="3"/><path d="M29 28h5v5h-5zm8 0h5v5h-5zm8 0h5v5h-5zM56 25l-5 8h5l-2 6 7-9h-5z"/>',
 firewall:'<path d="M27 18h36v25H27zM27 25h12v9H27m12-16v7h12v9h12M39 34v9m12-25v7m0 9v9"/>',
 security:'<path d="M45 15l15 6v10c0 10-7 15-15 19-8-4-15-9-15-19V21z"/><path d="M38 32l5 5 10-11"/>',
 wireless:'<rect x="31" y="31" width="28" height="12" rx="4"/><circle cx="45" cy="37" r="2" fill="#fff"/><path d="M35 27a14 14 0 0 1 20 0M39 23a9 9 0 0 1 12 0M45 18v4"/>',
 outdoor_ap:'<rect x="39" y="22" width="12" height="24" rx="3"/><path d="M39 29c-7 2-10 7-11 13m23-13c7 2 10 7 11 13M45 15v7"/>',
 controller:'<rect x="25" y="20" width="40" height="24" rx="4"/><path d="M31 27h13v10H31zm18 0h10m-10 5h10m-10 5h6"/>',
 mesh:'<circle cx="45" cy="31" r="8"/><circle cx="45" cy="31" r="2" fill="#fff"/><path d="M30 22a18 18 0 0 1 30 0M26 17a25 25 0 0 1 38 0M34 42l-5 5m27-5 5 5"/>',
 wireless_bridge:'<path d="M27 38h12V25H27zm24 0h12V25H51zM39 31h12M31 21a16 16 0 0 1 28 0"/>',
 gateway:'<rect x="27" y="20" width="36" height="24" rx="4"/><path d="M33 27h24M33 34h11m5 0h8M40 17l5-4 5 4"/>',
 modem:'<rect x="28" y="23" width="34" height="20" rx="5"/><path d="M34 30h14m-14 6h22M55 18v5"/><circle cx="55" cy="30" r="1" fill="#fff"/>',
 ont:'<rect x="29" y="20" width="32" height="24" rx="4"/><path d="M35 27h20v8H35zm4 12h3m5 0h3m5 0h2"/>',
 converter:'<rect x="27" y="23" width="36" height="20" rx="3"/><path d="M32 29h10v8H32zm17 0h9v8h-9M42 33h7"/>',
 desktop:'<rect x="26" y="18" width="38" height="25" rx="3"/><path d="M40 43v5m-8 0h26M31 23h28v15H31z"/>',
 laptop:'<path d="M30 18h30v22H30zM25 45h40l-4 4H29z"/><path d="M34 22h22v14H34z"/>',
 terminal:'<rect x="27" y="18" width="36" height="24" rx="3"/><path d="M34 26l5 4-5 4m9 0h9M39 42v6m-8 0h28"/>',
 server:'<rect x="31" y="14" width="28" height="36" rx="3"/><path d="M35 20h20v8H35zm0 12h20v8H35z"/><circle cx="51" cy="24" r="1" fill="#fff"/><circle cx="51" cy="36" r="1" fill="#fff"/>',
 rack_server:'<rect x="24" y="18" width="42" height="26" rx="2"/><path d="M28 23h34v7H28zm0 9h34v7H28z"/><circle cx="58" cy="26" r="1" fill="#fff"/><circle cx="58" cy="35" r="1" fill="#fff"/>',
 tower:'<rect x="34" y="13" width="22" height="38" rx="3"/><path d="M39 20h12m-12 6h12"/><circle cx="45" cy="42" r="3"/>',
 virtual:'<rect x="26" y="17" width="30" height="24" rx="3"/><rect x="34" y="23" width="30" height="24" rx="3"/><path d="M40 30h18v10H40z"/>',
 storage:'<rect x="28" y="15" width="34" height="34" rx="4"/><path d="M33 21h24v10H33zm0 13h24v10H33z"/><circle cx="53" cy="26" r="1" fill="#fff"/><circle cx="53" cy="39" r="1" fill="#fff"/>',
 camera:'<path d="M26 27h30v14H26zM56 30l10-6v20l-10-6zM32 24l5-5h13l4 5"/><circle cx="42" cy="34" r="5"/>',
 dome_camera:'<path d="M27 38a18 18 0 0 1 36 0zM31 38v5h28v-5"/><circle cx="45" cy="33" r="5"/>',
 ptz_camera:'<path d="M31 20h28l-3 12H34zM36 32a9 9 0 0 0 18 0M45 41v6m-9 0h18"/><circle cx="45" cy="32" r="3"/>',
 recorder:'<rect x="24" y="22" width="42" height="22" rx="3"/><path d="M29 28h22v10H29zm27 1h5m-5 5h5"/><circle cx="59" cy="39" r="1" fill="#fff"/>',
 monitor:'<rect x="25" y="17" width="40" height="27" rx="3"/><path d="M39 44v5m-9 0h30M30 22h30v17H30z"/>',
 access:'<rect x="29" y="17" width="32" height="32" rx="4"/><path d="M36 24h18v18H36zM40 28h10m-10 5h10m-10 5h6"/>',
 door:'<path d="M31 14h28v36H31zM37 20h16v30H37z"/><circle cx="49" cy="35" r="1.5" fill="#fff"/>',
 card:'<rect x="27" y="18" width="36" height="28" rx="4"/><path d="M33 25h15m-15 6h24m-24 6h18"/><circle cx="55" cy="25" r="3"/>',
 pbx:'<rect x="26" y="16" width="38" height="32" rx="3"/><path d="M31 22h28v8H31zm0 12h6v6h-6zm10 0h6v6h-6zm10 0h8v6h-8"/>',
 phone:'<path d="M31 20c4-4 24-4 28 0l-4 7-7-3h-6l-7 3zM34 31h22v16H34z"/><path d="M40 36h10m-10 5h10"/>',
 stb:'<rect x="27" y="24" width="36" height="18" rx="4"/><path d="M33 30h15m-15 6h24"/><circle cx="57" cy="30" r="1" fill="#fff"/>',
 tv:'<rect x="24" y="16" width="42" height="28" rx="3"/><path d="M42 44v5m-10 0h26M37 12l8 4 8-4"/>',
 pos:'<path d="M31 15h28v24H31zM35 20h20v13H35zM28 39h34l4 10H24z"/>',
 kiosk:'<path d="M34 13h22v29H34zM38 18h14v15H38zM39 42l-3 8h18l-3-8"/>',
 printer:'<path d="M31 15h28v12H31zM25 27h40v16H25zM31 38h28v12H31z"/><circle cx="58" cy="32" r="1" fill="#fff"/>',
 scanner:'<path d="M28 35h34v11H28zM34 18h22l6 17H28zM37 23h16"/>',
 cloud:'<path d="M25 39c-7-1-7-12 1-14 1-9 13-12 19-5 8-6 18 0 18 8 8 2 7 12-1 12z"/>',
 datacenter:'<path d="M27 16h36v34H27zM32 21h10v8H32zm16 0h10v8H48zM32 34h10v11H32zm16 0h10v11H48z"/>',
 building:'<path d="M28 20l17-8 17 8v30H28zM34 25h7v7h-7zm15 0h7v7h-7zM34 37h7v7h-7zm15 0h7v13h-7"/>',
 patch:'<rect x="23" y="22" width="44" height="22" rx="2"/><path d="M28 27h5v5h-5zm8 0h5v5h-5zm8 0h5v5h-5zm8 0h5v5h-5zm8 0h3v5h-3zM28 35h5v5h-5zm8 0h5v5h-5zm8 0h5v5h-5zm8 0h5v5h-5z"/>',
 rack:'<path d="M30 12h30v40H30zM34 17h22v8H34zm0 11h22v8H34zm0 11h22v8H34z"/>',
 fiber:'<rect x="25" y="20" width="40" height="25" rx="3"/><path d="M31 26h6v6h-6zm11 0h6v6h-6zm11 0h6v6h-6M34 35c8 8 14 8 22 0"/>',
 ups:'<rect x="32" y="13" width="26" height="38" rx="3"/><path d="M38 20h14v12H38zM45 35l-5 8h5l-2 6 7-9h-5z"/>'
};

function getDeviceDefinition(type){return DEVICE_LIBRARY[type]||DEVICE_LIBRARY.pc;}
function drawProfessionalIcon(icon,key){icon.innerHTML=PROFESSIONAL_ICONS[key]||PROFESSIONAL_ICONS.terminal;}
function getNodeIconKey(node){
    const model=String(node.model||"").toLowerCase();
    if(model.includes("poe"))return"poe_switch";
    if(model.includes("dome"))return"dome_camera";
    if(model.includes("ptz"))return"ptz_camera";
    if(model.includes("rack server"))return"rack_server";
    return getDeviceDefinition(node.type).icon;
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

        const newLink=normalizeLink({from:firstLinkNode.id,to:selectedNode.id,sourcePort,targetPort});
        links.push(newLink);
        selectedLink=newLink;
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

    if(!linkError){
        document.getElementById("statusBar").textContent="Connection created — choose its port/channel in Properties";
        selectLinkById(selectedLink.id);
    }

    return;

}

    document.getElementById("propName").value=
        selectedNode.text;
    document.getElementById("propNameSize").value=selectedNode.labelSize||13;
    document.getElementById("propNameThemeColor").checked=!/^#[0-9a-f]{6}$/i.test(selectedNode.labelColor);
    document.getElementById("propNameColor").value=/^#[0-9a-f]{6}$/i.test(selectedNode.labelColor)?selectedNode.labelColor:(theme==="light"?"#17202a":"#ffffff");
    document.getElementById("propNameColor").disabled=document.getElementById("propNameThemeColor").checked;
    document.getElementById("propNameBold").checked=Boolean(selectedNode.labelBold);

    populatePropertyDeviceFields(selectedNode);

    document.getElementById("propIP").value=
        selectedNode.ip || "";

    document.getElementById("propLocation").value=
        selectedNode.location || "";

    document.getElementById("propNotes").value=
        selectedNode.notes || "";

    renderConnectionStatus(selectedNode);

    document.getElementById("propStatus").value=["active","inactive","problem"].includes(selectedNode.status)?selectedNode.status:"active";
    document.getElementById("propStatusNote").value=selectedNode.statusNote||"";

    updateNodeMediaPreviews();

    showNodeProperties();

}

function populatePropertyDeviceFields(node,typeOverride=null){
    const typeSelect=document.getElementById("propDeviceType"),modelSelect=document.getElementById("propModel"),portSelect=document.getElementById("propPortCount");
    if(typeSelect.options.length===0){
        const groups=new Map();Object.entries(DEVICE_LIBRARY).forEach(([id,item])=>{if(!groups.has(item.category)){const group=document.createElement("optgroup");group.label=item.category;groups.set(item.category,group);typeSelect.appendChild(group);}const option=document.createElement("option");option.value=id;option.textContent=item.label;groups.get(item.category).appendChild(option);});
    }
    const type=typeOverride||node.type;typeSelect.value=DEVICE_LIBRARY[type]?type:"pc";
    const definition=getDeviceDefinition(typeSelect.value);modelSelect.innerHTML="";
    document.getElementById("propPortCountLabel").textContent=definition.connectionUnit==="Channel"?"Channel Count":"Port Count";
    definition.models.forEach(name=>{const option=document.createElement("option");option.value=name;option.textContent=name;modelSelect.appendChild(option);});
    const preserve=type===node.type;
    if(preserve&&node.model&&!definition.models.includes(node.model)){const legacy=document.createElement("option");legacy.value=node.model;legacy.textContent=node.model;modelSelect.appendChild(legacy);}
    modelSelect.value=preserve&&node.model&&[...modelSelect.options].some(option=>option.value===node.model)?node.model:definition.models[0];
    populatePropertyPorts(node.portCount,definition,modelSelect.value);
    document.getElementById("statusProperties").hidden=!definition.status;
}

function populatePropertyPorts(current,definition,model){
    const select=document.getElementById("propPortCount");select.innerHTML="";
    const suggested=getModelConnectionCount(definition,model);
    const values=definition.ports>0?[...new Set([suggested,definition.ports].filter(value=>value>0))]:[0];
    values.forEach(value=>{const option=document.createElement("option");option.value=value;option.textContent=value;select.appendChild(option);});
    select.value=values.includes(Number(current))?String(current):String(values[0]);
}

function renderConnectionStatus(node){
    const section=document.getElementById("connectionStatus");
    const list=document.getElementById("connectionStatusList");
    const count=getPortCount(node);
    section.hidden=count===0;
    list.innerHTML="";
    if(count===0) return;
    document.getElementById("connectionStatusTitle").textContent=`Connection ${getConnectionUnit(node)}s`;
    for(let port=1;port<=count;port++){
        const link=links.find(item=>(item.from===node.id&&item.sourcePort===port)||(item.to===node.id&&item.targetPort===port));
        const row=document.createElement(link?"button":"div");
        row.className=`connectionStatusRow ${link?"connected":"available"}`;
        const remoteId=link?(link.from===node.id?link.to:link.from):null;
        const remote=remoteId?nodes.find(item=>item.id===remoteId):null;
        row.innerHTML=`<span>${formatConnectionPoint(node,port,true)}</span><strong>${remote?escapeHtml(getNodeLabel(remote.id)):"Not Connected"}</strong>`;
        if(link){
            row.type="button";
            row.title=`Open connection to ${getNodeLabel(remote.id)}`;
            row.addEventListener("click",()=>selectLinkById(link.id));
        }
        list.appendChild(row);
    }
}

function setPreview(element,data,emptyText){
    element.innerHTML="";
    if(isSafeImageData(data)){
        const image=document.createElement("img");image.src=data;image.alt="Preview";element.appendChild(image);
    }else element.textContent=emptyText;
}

function updateNodeMediaPreviews(){
    if(!selectedNode) return;
    const iconPreview=document.getElementById("propIconPreview");
    if(selectedNode.iconType==="custom")setPreview(iconPreview,selectedNode.iconData,"Default icon");else setDefaultIconPreview(iconPreview,selectedNode);
    setPreview(document.getElementById("propPicturePreview"),selectedNode.pictureData,"No picture");
    document.getElementById("btnResetIcon").disabled=selectedNode.iconType!=="custom";
    document.getElementById("btnChangePicture").textContent=selectedNode.pictureData?"Change Picture":"Add Picture";
    document.getElementById("btnRemovePicture").disabled=!selectedNode.pictureData;
}
function setDefaultIconPreview(element,node){
    element.innerHTML="";const preview=document.createElementNS(SVGNS,"svg");preview.setAttribute("viewBox","0 0 90 60");preview.setAttribute("width","76");preview.setAttribute("height","56");preview.setAttribute("fill","none");preview.setAttribute("stroke","#00aee6");preview.setAttribute("stroke-width","2");preview.setAttribute("stroke-linecap","round");preview.setAttribute("stroke-linejoin","round");preview.innerHTML=PROFESSIONAL_ICONS[getNodeIconKey(node)]||PROFESSIONAL_ICONS.terminal;element.appendChild(preview);
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
    const nextType=propDeviceType.value;
    const nextModel=propModel.value;
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
        nextNode.labelSize=Math.min(48,Math.max(8,Number(document.getElementById("propNameSize").value)||13));
        nextNode.labelColor=document.getElementById("propNameThemeColor").checked?null:document.getElementById("propNameColor").value;
        nextNode.labelBold=document.getElementById("propNameBold").checked;
        nextNode.type=nextType;
        nextNode.ip=ip;
        nextNode.model=nextModel;
        nextNode.portCount=nextPortCount;
        nextNode.location=document.getElementById("propLocation").value;
        nextNode.notes=document.getElementById("propNotes").value;
        nextNode.status=document.getElementById("propStatus").value;
        nextNode.statusNote=document.getElementById("propStatusNote").value.trim().slice(0,160);

    }

    if(!statesAreEqual(cloneDiagramState(),nextState)){

        recordHistory();

    }

    selectedNode.text=name;
    selectedNode.labelSize=Math.min(48,Math.max(8,Number(document.getElementById("propNameSize").value)||13));
    selectedNode.labelColor=document.getElementById("propNameThemeColor").checked?null:document.getElementById("propNameColor").value;
    selectedNode.labelBold=document.getElementById("propNameBold").checked;
    selectedNode.type=nextType;

    selectedNode.ip=
        ip;

    selectedNode.model=nextModel;

    selectedNode.portCount=nextPortCount;

    selectedNode.location=
        document.getElementById("propLocation").value;

    selectedNode.notes=
        document.getElementById("propNotes").value;

    selectedNode.status=document.getElementById("propStatus").value;
    selectedNode.statusNote=document.getElementById("propStatusNote").value.trim().slice(0,160);

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
function isCanvasTarget(target){return !target.closest?.(".node,.waypointHandle")&&!target.dataset?.linkId;}
function beginCanvasPan(e){
    panMode=true;panPointerId=e.pointerId;panStartX=e.clientX-viewX;panStartY=e.clientY-viewY;
    svg.setPointerCapture?.(e.pointerId);e.preventDefault();
}
function cancelObjectGestureForPinch(){
    if(dragging&&selectedNode&&dragStartPosition){selectedNode.x=dragStartPosition.x;selectedNode.y=dragStartPosition.y;dragging=null;draggingPointerId=null;dragStartPosition=null;render();}
    if(waypointDrag){waypointDrag.link.route=waypointDrag.startRoute.map(point=>({...point}));waypointDrag=null;drawLinksOnly();}
}
function startCanvasGesture(e){
    if(e.pointerType==="touch"){
        touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(touchPoints.size===2){
            cancelObjectGestureForPinch();panMode=false;panPointerId=null;
            const points=[...touchPoints.values()],center={x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2};
            const rect=svg.getBoundingClientRect(),local={x:center.x-rect.left,y:center.y-rect.top};
            pinchState={distance:Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y),zoom,worldX:(local.x-viewX)/zoom,worldY:(local.y-viewY)/zoom};
            e.preventDefault();e.stopPropagation();return;
        }
        if(touchPoints.size===1&&isCanvasTarget(e.target)){beginCanvasPan(e);e.stopPropagation();}
        return;
    }
    if(isCanvasTarget(e.target)&&((e.button===1)||(e.button===0&&spacePressed))){beginCanvasPan(e);e.stopPropagation();}
}
function moveCanvasGesture(e){
    if(e.pointerType==="touch"&&touchPoints.has(e.pointerId))touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinchState&&touchPoints.size>=2){
        const points=[...touchPoints.values()].slice(0,2),distance=Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y);
        const center={x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2},rect=svg.getBoundingClientRect();
        zoom=Math.min(4,Math.max(.3,pinchState.zoom*(distance/(pinchState.distance||1))));
        viewX=center.x-rect.left-pinchState.worldX*zoom;viewY=center.y-rect.top-pinchState.worldY*zoom;updateView();
        e.preventDefault();e.stopPropagation();return;
    }
    if(panMode&&e.pointerId===panPointerId){viewX=e.clientX-panStartX;viewY=e.clientY-panStartY;updateView();e.preventDefault();e.stopPropagation();}
}
function endCanvasGesture(e){
    if(touchPoints.has(e.pointerId))touchPoints.delete(e.pointerId);
    if(pinchState&&touchPoints.size<2){pinchState=null;saveToLocalStorage();}
    if(e.pointerId===panPointerId){panMode=false;panPointerId=null;saveToLocalStorage();}
}
svg.addEventListener("pointerdown",startCanvasGesture,true);
svg.addEventListener("pointermove",moveCanvasGesture,true);
window.addEventListener("pointerup",endCanvasGesture,true);
window.addEventListener("pointercancel",endCanvasGesture,true);
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

    if(annotationDrag){moveAnnotation(e);return;}

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
window.addEventListener("pointerup",stopAnnotationDrag);
window.addEventListener("pointercancel",stopAnnotationDrag);

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
            labelSize:Math.min(48,Math.max(8,Number(node.labelSize)||13)),
            labelColor:/^#[0-9a-f]{6}$/i.test(node.labelColor)?node.labelColor:null,
            labelBold:Boolean(node.labelBold),
            ip:node.ip || "",
            model:node.model || "",
            portCount:getPortCount(node),
            location:node.location || "",
            notes:node.notes || "",
            iconType:node.iconType==="custom"?"custom":"default",
            iconData:node.iconType==="custom"&&isSafeImageData(node.iconData)?node.iconData:"",
            pictureData:isSafeImageData(node.pictureData)?node.pictureData:"",
            status:["active","inactive","problem"].includes(node.status)?node.status:"active",
            statusNote:String(node.statusNote||"").slice(0,160),
            x:node.x,
            y:node.y

        })),

        links:links.map(cloneLink),

        annotations:annotations.map(annotation=>({...annotation})),

        zoom:zoom,
        viewX:viewX,
        viewY:viewY
        ,diagramName:diagramName
        ,theme:theme
        ,gridEnabled:gridEnabled
        ,snapEnabled:snapEnabled
        ,background:{...diagramBackground}

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
        showFeedback("Penyimpanan browser penuh. Kurangi ukuran/jumlah gambar atau simpan JSON.",true);

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
        nextNodes.push({id,type,text:String(n.text||type.toUpperCase()).slice(0,80),labelSize:Math.min(48,Math.max(8,Number(n.labelSize)||13)),labelColor:/^#[0-9a-f]{6}$/i.test(n.labelColor)?n.labelColor:null,labelBold:Boolean(n.labelBold),ip:String(n.ip||""),
            model:String(n.model||""),portCount:Math.min(512,Math.max(0,Number.isInteger(Number(n.portCount))?Number(n.portCount):(DEFAULT_PORTS[type]||0))),
            location:String(n.location||""),notes:String(n.notes||""),
            iconType:n.iconType==="custom"&&isSafeImageData(n.iconData)?"custom":"default",
            iconData:n.iconType==="custom"&&isSafeImageData(n.iconData)?n.iconData:"",
            pictureData:isSafeImageData(n.pictureData)?n.pictureData:"",
            status:["active","inactive","problem"].includes(n.status)?n.status:"active",
            statusNote:String(n.statusNote||"").slice(0,160),x,y});
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
    const nextAnnotations=(Array.isArray(layout.annotations)?layout.annotations:[]).flatMap(raw=>{
        if(!raw||!Number.isFinite(Number(raw.x))||!Number.isFinite(Number(raw.y)))return[];
        if(raw.type==="text"&&String(raw.text||"").trim())return[{id:uniqueId("annotation"),type:"text",text:String(raw.text).slice(0,500),fontSize:Math.min(96,Math.max(8,Number(raw.fontSize)||18)),color:/^#[0-9a-f]{6}$/i.test(raw.color)?raw.color:"#ffffff",bold:raw.bold!==false,italic:Boolean(raw.italic),align:["start","middle","end"].includes(raw.align)?raw.align:"start",x:Number(raw.x),y:Number(raw.y)}];
        if(raw.type==="image"&&isSafeImageData(raw.data))return[{id:uniqueId("annotation"),type:"image",data:raw.data,width:Math.min(1200,Math.max(40,Number(raw.width)||240)),height:Math.min(900,Math.max(40,Number(raw.height)||160)),cropZoom:Math.min(4,Math.max(1,Number(raw.cropZoom)||1)),cropX:Math.min(100,Math.max(0,Number.isFinite(Number(raw.cropX))?Number(raw.cropX):50)),cropY:Math.min(100,Math.max(0,Number.isFinite(Number(raw.cropY))?Number(raw.cropY):50)),x:Number(raw.x),y:Number(raw.y)}];
        return[];
    });
    annotations.splice(0,annotations.length,...nextAnnotations);
    zoom=Number.isFinite(Number(layout.zoom))?Math.min(4,Math.max(.3,Number(layout.zoom))):1;
    viewX=Number.isFinite(Number(layout.viewX))?Number(layout.viewX):0;
    viewY=Number.isFinite(Number(layout.viewY))?Number(layout.viewY):0;
    diagramName=String(layout.diagramName||"HOTEL NETWORK DIAGRAM").slice(0,80);
    theme=layout.theme==="light"?"light":"dark";
    gridEnabled=layout.gridEnabled!==false;
    snapEnabled=layout.snapEnabled!==false;
    diagramBackground=normalizeBackground(layout.background);
    selectedNode=null; selectedElement=null; selectedLink=null; selectedAnnotation=null; pendingAnnotation=null; contextTarget=null; firstLinkNode=null; linkMode=false;
    document.getElementById("propertyPanel").hidden=true;
    const cancelButton=document.getElementById("btnCancelLink");
    if(cancelButton) cancelButton.hidden=true;
    applyTheme();
    applyDiagramBackground();
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

    if(nodes.length===0&&annotations.length===0){

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
        const hasHealth=getPortCount(node)>1&&getConnectedDeviceStatus(node).total>0;
        const healthHeight=84+String(node.text||"").split("\n").length*Math.max(14,(Number(node.labelSize)||13)*1.15)+34;
        maxY=Math.max(maxY,node.y+(hasHealth?healthHeight:NODE_HEIGHT));

    });
    annotations.forEach(annotation=>{
        const width=annotation.type==="image"?annotation.width:Math.max(80,String(annotation.text||"").length*10),height=annotation.type==="image"?annotation.height:30;
        minX=Math.min(minX,annotation.x);minY=Math.min(minY,annotation.y-height);maxX=Math.max(maxX,annotation.x+width);maxY=Math.max(maxY,annotation.y+height);
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
    const exportTextColor=getEffectiveBackgroundType()==="light"?"#17202a":"#ffffff";

    style.textContent=`
        .node rect{fill:#2f3b52;stroke:#5ea8ff;stroke-width:2;rx:8;}
        .node circle{fill:#2f3136;stroke:#00c8ff;stroke-width:2;}.node .deviceIcon{fill:transparent;}
        .node text{fill:${exportTextColor};font-family:Segoe UI,Arial,sans-serif;font-size:13px;text-anchor:middle;dominant-baseline:middle;user-select:none;pointer-events:none;}
        .link{fill:none;}
        .linkLabel{fill:${exportTextColor};font-family:Segoe UI,Arial,sans-serif;font-size:12px;text-anchor:middle;paint-order:stroke;stroke:${getEffectiveBackgroundType()==="light"?"#eef3f7":"#202020"};stroke-width:4px;stroke-linejoin:round;}
        .node .statusBadge{stroke:#ffffff;stroke-width:2;}.statusBadge.active{fill:#27ae60;}.statusBadge.inactive{fill:#7f8c8d;}.statusBadge.problem{fill:#e53935;}
        .node .portUsageText{fill:#7ee0ff;font-size:10px;font-weight:600;paint-order:stroke;stroke:#202020;stroke-width:3px;}
        .node .connectionHealthText{font-size:10px;font-weight:600;paint-order:stroke;stroke:#202020;stroke-width:3px;}.connectionHealthText .activeCount{fill:#27ae60;}.connectionHealthText .problemCount{fill:#ff5252;}.connectionHealthText .inactiveCount{fill:#9aa4ad;}
        .annotationText{fill:#ffffff;font-family:Segoe UI,Arial,sans-serif;font-size:18px;font-weight:600;paint-order:stroke;stroke:#202020;stroke-width:4px;}
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
    appendExportBackground(exportSvg,bounds);
    const group=document.createElementNS(SVGNS,"g");
    const exportAnnotations=annotationsLayer.cloneNode(true);exportAnnotations.querySelectorAll(".selectedAnnotation").forEach(item=>item.classList.remove("selectedAnnotation"));exportAnnotations.querySelectorAll(".annotationImageFrame").forEach(frame=>frame.remove());
    const exportLinks=linksLayer.cloneNode(true);
    exportLinks.querySelectorAll('[stroke="transparent"]').forEach(hit=>hit.remove());
    exportLinks.querySelectorAll(".waypointHandle").forEach(handle=>handle.remove());
    const exportNodes=nodesLayer.cloneNode(true);
    exportNodes.querySelectorAll(".selected").forEach(node=>node.classList.remove("selected"));
    group.append(exportAnnotations,exportLinks,exportNodes); exportSvg.appendChild(group);
    return {exportSvg,bounds};
}

function appendExportBackground(exportSvg,bounds){
    const bg=diagramBackground,type=getEffectiveBackgroundType();
    if(type==="transparent") return;
    if(type==="image"&&bg.data){
        if(bg.fit==="repeat"){
            const defs=document.createElementNS(SVGNS,"defs"),pattern=document.createElementNS(SVGNS,"pattern"),image=document.createElementNS(SVGNS,"image");
            pattern.id="exportBackgroundPattern";pattern.setAttribute("width",256);pattern.setAttribute("height",256);pattern.setAttribute("patternUnits","userSpaceOnUse");
            image.setAttribute("href",bg.data);image.setAttribute("width",256);image.setAttribute("height",256);image.setAttribute("preserveAspectRatio","xMidYMid meet");pattern.appendChild(image);defs.appendChild(pattern);exportSvg.appendChild(defs);
            const rect=document.createElementNS(SVGNS,"rect");rect.setAttribute("x",bounds.x);rect.setAttribute("y",bounds.y);rect.setAttribute("width",bounds.width);rect.setAttribute("height",bounds.height);rect.setAttribute("fill","url(#exportBackgroundPattern)");exportSvg.appendChild(rect);
        }else{
            const image=document.createElementNS(SVGNS,"image");image.setAttribute("href",bg.data);image.setAttribute("x",bounds.x);image.setAttribute("y",bounds.y);image.setAttribute("width",bounds.width);image.setAttribute("height",bounds.height);image.setAttribute("preserveAspectRatio",bg.fit==="cover"?"xMidYMid slice":bg.fit==="contain"?"xMidYMid meet":"xMidYMid meet");exportSvg.appendChild(image);
        }
        return;
    }
    const rect=document.createElementNS(SVGNS,"rect");
    rect.setAttribute("x",bounds.x);rect.setAttribute("y",bounds.y);rect.setAttribute("width",bounds.width);rect.setAttribute("height",bounds.height);
    rect.setAttribute("fill",type==="light"?"#eef3f7":type==="color"?bg.color:"#202020");exportSvg.appendChild(rect);
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
    if(document.getElementById("canvasContainer")) applyDiagramBackground();
}

function exportPNG(){

    let bounds,exportSvg;
    try{({bounds,exportSvg}=buildExportSVG());}catch(error){showFeedback("Diagram tidak dapat diekspor",true);return;}
    const scale=4;

    if(bounds.width*scale>16384 || bounds.height*scale>16384){showFeedback("Diagram terlalu besar untuk PNG",true);return;}

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
    const definition=getDeviceDefinition(deviceType.value);
    lblModel.style.display="";deviceModel.style.display="";
    lblPortCount.style.display=definition.ports>0?"":"none";devicePortCount.style.display=definition.ports>0?"":"none";
    lblPortCount.textContent=definition.connectionUnit==="Channel"?"Channel Count":"Port Count";
    deviceModel.innerHTML="";
    definition.models.forEach(name=>{
        const option=document.createElement("option");option.textContent=name;option.value=name;
        option.dataset.ports=getModelConnectionCount(definition,name);deviceModel.appendChild(option);
    });
    syncModelPortOptions();
    if(typeof deviceIconMode!=="undefined"&&deviceIconMode.value==="default")setDefaultIconPreview(deviceIconPreview,{type:deviceType.value,model:deviceModel.value});

}
function syncModelPortOptions(){
    const option=deviceModel.selectedOptions[0];
    if(!option) return;
    const ports=Number(option.dataset.ports);
    devicePortCount.innerHTML="";
    const portOption=document.createElement("option");
    portOption.value=ports; portOption.textContent=ports;
    devicePortCount.appendChild(portOption);
    if(typeof deviceIconMode!=="undefined"&&deviceIconMode.value==="default")setDefaultIconPreview(deviceIconPreview,{type:deviceType.value,model:deviceModel.value});
}
function populateDeviceLibrary(){
    const search=document.getElementById("deviceSearch").value.trim().toLowerCase();
    const category=document.getElementById("deviceCategory").value;
    const previous=deviceType.value;deviceType.innerHTML="";
    const groups=new Map();
    Object.entries(DEVICE_LIBRARY).forEach(([id,item])=>{
        const haystack=`${item.label} ${item.category} ${item.models.join(" ")}`.toLowerCase();
        if((category&&category!=="all"&&item.category!==category)||(search&&!haystack.includes(search)))return;
        if(!groups.has(item.category)){const group=document.createElement("optgroup");group.label=item.category;groups.set(item.category,group);deviceType.appendChild(group);}
        const option=document.createElement("option");option.value=id;option.textContent=item.label;groups.get(item.category).appendChild(option);
    });
    if([...deviceType.options].some(option=>option.value===previous))deviceType.value=previous;
    btnCreateDevice.disabled=deviceType.options.length===0;
    if(deviceType.options.length)updateDeviceOptions();
}

function createDevice(type,options={},position=getNextDevicePosition()){
    const definition=getDeviceDefinition(type);
    const model=options.model&&definition.models.includes(options.model)?options.model:definition.models[0];
    const count=nodes.filter(node=>node.type===type).length+1;
    const capacity=definition.ports>0?(Number(options.portCount)||getModelConnectionCount(definition,model)):0;
    return{
        id:uniqueId(type),type,
        text:options.text||`${definition.label.toUpperCase()}-${String(count).padStart(3,"0")}`,
        ip:"",model,portCount:capacity,location:"",notes:"",labelSize:13,labelColor:null,labelBold:false,
        iconType:options.iconType==="custom"&&options.iconData?"custom":"default",
        iconData:options.iconType==="custom"?options.iconData||"":"",
        pictureData:"",status:"active",statusNote:"",
        x:position.x,y:position.y
    };
}

function addDevice(type,options={},position,selectAfterCreate=false){
    if(!DEVICE_TYPES.has(type)) return null;
    recordHistory();
    const node=createDevice(type,options,position||getNextDevicePosition());
    nodes.push(node);render();saveToLocalStorage();
    if(selectAfterCreate) selectNodeById(node.id);
    return node;
}

function renderDevicePalette(search=""){
    const container=document.getElementById("paletteCategories");
    const query=search.trim().toLowerCase();
    container.innerHTML="";
    const categories=new Map();
    Object.entries(DEVICE_LIBRARY).forEach(([type,definition])=>{
        if(query&&!`${definition.label} ${definition.category} ${definition.models.join(" ")}`.toLowerCase().includes(query)) return;
        if(!categories.has(definition.category)) categories.set(definition.category,[]);
        categories.get(definition.category).push([type,definition]);
    });
    [...categories.entries()].sort(([a],[b])=>a.localeCompare(b)).forEach(([category,items],categoryIndex)=>{
        const details=document.createElement("details");details.className="paletteCategory";details.open=Boolean(query)||categoryIndex===0;
        const summary=document.createElement("summary");summary.textContent=`${category} (${items.length})`;
        const list=document.createElement("div");list.className="paletteDeviceList";
        items.forEach(([type,definition])=>{
            const item=document.createElement("div");item.className="paletteDevice";item.draggable=true;item.tabIndex=0;item.dataset.deviceType=type;item.title=`Drag ${definition.label} to the diagram`;
            const icon=document.createElement("span");icon.className="paletteDeviceIcon";icon.textContent=definition.label.split(/\s+/).map(word=>word[0]).join("").slice(0,3);
            const label=document.createElement("span");label.textContent=definition.label;item.append(icon,label);
            bindPaletteDevice(item);list.appendChild(item);
        });
        details.append(summary,list);container.appendChild(details);
    });
    if(categories.size===0){const empty=document.createElement("p");empty.className="paletteEmpty";empty.textContent="No devices found";container.appendChild(empty);}
}

let draggedPaletteType=null;
let touchPaletteDrag=null;
function showPaletteDropFeedback(type,clientX,clientY){
    const canvas=document.getElementById("canvasContainer"),preview=document.getElementById("paletteDropPreview"),rect=canvas.getBoundingClientRect();
    canvas.classList.add("paletteDropTarget");preview.style.left=`${clientX-rect.left}px`;preview.style.top=`${clientY-rect.top}px`;preview.textContent=getDeviceDefinition(type).label;
}
function clearPaletteDropFeedback(){
    document.getElementById("canvasContainer").classList.remove("paletteDropTarget");
    document.querySelectorAll(".paletteDevice.dragging").forEach(item=>item.classList.remove("dragging"));
}
function addPaletteDeviceAt(type,clientX,clientY){
    const point=getViewportPoint({clientX,clientY});
    const position=getSnappedPosition(point.x-NODE_WIDTH/2,point.y-NODE_HEIGHT/2);
    const node=addDevice(type,{},position,true);
    if(node) showFeedback(`${getDeviceDefinition(type).label} added`,false);
}
function bindPaletteDevice(item){
    item.addEventListener("dragstart",event=>{
        draggedPaletteType=item.dataset.deviceType;item.classList.add("dragging");event.dataTransfer.effectAllowed="copy";event.dataTransfer.setData("text/x-device-type",draggedPaletteType);
    });
    item.addEventListener("dragend",()=>{draggedPaletteType=null;clearPaletteDropFeedback();});
    item.addEventListener("pointerdown",event=>{
        if(event.pointerType!=="touch") return;
        touchPaletteDrag={pointerId:event.pointerId,type:item.dataset.deviceType,startX:event.clientX,startY:event.clientY,active:false,item};item.setPointerCapture?.(event.pointerId);
    });
    item.addEventListener("pointermove",event=>{
        if(!touchPaletteDrag||touchPaletteDrag.pointerId!==event.pointerId) return;
        if(!touchPaletteDrag.active&&Math.hypot(event.clientX-touchPaletteDrag.startX,event.clientY-touchPaletteDrag.startY)>8){touchPaletteDrag.active=true;item.classList.add("dragging");}
        if(touchPaletteDrag.active){event.preventDefault();showPaletteDropFeedback(touchPaletteDrag.type,event.clientX,event.clientY);}
    });
    item.addEventListener("pointerup",event=>{
        if(!touchPaletteDrag||touchPaletteDrag.pointerId!==event.pointerId) return;
        const active=touchPaletteDrag.active,type=touchPaletteDrag.type;touchPaletteDrag=null;
        if(active&&document.elementFromPoint(event.clientX,event.clientY)?.closest("#canvasContainer")) addPaletteDeviceAt(type,event.clientX,event.clientY);
        clearPaletteDropFeedback();
    });
    item.addEventListener("pointercancel",()=>{touchPaletteDrag=null;clearPaletteDropFeedback();});
}

function initializeDevicePalette(){
    const palette=document.getElementById("devicePalette"),toggle=document.getElementById("btnTogglePalette"),search=document.getElementById("paletteSearch"),canvas=document.getElementById("canvasContainer");
    renderDevicePalette();
    toggle.addEventListener("click",()=>{const collapsed=palette.classList.toggle("collapsed");toggle.setAttribute("aria-expanded",String(!collapsed));toggle.setAttribute("aria-label",collapsed?"Expand device palette":"Collapse device palette");});
    search.addEventListener("input",()=>renderDevicePalette(search.value));
    canvas.addEventListener("dragover",event=>{const type=event.dataTransfer.getData("text/x-device-type")||draggedPaletteType;if(!DEVICE_TYPES.has(type))return;event.preventDefault();event.dataTransfer.dropEffect="copy";showPaletteDropFeedback(type,event.clientX,event.clientY);});
    canvas.addEventListener("dragleave",event=>{if(!canvas.contains(event.relatedTarget))clearPaletteDropFeedback();});
    canvas.addEventListener("drop",event=>{const type=event.dataTransfer.getData("text/x-device-type")||draggedPaletteType;if(!DEVICE_TYPES.has(type))return;event.preventDefault();addPaletteDeviceAt(type,event.clientX,event.clientY);draggedPaletteType=null;clearPaletteDropFeedback();});
}
document.getElementById("canvasContainer").addEventListener("click",event=>{
    if(event.target.closest?.(".node,.waypointHandle,.annotation")||event.target.dataset?.linkId) return;
    if(pendingAnnotation){
        const point=getViewportPoint(event),position=getSnappedPosition(point.x,point.y);
        recordHistory();annotations.push({...pendingAnnotation,id:uniqueId("annotation"),x:position.x,y:position.y});pendingAnnotation=null;render();saveToLocalStorage();showFeedback("Annotation added",false);return;
    }
    hideProperties();
});
loadFromLocalStorage();
render();
updateView();
updateHistoryButtons();
updateLayoutTools();
applyTheme();
applyDiagramBackground();
/* ==========================================================
   ADD DEVICE
========================================================== */

const btnOpen=document.getElementById("btnOpen");
const btnSave=document.getElementById("btnSave");
const btnUndo=document.getElementById("btnUndo");
const btnRedo=document.getElementById("btnRedo");
const fileOpen=document.getElementById("fileOpen");

const btnAddDevice=document.getElementById("btnAddDevice");
const btnAddText=document.getElementById("btnAddText");
const btnAddImage=document.getElementById("btnAddImage");
const annotationImageFile=document.getElementById("annotationImageFile");
const btnAddLink=document.getElementById("btnAddLink");
const btnExportPNG=document.getElementById("btnExportPNG");
const btnReset=document.getElementById("btnReset");
const btnFitView=document.getElementById("btnFitView");
const btnResetDefault=document.getElementById("btnResetDefault");
const btnGrid=document.getElementById("btnGrid");
const btnSnap=document.getElementById("btnSnap");
const btnCancelLink=document.getElementById("btnCancelLink");
const btnTheme=document.getElementById("btnTheme");
const btnExportSVG=document.getElementById("btnExportSVG");
const btnBackground=document.getElementById("btnBackground");

const deviceModal=document.getElementById("deviceModal");

const btnCreateDevice=document.getElementById("btnCreateDevice");
const btnCloseDevice=document.getElementById("btnCloseDevice");

const deviceType=document.getElementById("deviceType");
const deviceCategory=document.getElementById("deviceCategory");
const deviceSearch=document.getElementById("deviceSearch");
const deviceIconMode=document.getElementById("deviceIconMode");
const deviceIconFile=document.getElementById("deviceIconFile");
const deviceIconPreview=document.getElementById("deviceIconPreview");

const deviceModel=document.getElementById("deviceModel");
const devicePortCount=document.getElementById("devicePortCount");

const lblModel=document.getElementById("lblModel");
const lblPortCount=document.getElementById("lblPortCount");
deviceType.addEventListener("change", updateDeviceOptions);
deviceModel.addEventListener("change",syncModelPortOptions);
deviceCategory.innerHTML='<option value="all">All Categories</option>';
[...new Set(Object.values(DEVICE_LIBRARY).map(item=>item.category))].sort().forEach(category=>{const option=document.createElement("option");option.value=category;option.textContent=category;deviceCategory.appendChild(option);});
deviceCategory.addEventListener("change",populateDeviceLibrary);
deviceSearch.addEventListener("input",populateDeviceLibrary);
populateDeviceLibrary();
initializeDevicePalette();
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
const propIconFile=document.getElementById("propIconFile");
const propPictureFile=document.getElementById("propPictureFile");
const backgroundModal=document.getElementById("backgroundModal");
const backgroundType=document.getElementById("backgroundType");
const backgroundColor=document.getElementById("backgroundColor");
const backgroundFit=document.getElementById("backgroundFit");
const backgroundImageFile=document.getElementById("backgroundImageFile");
const propDeviceType=document.getElementById("propDeviceType");
const propModel=document.getElementById("propModel");
const propPortCount=document.getElementById("propPortCount");
const propAnnotationText=document.getElementById("propAnnotationText");
const propAnnotationFontSize=document.getElementById("propAnnotationFontSize");
const propAnnotationColor=document.getElementById("propAnnotationColor");
const propAnnotationBold=document.getElementById("propAnnotationBold");
const propAnnotationItalic=document.getElementById("propAnnotationItalic");
const propAnnotationAlign=document.getElementById("propAnnotationAlign");
const propAnnotationWidth=document.getElementById("propAnnotationWidth");
const propAnnotationHeight=document.getElementById("propAnnotationHeight");
const propAnnotationCropZoom=document.getElementById("propAnnotationCropZoom");
const propAnnotationCropX=document.getElementById("propAnnotationCropX");
const propAnnotationCropY=document.getElementById("propAnnotationCropY");
propDeviceType.addEventListener("change",function(){if(selectedNode){populatePropertyDeviceFields(selectedNode,this.value);if(selectedNode.iconType!=="custom")setDefaultIconPreview(document.getElementById("propIconPreview"),{...selectedNode,type:this.value,model:propModel.value});}});
propModel.addEventListener("change",function(){if(selectedNode){populatePropertyPorts(null,getDeviceDefinition(propDeviceType.value),this.value);if(selectedNode.iconType!=="custom")setDefaultIconPreview(document.getElementById("propIconPreview"),{...selectedNode,type:propDeviceType.value,model:this.value});}});
document.getElementById("propNameThemeColor").addEventListener("change",function(){document.getElementById("propNameColor").disabled=this.checked;});

document.getElementById("btnUpdateAnnotation").onclick=function(){
    if(!selectedAnnotation)return;
    if(selectedAnnotation.type==="text"&&!propAnnotationText.value.trim()){showFeedback("Text cannot be empty",true);return;}
    recordHistory();
    if(selectedAnnotation.type==="text"){
        const value=propAnnotationText.value.trim();
        selectedAnnotation.text=value.slice(0,500);selectedAnnotation.fontSize=Math.min(96,Math.max(8,Number(propAnnotationFontSize.value)||18));selectedAnnotation.color=propAnnotationColor.value;selectedAnnotation.bold=propAnnotationBold.checked;selectedAnnotation.italic=propAnnotationItalic.checked;selectedAnnotation.align=propAnnotationAlign.value;
    }else{
        selectedAnnotation.width=Math.min(1200,Math.max(40,Number(propAnnotationWidth.value)||240));selectedAnnotation.height=Math.min(900,Math.max(40,Number(propAnnotationHeight.value)||160));selectedAnnotation.cropZoom=Math.min(4,Math.max(1,Number(propAnnotationCropZoom.value)||1));selectedAnnotation.cropX=Math.min(100,Math.max(0,Number(propAnnotationCropX.value)));selectedAnnotation.cropY=Math.min(100,Math.max(0,Number(propAnnotationCropY.value)));
    }
    render();showAnnotationProperties(selectedAnnotation);saveToLocalStorage();
};
document.getElementById("btnResetAnnotationCrop").onclick=function(){if(!selectedAnnotation||selectedAnnotation.type!=="image")return;recordHistory();selectedAnnotation.cropZoom=1;selectedAnnotation.cropX=50;selectedAnnotation.cropY=50;render();showAnnotationProperties(selectedAnnotation);saveToLocalStorage();};
document.getElementById("btnDeleteAnnotation").onclick=function(){if(!selectedAnnotation)return;recordHistory();const index=annotations.findIndex(item=>item.id===selectedAnnotation.id);if(index>=0)annotations.splice(index,1);selectedAnnotation=null;hideProperties();render();saveToLocalStorage();};

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

            alert("File JSON tidak valid: "+e.message);

        }

        fileOpen.value="";

    };

    reader.readAsText(file);

};
btnAddDevice.onclick=function(){
    deviceCategory.value="all";deviceSearch.value="";populateDeviceLibrary();deviceType.selectedIndex=0;updateDeviceOptions();
    pendingDeviceIconData="";deviceIconMode.value="default";setDefaultIconPreview(deviceIconPreview,{type:deviceType.value,model:deviceModel.value});

    deviceModal.style.display="flex";
    deviceType.focus();

};
btnAddText.onclick=function(){
    const value=prompt("Text information");if(value===null||!value.trim())return;
    pendingAnnotation={type:"text",text:value.trim().slice(0,500),fontSize:18,color:"#ffffff",bold:true,italic:false,align:"start"};
    document.getElementById("statusBar").textContent="Click an empty canvas area to place the text";
};
btnAddImage.onclick=()=>annotationImageFile.click();
annotationImageFile.addEventListener("change",async function(){
    const file=this.files[0];this.value="";if(!file)return;
    try{const data=await processImageFile(file,1200,900,.86);pendingAnnotation={type:"image",data,width:240,height:160,cropZoom:1,cropX:50,cropY:50};document.getElementById("statusBar").textContent="Click an empty canvas area to place the image";}
    catch(error){showFeedback(error.message,true);}
});
deviceIconMode.addEventListener("change",function(){
    if(this.value==="custom") deviceIconFile.click();
    else{pendingDeviceIconData="";setDefaultIconPreview(deviceIconPreview,{type:deviceType.value,model:deviceModel.value});}
});
deviceIconFile.addEventListener("change",async function(){
    const file=this.files[0];this.value="";if(!file) return;
    try{pendingDeviceIconData=await processImageFile(file,128,128,.9);deviceIconMode.value="custom";setPreview(deviceIconPreview,pendingDeviceIconData,"Default icon");}
    catch(error){deviceIconMode.value=pendingDeviceIconData?"custom":"default";showFeedback(error.message,true);}
});
btnExportPNG.onclick=function(){

    exportPNG();

};
btnReset.onclick=function(){

    resetView();

};
btnFitView.onclick=fitView;
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
btnTheme.onclick=function(){theme=theme==="dark"?"light":"dark";applyTheme();render();saveToLocalStorage();};

const diagramNameInput=document.getElementById("diagramName");
diagramNameInput.addEventListener("change",function(){
    const value=this.value.trim();
    if(!value){this.value=diagramName;showFeedback("Nama diagram tidak boleh kosong",true);return;}
    if(value!==diagramName) recordHistory();
    diagramName=value; saveToLocalStorage();
});

document.getElementById("btnChangeIcon").onclick=()=>propIconFile.click();
propIconFile.addEventListener("change",async function(){
    const file=this.files[0],target=selectedNode;this.value="";if(!file||!target)return;
    try{const data=await processImageFile(file,128,128,.9);if(!nodes.includes(target))return;recordHistory();target.iconType="custom";target.iconData=data;if(selectedNode===target)updateNodeMediaPreviews();render();saveToLocalStorage();}
    catch(error){showFeedback(error.message,true);}
});
document.getElementById("btnResetIcon").onclick=function(){
    if(!selectedNode||selectedNode.iconType!=="custom")return;recordHistory();selectedNode.iconType="default";selectedNode.iconData="";updateNodeMediaPreviews();render();saveToLocalStorage();
};
document.getElementById("btnChangePicture").onclick=()=>propPictureFile.click();
propPictureFile.addEventListener("change",async function(){
    const file=this.files[0],target=selectedNode;this.value="";if(!file||!target)return;
    try{const data=await processImageFile(file,800,600,.8);if(!nodes.includes(target))return;recordHistory();target.pictureData=data;if(selectedNode===target)updateNodeMediaPreviews();saveToLocalStorage();}
    catch(error){showFeedback(error.message,true);}
});
document.getElementById("btnRemovePicture").onclick=function(){
    if(!selectedNode||!selectedNode.pictureData)return;recordHistory();selectedNode.pictureData="";updateNodeMediaPreviews();saveToLocalStorage();
};

btnBackground.onclick=function(){
    backgroundType.value=diagramBackground.type;backgroundColor.value=diagramBackground.color;backgroundFit.value=diagramBackground.fit;
    updateBackgroundPreview();backgroundModal.style.display="flex";backgroundType.focus();
};
document.getElementById("btnCloseBackground").onclick=function(){backgroundModal.style.display="none";btnBackground.focus();};
backgroundType.addEventListener("change",function(){
    if(this.value==="image"&&!diagramBackground.data){backgroundImageFile.click();return;}
    recordHistory();diagramBackground.type=this.value;diagramBackground.customized=this.value!=="theme";applyDiagramBackground();render();saveToLocalStorage();
});
backgroundColor.addEventListener("change",function(){recordHistory();diagramBackground={...diagramBackground,type:"color",color:this.value,customized:true};backgroundType.value="color";applyDiagramBackground();render();saveToLocalStorage();});
backgroundFit.addEventListener("change",function(){recordHistory();diagramBackground.fit=this.value;applyDiagramBackground();saveToLocalStorage();});
document.getElementById("btnChooseBackgroundImage").onclick=()=>backgroundImageFile.click();
backgroundImageFile.addEventListener("change",async function(){
    const file=this.files[0];this.value="";if(!file)return;
    try{const data=await processImageFile(file,1600,1200,.78);recordHistory();diagramBackground={...diagramBackground,type:"image",data,customized:true};backgroundType.value="image";applyDiagramBackground();render();saveToLocalStorage();}
    catch(error){backgroundType.value=diagramBackground.type;showFeedback(error.message,true);}
});
document.getElementById("btnResetBackground").onclick=function(){recordHistory();diagramBackground={type:"theme",color:"#202020",data:"",fit:"cover",customized:false};backgroundType.value="theme";backgroundColor.value="#202020";backgroundFit.value="cover";applyDiagramBackground();render();saveToLocalStorage();};

btnCloseDevice.onclick=function(){

    deviceModal.style.display="none";
    btnAddDevice.focus();

};

btnCreateDevice.onclick=function(){

    const type=deviceType.value;
    addDevice(type,{model:deviceModel.value,portCount:Number(devicePortCount.value),iconType:deviceIconMode.value,iconData:pendingDeviceIconData});

    deviceModal.style.display="none";

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
        if(pendingAnnotation){pendingAnnotation=null;document.getElementById("statusBar").textContent="Ready";}
        if(deviceModal.style.display==="flex"){deviceModal.style.display="none";btnAddDevice.focus();}
        if(backgroundModal.style.display==="flex"){backgroundModal.style.display="none";btnBackground.focus();}
        contextMenu.style.display="none";
        if(linkMode) cancelLinkMode();
        return;
    }

    if(isEditingTarget(e.target)) return;

    if(e.code==="Space"){spacePressed=true;e.preventDefault();svg.style.cursor="grab";return;}

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

    if(selectedAnnotation){recordHistory();const index=annotations.findIndex(item=>item.id===selectedAnnotation.id);if(index>=0)annotations.splice(index,1);selectedAnnotation=null;render();saveToLocalStorage();return;}

    if(deleteSelectedWaypoint()) return;

    if(selectedLink){

        deleteSelectedLink();
        return;

    }

    if(!selectedNode) return;

    deleteNodeById(selectedNode.id);

});
document.addEventListener("keyup",function(e){if(e.code==="Space"){spacePressed=false;svg.style.cursor="";}});
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
    const retainedSelectedId=selectedNode&&selectedNode.id!==id?selectedNode.id:null;
    recordHistory();
    nodes.splice(idx,1);
    for(let i=links.length-1;i>=0;i--) if(links[i].from===id||links[i].to===id) links.splice(i,1);
    if(firstLinkNode?.id===id) cancelLinkMode();
    selectedNode=null; selectedElement=null; selectedLink=null; selectedWaypointIndex=null; contextTarget=null;
    render();
    if(retainedSelectedId) selectNodeById(retainedSelectedId);
    else{
        hideProperties();
        document.getElementById("connectionStatus").hidden=true;
        document.getElementById("connectionStatusList").innerHTML="";
    }
    saveToLocalStorage();
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
