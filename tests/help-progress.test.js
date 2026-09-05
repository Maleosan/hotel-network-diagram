"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {ProgressController,SyncCancelledError,reduceProgress}=require("../sync-progress.js");
const help=require("../help.js");

test("running progress is monotonic and cannot report 100%",()=>{
    let state=reduceProgress(null,{type:"start",title:"SYNCING"});
    state=reduceProgress(state,{type:"update",percent:60,status:"Applying"});
    state=reduceProgress(state,{type:"update",percent:35,status:"Still applying"});
    assert.equal(state.percent,60);
    state=reduceProgress(state,{type:"update",percent:100,status:"Saving"});
    assert.equal(state.percent,99);assert.equal(state.phase,"running");
});

test("100% is shown only after completed transition",()=>{
    let state=reduceProgress(null,{type:"start",title:"SYNCING"});
    state=reduceProgress(state,{type:"commit",percent:95,status:"Saving"});
    assert.equal(state.cancellable,false);assert.equal(state.percent,95);
    state=reduceProgress(state,{type:"complete"});
    assert.equal(state.percent,100);assert.equal(state.phase,"completed");
});

test("failed and cancelled operations never become completed",()=>{
    const started=reduceProgress(null,{type:"start",title:"SYNCING"});
    const failed=reduceProgress(started,{type:"fail",status:"Firebase unavailable"});
    const cancelled=reduceProgress(started,{type:"cancel"});
    assert.equal(failed.phase,"failed");assert.notEqual(failed.percent,100);
    assert.equal(cancelled.phase,"cancelled");assert.equal(cancelled.cancellable,false);
});

function fakeElement(){
    const listeners={};
    return{hidden:false,disabled:false,textContent:"",innerHTML:"",style:{},children:[],classList:{toggle(){}},setAttribute(){},addEventListener(type,handler){listeners[type]=handler;},appendChild(child){this.children.push(child);},click(){listeners.click?.();}};
}

test("Progress controller cancel throws only during safe stage",()=>{
    global.document={createElement:()=>fakeElement()};
    const elements={modal:fakeElement(),title:fakeElement(),status:fakeElement(),percent:fakeElement(),track:fakeElement(),bar:fakeElement(),detail:fakeElement(),steps:fakeElement(),summary:fakeElement(),cancel:fakeElement(),retry:fakeElement(),close:fakeElement()};
    const controller=new ProgressController(elements);
    controller.start({title:"SYNCING",stages:["Load","Save"]});elements.cancel.click();
    assert.throws(()=>controller.throwIfCancelled(),SyncCancelledError);
    controller.start({title:"SYNCING",stages:["Load","Save"]});controller.setUnsafe();elements.cancel.click();assert.doesNotThrow(()=>controller.throwIfCancelled());
    delete global.document;
});

test("Progress retry callback is available after failure",()=>{
    global.document={createElement:()=>fakeElement()};let retried=0,busy=[];
    const elements={modal:fakeElement(),title:fakeElement(),status:fakeElement(),percent:fakeElement(),track:fakeElement(),bar:fakeElement(),detail:fakeElement(),steps:fakeElement(),summary:fakeElement(),cancel:fakeElement(),retry:fakeElement(),close:fakeElement()};
    const controller=new ProgressController(elements,value=>busy.push(value));controller.start({title:"SYNCING",stages:["Load"],retry:()=>retried++});controller.fail(new Error("Firebase unavailable"),{retry:()=>retried++});elements.retry.click();
    assert.equal(retried,1);assert.deepEqual(busy,[true,false]);
    delete global.document;
});

test("Help contains only audited application categories",()=>{
    assert.deepEqual(help.categories(),["All","Getting Started","Diagram","Device","Files","Multi-User","Account"]);
    assert.ok(help.articles.length>=27);
    for(const article of help.articles){assert.ok(article.id);assert.ok(article.title);assert.ok(article.steps.length);assert.ok(article.tip);}
});

test("Help search for port returns port-specific guides",()=>{
    const matches=help.filterArticles("port");
    assert.ok(matches.some(article=>article.id==="specific-port"));
    assert.ok(matches.some(article=>article.id==="port-status"));
});

test("Help category and search filters work together",()=>{
    const matches=help.filterArticles("source","Multi-User");
    assert.ok(matches.length>=3);
    assert.ok(matches.every(article=>article.category==="Multi-User"));
});
