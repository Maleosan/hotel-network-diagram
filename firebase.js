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
    collection,
    deleteField,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    where
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
const PHOTO_VERIFICATION_TTL=7*24*60*60*1000;
const PHOTO_VERIFICATION_CACHE_PREFIX="hotelNetworkDiagram.photoVerification.";
const PUBLICATION_COLLECTION="publishedDiagrams";
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
const shareButton=document.getElementById("btnSharePublish");
const syncButton=document.getElementById("btnSyncMerge");
const shareModal=document.getElementById("sharePublishModal");
const syncModal=document.getElementById("syncMergeModal");
const shareRecipients=document.getElementById("shareRecipients");
const shareStatus=document.getElementById("sharePublishStatus");
const syncSourceSelect=document.getElementById("syncSourceSelect");
const syncVersionStatus=document.getElementById("syncVersionStatus");
const syncChangesList=document.getElementById("syncChangesList");

let auth=null;
let db=null;
let provider=null;
let currentUser=null;
let diagramReady=false;
let diagramExists=false;
let knownRevision=null;
let knownChunkCount=0;
let knownVersion=0;
let knownPhotoIds=new Set();
let verifiedPhotoIds=new Set();
let photoLoadFailures=0;
let lastSavedCloudData=null;
let loadedSyncChanges=[];
let loadedSyncState=null;
let saveTimer=null;
let saveRunning=false;
let saveQueued=false;
let lastSaveError=null;
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
    if(error?.code==="permission-denied")return "Firestore menolak akses data share. Muat ulang login dan pastikan firestore.rules terbaru sudah dipublish.";
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
function getPrivateChangeRef(uid,changeId){return doc(db,"users",uid,"diagrams",DIAGRAM_ID,"changes",changeId);}
function getSyncStateRef(uid,publicationId){return doc(db,"users",uid,"diagrams",DIAGRAM_ID,"syncStates",publicationId);}
function getPublicationId(uid){return `pub-${uid}-${DIAGRAM_ID}`;}
function getPublicationRef(publicationId){return doc(db,PUBLICATION_COLLECTION,publicationId);}
function getPublishedChangeRef(publicationId,changeId){return doc(db,PUBLICATION_COLLECTION,publicationId,"changes",changeId);}
function getPublishedPhotoRef(publicationId,photoId){return doc(db,PUBLICATION_COLLECTION,publicationId,"photos",photoId);}

function cloneValue(value){
    if(value===undefined)return null;
    return JSON.parse(JSON.stringify(value));
}

function valuesEqual(a,b){return JSON.stringify(a===undefined?null:a)===JSON.stringify(b===undefined?null:b);}

function createChangeRecord({version,previousVersion,targetType,targetId,targetLabel,operation,field,before,after,index,userId}){
    const changeId=`v${String(version).padStart(10,"0")}-${hashString(`${targetType}|${targetId}|${field}|${index}`)}`;
    return{changeId,userId,ownerId:userId,diagramId:DIAGRAM_ID,targetType,targetId:String(targetId),targetLabel:String(targetLabel||targetId).slice(0,120),operation,field,changedFields:[{field,before:cloneValue(before),after:cloneValue(after)}],previousVersion,newVersion:version,timestamp:serverTimestamp()};
}

function buildChangeRecords(previous,next,previousVersion,newVersion,userId){
    const changes=[];
    const push=(record)=>changes.push(createChangeRecord({...record,version:newVersion,previousVersion,index:changes.length,userId}));
    const groups=[
        ["device","nodes",item=>item.text||item.id],
        ["connection","links",item=>item.label||`${item.from||"?"} → ${item.to||"?"}`],
        ["annotation","annotations",item=>item.text||item.id]
    ];
    for(const [targetType,key,getLabel] of groups){
        const beforeMap=new Map((Array.isArray(previous?.[key])?previous[key]:[]).map(item=>[String(item.id),item]));
        const afterMap=new Map((Array.isArray(next?.[key])?next[key]:[]).map(item=>[String(item.id),item]));
        for(const [id,item] of afterMap){
            const old=beforeMap.get(id);
            if(!old){push({targetType,targetId:id,targetLabel:getLabel(item),operation:"create",field:"$entity",before:null,after:item});continue;}
            const fields=new Set([...Object.keys(old),...Object.keys(item)]);
            fields.delete("pictureData");
            if(targetType==="device"&&!valuesEqual({x:old.x,y:old.y},{x:item.x,y:item.y})){
                push({targetType,targetId:id,targetLabel:getLabel(item),operation:"update",field:"position",before:{x:old.x,y:old.y},after:{x:item.x,y:item.y}});fields.delete("x");fields.delete("y");
            }
            if(targetType==="device"&&!valuesEqual({pictureId:old.pictureId||null,pictureHash:old.pictureHash||null},{pictureId:item.pictureId||null,pictureHash:item.pictureHash||null})){
                push({targetType,targetId:id,targetLabel:getLabel(item),operation:"update",field:"image",before:{pictureId:old.pictureId||null,pictureHash:old.pictureHash||null},after:{pictureId:item.pictureId||null,pictureHash:item.pictureHash||null}});fields.delete("pictureId");fields.delete("pictureHash");
            }
            for(const field of fields)if(!valuesEqual(old[field],item[field]))push({targetType,targetId:id,targetLabel:getLabel(item),operation:"update",field,before:old[field],after:item[field]});
        }
        for(const [id,item] of beforeMap)if(!afterMap.has(id))push({targetType,targetId:id,targetLabel:getLabel(item),operation:"delete",field:"$entity",before:item,after:null});
    }
    const configFields=["diagramName","theme","gridEnabled","snapEnabled","background","globalDeviceScale","defaultDeviceNameColor","globalStatusTextSize","statusSummaryTypes"];
    for(const field of configFields)if(!valuesEqual(previous?.[field],next?.[field]))push({targetType:"diagram",targetId:DIAGRAM_ID,targetLabel:"Diagram settings",operation:"update",field,before:previous?.[field],after:next?.[field]});
    return changes;
}

function parseImageDataUrl(value){
    const match=typeof value==="string"?value.match(/^data:(image\/(?:png|jpeg|webp));base64,([a-z0-9+/=]+)$/i):null;
    return match?{mimeType:match[1].toLowerCase(),base64:match[2]}:null;
}

function getBase64ByteLength(value){return Math.max(0,Math.floor(value.length*3/4)-(value.endsWith("==")?2:value.endsWith("=")?1:0));}

function uint8ArrayToBase64(bytes){
    let binary="";
    for(let index=0;index<bytes.length;index+=0x8000)binary+=String.fromCharCode(...bytes.subarray(index,index+0x8000));
    return btoa(binary);
}

function getFirestoreBytesBase64(value){
    if(!value)return "";
    if(typeof value.toBase64==="function")return value.toBase64();
    if(typeof value.toUint8Array==="function")return uint8ArrayToBase64(value.toUint8Array());
    return "";
}

function getPhotoVerificationCache(uid){
    try{
        const value=JSON.parse(localStorage.getItem(`${PHOTO_VERIFICATION_CACHE_PREFIX}${uid}`)||"{}");
        return value&&typeof value==="object"?value:{};
    }catch(error){console.warn("Ignoring an invalid photo verification cache",error);return {};}
}

function rememberVerifiedPhoto(uid,photoId,hash){
    try{
        const cache=getPhotoVerificationCache(uid);
        cache[photoId]={hash,verifiedAt:Date.now()};
        const entries=Object.entries(cache).sort((a,b)=>(b[1]?.verifiedAt||0)-(a[1]?.verifiedAt||0)).slice(0,250);
        localStorage.setItem(`${PHOTO_VERIFICATION_CACHE_PREFIX}${uid}`,JSON.stringify(Object.fromEntries(entries)));
    }catch(error){console.warn("Unable to cache photo verification",error);}
}

function hasFreshPhotoVerification(uid,photoId,hash){
    const cached=getPhotoVerificationCache(uid)[photoId];
    return cached?.hash===hash&&Date.now()-Number(cached.verifiedAt)<PHOTO_VERIFICATION_TTL;
}

function readVerifiedPhotoSnapshot(snapshot,expectedHash){
    if(!snapshot.exists())return null;
    const photo=snapshot.data()||{},base64=getFirestoreBytesBase64(photo.data);
    if(!base64||hashString(base64)!==expectedHash||photo.hash!==expectedHash)return null;
    const byteLength=getBase64ByteLength(base64);
    if(byteLength>MAX_PHOTO_BYTES||Number(photo.byteLength)!==byteLength)return null;
    const mimeType=/^image\/(png|jpeg|webp)$/i.test(photo.mimeType)?photo.mimeType.toLowerCase():"image/webp";
    return{base64,mimeType,byteLength};
}

async function writeAndVerifyPhoto(uid,photo){
    const reference=getPhotoRef(uid,photo.id);
    await setDoc(reference,{data:photo.data,mimeType:photo.mimeType,byteLength:photo.byteLength,hash:photo.hash,updatedAt:serverTimestamp(),updatedBy:uid});
    const verified=readVerifiedPhotoSnapshot(await getDoc(reference),photo.hash);
    if(!verified)throw new Error("Foto device gagal diverifikasi di Firestore. Coba Save to Cloud lagi.");
    verifiedPhotoIds.add(photo.id);rememberVerifiedPhoto(uid,photo.id,photo.hash);
    return verified;
}

async function ensurePhotoDocument(uid,photo,{allowRepair=true}={}){
    if(verifiedPhotoIds.has(photo.id))return{written:false,verified:null};
    const reference=getPhotoRef(uid,photo.id),snapshot=await getDoc(reference);
    const verified=readVerifiedPhotoSnapshot(snapshot,photo.hash);
    if(verified){verifiedPhotoIds.add(photo.id);rememberVerifiedPhoto(uid,photo.id,photo.hash);return{written:false,verified};}
    if(!allowRepair||!photo.data)return{written:false,verified:null};
    return{written:true,verified:await writeAndVerifyPhoto(uid,photo)};
}

function prepareCloudDiagram(diagramData){
    const photos=[];
    const cloudData={...diagramData,nodes:(Array.isArray(diagramData.nodes)?diagramData.nodes:[]).map(node=>{
        const {pictureData,pictureId,pictureHash,...cloudNode}=node;
        const parsed=parseImageDataUrl(pictureData);
        if(!parsed)return cloudNode;
        const byteLength=getBase64ByteLength(parsed.base64);
        if(byteLength>MAX_PHOTO_BYTES)throw new Error("Foto device lama terlalu besar untuk Firestore. Pilih ulang foto agar dikompres otomatis.");
        const hash=hashString(parsed.base64),id=`device-${hashString(String(node.id||"device"))}-${hash}`;
        photos.push({id,hash,mimeType:parsed.mimeType,byteLength,data:Bytes.fromBase64String(parsed.base64),base64:parsed.base64});
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
    photoLoadFailures=0;
    await runLimited((Array.isArray(layout?.nodes)?layout.nodes:[]).map(node=>async()=>{
        if(!node.pictureId||!node.pictureHash)return;
        referencedIds.add(node.pictureId);
        const cached=cachedPictures.get(node.id);
        if(cached?.hash===node.pictureHash){
            node.pictureData=cached.data;
            if(hasFreshPhotoVerification(user.uid,node.pictureId,node.pictureHash)){verifiedPhotoIds.add(node.pictureId);return;}
            const parsed=parseImageDataUrl(cached.data);
            const repaired=await ensurePhotoDocument(user.uid,{id:node.pictureId,hash:node.pictureHash,mimeType:parsed.mimeType,byteLength:getBase64ByteLength(parsed.base64),data:Bytes.fromBase64String(parsed.base64)});
            if(!repaired.verified)photoLoadFailures++;
            return;
        }
        const result=await ensurePhotoDocument(user.uid,{id:node.pictureId,hash:node.pictureHash},{allowRepair:false});
        if(!result.verified){photoLoadFailures++;return;}
        node.pictureData=`data:${result.verified.mimeType};base64,${result.verified.base64}`;
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
    diagramExists=true;knownRevision=typeof metadata.revision==="string"?metadata.revision:null;knownChunkCount=Number(metadata.chunkCount)||0;knownVersion=Math.max(0,Number(metadata.version)||0);
    let serialized=metadata.diagramData||null;
    if(!serialized){
        if(!Number.isInteger(knownChunkCount)||knownChunkCount<1||knownChunkCount>MAX_CHUNK_COUNT)throw new Error("Metadata chunk diagram tidak valid.");
        const snapshots=await Promise.all(Array.from({length:knownChunkCount},(_,index)=>getDoc(getChunkRef(user.uid,knownRevision,index))));
        if(snapshots.some(item=>!item.exists()))throw new Error("Sebagian data diagram cloud tidak ditemukan.");
        serialized=snapshots.map(item=>String(item.data()?.data||"")).join("");
        if(metadata.checksum&&metadata.checksum!==hashString(serialized))throw new Error("Data diagram cloud tidak lengkap atau rusak.");
    }
    const cloudLayout=typeof serialized==="string"?JSON.parse(serialized):serialized;
    lastSavedCloudData=cloneValue(cloudLayout);
    bridge.loadDiagramData(await hydrateCloudDiagram(cloneValue(cloudLayout),user,metadata));
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
    if(navigator.onLine===false){lastSaveError=new Error("Tidak ada koneksi internet.");setSaveStatus("⚠ Save failed","error");bridge.showFeedback("Tidak ada koneksi internet. Diagram tetap tersimpan di browser dan akan dicoba lagi saat online.",true);return;}
    clearTimeout(saveTimer);saveTimer=null;
    if(saveRunning){saveQueued=true;return;}
    saveRunning=true;lastSaveError=null;saveCloudButton.disabled=true;setSaveStatus("Saving…","unsaved");
    const savingUser=currentUser;
    const previousRevision=knownRevision;
    const previousChunkCount=knownChunkCount,previousPhotoIds=new Set(knownPhotoIds);
    const previousVersion=knownVersion;
    let newVersion=knownVersion+1;
    let newRevision=null;
    let newChunkCount=0;
    const writtenPhotoIds=[];
    const writtenChangeIds=[];
    try{
        const diagramData=bridge.getDiagramData();
        const {cloudData,photos}=prepareCloudDiagram(diagramData);
        const changes=buildChangeRecords(knownVersion===0?null:lastSavedCloudData,cloudData,previousVersion,newVersion,savingUser.uid);
        if(!changes.length)newVersion=knownVersion;
        const serialized=JSON.stringify(cloudData);
        const chunks=chunkUtf8String(serialized);
        if(chunks.length>MAX_CHUNK_COUNT)throw new Error("Diagram terlalu besar untuk penyimpanan cloud.");
        newRevision=`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
        newChunkCount=chunks.length;
        await runLimited(photos.map(photo=>async()=>{
            const result=await ensurePhotoDocument(savingUser.uid,photo);
            if(result.written)writtenPhotoIds.push(photo.id);
        }));
        await runLimited(changes.map(change=>async()=>{await setDoc(getPrivateChangeRef(savingUser.uid,change.changeId),change);writtenChangeIds.push(change.changeId);}));
        await runLimited(chunks.map((data,index)=>()=>setDoc(getChunkRef(savingUser.uid,newRevision,index),{revision:newRevision,index,data})));
        if(currentUser?.uid!==savingUser.uid)throw new Error("Sesi pengguna berubah saat menyimpan.");
        const nextPhotoIds=photos.map(photo=>photo.id);
        const metadata={name:String(cloudData.diagramName||"HOTEL NETWORK DIAGRAM").slice(0,80),encoding:"json-utf8-chunks-v1",schemaVersion:3,version:newVersion,revision:newRevision,chunkCount:chunks.length,photoIds:nextPhotoIds,byteLength:new TextEncoder().encode(serialized).length,checksum:hashString(serialized),updatedAt:serverTimestamp(),updatedBy:savingUser.uid};
        if(diagramExists)metadata.diagramData=deleteField();
        else metadata.createdAt=serverTimestamp();
        await setDoc(getDiagramRef(savingUser.uid),metadata,{merge:true});
        diagramExists=true;knownRevision=newRevision;knownChunkCount=chunks.length;knownVersion=newVersion;knownPhotoIds=new Set(nextPhotoIds);verifiedPhotoIds=new Set(nextPhotoIds);lastSavedCloudData=cloneValue(cloudData);
        setSaveStatus(`✓ Saved ${formatTime()}`,"saved");
        if(previousChunkCount&&previousRevision!==newRevision)deleteChunks(savingUser.uid,previousRevision,previousChunkCount).catch(error=>console.warn("Old diagram chunks could not be removed",error));
        const stalePhotoIds=[...previousPhotoIds].filter(id=>!knownPhotoIds.has(id));
        if(stalePhotoIds.length)runLimited(stalePhotoIds.map(id=>()=>deleteDoc(getPhotoRef(savingUser.uid,id)))).catch(error=>console.warn("Old device photos could not be removed",error));
    }catch(error){
        lastSaveError=error;
        console.error("Cloud save failed",error);setSaveStatus("⚠ Save failed","error");bridge.showFeedback(getCloudErrorMessage(error),true);
        if(newRevision&&newChunkCount)deleteChunks(savingUser.uid,newRevision,newChunkCount).catch(()=>{});
        if(writtenPhotoIds.length)runLimited(writtenPhotoIds.filter(id=>!previousPhotoIds.has(id)).map(id=>()=>deleteDoc(getPhotoRef(savingUser.uid,id)))).catch(()=>{});
        if(writtenChangeIds.length)runLimited(writtenChangeIds.map(id=>()=>deleteDoc(getPrivateChangeRef(savingUser.uid,id)))).catch(()=>{});
    }finally{
        saveRunning=false;saveCloudButton.disabled=false;
        if(saveQueued){saveQueued=false;scheduleCloudSave();}
    }
}

function waitForSaveIdle(timeout=15000){
    const started=Date.now();
    return new Promise((resolve,reject)=>{const check=()=>{if(!saveRunning){resolve();return;}if(Date.now()-started>timeout){reject(new Error("Save sebelumnya belum selesai."));return;}setTimeout(check,100);};check();});
}

function parseShareRecipients(value){
    const emails=[],userIds=[];
    String(value||"").split(/[\n,;]+/).map(item=>item.trim()).filter(Boolean).forEach(item=>{
        if(item.includes("@")){const email=item.toLowerCase();if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&!emails.includes(email))emails.push(email);}
        else if(/^[a-z0-9_-]{8,128}$/i.test(item)&&!userIds.includes(item))userIds.push(item);
    });
    return{emails:emails.slice(0,40),userIds:userIds.slice(0,40)};
}

async function getPrivateChangesSince(uid,version){
    const snapshot=await getDocs(query(collection(db,"users",uid,"diagrams",DIAGRAM_ID,"changes"),where("newVersion",">",version),orderBy("newVersion")));
    return snapshot.docs.map(item=>item.data()).sort((a,b)=>a.newVersion-b.newVersion||String(a.changeId).localeCompare(String(b.changeId)));
}

function getPhotoIdsFromChanges(changes){
    const ids=new Set();
    changes.forEach(change=>{
        const entry=change.changedFields?.[0];
        if(change.field==="image"&&typeof entry?.after?.pictureId==="string")ids.add(entry.after.pictureId);
        if(change.field==="$entity"&&typeof entry?.after?.pictureId==="string")ids.add(entry.after.pictureId);
    });
    return ids;
}

async function publishDiagram(){
    if(!currentUser||!diagramReady)throw new Error("Login Google diperlukan untuk Share / Publish.");
    const recipients=parseShareRecipients(shareRecipients.value);
    if(!recipients.emails.length&&!recipients.userIds.length)throw new Error("Masukkan minimal satu email Google atau Firebase UID penerima.");
    await waitForSaveIdle();await saveNow({manual:true});await waitForSaveIdle();if(lastSaveError)throw lastSaveError;
    const publicationId=getPublicationId(currentUser.uid),reference=getPublicationRef(publicationId),existingSnapshot=await getDoc(reference),existing=existingSnapshot.exists()?existingSnapshot.data():null;
    const publishedVersion=Math.max(0,Number(existing?.latestVersion)||0);
    const changes=existing?(await getPrivateChangesSince(currentUser.uid,publishedVersion)).filter(change=>change.newVersion<=knownVersion):buildChangeRecords(null,lastSavedCloudData,0,knownVersion,currentUser.uid);
    const publicationBase={ownerId:currentUser.uid,ownerName:currentUser.displayName||"Google User",ownerEmail:(currentUser.email||"").toLowerCase(),diagramId:DIAGRAM_ID,name:String(lastSavedCloudData?.diagramName||"HOTEL NETWORK DIAGRAM").slice(0,80),allowedEmails:recipients.emails,allowedUserIds:recipients.userIds};
    await setDoc(reference,{...publicationBase,latestVersion:publishedVersion,updatedAt:serverTimestamp(),createdAt:existing?.createdAt||serverTimestamp()},{merge:true});
    await runLimited(changes.map(change=>()=>setDoc(getPublishedChangeRef(publicationId,change.changeId),{...change,publishedAt:serverTimestamp()})));
    await runLimited([...getPhotoIdsFromChanges(changes)].map(photoId=>async()=>{
        const source=await getDoc(getPhotoRef(currentUser.uid,photoId));
        if(!source.exists())throw new Error(`Foto ${photoId} belum tersedia di cloud. Klik Save to Cloud lalu coba publish lagi.`);
        await setDoc(getPublishedPhotoRef(publicationId,photoId),{...source.data(),ownerId:currentUser.uid,publishedAt:serverTimestamp()});
    }));
    await setDoc(reference,{...publicationBase,latestVersion:knownVersion,updatedAt:serverTimestamp()},{merge:true});
    shareStatus.textContent=`✓ Published v${knownVersion} · ${changes.length} field change(s) · ${recipients.emails.length+recipients.userIds.length} recipient(s)`;
    bridge.showFeedback(`Diagram published at version ${knownVersion}.`,false);
}

async function listAvailablePublications(){
    const found=new Map(),root=collection(db,PUBLICATION_COLLECTION),requests=[{scope:"UID",value:query(root,where("allowedUserIds","array-contains",currentUser.uid))}];
    if(currentUser.email)requests.push({scope:"email",value:query(root,where("allowedEmails","array-contains",currentUser.email.toLowerCase()))});
    const results=await Promise.allSettled(requests.map(item=>getDocs(item.value)));
    let successfulQueries=0,firstError=null;
    results.forEach((result,index)=>{
        if(result.status==="fulfilled"){
            successfulQueries++;
            result.value.docs.forEach(item=>found.set(item.id,{id:item.id,...item.data()}));
            return;
        }
        firstError||=result.reason;
        console.warn(`Shared diagram ${requests[index].scope} query failed`,result.reason);
    });
    if(!successfulQueries&&firstError)throw firstError;
    return[...found.values()].sort((a,b)=>String(a.ownerName||a.ownerEmail).localeCompare(String(b.ownerName||b.ownerEmail)));
}

async function loadSyncState(publicationId){
    const snapshot=await getDoc(getSyncStateRef(currentUser.uid,publicationId));
    return snapshot.exists()?snapshot.data():{lastSyncedVersion:0,resolvedChangeIds:[]};
}

function getTargetCollection(layout,targetType){
    if(targetType==="device")return layout.nodes;
    if(targetType==="connection")return layout.links;
    if(targetType==="annotation")return layout.annotations;
    return null;
}

function comparableEntity(value){
    if(!value||typeof value!=="object")return value;
    const {pictureData,...copy}=value;return copy;
}

function getCurrentChangeValue(layout,change){
    const entry=change.changedFields?.[0];
    if(change.targetType==="diagram")return layout[change.field];
    const collectionValue=getTargetCollection(layout,change.targetType),target=collectionValue?.find(item=>String(item.id)===String(change.targetId));
    if(change.field==="$entity")return comparableEntity(target||null);
    if(change.field==="position")return{x:target?.x,y:target?.y};
    if(change.field==="image"){
        const parsed=parseImageDataUrl(target?.pictureData);
        if(parsed){const pictureHash=hashString(parsed.base64);return{pictureId:`device-${hashString(String(target.id||"device"))}-${pictureHash}`,pictureHash};}
        return{pictureId:target?.pictureId||null,pictureHash:target?.pictureHash||null};
    }
    return target?.[change.field];
}

function hasConnectionResourceConflict(layout,change,after){
    if(change.targetType!=="connection"||change.operation==="delete")return false;
    const current=layout.links.find(link=>String(link.id)===String(change.targetId));
    let candidate=change.field==="$entity"?cloneValue(after):(current?{...current,[change.field]:cloneValue(after)}:null);
    if(!candidate)return true;
    return layout.links.some(link=>{
        if(String(link.id)===String(change.targetId))return false;
        const samePair=new Set([String(link.from),String(link.to)]).size===new Set([String(candidate.from),String(candidate.to)]).size&&[String(candidate.from),String(candidate.to)].every(id=>id===String(link.from)||id===String(link.to));
        const sourceConflict=Number(candidate.sourcePort)>0&&((String(link.from)===String(candidate.from)&&Number(link.sourcePort)===Number(candidate.sourcePort))||(String(link.to)===String(candidate.from)&&Number(link.targetPort)===Number(candidate.sourcePort)));
        const targetConflict=Number(candidate.targetPort)>0&&((String(link.from)===String(candidate.to)&&Number(link.sourcePort)===Number(candidate.targetPort))||(String(link.to)===String(candidate.to)&&Number(link.targetPort)===Number(candidate.targetPort)));
        return samePair||sourceConflict||targetConflict;
    });
}

function formatChangeValue(value){
    if(value===null||value===undefined||value==="")return "—";
    const text=typeof value==="object"?JSON.stringify(value):String(value);
    return text.length>220?`${text.slice(0,217)}…`:text;
}

function createSyncChangeRow(item){
    const row=document.createElement("article");row.className=`syncChange${item.conflict?" conflict":""}`;row.dataset.changeId=item.changeId;
    const checkbox=document.createElement("input");checkbox.type="checkbox";checkbox.className="syncApply";checkbox.checked=!item.conflict;checkbox.disabled=item.conflict;checkbox.setAttribute("aria-label",`Apply ${item.targetLabel} ${item.field}`);
    const content=document.createElement("div"),title=document.createElement("strong");title.textContent=`${item.targetLabel} · ${item.field==="$entity"?item.operation:item.field}`;
    const details=document.createElement("dl"),beforeTitle=document.createElement("dt"),beforeValue=document.createElement("dd"),afterTitle=document.createElement("dt"),afterValue=document.createElement("dd");
    beforeTitle.textContent="Current";beforeValue.textContent=formatChangeValue(item.current);afterTitle.textContent="Shared";afterValue.textContent=formatChangeValue(item.after);details.append(beforeTitle,beforeValue,afterTitle,afterValue);content.append(title,details);row.append(checkbox,content);
    if(item.conflict){
        const choice=document.createElement("label");choice.className="syncConflictChoice";choice.textContent="Conflict: ";const select=document.createElement("select");select.className="syncResolution";[["shared","Use shared version"],["mine","Keep mine"],["defer","Review later"]].forEach(([value,label])=>{const option=document.createElement("option");option.value=value;option.textContent=label;select.appendChild(option);});select.value="defer";checkbox.checked=false;choice.appendChild(select);row.appendChild(choice);
    }
    return row;
}

async function reviewSelectedPublication(){
    const publicationId=syncSourceSelect.value;if(!publicationId)return;
    const publicationSnapshot=await getDoc(getPublicationRef(publicationId));if(!publicationSnapshot.exists())throw new Error("Published diagram tidak ditemukan.");
    const publication={id:publicationId,...publicationSnapshot.data()},state=await loadSyncState(publicationId);let cursor=Math.max(0,Number(state.lastSyncedVersion)||0);const resolved=new Set(Array.isArray(state.resolvedChangeIds)?state.resolvedChangeIds:[]);
    const latestVersion=Math.max(cursor,Number(publication.latestVersion)||0);
    const snapshot=latestVersion>cursor?await getDocs(query(collection(db,PUBLICATION_COLLECTION,publicationId,"changes"),where("newVersion",">",cursor),where("newVersion","<=",latestVersion),orderBy("newVersion"))):{docs:[]};
    const layout=bridge.getDiagramData(),allChanges=snapshot.docs.map(item=>({id:item.id,...item.data()})).sort((a,b)=>a.newVersion-b.newVersion||String(a.changeId).localeCompare(String(b.changeId))),reviewed=allChanges.filter(item=>!resolved.has(item.changeId)).map(change=>{
        const entry=change.changedFields?.[0]||{},current=getCurrentChangeValue(layout,change),alreadyApplied=valuesEqual(current,entry.after),conflict=!alreadyApplied&&(!valuesEqual(current,entry.before)||hasConnectionResourceConflict(layout,change,entry.after));
        return{...change,before:entry.before,after:entry.after,current,alreadyApplied,conflict};
    });
    reviewed.filter(item=>item.alreadyApplied).forEach(item=>resolved.add(item.changeId));
    for(const version of [...new Set(allChanges.map(item=>item.newVersion))].sort((a,b)=>a-b)){if(allChanges.filter(item=>item.newVersion===version).every(item=>resolved.has(item.changeId)))cursor=version;else break;}
    const remainingResolved=[...resolved].filter(id=>{const item=allChanges.find(change=>change.changeId===id);return !item||item.newVersion>cursor;}).slice(-500);
    if(cursor!==Math.max(0,Number(state.lastSyncedVersion)||0))await setDoc(getSyncStateRef(currentUser.uid,publicationId),{lastSyncedVersion:cursor,resolvedChangeIds:remainingResolved,lastSourceVersion:publication.latestVersion||cursor,lastSyncTime:serverTimestamp()},{merge:true});
    loadedSyncChanges=reviewed.filter(item=>!item.alreadyApplied);loadedSyncState={...state,lastSyncedVersion:cursor,resolvedChangeIds:remainingResolved,publication};syncChangesList.innerHTML="";
    if(!loadedSyncChanges.length){const empty=document.createElement("p");empty.className="syncEmpty";empty.textContent="✓ Up to date";syncChangesList.appendChild(empty);}
    else loadedSyncChanges.forEach(item=>syncChangesList.appendChild(createSyncChangeRow(item)));
    syncVersionStatus.textContent=`Your cursor: v${cursor} · ${publication.ownerName||publication.ownerEmail||"Shared user"}: v${publication.latestVersion||0} · ${loadedSyncChanges.length} change(s) available`;
}

async function hydrateMergedPhotos(layout,publicationId,photoIds){
    for(const photoId of photoIds){
        const node=layout.nodes.find(item=>item.pictureId===photoId);if(!node)continue;
        const snapshot=await getDoc(getPublishedPhotoRef(publicationId,photoId));if(!snapshot.exists())throw new Error(`Published photo ${photoId} tidak ditemukan.`);
        const photo=snapshot.data()||{},verified=readVerifiedPhotoSnapshot(snapshot,node.pictureHash);
        if(!verified)throw new Error(`Published photo ${photoId} tidak valid.`);
        node.pictureData=`data:${verified.mimeType};base64,${verified.base64}`;
    }
}

function applySharedChange(layout,change,photoIds){
    const after=cloneValue(change.after);
    if(change.targetType==="diagram"){layout[change.field]=after;return true;}
    const values=getTargetCollection(layout,change.targetType);if(!values)return false;
    const index=values.findIndex(item=>String(item.id)===String(change.targetId));
    if(change.field==="$entity"){
        if(change.operation==="delete"){if(index>=0)values.splice(index,1);return true;}
        if(index>=0)values[index]=after;else values.push(after);
        if(after?.pictureId)photoIds.add(after.pictureId);return true;
    }
    if(index<0)return false;
    if(change.field==="position"){values[index].x=after?.x;values[index].y=after?.y;return true;}
    if(change.field==="image"){
        values[index].pictureId=after?.pictureId||null;values[index].pictureHash=after?.pictureHash||null;
        if(after?.pictureId)photoIds.add(after.pictureId);else values[index].pictureData="";
        return true;
    }
    values[index][change.field]=after;
    return true;
}

function validateMergedLayout(layout){
    const nodesById=new Map(layout.nodes.map(node=>[String(node.id),node])),pairs=new Set(),ports=new Set();
    for(const link of layout.links){
        const from=String(link.from),to=String(link.to);if(!nodesById.has(from)||!nodesById.has(to))throw new Error(`Connection ${link.label||link.id} membutuhkan device yang belum dipilih.`);
        const pair=[from,to].sort().join("::");if(pairs.has(pair))throw new Error(`Conflict: terdapat dua connection antara ${from} dan ${to}.`);pairs.add(pair);
        for(const [nodeId,port] of [[from,Number(link.sourcePort)],[to,Number(link.targetPort)]])if(Number.isInteger(port)&&port>0){const key=`${nodeId}:${port}`;if(ports.has(key))throw new Error(`Conflict port: ${nodeId} port/channel ${port} digunakan lebih dari sekali.`);ports.add(key);const count=Number(nodesById.get(nodeId)?.portCount)||0;if(count&&port>count)throw new Error(`Port/channel ${port} melebihi kapasitas ${nodeId}.`);}
    }
}

async function syncReviewedChanges({all=false}={}){
    if(!loadedSyncState?.publication)throw new Error("Pilih dan review published diagram terlebih dahulu.");
    const layout=cloneValue(bridge.getDiagramData()),resolved=new Set(Array.isArray(loadedSyncState.resolvedChangeIds)?loadedSyncState.resolvedChangeIds:[]),photoIds=new Set();
    let selectedCount=0;
    for(const change of loadedSyncChanges){
        const row=syncChangesList.querySelector(`[data-change-id="${CSS.escape(change.changeId)}"]`),checkbox=row?.querySelector(".syncApply"),resolution=row?.querySelector(".syncResolution")?.value;
        let action=all?"shared":change.conflict?resolution:(checkbox?.checked?"shared":"defer");
        if(action==="defer"||!action)continue;
        selectedCount++;
        if(action==="shared"&&!applySharedChange(layout,change,photoIds))throw new Error(`Target ${change.targetLabel} belum ada. Pilih juga perubahan create yang terkait.`);
        resolved.add(change.changeId);
    }
    if(!selectedCount)throw new Error("Tidak ada perubahan yang dipilih.");
    validateMergedLayout(layout);
    await hydrateMergedPhotos(layout,loadedSyncState.publication.id,photoIds);
    bridge.loadDiagramData(layout);await saveNow({manual:true});await waitForSaveIdle();if(lastSaveError)throw lastSaveError;
    let cursor=Math.max(0,Number(loadedSyncState.lastSyncedVersion)||0);
    const versions=[...new Set(loadedSyncChanges.map(item=>item.newVersion))].sort((a,b)=>a-b);
    for(const version of versions){const atVersion=loadedSyncChanges.filter(item=>item.newVersion===version);if(atVersion.every(item=>resolved.has(item.changeId)))cursor=version;else break;}
    const remaining=[...resolved].filter(id=>{const item=loadedSyncChanges.find(change=>change.changeId===id);return !item||item.newVersion>cursor;}).slice(-500);
    await setDoc(getSyncStateRef(currentUser.uid,loadedSyncState.publication.id),{sourceOwnerId:loadedSyncState.publication.ownerId,sourceName:loadedSyncState.publication.ownerName||loadedSyncState.publication.ownerEmail||"Shared user",lastSyncedFromUser:loadedSyncState.publication.ownerId,lastSyncedDiagram:loadedSyncState.publication.diagramId||DIAGRAM_ID,lastSyncedVersion:cursor,lastSourceVersion:loadedSyncState.publication.latestVersion||cursor,resolvedChangeIds:remaining,lastSyncTime:serverTimestamp()},{merge:true});
    bridge.showFeedback(`Sync selesai. Cursor sekarang v${cursor}.`,false);await reviewSelectedPublication();
}

async function openShareModal(){
    if(!currentUser){bridge.showFeedback("Login Google diperlukan untuk Share / Publish.",true);return;}
    const snapshot=await getDoc(getPublicationRef(getPublicationId(currentUser.uid)));
    if(snapshot.exists()){const data=snapshot.data();shareRecipients.value=[...(data.allowedEmails||[]),...(data.allowedUserIds||[])].join("\n");shareStatus.textContent=`Published version: v${data.latestVersion||0}`;}
    else shareStatus.textContent="Belum dipublish.";
    shareModal.style.display="flex";shareRecipients.focus();
}

async function openSyncModal(){
    if(!currentUser){bridge.showFeedback("Login Google diperlukan untuk Sync / Merge.",true);return;}
    syncModal.style.display="flex";syncSourceSelect.innerHTML="";syncVersionStatus.textContent="Loading shared diagrams…";syncChangesList.innerHTML='<p class="syncEmpty">Loading…</p>';
    const publications=(await listAvailablePublications()).filter(item=>item.ownerId!==currentUser.uid);
    if(!publications.length){const option=document.createElement("option");option.value="";option.textContent="No shared diagrams available";syncSourceSelect.appendChild(option);syncVersionStatus.textContent="Belum ada diagram yang dibagikan kepada akun ini.";syncChangesList.innerHTML='<p class="syncEmpty">No changes available.</p>';return;}
    publications.forEach(item=>{const option=document.createElement("option");option.value=item.id;option.textContent=`${item.ownerName||item.ownerEmail||item.ownerId} · ${item.name||"Diagram"} · v${item.latestVersion||0}`;syncSourceSelect.appendChild(option);});
    await reviewSelectedPublication();
}

async function handleAuthenticatedUser(user,generation){
    currentUser=user;diagramReady=false;diagramExists=false;knownRevision=null;knownChunkCount=0;knownVersion=0;knownPhotoIds=new Set();verifiedPhotoIds=new Set();photoLoadFailures=0;lastSavedCloudData=null;
    bridge.setStorageUser(user.uid);setUserDisplay(user);authMessage.textContent="Memuat diagram Anda...";signInButton.disabled=true;
    let cloudLoaded=false;
    let cloudError=null;
    try{await saveProfile(user);}catch(error){console.error("Profile save failed",error);cloudError=error;}
    try{cloudLoaded=await loadCloudDiagram(user);}catch(error){console.error("Cloud load failed",error);cloudError=error;}
    if(generation!==authGeneration)return;
    if(!cloudLoaded)loadLocalFallback(user);
    diagramReady=true;showAuthenticatedApp(user);
    if(cloudError){setSaveStatus("⚠ Save failed","error");bridge.showFeedback(`${getCloudErrorMessage(cloudError)} Diagram lokal tetap dapat digunakan.`,true);}
    else if(cloudLoaded&&photoLoadFailures){setSaveStatus(`⚠ ${photoLoadFailures} foto belum sinkron`,"error");bridge.showFeedback(`${photoLoadFailures} foto cloud tidak ditemukan. Buka aplikasi pada perangkat asal lalu klik Save to Cloud untuk memperbaikinya.`,true);}
    else if(cloudLoaded)setSaveStatus("✓ Cloud loaded","saved");
    else{setSaveStatus("Unsaved changes","unsaved");await saveNow();}
}

async function handleAuthState(user){
    const generation=++authGeneration;
    clearTimeout(saveTimer);saveTimer=null;saveQueued=false;diagramReady=false;
    if(!user){currentUser=null;knownVersion=0;knownPhotoIds=new Set();verifiedPhotoIds=new Set();photoLoadFailures=0;lastSavedCloudData=null;bridge.setStorageUser(null);showLogin();return;}
    await handleAuthenticatedUser(user,generation);
}

window.addEventListener(CHANGE_EVENT,scheduleCloudSave);
window.addEventListener("offline",()=>{if(currentUser&&diagramReady)setSaveStatus("⚠ Save failed","error");});
window.addEventListener("online",()=>{if(currentUser&&diagramReady)scheduleCloudSave();});
saveCloudButton.addEventListener("click",()=>{void saveNow({manual:true});});
shareButton.addEventListener("click",()=>{void openShareModal().catch(error=>bridge.showFeedback(getCloudErrorMessage(error),true));});
syncButton.addEventListener("click",()=>{void openSyncModal().catch(error=>bridge.showFeedback(getCloudErrorMessage(error),true));});
document.getElementById("btnCloseSharePublish").addEventListener("click",()=>{shareModal.style.display="none";shareButton.focus();});
document.getElementById("btnCloseSyncMerge").addEventListener("click",()=>{syncModal.style.display="none";syncButton.focus();});
document.getElementById("btnConfirmSharePublish").addEventListener("click",async event=>{const button=event.currentTarget;button.disabled=true;shareStatus.textContent="Publishing changes…";try{await publishDiagram();}catch(error){shareStatus.textContent=`⚠ ${getCloudErrorMessage(error)}`;bridge.showFeedback(getCloudErrorMessage(error),true);}finally{button.disabled=false;}});
syncSourceSelect.addEventListener("change",()=>{void reviewSelectedPublication().catch(error=>bridge.showFeedback(getCloudErrorMessage(error),true));});
document.getElementById("btnRefreshSync").addEventListener("click",()=>{void reviewSelectedPublication().catch(error=>bridge.showFeedback(getCloudErrorMessage(error),true));});
document.getElementById("syncSelectAll").addEventListener("change",event=>{syncChangesList.querySelectorAll(".syncApply").forEach(input=>{if(!input.closest(".conflict"))input.checked=event.currentTarget.checked;});});
document.getElementById("btnSyncSelected").addEventListener("click",async event=>{const button=event.currentTarget;button.disabled=true;try{await syncReviewedChanges();}catch(error){bridge.showFeedback(getCloudErrorMessage(error),true);}finally{button.disabled=false;}});
document.getElementById("btnSyncAll").addEventListener("click",async event=>{if(!confirm("Sync all shared changes? Conflict fields will use the shared version."))return;const button=event.currentTarget;button.disabled=true;try{await syncReviewedChanges({all:true});}catch(error){bridge.showFeedback(getCloudErrorMessage(error),true);}finally{button.disabled=false;}});
document.addEventListener("keydown",event=>{if(event.key!=="Escape")return;if(shareModal.style.display==="flex"){shareModal.style.display="none";shareButton.focus();}if(syncModal.style.display==="flex"){syncModal.style.display="none";syncButton.focus();}});

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
