import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
    browserLocalPersistence,
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    setPersistence,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
    Bytes,
    deleteField,
    deleteDoc,
    doc,
    getDoc,
    getFirestore,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

window.hotelFirebaseStarted=true;

const firebaseConfig={
    apiKey:"AIzaSyDHKC9BChi_9gUa94Jjo32CuoHcnfQqS6w",
    authDomain:"diagram-jaringan.firebaseapp.com",
    projectId:"diagram-jaringan",
    storageBucket:"diagram-jaringan.firebasestorage.app",
    messagingSenderId:"600799694188",
    appId:"1:600799694188:web:7465f7214506d981ab7749",
    measurementId:"G-ZRC8T45ZZ0"
};

const DIAGRAM_ID="main";
const AUTO_SAVE_DELAY=1500;
const MAX_CHUNK_BYTES=650000;
const MAX_CHUNK_COUNT=400;
const MAX_PHOTO_BYTES=450000;
const CHANGE_EVENT="hotel-network-diagram-change";
const bridge=window.hotelNetworkDiagramCloudBridge;

const authGate=document.getElementById("authGate");
const authMessage=document.getElementById("authMessage");
const signInButton=document.getElementById("btnGoogleSignIn");
const localModeButton=document.getElementById("btnContinueLocal");
const accountPanel=document.getElementById("cloudAccount");
const saveStatus=document.getElementById("cloudSaveStatus");
const saveCloudButton=document.getElementById("btnSaveCloud");
const logoutButton=document.getElementById("btnLogout");
const userPhoto=document.getElementById("cloudUserPhoto");
const userInitial=document.getElementById("cloudUserInitial");
const userName=document.getElementById("cloudUserName");
const userEmail=document.getElementById("cloudUserEmail");

let auth=null;
let db=null;
let provider=null;
let currentUser=null;
let diagramReady=false;
let diagramExists=false;
let knownRevision=null;
let knownChunkCount=0;
let knownPhotoIds=new Set();
let saveTimer=null;
let saveRunning=false;
let saveQueued=false;
let authGeneration=0;

function setSaveStatus(message,state=""){
    saveStatus.textContent=message;
    saveStatus.className=`cloudSaveStatus${state?` ${state}`:""}`;
}

function formatTime(date=new Date()){
    return new Intl.DateTimeFormat("id-ID",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false,timeZone:"Asia/Makassar"}).format(date);
}

function getAuthErrorMessage(error){
    if(error?.code==="auth/popup-closed-by-user"||error?.code==="auth/cancelled-popup-request")return "Login Google dibatalkan.";
    if(error?.code==="auth/popup-blocked")return "Popup login diblokir. Izinkan popup untuk situs ini lalu coba kembali.";
    if(error?.code==="auth/unauthorized-domain")return "Domain GitHub Pages belum diizinkan di Firebase Authentication.";
    if(error?.code==="auth/network-request-failed")return "Login gagal karena koneksi internet bermasalah.";
    return `Login Google gagal${error?.code?` (${error.code})`:""}. Silakan coba kembali.`;
}

function getCloudErrorMessage(error){
    if(error?.code==="permission-denied")return "Firestore menolak akses. Publish firestore.rules terlebih dahulu.";
    if(error?.code==="unavailable")return "Firestore tidak tersedia. Periksa koneksi internet.";
    if(error?.code==="resource-exhausted")return "Kuota Firestore sementara telah tercapai.";
    return error?.message||"Firestore gagal memproses data.";
}

function setUserDisplay(user){
    const name=user.displayName||"Google User";
    userName.textContent=name;
    userEmail.textContent=user.email||"";
    userInitial.textContent=name.trim().charAt(0).toUpperCase()||"U";
    if(user.photoURL){
        userPhoto.src=user.photoURL;userPhoto.alt=`Foto profil ${name}`;userPhoto.hidden=false;userInitial.hidden=true;
    }else{
        userPhoto.hidden=true;userPhoto.removeAttribute("src");userInitial.hidden=false;
    }
}

userPhoto.addEventListener("error",()=>{userPhoto.hidden=true;userInitial.hidden=false;});

function showLogin(message="Sign in dengan akun Google untuk membuka diagram Anda."){
    document.body.classList.remove("authenticated");document.getElementById("btnMenuToggle").hidden=true;closeToolbarMenu();authGate.hidden=false;accountPanel.hidden=true;signInButton.hidden=false;signInButton.disabled=false;localModeButton.hidden=true;authMessage.textContent=message;
}

function showAuthenticatedApp(user){
    setUserDisplay(user);accountPanel.hidden=false;document.body.classList.add("authenticated");document.getElementById("btnMenuToggle").hidden=false;authGate.hidden=true;
}

function showFirebaseFailure(message){
    document.body.classList.remove("authenticated");document.getElementById("btnMenuToggle").hidden=true;closeToolbarMenu();authGate.hidden=false;accountPanel.hidden=true;signInButton.hidden=true;localModeButton.hidden=false;authMessage.textContent=message;
}

function closeToolbarMenu(){
    const menu=document.getElementById("toolbarMenu"),toggle=document.getElementById("btnMenuToggle");
    menu?.classList.remove("open");toggle?.setAttribute("aria-expanded","false");toggle?.setAttribute("aria-label","Open tools menu");
}

function chunkUtf8String(value,maxBytes=MAX_CHUNK_BYTES){
    const chunks=[];
    let start=0;
    let bytes=0;
    for(let index=0;index<value.length;){
        const codePoint=value.codePointAt(index);
        const units=codePoint>0xffff?2:1;
        const nextBytes=codePoint<=0x7f?1:codePoint<=0x7ff?2:codePoint<=0xffff?3:4;
        if(bytes+nextBytes>maxBytes&&index>start){chunks.push(value.slice(start,index));start=index;bytes=0;}
        bytes+=nextBytes;index+=units;
    }
    if(start<value.length||value.length===0)chunks.push(value.slice(start));
    return chunks;
}

function hashString(value){
    let hash=2166136261;
    for(let index=0;index<value.length;index++){hash^=value.charCodeAt(index);hash=Math.imul(hash,16777619);}
    return (hash>>>0).toString(16).padStart(8,"0");
}

function getDiagramRef(uid){return doc(db,"users",uid,"diagrams",DIAGRAM_ID);}
function getChunkId(revision,index){return revision?`${revision}_${String(index).padStart(4,"0")}`:String(index).padStart(4,"0");}
function getChunkRef(uid,revision,index){return doc(db,"users",uid,"diagrams",DIAGRAM_ID,"chunks",getChunkId(revision,index));}
function getPhotoRef(uid,photoId){return doc(db,"users",uid,"diagrams",DIAGRAM_ID,"photos",photoId);}

function parseImageDataUrl(value){
    const match=typeof value==="string"?value.match(/^data:(image\/(?:png|jpeg|webp));base64,([a-z0-9+/=]+)$/i):null;
    return match?{mimeType:match[1].toLowerCase(),base64:match[2]}:null;
}

function getBase64ByteLength(value){return Math.max(0,Math.floor(value.length*3/4)-(value.endsWith("==")?2:value.endsWith("=")?1:0));}

function prepareCloudDiagram(diagramData){
    const photos=[];
    const cloudData={...diagramData,nodes:(Array.isArray(diagramData.nodes)?diagramData.nodes:[]).map(node=>{
        const {pictureData,...cloudNode}=node;
        const parsed=parseImageDataUrl(pictureData);
        if(!parsed)return cloudNode;
        const byteLength=getBase64ByteLength(parsed.base64);
        if(byteLength>MAX_PHOTO_BYTES)throw new Error("Foto device lama terlalu besar untuk Firestore. Pilih ulang foto agar dikompres otomatis.");
        const hash=hashString(parsed.base64),id=`device-${hashString(String(node.id||"device"))}-${hash}`;
        photos.push({id,hash,mimeType:parsed.mimeType,byteLength,data:Bytes.fromBase64String(parsed.base64)});
        return{...cloudNode,pictureId:id,pictureHash:hash};
    })};
    return{cloudData,photos};
}

function getCachedPictureMap(user){
    const map=new Map();
    const candidates=[bridge.getUserLocalCache(user.uid),bridge.getLegacyLocalCache(user.uid)].filter(Boolean);
    for(const cached of candidates){
        try{
            const layout=typeof cached==="string"?JSON.parse(cached):cached;
            (Array.isArray(layout?.nodes)?layout.nodes:[]).forEach(node=>{const parsed=parseImageDataUrl(node.pictureData);if(parsed&&!map.has(node.id))map.set(node.id,{data:node.pictureData,hash:hashString(parsed.base64)});});
        }catch(error){console.warn("Ignoring an invalid cached photo source",error);}
    }
    return map;
}

async function hydrateCloudDiagram(serialized,user,metadata){
    const layout=typeof serialized==="string"?JSON.parse(serialized):serialized;
    const cachedPictures=getCachedPictureMap(user),referencedIds=new Set();
    await runLimited((Array.isArray(layout?.nodes)?layout.nodes:[]).map(node=>async()=>{
        if(!node.pictureId||!node.pictureHash)return;
        referencedIds.add(node.pictureId);
        const cached=cachedPictures.get(node.id);
        if(cached?.hash===node.pictureHash){node.pictureData=cached.data;return;}
        const snapshot=await getDoc(getPhotoRef(user.uid,node.pictureId));
        if(!snapshot.exists())return;
        const photo=snapshot.data()||{},mimeType=/^image\/(png|jpeg|webp)$/i.test(photo.mimeType)?photo.mimeType:"image/webp";
        if(photo.data&&typeof photo.data.toBase64==="function")node.pictureData=`data:${mimeType};base64,${photo.data.toBase64()}`;
    }));
    knownPhotoIds=new Set(Array.isArray(metadata.photoIds)?metadata.photoIds.filter(id=>typeof id==="string"):referencedIds);
    return layout;
}

async function runLimited(tasks,limit=6){
    for(let index=0;index<tasks.length;index+=limit)await Promise.all(tasks.slice(index,index+limit).map(task=>task()));
}

async function deleteChunks(uid,revision,count){
    if(!count)return;
    const tasks=Array.from({length:count},(_,index)=>()=>deleteDoc(getChunkRef(uid,revision,index)));
    await runLimited(tasks);
}

async function saveProfile(user){
    const profileRef=doc(db,"users",user.uid);
    const existing=await getDoc(profileRef);
    const profile={displayName:user.displayName||"",email:user.email||"",photoURL:user.photoURL||"",lastLoginAt:serverTimestamp()};
    if(!existing.exists())profile.createdAt=serverTimestamp();
    await setDoc(profileRef,profile,{merge:true});
}

async function loadCloudDiagram(user){
    const snapshot=await getDoc(getDiagramRef(user.uid));
    if(!snapshot.exists())return false;
    const metadata=snapshot.data()||{};
    diagramExists=true;knownRevision=typeof metadata.revision==="string"?metadata.revision:null;knownChunkCount=Number(metadata.chunkCount)||0;
    let serialized=metadata.diagramData||null;
    if(!serialized){
        if(!Number.isInteger(knownChunkCount)||knownChunkCount<1||knownChunkCount>MAX_CHUNK_COUNT)throw new Error("Metadata chunk diagram tidak valid.");
        const snapshots=await Promise.all(Array.from({length:knownChunkCount},(_,index)=>getDoc(getChunkRef(user.uid,knownRevision,index))));
        if(snapshots.some(item=>!item.exists()))throw new Error("Sebagian data diagram cloud tidak ditemukan.");
        serialized=snapshots.map(item=>String(item.data()?.data||"")).join("");
        if(metadata.checksum&&metadata.checksum!==hashString(serialized))throw new Error("Data diagram cloud tidak lengkap atau rusak.");
    }
    bridge.loadDiagramData(await hydrateCloudDiagram(serialized,user,metadata));
    return true;
}

function loadLocalFallback(user){
    const candidates=[bridge.getUserLocalCache(user.uid),bridge.getLegacyLocalCache(user.uid)].filter(Boolean);
    for(const cached of candidates){
        try{bridge.loadDiagramData(cached);return "cache";}
        catch(error){console.warn("Ignoring an invalid local diagram cache",error);}
    }
    bridge.loadDefaultDiagram();
    return "default";
}

function scheduleCloudSave(){
    if(!currentUser||!diagramReady)return;
    clearTimeout(saveTimer);setSaveStatus("Unsaved changes","unsaved");
    saveTimer=setTimeout(()=>{void saveNow();},AUTO_SAVE_DELAY);
}

async function saveNow({manual=false}={}){
    if(!currentUser||!diagramReady){if(manual)setSaveStatus("Cloud belum siap","error");return;}
    if(navigator.onLine===false){setSaveStatus("⚠ Save failed","error");bridge.showFeedback("Tidak ada koneksi internet. Diagram tetap tersimpan di browser dan akan dicoba lagi saat online.",true);return;}
    clearTimeout(saveTimer);saveTimer=null;
    if(saveRunning){saveQueued=true;return;}
    saveRunning=true;saveCloudButton.disabled=true;setSaveStatus("Saving…","unsaved");
    const savingUser=currentUser;
    const previousRevision=knownRevision;
    const previousChunkCount=knownChunkCount,previousPhotoIds=new Set(knownPhotoIds);
    let newRevision=null;
    let newChunkCount=0;
    const writtenPhotoIds=[];
    try{
        const diagramData=bridge.getDiagramData();
        const {cloudData,photos}=prepareCloudDiagram(diagramData);
        const serialized=JSON.stringify(cloudData);
        const chunks=chunkUtf8String(serialized);
        if(chunks.length>MAX_CHUNK_COUNT)throw new Error("Diagram terlalu besar untuk penyimpanan cloud.");
        newRevision=`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
        newChunkCount=chunks.length;
        await runLimited(photos.filter(photo=>!knownPhotoIds.has(photo.id)).map(photo=>async()=>{await setDoc(getPhotoRef(savingUser.uid,photo.id),{data:photo.data,mimeType:photo.mimeType,byteLength:photo.byteLength,hash:photo.hash,updatedAt:serverTimestamp(),updatedBy:savingUser.uid});writtenPhotoIds.push(photo.id);}));
        await runLimited(chunks.map((data,index)=>()=>setDoc(getChunkRef(savingUser.uid,newRevision,index),{revision:newRevision,index,data})));
        if(currentUser?.uid!==savingUser.uid)throw new Error("Sesi pengguna berubah saat menyimpan.");
        const nextPhotoIds=photos.map(photo=>photo.id);
        const metadata={name:String(cloudData.diagramName||"HOTEL NETWORK DIAGRAM").slice(0,80),encoding:"json-utf8-chunks-v1",schemaVersion:2,revision:newRevision,chunkCount:chunks.length,photoIds:nextPhotoIds,byteLength:new TextEncoder().encode(serialized).length,checksum:hashString(serialized),updatedAt:serverTimestamp(),updatedBy:savingUser.uid};
        if(diagramExists)metadata.diagramData=deleteField();
        else metadata.createdAt=serverTimestamp();
        await setDoc(getDiagramRef(savingUser.uid),metadata,{merge:true});
        diagramExists=true;knownRevision=newRevision;knownChunkCount=chunks.length;knownPhotoIds=new Set(nextPhotoIds);
        setSaveStatus(`✓ Saved ${formatTime()}`,"saved");
        if(previousChunkCount&&previousRevision!==newRevision)deleteChunks(savingUser.uid,previousRevision,previousChunkCount).catch(error=>console.warn("Old diagram chunks could not be removed",error));
        const stalePhotoIds=[...previousPhotoIds].filter(id=>!knownPhotoIds.has(id));
        if(stalePhotoIds.length)runLimited(stalePhotoIds.map(id=>()=>deleteDoc(getPhotoRef(savingUser.uid,id)))).catch(error=>console.warn("Old device photos could not be removed",error));
    }catch(error){
        console.error("Cloud save failed",error);setSaveStatus("⚠ Save failed","error");bridge.showFeedback(getCloudErrorMessage(error),true);
        if(newRevision&&newChunkCount)deleteChunks(savingUser.uid,newRevision,newChunkCount).catch(()=>{});
        if(writtenPhotoIds.length)runLimited(writtenPhotoIds.filter(id=>!previousPhotoIds.has(id)).map(id=>()=>deleteDoc(getPhotoRef(savingUser.uid,id)))).catch(()=>{});
    }finally{
        saveRunning=false;saveCloudButton.disabled=false;
        if(saveQueued){saveQueued=false;scheduleCloudSave();}
    }
}

async function handleAuthenticatedUser(user,generation){
    currentUser=user;diagramReady=false;diagramExists=false;knownRevision=null;knownChunkCount=0;knownPhotoIds=new Set();
    bridge.setStorageUser(user.uid);setUserDisplay(user);authMessage.textContent="Memuat diagram Anda...";signInButton.disabled=true;
    let cloudLoaded=false;
    let cloudError=null;
    try{await saveProfile(user);}catch(error){console.error("Profile save failed",error);cloudError=error;}
    try{cloudLoaded=await loadCloudDiagram(user);}catch(error){console.error("Cloud load failed",error);cloudError=error;}
    if(generation!==authGeneration)return;
    if(!cloudLoaded)loadLocalFallback(user);
    diagramReady=true;showAuthenticatedApp(user);
    if(cloudError){setSaveStatus("⚠ Save failed","error");bridge.showFeedback(`${getCloudErrorMessage(cloudError)} Diagram lokal tetap dapat digunakan.`,true);}
    else if(cloudLoaded)setSaveStatus("✓ Cloud loaded","saved");
    else{setSaveStatus("Unsaved changes","unsaved");await saveNow();}
}

async function handleAuthState(user){
    const generation=++authGeneration;
    clearTimeout(saveTimer);saveTimer=null;saveQueued=false;diagramReady=false;
    if(!user){currentUser=null;knownPhotoIds=new Set();bridge.setStorageUser(null);showLogin();return;}
    await handleAuthenticatedUser(user,generation);
}

window.addEventListener(CHANGE_EVENT,scheduleCloudSave);
window.addEventListener("offline",()=>{if(currentUser&&diagramReady)setSaveStatus("⚠ Save failed","error");});
window.addEventListener("online",()=>{if(currentUser&&diagramReady)scheduleCloudSave();});
saveCloudButton.addEventListener("click",()=>{void saveNow({manual:true});});

async function initializeFirebase(){
    if(!bridge)throw new Error("Diagram cloud bridge tidak tersedia.");
    const firebaseApp=initializeApp(firebaseConfig);
    auth=getAuth(firebaseApp);db=getFirestore(firebaseApp);provider=new GoogleAuthProvider();auth.useDeviceLanguage();
    try{await setPersistence(auth,browserLocalPersistence);}catch(error){console.warn("Firebase Auth persistence unavailable",error);}
    signInButton.disabled=false;authMessage.textContent="Sign in dengan akun Google untuk membuka diagram Anda.";
    signInButton.addEventListener("click",async()=>{
        signInButton.disabled=true;authMessage.textContent="Membuka login Google...";
        try{await signInWithPopup(auth,provider);}
        catch(error){console.error("Google sign-in failed",error);authMessage.textContent=getAuthErrorMessage(error);signInButton.disabled=false;}
    });
    logoutButton.addEventListener("click",async()=>{
        logoutButton.disabled=true;
        try{if(currentUser&&diagramReady)await saveNow();authGate.hidden=false;authMessage.textContent="Logout...";await signOut(auth);}
        catch(error){console.error("Logout failed",error);bridge.showFeedback("Logout gagal. Silakan coba kembali.",true);authGate.hidden=true;}
        finally{logoutButton.disabled=false;}
    });
    onAuthStateChanged(auth,user=>{void handleAuthState(user);},error=>{console.error("Auth state failed",error);showFirebaseFailure(getAuthErrorMessage(error));});
}

initializeFirebase().catch(error=>{
    console.error("Firebase initialization failed",error);
    showFirebaseFailure(`Firebase tidak dapat dimulai. ${error.message||"Periksa koneksi dan konfigurasi."}`);
});
