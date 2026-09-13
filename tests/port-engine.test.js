"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ports=require("../port-engine.js");

test("legacy DVR channelCount is migrated without falling back to eight",()=>{
    const device=ports.normalizeDevice({id:"dvr-1",type:"dvr",channelCount:16},8);
    assert.equal(device.portCount,16);
    assert.equal(device.ports.length,16);
    assert.equal(device.ports[15].id,"port-16");
});

test("an existing ports array has migration priority and stable IDs",()=>{
    const legacy={ports:Array.from({length:16},(_,index)=>({id:`port-${index+1}`,note:index===0?"uplink":""}))};
    const device=ports.normalizeDevice(legacy,8);
    assert.equal(device.portCount,16);
    assert.equal(device.ports[0].note,"uplink");
});

test("increasing capacity preserves ports and creates the remainder",()=>{
    const original=ports.normalizePorts([{id:"port-1",name:"WAN"}],8);
    const expanded=ports.normalizePorts(original,16);
    assert.equal(expanded.length,16);
    assert.equal(expanded[0].name,"WAN");
    assert.deepEqual(expanded.slice(8).map(port=>port.id),Array.from({length:8},(_,index)=>`port-${index+9}`));
});

test("decreasing capacity reports every affected connection before removal",()=>{
    const links=[
        {id:"c15",from:"dvr",to:"cam15",sourcePort:15,sourcePortId:"port-15"},
        {id:"c16",from:"dvr",to:"cam16",sourcePortId:"port-16"},
        {id:"c8",from:"dvr",to:"cam8",sourcePort:8}
    ];
    assert.deepEqual(ports.affectedConnections("dvr",8,links).map(link=>link.id),["c15","c16"]);
});

test("connection normalization persists stable endpoint IDs",()=>{
    const nodes=new Map([["switch",ports.normalizeDevice({portCount:24},24)],["router",ports.normalizeDevice({portCount:12},12)]]);
    const link=ports.normalizeConnectionPorts({from:"switch",to:"router",sourcePort:24,targetPort:12},nodes);
    assert.equal(link.sourcePortId,"port-24");
    assert.equal(link.targetPortId,"port-12");
});

test("image-only updates cannot alter normalized configuration",()=>{
    const before=ports.normalizeDevice({id:"dvr",type:"dvr",portCount:16,ports:ports.normalizePorts([],16),pictureData:"old"},8);
    const after=ports.normalizeDevice({...before,pictureData:"new"},8);
    assert.equal(after.portCount,16);
    assert.deepEqual(after.ports,before.ports);
});

test("properties use one custom numeric input rather than preset selects",()=>{
    const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
    assert.match(html,/id="propPortCount" type="number" min="1"/);
    assert.match(html,/id="devicePortCount" type="number" min="1"/);
});
