(function(root,factory){
    const api=factory();
    if(typeof module==="object"&&module.exports)module.exports=api;
    else root.HotelPngExportEngine=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
    "use strict";

    const DEFAULT_LIMITS=Object.freeze({maxDimension:8192,maxPixels:24000000});

    function positiveNumber(value,name){
        const number=Number(value);
        if(!Number.isFinite(number)||number<=0)throw new TypeError(`${name} must be a positive number`);
        return number;
    }

    function createPlan(bounds,requestedScale=4,limits=DEFAULT_LIMITS){
        const width=positiveNumber(bounds?.width,"bounds.width");
        const height=positiveNumber(bounds?.height,"bounds.height");
        const desiredScale=positiveNumber(requestedScale,"requestedScale");
        const maxDimension=positiveNumber(limits?.maxDimension??DEFAULT_LIMITS.maxDimension,"maxDimension");
        const maxPixels=positiveNumber(limits?.maxPixels??DEFAULT_LIMITS.maxPixels,"maxPixels");
        const scale=Math.min(
            desiredScale,
            maxDimension/width,
            maxDimension/height,
            Math.sqrt(maxPixels/(width*height))
        );
        const pixelWidth=Math.max(1,Math.floor(width*scale));
        const pixelHeight=Math.max(1,Math.floor(height*scale));
        return{
            scale,
            pixelWidth,
            pixelHeight,
            adjusted:scale<desiredScale-Number.EPSILON,
            requestedScale:desiredScale,
            maxDimension,
            maxPixels
        };
    }

    function reducePlan(bounds,plan,factor=.72){
        const reduction=positiveNumber(factor,"factor");
        if(reduction>=1)throw new RangeError("factor must be less than 1");
        const reduced=createPlan(bounds,plan.scale*reduction,{maxDimension:plan.maxDimension,maxPixels:plan.maxPixels});
        return{...reduced,adjusted:true,requestedScale:plan.requestedScale};
    }

    return{DEFAULT_LIMITS,createPlan,reducePlan};
});
