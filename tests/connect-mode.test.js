"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ports=require("../port-engine.js");

function device(id,portCount){return ports.normalizeDevice({id,portCount},portCount);}

test("drag connection planning assigns the first free port on both devices",()=>{
    const nodesById=new Map([["switch",device("switch",24)],["camera",device("camera",2)],["existing",device("existing",1)]]);
    const links=[{from:"switch",to:"existing",sourcePortId:"port-1",targetPort:1}];
    assert.deepEqual(ports.planConnection({from:"switch",to:"camera",nodesById,links}),{ok:true,sourcePort:2,targetPort:1});
});

test("drag connection planning rejects reverse-direction duplicates",()=>{
    const nodesById=new Map([["a",device("a",8)],["b",device("b",8)]]);
    const links=[{from:"b",to:"a",sourcePort:1,targetPort:1}];
    assert.deepEqual(ports.planConnection({from:"a",to:"b",nodesById,links}),{ok:false,reason:"duplicate"});
});

test("drag connection planning reports a full custom port range",()=>{
    const nodesById=new Map([["dvr",device("dvr",2)],["camera",device("camera",1)],["one",device("one",1)],["two",device("two",1)]]);
    const links=[
        {from:"dvr",to:"one",sourcePort:1,targetPort:1},
        {from:"dvr",to:"two",sourcePortId:"port-2",targetPortId:"port-1"}
    ];
    assert.deepEqual(ports.planConnection({from:"dvr",to:"camera",nodesById,links}),{ok:false,reason:"source-full"});
});

test("devices without declared ports keep backward-compatible automatic endpoints",()=>{
    const nodesById=new Map([["cloud",device("cloud",0)],["wan",device("wan",0)]]);
    assert.deepEqual(ports.planConnection({from:"cloud",to:"wan",nodesById,links:[]}),{ok:true,sourcePort:null,targetPort:null});
});

test("connect UI keeps click fallback and adds pointer drag feedback",()=>{
    const root=path.join(__dirname,"..");
    const app=fs.readFileSync(path.join(root,"app.js"),"utf8");
    const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
    const css=fs.readFileSync(path.join(root,"style.css"),"utf8");
    assert.match(html,/id="btnAddLink"[^>]*aria-pressed="false"/);
    assert.match(html,/id="btnPaletteAddLink"[^>]*data-connect-trigger[^>]*aria-pressed="false"/);
    assert.equal((html.match(/data-connect-trigger/g)||[]).length,2);
    assert.match(app,/function startConnectGesture/);
    assert.match(app,/function moveConnectGesture/);
    assert.match(app,/function endConnectGesture/);
    assert.match(app,/if\(firstLinkNode==null\)/);
    assert.match(app,/btnPaletteAddLink\.onclick=toggleLinkMode/);
    assert.match(css,/\.connectPreview/);
    assert.match(css,/\.paletteConnectButton\.active/);
    assert.match(css,/\.node\.connectTargetValid/);
});
