(function(root,factory){
    const api=factory();
    if(typeof module==="object"&&module.exports)module.exports=api;
    root.HotelStatusEngine=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
    const GROUPS={Router:new Set(["router","core_router","edge_router"]),Switch:new Set(["switch","l2_switch","l3_switch","managed_switch","unmanaged_switch","poe_switch"]),"NVR / DVR":new Set(["nvr","dvr"]),Camera:new Set(["camera","dome_camera","ptz_camera"]),PC:new Set(["pc"])};
    function normalizeStatus(value){
        if(value==="inactive"||value==="non-active"||value==="offline")return "inactive";
        if(value==="problem"||value==="broken"||value==="fault")return "problem";
        return "active";
    }
    function summarize(nodes,selectedIds){
        const ids=selectedIds instanceof Set?selectedIds:new Set(selectedIds||[]),selected=(nodes||[]).filter(node=>ids.has(String(node.id)));
        const result={total:selected.length,active:0,inactive:0,problem:0,detail:{}};
        Object.keys(GROUPS).forEach(label=>result.detail[label]=0);
        selected.forEach(node=>{result[normalizeStatus(node.status)]++;for(const [label,types] of Object.entries(GROUPS))if(types.has(node.type)){result.detail[label]++;break;}});
        return result;
    }
    function summarizeConnected(nodes,links,rootId,options={}){
        const byId=new Map((nodes||[]).map(node=>[String(node.id),node]));
        const outgoing=new Map();
        for(const link of links||[]){
            const from=String(link?.from||"");
            if(!from)continue;
            if(!outgoing.has(from))outgoing.set(from,[]);
            outgoing.get(from).push(link);
        }
        const isStatusNode=typeof options.isStatusNode==="function"?options.isStatusNode:()=>true;
        const canTraverse=typeof options.canTraverse==="function"?options.canTraverse:()=>false;
        const visited=new Set([String(rootId)]),queue=[String(rootId)],connected=[];
        while(queue.length){
            const currentId=queue.shift();
            for(const link of outgoing.get(currentId)||[]){
                const remoteId=String(link?.to||"");
                if(!remoteId||visited.has(remoteId))continue;
                visited.add(remoteId);
                const remote=byId.get(remoteId);
                if(!remote)continue;
                if(isStatusNode(remote))connected.push(remote);
                else if(canTraverse(remote))queue.push(remoteId);
            }
        }
        const result={active:0,problem:0,inactive:0,total:connected.length,label:"Device"};
        connected.forEach(remote=>result[normalizeStatus(remote.status)]++);
        const types=new Set(connected.map(remote=>remote.type));
        if(types.size===1&&types.has("pc"))result.label="PC";
        else if(connected.length&&connected.every(remote=>["camera","dome_camera","ptz_camera"].includes(remote.type)))result.label="Camera";
        else if(connected.length&&connected.every(remote=>["pc","laptop","thin_client","terminal"].includes(remote.type)))result.label="Client";
        return result;
    }
    return Object.freeze({normalizeStatus,summarize,summarizeConnected});
});
