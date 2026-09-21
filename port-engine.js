(function(root,factory){
    const api=factory();
    if(typeof module==="object"&&module.exports)module.exports=api;
    else root.HotelPortEngine=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
    "use strict";

    const MAX_PORTS=512;
    function validCount(value,minimum=0){
        const count=Number(value);
        return Number.isInteger(count)&&count>=minimum&&count<=MAX_PORTS?count:null;
    }
    function portId(number){return `port-${number}`;}
    function portNumber(id){
        const match=String(id||"").match(/^port-(\d+)$/);
        return match?Number(match[1]):null;
    }
    function inferPortCount(device,defaultCount=0){
        const explicit=validCount(device?.portCount);
        if(explicit!==null)return explicit;
        if(Array.isArray(device?.ports))return Math.min(MAX_PORTS,device.ports.length);
        const channel=validCount(device?.channelCount);
        if(channel!==null)return channel;
        return validCount(defaultCount)??0;
    }
    function normalizePorts(ports,count){
        const existing=new Map();
        (Array.isArray(ports)?ports:[]).forEach((port,index)=>{
            const number=portNumber(port?.id)||index+1;
            if(number>=1&&number<=count&&!existing.has(number))existing.set(number,{...port,id:portId(number),number});
        });
        return Array.from({length:count},(_,index)=>existing.get(index+1)||{id:portId(index+1),number:index+1});
    }
    function normalizeDevice(device,defaultCount=0){
        const count=inferPortCount(device,defaultCount);
        return{...device,portCount:count,ports:normalizePorts(device?.ports,count)};
    }
    function endpointNumber(link,nodeId){
        if(link.from===nodeId)return portNumber(link.sourcePortId)||validCount(link.sourcePort,1);
        if(link.to===nodeId)return portNumber(link.targetPortId)||validCount(link.targetPort,1);
        return null;
    }
    function affectedConnections(nodeId,nextCount,links){
        return (links||[]).filter(link=>{const number=endpointNumber(link,nodeId);return number!==null&&number>nextCount;});
    }
    function normalizeConnectionPorts(link,nodesById){
        const result={...link};
        [["from","sourcePort","sourcePortId"],["to","targetPort","targetPortId"]].forEach(([nodeKey,numberKey,idKey])=>{
            const node=nodesById.get(result[nodeKey]);
            const number=portNumber(result[idKey])||validCount(result[numberKey],1);
            if(!node||number===null||number>node.portCount){result[numberKey]=null;result[idKey]=null;}
            else{result[numberKey]=number;result[idKey]=portId(number);}
        });
        return result;
    }
    function hasDuplicateConnection(links,from,to){
        return (links||[]).some(link=>(link.from===from&&link.to===to)||(link.from===to&&link.to===from));
    }
    function firstAvailablePort(nodeId,count,links){
        const used=new Set((links||[]).map(link=>endpointNumber(link,nodeId)).filter(Number.isInteger));
        for(let number=1;number<=count;number++)if(!used.has(number))return number;
        return null;
    }
    function planConnection({from,to,nodesById,links=[],allowParallel=false}={}){
        const source=nodesById?.get?.(from),target=nodesById?.get?.(to);
        if(!source||!target)return{ok:false,reason:"missing-device"};
        if(from===to)return{ok:false,reason:"same-device"};
        if(!allowParallel&&hasDuplicateConnection(links,from,to))return{ok:false,reason:"duplicate"};
        const sourceCount=inferPortCount(source),targetCount=inferPortCount(target);
        const sourcePort=sourceCount?firstAvailablePort(from,sourceCount,links):null;
        const targetPort=targetCount?firstAvailablePort(to,targetCount,links):null;
        if(sourceCount&&sourcePort===null)return{ok:false,reason:"source-full"};
        if(targetCount&&targetPort===null)return{ok:false,reason:"target-full"};
        return{ok:true,sourcePort,targetPort};
    }
    return{MAX_PORTS,affectedConnections,endpointNumber,firstAvailablePort,hasDuplicateConnection,inferPortCount,normalizeConnectionPorts,normalizeDevice,normalizePorts,planConnection,portId,portNumber,validCount};
});
