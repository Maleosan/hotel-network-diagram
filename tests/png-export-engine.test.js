"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const engine=require("../png-export-engine.js");

test("PNG export keeps requested quality for a normal diagram",()=>{
    const plan=engine.createPlan({width:1200,height:800},4);
    assert.deepEqual({width:plan.pixelWidth,height:plan.pixelHeight,adjusted:plan.adjusted},{width:4800,height:3200,adjusted:false});
});

test("PNG export downscales a wide diagram instead of rejecting it",()=>{
    const plan=engine.createPlan({width:12000,height:4000},4);
    assert.equal(plan.adjusted,true);
    assert.ok(plan.pixelWidth<=engine.DEFAULT_LIMITS.maxDimension);
    assert.ok(plan.pixelHeight<=engine.DEFAULT_LIMITS.maxDimension);
    assert.ok(plan.pixelWidth*plan.pixelHeight<=engine.DEFAULT_LIMITS.maxPixels);
});

test("PNG export preserves the diagram aspect ratio",()=>{
    const plan=engine.createPlan({width:18000,height:3000},4);
    assert.ok(Math.abs(plan.pixelWidth/plan.pixelHeight-6)<.01);
});

test("PNG retry plan reduces both output dimensions",()=>{
    const first=engine.createPlan({width:6000,height:3000},4);
    const retry=engine.reducePlan({width:6000,height:3000},first);
    assert.ok(retry.pixelWidth<first.pixelWidth);
    assert.ok(retry.pixelHeight<first.pixelHeight);
    assert.equal(retry.adjusted,true);
    assert.equal(retry.requestedScale,4);
});

test("property-only device pictures are not part of the rendered PNG layers",()=>{
    const source=fs.readFileSync(path.join(__dirname,"..","app.js"),"utf8");
    const exporter=source.slice(source.indexOf("function buildExportSVG"),source.indexOf("function appendExportBackground"));
    assert.doesNotMatch(exporter,/pictureData/);
    assert.match(exporter,/annotationsLayer\.cloneNode/);
    assert.match(exporter,/linksLayer\.cloneNode/);
    assert.match(exporter,/nodesLayer\.cloneNode/);
});

test("PNG sizing engine loads before the application",()=>{
    const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
    assert.ok(html.indexOf("png-export-engine.js")<html.indexOf("app.js?v="));
});
