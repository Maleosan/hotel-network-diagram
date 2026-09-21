const test=require("node:test");
const assert=require("node:assert/strict");
const StatusEngine=require("../status-engine.js");

test("summary counts only selected unique device ids and maps existing statuses",()=>{
    const nodes=[
        {id:"r1",type:"router",status:"active"},
        {id:"s1",type:"poe_switch",status:"inactive"},
        {id:"c1",type:"dome_camera",status:"problem"},
        {id:"pc1",type:"pc",status:"unexpected"},
        {id:"n1",type:"nvr",status:"active"}
    ];
    const result=StatusEngine.summarize(nodes,new Set(["r1","s1","c1","pc1"]));
    assert.deepEqual(result,{total:4,active:2,inactive:1,problem:1,detail:{Router:1,Switch:1,"NVR / DVR":0,Camera:1,PC:1}});
    assert.equal(result.active+result.inactive+result.problem,result.total);
});

test("all-device selection produces complete type breakdown",()=>{
    const nodes=[{id:1,type:"core_router",status:"offline"},{id:2,type:"dvr",status:"broken"},{id:3,type:"ptz_camera",status:"active"}];
    const result=StatusEngine.summarize(nodes,new Set(["1","2","3"]));
    assert.equal(result.total,3);assert.equal(result.inactive,1);assert.equal(result.problem,1);assert.equal(result.active,1);
    assert.equal(result.detail.Router,1);assert.equal(result.detail["NVR / DVR"],1);assert.equal(result.detail.Camera,1);
});

test("connected status follows only the queried device downstream branch",()=>{
    const nodes=[
        {id:"switch",type:"switch",portCount:24},
        {id:"modem-a",type:"modem",portCount:2},
        {id:"modem-b",type:"modem",portCount:2},
        {id:"pc-a",type:"pc",status:"active"},
        {id:"pc-b",type:"pc",status:"problem"}
    ];
    const links=[
        {from:"switch",to:"modem-a"},
        {from:"switch",to:"modem-b"},
        {from:"modem-a",to:"pc-a"},
        {from:"modem-b",to:"pc-b"}
    ];
    const statusTypes=new Set(["pc"]),options={isStatusNode:node=>statusTypes.has(node.type),canTraverse:node=>node.portCount>1};
    assert.deepEqual(StatusEngine.summarizeConnected(nodes,links,"modem-a",options),{active:1,problem:0,inactive:0,total:1,label:"PC"});
    assert.deepEqual(StatusEngine.summarizeConnected(nodes,links,"modem-b",options),{active:0,problem:1,inactive:0,total:1,label:"PC"});
    assert.deepEqual(StatusEngine.summarizeConnected(nodes,links,"switch",options),{active:1,problem:1,inactive:0,total:2,label:"PC"});
});

test("connected status never walks back upstream into sibling branches",()=>{
    const nodes=[{id:"root",type:"switch",portCount:24},{id:"leaf",type:"modem",portCount:2},{id:"pc",type:"pc",status:"active"}];
    const links=[{from:"root",to:"leaf"},{from:"root",to:"pc"}];
    const result=StatusEngine.summarizeConnected(nodes,links,"leaf",{isStatusNode:node=>node.type==="pc",canTraverse:node=>node.portCount>1});
    assert.deepEqual(result,{active:0,problem:0,inactive:0,total:0,label:"Device"});
});

test("connected status traversal is cycle-safe",()=>{
    const nodes=[{id:"a",type:"switch",portCount:24},{id:"b",type:"switch",portCount:24},{id:"camera",type:"camera",status:"inactive"}];
    const links=[{from:"a",to:"b"},{from:"b",to:"a"},{from:"b",to:"camera"}];
    const result=StatusEngine.summarizeConnected(nodes,links,"a",{isStatusNode:node=>node.type==="camera",canTraverse:node=>node.portCount>1});
    assert.deepEqual(result,{active:0,problem:0,inactive:1,total:1,label:"Camera"});
});
