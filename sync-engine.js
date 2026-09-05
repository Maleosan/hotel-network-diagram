(function(root,factory){
    const api=factory();
    if(typeof module==="object"&&module.exports)module.exports=api;
    else root.HotelSyncEngine=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
    "use strict";

    const GROUPS=[
        ["device","nodes",item=>item.text||item.id],
        ["connection","links",item=>item.label||`${item.from||"?"} → ${item.to||"?"}`],
        ["annotation","annotations",item=>item.text||item.id]
    ];
    const CONFIG_FIELDS=["diagramName","theme","gridEnabled","snapEnabled","background","globalDeviceScale","defaultDeviceNameColor","globalStatusTextSize","statusSummaryTypes"];

    function clone(value){return value===undefined?null:JSON.parse(JSON.stringify(value));}
    function equal(a,b){return JSON.stringify(a===undefined?null:a)===JSON.stringify(b===undefined?null:b);}
    function comparableEntity(value){
        if(!value||typeof value!=="object")return value;
        const {pictureData,...copy}=value;
        return copy;
    }
    function collectionFor(layout,targetType){
        if(targetType==="device")return layout.nodes;
        if(targetType==="connection")return layout.links;
        if(targetType==="annotation")return layout.annotations;
        return null;
    }
    function currentValue(layout,change){
        const entry=change.changedFields?.[0]||change;
        if(change.targetType==="diagram")return layout?.[change.field];
        const values=collectionFor(layout||{},change.targetType),target=values?.find(item=>String(item.id)===String(change.targetId));
        if(change.field==="$entity")return comparableEntity(target||null);
        if(change.field==="position")return target?{x:target.x,y:target.y}:null;
        if(change.field==="image")return target?{pictureId:target.pictureId||null,pictureHash:target.pictureHash||null}:null;
        return target?.[entry.field||change.field];
    }
    function makeChange(targetType,targetId,targetLabel,operation,field,before,after,index){
        return{changeId:`plan-${targetType}-${String(targetId)}-${field}-${index}`,targetType,targetId:String(targetId),targetLabel:String(targetLabel||targetId),operation,field,changedFields:[{field,before:clone(before),after:clone(after)}],before:clone(before),after:clone(after)};
    }
    function diffLayouts(base,source){
        const changes=[];
        const push=(...args)=>changes.push(makeChange(...args,changes.length));
        for(const [targetType,key,label] of GROUPS){
            const beforeMap=new Map((Array.isArray(base?.[key])?base[key]:[]).map(item=>[String(item.id),comparableEntity(item)]));
            const afterMap=new Map((Array.isArray(source?.[key])?source[key]:[]).map(item=>[String(item.id),comparableEntity(item)]));
            for(const [id,item] of afterMap){
                const old=beforeMap.get(id);
                if(!old){push(targetType,id,label(item),"create","$entity",null,item);continue;}
                const fields=new Set([...Object.keys(old),...Object.keys(item)]);fields.delete("pictureData");
                if(targetType==="device"&&!equal({x:old.x,y:old.y},{x:item.x,y:item.y})){push(targetType,id,label(item),"update","position",{x:old.x,y:old.y},{x:item.x,y:item.y});fields.delete("x");fields.delete("y");}
                if(targetType==="device"&&!equal({pictureId:old.pictureId||null,pictureHash:old.pictureHash||null},{pictureId:item.pictureId||null,pictureHash:item.pictureHash||null})){push(targetType,id,label(item),"update","image",{pictureId:old.pictureId||null,pictureHash:old.pictureHash||null},{pictureId:item.pictureId||null,pictureHash:item.pictureHash||null});fields.delete("pictureId");fields.delete("pictureHash");}
                for(const field of fields)if(!equal(old[field],item[field]))push(targetType,id,label(item),"update",field,old[field],item[field]);
            }
            for(const [id,item] of beforeMap)if(!afterMap.has(id))push(targetType,id,label(item),"delete","$entity",item,null);
        }
        for(const field of CONFIG_FIELDS)if(!equal(base?.[field],source?.[field]))push("diagram","main","Diagram settings","update",field,base?.[field],source?.[field]);
        return changes;
    }
    function connectionCollision(layout,change){
        if(change.targetType!=="connection"||change.operation==="delete")return false;
        const after=change.after??change.changedFields?.[0]?.after,current=(layout.links||[]).find(link=>String(link.id)===String(change.targetId));
        const candidate=change.field==="$entity"?after:(current?{...current,[change.field]:after}:null);
        if(!candidate)return false;
        return (layout.links||[]).some(link=>{
            if(String(link.id)===String(change.targetId))return false;
            const samePair=[String(link.from),String(link.to)].sort().join("::")===[String(candidate.from),String(candidate.to)].sort().join("::");
            const occupied=(node,port)=>Number(port)>0&&((String(link.from)===String(node)&&Number(link.sourcePort)===Number(port))||(String(link.to)===String(node)&&Number(link.targetPort)===Number(port)));
            return samePair||occupied(candidate.from,candidate.sourcePort)||occupied(candidate.to,candidate.targetPort);
        });
    }
    function planThreeWay(base,current,source,{trustedBase=true}={}){
        const origin=trustedBase?base:{nodes:[],links:[],annotations:[]};
        const changes=diffLayouts(origin,source);
        return changes.map(change=>{
            const before=change.before,after=change.after,now=currentValue(current,change);
            let alreadyApplied=equal(now,after),conflict=false,reason="";
            if(!alreadyApplied){
                if(!trustedBase){
                    if(change.operation==="create"&&now===null)conflict=false;
                    else{conflict=true;reason="No common base";}
                }else if(change.operation==="create"){
                    conflict=now!==null;reason=conflict?"ID already exists":"";
                }else if(change.operation==="delete"){
                    conflict=now!==null&&!equal(now,before);reason=conflict?"Locally modified before source deletion":"";
                }else{
                    conflict=!equal(now,before);reason=conflict?"Both diagrams changed this field":"";
                }
                if(!conflict&&connectionCollision(current,change)){conflict=true;reason="Connection or port is already in use";}
            }
            return{...change,current:clone(now),alreadyApplied,conflict,reason};
        });
    }
    function applyChange(layout,change){
        const after=clone(change.after??change.changedFields?.[0]?.after);
        if(change.targetType==="diagram"){layout[change.field]=after;return true;}
        const values=collectionFor(layout,change.targetType);if(!values)return false;
        const index=values.findIndex(item=>String(item.id)===String(change.targetId));
        if(change.field==="$entity"){
            if(change.operation==="delete"){if(index>=0)values.splice(index,1);return true;}
            if(index>=0)values[index]=after;else values.push(after);return true;
        }
        if(index<0)return false;
        if(change.field==="position"){values[index].x=after?.x;values[index].y=after?.y;return true;}
        if(change.field==="image"){values[index].pictureId=after?.pictureId||null;values[index].pictureHash=after?.pictureHash||null;values[index].pictureData="";return true;}
        values[index][change.field]=after;return true;
    }
    function applyChanges(layout,changes){
        const result=clone(layout);
        const ordered=[...changes].sort((a,b)=>{
            const rank=change=>change.operation==="delete"?(change.targetType==="connection"?0:1):(change.targetType==="device"?2:change.targetType==="connection"?3:4);
            return rank(a)-rank(b);
        });
        ordered.forEach(change=>applyChange(result,change));
        return result;
    }
    function reconstructSource(base,changes){
        const result=clone(base);
        changes.forEach(change=>applyChange(result,{...change,before:change.changedFields?.[0]?.before,after:change.changedFields?.[0]?.after}));
        return result;
    }
    function similarity(current,source){
        const currentNodes=new Set((current?.nodes||[]).map(item=>String(item.id))),sourceNodes=new Set((source?.nodes||[]).map(item=>String(item.id)));
        const currentLinks=new Set((current?.links||[]).map(item=>String(item.id))),sourceLinks=new Set((source?.links||[]).map(item=>String(item.id)));
        const overlap=(a,b)=>{const union=new Set([...a,...b]);if(!union.size)return 1;let same=0;a.forEach(id=>{if(b.has(id))same++;});return same/union.size;};
        const nodeScore=overlap(currentNodes,sourceNodes),linkScore=overlap(currentLinks,sourceLinks);
        const structural=Math.min(currentNodes.size,sourceNodes.size)/Math.max(1,currentNodes.size,sourceNodes.size);
        const score=Math.round((nodeScore*.65+linkScore*.25+structural*.1)*100);
        return{score,level:score>=80?"safe":score>=50?"review":"replace",label:score>=80?"Safe / Smart Merge":score>=50?"Review Recommended":"Replace Recommended"};
    }
    return{applyChange,applyChanges,clone,currentValue,diffLayouts,equal,planThreeWay,reconstructSource,similarity};
});
