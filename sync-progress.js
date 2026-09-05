(function(root,factory){
    const api=factory();
    if(typeof module==="object"&&module.exports)module.exports=api;
    else root.HotelSyncProgress=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
    "use strict";

    class SyncCancelledError extends Error{
        constructor(){super("Sync dibatalkan dengan aman sebelum diagram diubah.");this.name="SyncCancelledError";}
    }

    function reduceProgress(state,action){
        const current=state||{phase:"idle",percent:0,cancellable:false};
        if(!action)return current;
        if(action.type==="start")return{phase:"running",percent:0,cancellable:true,title:action.title||"SYNCING",status:action.status||"Preparing…"};
        if(action.type==="update")return{...current,phase:"running",percent:Math.min(99,Math.max(current.percent||0,Number(action.percent)||0)),status:action.status??current.status,cancellable:action.cancellable??current.cancellable};
        if(action.type==="commit")return{...current,phase:"running",percent:Math.min(99,Math.max(current.percent||0,Number(action.percent)||0)),status:action.status||"Saving result…",cancellable:false};
        if(action.type==="complete")return{...current,phase:"completed",percent:100,status:action.status||"Completed",cancellable:false};
        if(action.type==="fail")return{...current,phase:"failed",status:action.status||"Failed",cancellable:false};
        if(action.type==="cancel")return{...current,phase:"cancelled",status:"Cancelled safely",cancellable:false};
        return current;
    }

    class ProgressController{
        constructor(elements,onBusyChange=()=>{}){
            this.elements=elements;this.onBusyChange=onBusyChange;this.state=reduceProgress();this.stages=[];this.retry=null;
            elements.cancel.addEventListener("click",()=>this.requestCancel());
            elements.close.addEventListener("click",()=>this.close());
            elements.retry.addEventListener("click",()=>{const retry=this.retry;this.close();if(retry)void retry();});
        }
        start({title="SYNCING",stages=[],retry=null}={}){
            this.state=reduceProgress(this.state,{type:"start",title,status:"Preparing secure temporary state…"});this.stages=[...stages];this.retry=retry;this.cancelRequested=false;
            this.elements.modal.style.display="flex";this.onBusyChange(true);this.render();
        }
        stage(index,{done=null,total=null,status="",detail="",cancellable=true}={}){
            const fraction=Number.isFinite(done)&&Number.isFinite(total)&&total>0?Math.min(1,done/total):0;
            const percent=this.stages.length?((index+fraction)/this.stages.length)*100:0;
            this.state=reduceProgress(this.state,{type:cancellable?"update":"commit",percent,status,cancellable});
            this.activeStage=index;this.detail=detail||(Number.isFinite(done)&&Number.isFinite(total)?`${done} / ${total}`:"");this.render();
        }
        indeterminate(index,status,detail=""){
            this.activeStage=index;this.state={...this.state,status};this.detail=detail;this.render(true);
        }
        setUnsafe(status="Saving result…"){
            this.state=reduceProgress(this.state,{type:"commit",percent:this.state.percent,status});this.render();
        }
        complete({title="✓ SYNC COMPLETED",summary=[]}={}){
            this.state=reduceProgress(this.state,{type:"complete",status:"All stages completed and saved."});this.completionTitle=title;this.summary=summary;this.activeStage=this.stages.length;this.render();
        }
        fail(error,{retry=null}={}){
            this.state=reduceProgress(this.state,{type:"fail",status:error?.message||"Unable to complete sync."});this.retry=retry;this.render();
        }
        cancelled(){this.state=reduceProgress(this.state,{type:"cancel"});this.render();}
        requestCancel(){if(this.state.phase==="running"&&this.state.cancellable){this.cancelRequested=true;this.state={...this.state,status:"Cancelling safely…",cancellable:false};this.render();}}
        throwIfCancelled(){if(this.cancelRequested)throw new SyncCancelledError();}
        close(){if(this.state.phase==="running")return;this.elements.modal.style.display="none";this.onBusyChange(false);}
        render(indeterminate=false){
            const e=this.elements,s=this.state,finished=s.phase!=="running";
            e.title.textContent=s.phase==="completed"?(this.completionTitle||"✓ SYNC COMPLETED"):s.phase==="failed"?"❌ SYNC FAILED":s.phase==="cancelled"?"SYNC CANCELLED":s.title;
            e.percent.textContent=`${Math.round(s.percent||0)}%`;e.bar.style.width=`${Math.round(s.percent||0)}%`;e.track.setAttribute("aria-valuenow",String(Math.round(s.percent||0)));e.track.classList.toggle("indeterminate",Boolean(indeterminate&&s.phase==="running"));e.status.textContent=s.status||"";e.detail.textContent=this.detail||"";
            e.steps.innerHTML="";this.stages.forEach((label,index)=>{const item=document.createElement("li");item.className=index<(this.activeStage??0)?"done":index===(this.activeStage??0)&&s.phase==="running"?"active":"";item.textContent=`${item.className==="done"?"✓":item.className==="active"?"→":"○"} ${label}`;e.steps.appendChild(item);});
            e.summary.innerHTML="";(s.phase==="completed"?this.summary||[]:s.phase==="failed"?[s.status]:s.phase==="cancelled"?[s.status]:[]).forEach(text=>{const line=document.createElement("p");line.textContent=text;e.summary.appendChild(line);});
            e.cancel.hidden=!s.cancellable;e.cancel.disabled=this.cancelRequested;e.close.hidden=!finished;e.retry.hidden=s.phase!=="failed"||!this.retry;
        }
    }

    return{ProgressController,SyncCancelledError,reduceProgress};
});
