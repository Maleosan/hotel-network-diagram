"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const engine=require("../sync-engine.js");

const node=(id,extra={})=>({id,type:"pc",text:id,x:0,y:0,portCount:8,...extra});
const link=(id,from,to,extra={})=>({id,from,to,sourcePort:1,targetPort:1,label:id,...extra});
const layout=(nodes=[],links=[],extra={})=>({nodes,links,annotations:[],diagramName:"Test",theme:"dark",...extra});
const plan=(base,current,source,options)=>engine.planThreeWay(base,current,source,options);
const find=(items,type,id,field)=>items.find(item=>item.targetType===type&&item.targetId===id&&item.field===field);

test("A source-only field change is safe",()=>{
    const base=layout([node("n1")]),source=layout([node("n1",{text:"Source"})]),current=layout([node("n1")]);
    assert.equal(find(plan(base,current,source),"device","n1","text").conflict,false);
});

test("B current-only field change is preserved",()=>{
    const base=layout([node("n1")]),source=layout([node("n1")]),current=layout([node("n1",{notes:"Local"})]);
    assert.equal(plan(base,current,source).some(item=>item.field==="notes"),false);
});

test("C same-field divergent edits become conflict",()=>{
    const base=layout([node("n1")]),source=layout([node("n1",{text:"A"})]),current=layout([node("n1",{text:"B"})]);
    assert.equal(find(plan(base,current,source),"device","n1","text").conflict,true);
});

test("source add merges without deleting current-only device",()=>{
    const base=layout([node("n1")]),source=layout([node("n1"),node("n2")]),current=layout([node("n1"),node("local")]);
    const result=engine.applyChanges(current,plan(base,current,source).filter(item=>!item.conflict));
    assert.deepEqual(new Set(result.nodes.map(item=>item.id)),new Set(["n1","n2","local"]));
});

test("source delete removes untouched current device",()=>{
    const base=layout([node("n1")]),source=layout([]),current=layout([node("n1")]);
    const change=find(plan(base,current,source),"device","n1","$entity");
    assert.equal(change.conflict,false);assert.equal(engine.applyChanges(current,[change]).nodes.length,0);
});

test("source delete conflicts with locally modified device",()=>{
    const change=find(plan(layout([node("n1")]),layout([node("n1",{notes:"local"})]),layout([])),"device","n1","$entity");
    assert.equal(change.conflict,true);
});

test("current delete remains when source is unchanged",()=>{
    assert.equal(plan(layout([node("n1")]),layout([]),layout([node("n1")])).length,0);
});

test("source update conflicts when current deleted target",()=>{
    const change=find(plan(layout([node("n1")]),layout([]),layout([node("n1",{text:"new"})])),"device","n1","text");
    assert.equal(change.conflict,true);
});

test("different new stable IDs are both preserved",()=>{
    const base=layout([]),source=layout([node("source")]),current=layout([node("current")]);
    const result=engine.applyChanges(current,plan(base,current,source).filter(item=>!item.conflict));
    assert.deepEqual(result.nodes.map(item=>item.id).sort(),["current","source"]);
});

test("same newly-created ID with different content conflicts",()=>{
    const change=find(plan(layout([]),layout([node("same",{text:"current"})]),layout([node("same",{text:"source"})])),"device","same","$entity");
    assert.equal(change.conflict,true);
});

test("position conflict is field-level",()=>{
    const base=layout([node("n1")]),source=layout([node("n1",{x:10})]),current=layout([node("n1",{y:20})]);
    const change=find(plan(base,current,source),"device","n1","position");
    assert.equal(change.conflict,true);assert.equal(change.field,"position");
});

test("connection addition applies after devices",()=>{
    const base=layout([node("a"),node("b")]),source=layout([node("a"),node("b")],[link("l1","a","b")]),current=engine.clone(base);
    const result=engine.applyChanges(current,plan(base,current,source).filter(item=>!item.conflict));assert.equal(result.links[0].id,"l1");
});

test("connection deletion applies",()=>{
    const base=layout([node("a"),node("b")],[link("l1","a","b")]),source=layout([node("a"),node("b")]),current=engine.clone(base);
    const change=find(plan(base,current,source),"connection","l1","$entity");assert.equal(change.conflict,false);assert.equal(engine.applyChanges(current,[change]).links.length,0);
});

test("duplicate connection pair becomes conflict",()=>{
    const base=layout([node("a"),node("b")]),source=layout([node("a"),node("b")],[link("source","a","b")]),current=layout([node("a"),node("b")],[link("current","a","b")]);
    assert.equal(find(plan(base,current,source),"connection","source","$entity").conflict,true);
});

test("occupied connection port becomes conflict",()=>{
    const base=layout([node("a"),node("b"),node("c")]),source=layout(base.nodes,[link("source","a","b")]),current=layout(base.nodes,[link("current","a","c")]);
    assert.equal(find(plan(base,current,source),"connection","source","$entity").conflict,true);
});

test("image reference change is detected independently",()=>{
    const base=layout([node("n1",{pictureId:"p1",pictureHash:"h1"})]),source=layout([node("n1",{pictureId:"p2",pictureHash:"h2"})]),current=engine.clone(base);
    const change=find(plan(base,current,source),"device","n1","image");assert.equal(change.conflict,false);assert.deepEqual(change.after,{pictureId:"p2",pictureHash:"h2"});
});

test("applying source keeps stable device ID",()=>{
    const base=layout([node("stable")]),source=layout([node("stable",{text:"updated"})]),current=engine.clone(base);
    const result=engine.applyChanges(current,plan(base,current,source));assert.equal(result.nodes[0].id,"stable");
});

test("similarity at or above 80 is safe",()=>{
    const source=layout([node("1"),node("2"),node("3"),node("4"),node("5")]);
    assert.equal(engine.similarity(engine.clone(source),source).level,"safe");
});

test("similarity from 50 through 79 recommends review",()=>{
    const current=layout([node("1"),node("2"),node("3")]),source=layout([node("1"),node("2"),node("4")]);
    assert.equal(engine.similarity(current,source).level,"review");
});

test("similarity below 50 recommends replace",()=>{
    assert.equal(engine.similarity(layout([node("a")]),layout([node("b")])).level,"replace");
});

test("incremental reconstruction respects create then delete order",()=>{
    const changes=[
        {targetType:"device",targetId:"x",targetLabel:"x",operation:"create",field:"$entity",changedFields:[{after:node("x")} ]},
        {targetType:"device",targetId:"x",targetLabel:"x",operation:"delete",field:"$entity",changedFields:[{after:null}]}
    ];
    assert.equal(engine.reconstructSource(layout([]),changes).nodes.length,0);
});

test("annotation and diagram settings changes are mergeable",()=>{
    const base=layout([],[],{annotations:[],theme:"dark"}),source=layout([],[],{annotations:[{id:"a1",type:"text",text:"A",x:1,y:1}],theme:"light"}),current=engine.clone(base);
    const changes=plan(base,current,source);assert.ok(find(changes,"annotation","a1","$entity"));assert.ok(find(changes,"diagram","main","theme"));
});

test("no common base is stated as conflicts for overlapping data",()=>{
    const source=layout([node("n1",{text:"source"})]),current=layout([node("n1",{text:"current"})]);
    const change=find(plan(null,current,source,{trustedBase:false}),"device","n1","$entity");assert.equal(change.conflict,true);assert.equal(change.reason,"No common base");
});
