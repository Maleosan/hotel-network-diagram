(function(root,factory){
    const api=factory();
    if(typeof module==="object"&&module.exports)module.exports=api;
    else root.HotelViewportEngine=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
    "use strict";

    const InteractionState=Object.freeze({
        IDLE:"IDLE",
        PANNING:"PANNING",
        DRAGGING_DEVICE:"DRAGGING_DEVICE",
        DRAGGING_ANNOTATION:"DRAGGING_ANNOTATION",
        DRAGGING_WAYPOINT:"DRAGGING_WAYPOINT",
        PINCH_ZOOMING:"PINCH_ZOOMING"
    });

    function finite(value,fallback=0){
        const number=Number(value);
        return Number.isFinite(number)?number:fallback;
    }

    function clampZoom(value,minZoom=.1,maxZoom=4){
        return Math.min(maxZoom,Math.max(minZoom,finite(value,1)));
    }

    function normalizeViewport(view,minZoom=.1,maxZoom=4){
        return{
            panX:finite(view?.panX),
            panY:finite(view?.panY),
            zoom:clampZoom(view?.zoom,minZoom,maxZoom)
        };
    }

    function screenToWorld(point,rect,view){
        const current=normalizeViewport(view),left=finite(rect?.left),top=finite(rect?.top);
        return{
            x:(finite(point?.x)-left-current.panX)/current.zoom,
            y:(finite(point?.y)-top-current.panY)/current.zoom
        };
    }

    function worldToScreen(point,rect,view){
        const current=normalizeViewport(view),left=finite(rect?.left),top=finite(rect?.top);
        return{
            x:left+current.panX+finite(point?.x)*current.zoom,
            y:top+current.panY+finite(point?.y)*current.zoom
        };
    }

    function panViewport(startView,startPoint,currentPoint){
        const initial=normalizeViewport(startView);
        return{
            ...initial,
            panX:initial.panX+finite(currentPoint?.x)-finite(startPoint?.x),
            panY:initial.panY+finite(currentPoint?.y)-finite(startPoint?.y)
        };
    }

    function zoomViewportAt(view,nextZoom,anchorPoint,rect,minZoom=.1,maxZoom=4){
        const current=normalizeViewport(view,minZoom,maxZoom);
        const anchorWorld=screenToWorld(anchorPoint,rect,current);
        const zoom=clampZoom(nextZoom,minZoom,maxZoom);
        const localX=finite(anchorPoint?.x)-finite(rect?.left);
        const localY=finite(anchorPoint?.y)-finite(rect?.top);
        return{zoom,panX:localX-anchorWorld.x*zoom,panY:localY-anchorWorld.y*zoom};
    }

    function fitViewport(bounds,metrics,options={}){
        const minZoom=finite(options.minZoom,.1),maxZoom=finite(options.maxZoom,4);
        const width=Math.max(1,finite(metrics?.width,1)),height=Math.max(1,finite(metrics?.height,1));
        const ratio=Math.max(0,finite(options.paddingRatio,.12));
        const minPadding=Math.max(0,finite(options.minPadding,40)),maxPadding=Math.max(minPadding,finite(options.maxPadding,96));
        const padding=Math.max(minPadding,Math.min(maxPadding,Math.min(width,height)*ratio));
        const worldWidth=Math.max(1,finite(bounds?.width,1)),worldHeight=Math.max(1,finite(bounds?.height,1));
        const zoom=clampZoom(Math.min(Math.max(1,width-padding*2)/worldWidth,Math.max(1,height-padding*2)/worldHeight),minZoom,maxZoom);
        const centerX=finite(bounds?.x)+worldWidth/2,centerY=finite(bounds?.y)+worldHeight/2;
        return{
            zoom,
            panX:finite(metrics?.left)+width/2-centerX*zoom,
            panY:finite(metrics?.top)+height/2-centerY*zoom,
            padding
        };
    }

    function resolvePointerMode({pointerType="mouse",button=0,spacePressed=false,isWorldObject=false,touchCount=1,editable=true}={}){
        if(pointerType==="touch"&&touchCount>=2)return InteractionState.PINCH_ZOOMING;
        if(pointerType==="mouse"&&(button===1||(button===0&&spacePressed)))return InteractionState.PANNING;
        if(pointerType==="touch"&&!isWorldObject)return InteractionState.PANNING;
        if(isWorldObject&&editable&&(pointerType!=="mouse"||button===0))return InteractionState.DRAGGING_DEVICE;
        return InteractionState.IDLE;
    }

    return{InteractionState,clampZoom,normalizeViewport,screenToWorld,worldToScreen,panViewport,zoomViewportAt,fitViewport,resolvePointerMode};
});
