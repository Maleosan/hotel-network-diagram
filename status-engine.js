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
    return Object.freeze({normalizeStatus,summarize});
});
