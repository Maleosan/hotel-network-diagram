"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const engine=require("../viewport-engine.js");

const rect={left:20,top:40,width:1000,height:700};

test("1. middle-mouse pan changes only viewport coordinates",()=>{
    const device={id:"camera-1",x:320,y:180};
    const before={...device};
    const view=engine.panViewport({panX:10,panY:20,zoom:1},{x:100,y:100},{x:260,y:190});
    assert.deepEqual(device,before);
    assert.deepEqual(view,{panX:170,panY:110,zoom:1});
});

test("2. repeated pan leaves serialized world positions unchanged",()=>{
    const diagram={nodes:[{id:"camera-1",x:12,y:34}],links:[{id:"link-1",from:"camera-1",to:"nvr-1"}]};
    const serialized=JSON.stringify(diagram);
    let view={panX:0,panY:0,zoom:1};
    for(let index=0;index<20;index++)view=engine.panViewport(view,{x:0,y:0},{x:index,y:-index});
    assert.equal(JSON.stringify(diagram),serialized);
    assert.notEqual(view.panX,0);
});

test("3. pointer-centered zoom preserves world coordinates",()=>{
    const device={x:550,y:210},before={...device};
    const view=engine.zoomViewportAt({panX:-40,panY:60,zoom:1},.25,{x:400,y:300},rect,.1,4);
    assert.deepEqual(device,before);
    assert.equal(view.zoom,.25);
});

test("4. left drag converts screen movement into world movement",()=>{
    const view={panX:100,panY:-50,zoom:.5};
    const start=engine.screenToWorld({x:300,y:250},rect,view);
    const end=engine.screenToWorld({x:350,y:275},rect,view);
    assert.deepEqual({x:end.x-start.x,y:end.y-start.y},{x:100,y:50});
});

test("5. one-finger blank-canvas gesture resolves to panning",()=>{
    assert.equal(engine.resolvePointerMode({pointerType:"touch",isWorldObject:false,touchCount:1}),engine.InteractionState.PANNING);
});

test("6. one-finger device gesture resolves to device dragging",()=>{
    assert.equal(engine.resolvePointerMode({pointerType:"touch",isWorldObject:true,touchCount:1,editable:true}),engine.InteractionState.DRAGGING_DEVICE);
});

test("7. two-finger gesture always resolves to pinch zoom",()=>{
    assert.equal(engine.resolvePointerMode({pointerType:"touch",isWorldObject:true,touchCount:2}),engine.InteractionState.PINCH_ZOOMING);
});

test("8. Fit View contains world bounds without modifying them",()=>{
    const bounds={x:-200,y:100,width:2400,height:1300},before={...bounds};
    const view=engine.fitViewport(bounds,{left:80,top:0,width:900,height:600},{minZoom:.1,maxZoom:4,paddingRatio:.12,minPadding:40,maxPadding:96});
    assert.deepEqual(bounds,before);
    const topLeft=engine.worldToScreen({x:bounds.x,y:bounds.y},rect,{...view,panX:view.panX-rect.left,panY:view.panY-rect.top});
    const bottomRight=engine.worldToScreen({x:bounds.x+bounds.width,y:bounds.y+bounds.height},rect,{...view,panX:view.panX-rect.left,panY:view.panY-rect.top});
    assert.ok(topLeft.x>=80&&topLeft.y>=0);
    assert.ok(bottomRight.x<=980&&bottomRight.y<=600);
});

test("9. screen/world conversion remains exact after pan and zoom",()=>{
    const view={panX:-835.25,panY:412.5,zoom:.175};
    const world={x:1920.5,y:-340.25};
    const screen=engine.worldToScreen(world,rect,view);
    const restored=engine.screenToWorld(screen,rect,view);
    assert.ok(Math.abs(restored.x-world.x)<1e-9);
    assert.ok(Math.abs(restored.y-world.y)<1e-9);
});

test("10. viewport persistence is separate from diagram autosave",()=>{
    const source=fs.readFileSync(path.join(__dirname,"..","app.js"),"utf8");
    const createLayout=source.slice(source.indexOf("function createLayoutData"),source.indexOf("const LOCAL_STORAGE_KEY"));
    const saveViewport=source.slice(source.indexOf("function saveViewportState"),source.indexOf("function loadViewportState"));
    assert.doesNotMatch(createLayout,/\b(?:zoom|viewX|viewY|panX|panY)\s*:/);
    assert.doesNotMatch(saveViewport,/hotel-network-diagram-change|saveToLocalStorage/);
    assert.match(saveViewport,/localStorage\.setItem/);
});
