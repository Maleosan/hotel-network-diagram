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
