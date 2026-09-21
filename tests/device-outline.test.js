"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const syncEngine=require("../sync-engine.js");

const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");

test("device outline setting is available and defaults to visible",()=>{
    const html=read("index.html"),source=read("app.js");
    assert.match(html,/id="deviceOutlineEnabled"[^>]*checked/);
    assert.match(source,/let deviceOutlineEnabled=true/);
    assert.match(source,/layout\.deviceOutlineEnabled!==false/);
});

test("device outline setting persists through diagram data and sync",()=>{
    const source=read("app.js"),sync=read("sync-engine.js"),firebase=read("firebase.js"),html=read("index.html");
    const createLayout=source.slice(source.indexOf("function createLayoutData"),source.indexOf("const LOCAL_STORAGE_KEY"));
    assert.match(createLayout,/deviceOutlineEnabled:Boolean\(deviceOutlineEnabled\)/);
    assert.match(sync,/"deviceOutlineEnabled"/);
    assert.match(firebase,/"deviceOutlineEnabled"/);
    assert.match(html,/sync-engine\.js\?v=20260921-1/);
    assert.match(html,/firebase\.js\?v=20260921-1/);
});

test("hidden outline affects normal display and PNG but preserves interaction feedback",()=>{
    const source=read("app.js"),css=read("style.css");
    assert.match(source,/g\.classList\.add\("deviceOutlineHidden"\)/);
    assert.match(source,/\.node\.deviceOutlineHidden \.deviceIcon\{stroke:transparent;\}/);
    assert.match(css,/\.node\.deviceOutlineHidden:not\(\.selected\) \.deviceIcon\{stroke:transparent;\}/);
    assert.match(css,/\.node\.connectTargetValid \.deviceIcon\{[^}]*stroke:#1ce084!important/);
});

test("device outline preference can be merged from a published diagram",()=>{
    const base={nodes:[],links:[],annotations:[],deviceOutlineEnabled:true};
    const current=syncEngine.clone(base);
    const source={...syncEngine.clone(base),deviceOutlineEnabled:false};
    const changes=syncEngine.planThreeWay(base,current,source);
    const change=changes.find(item=>item.targetType==="diagram"&&item.field==="deviceOutlineEnabled");
    assert.equal(change.conflict,false);
    assert.equal(syncEngine.applyChanges(current,[change]).deviceOutlineEnabled,false);
});
