(()=>{var Ma=(r,t)=>()=>(t||r((t={exports:{}}).exports,t),t.exports);var Es=Ma(()=>{});var Ss=Ma(()=>{});var Is=Ma(()=>{});var pu=function(r,t){return(pu=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,n){e.__proto__=n}||function(e,n){for(var a in n)n.hasOwnProperty(a)&&(e[a]=n[a])})(r,t)};function at(r,t){function e(){this.constructor=r}pu(r,t),r.prototype=t===null?Object.create(t):(e.prototype=t.prototype,new e)}function Y(r,t,e,n){return new(e||(e=Promise))((function(a,o){function i(c){try{u(n.next(c))}catch(l){o(l)}}function s(c){try{u(n.throw(c))}catch(l){o(l)}}function u(c){c.done?a(c.value):new e((function(l){l(c.value)})).then(i,s)}u((n=n.apply(r,t||[])).next())}))}function Q(r,t){var e,n,a,o,i={label:0,sent:function(){if(1&a[0])throw a[1];return a[1]},trys:[],ops:[]};return o={next:s(0),throw:s(1),return:s(2)},typeof Symbol=="function"&&(o[Symbol.iterator]=function(){return this}),o;function s(u){return function(c){return(function(l){if(e)throw new TypeError("Generator is already executing.");for(;i;)try{if(e=1,n&&(a=2&l[0]?n.return:l[0]?n.throw||((a=n.return)&&a.call(n),0):n.next)&&!(a=a.call(n,l[1])).done)return a;switch(n=0,a&&(l=[2&l[0],a.value]),l[0]){case 0:case 1:a=l;break;case 4:return i.label++,{value:l[1],done:!1};case 5:i.label++,n=l[1],l=[0];continue;case 7:l=i.ops.pop(),i.trys.pop();continue;default:if(!(a=(a=i.trys).length>0&&a[a.length-1])&&(l[0]===6||l[0]===2)){i=0;continue}if(l[0]===3&&(!a||l[1]>a[0]&&l[1]<a[3])){i.label=l[1];break}if(l[0]===6&&i.label<a[1]){i.label=a[1],a=l;break}if(a&&i.label<a[2]){i.label=a[2],i.ops.push(l);break}a[2]&&i.ops.pop(),i.trys.pop();continue}l=t.call(r,i)}catch(p){l=[6,p],n=0}finally{e=a=0}if(5&l[0])throw l[1];return{value:l[0]?l[1]:void 0,done:!0}})([u,c])}}}var sp=(function(){function r(t){this.global=t,this.flags={},this.flagRegistry={},this.urlFlags={},this.populateURLFlags()}return r.prototype.setPlatform=function(t,e){this.platform!=null&&console.warn("Platform "+this.platformName+" has already been set. Overwriting the platform with "+e+"."),this.platformName=t,this.platform=e},r.prototype.registerFlag=function(t,e,n){if(this.flagRegistry[t]={evaluationFn:e,setHook:n},this.urlFlags[t]!=null){var a=this.urlFlags[t];console.warn("Setting feature override from URL "+t+": "+a+"."),this.set(t,a)}},r.prototype.get=function(t){return t in this.flags?this.flags[t]:(this.flags[t]=this.evaluateFlag(t),this.flags[t])},r.prototype.getNumber=function(t){return this.get(t)},r.prototype.getBool=function(t){return this.get(t)},r.prototype.getFlags=function(){return this.flags},Object.defineProperty(r.prototype,"features",{get:function(){return this.flags},enumerable:!0,configurable:!0}),r.prototype.set=function(t,e){if(this.flagRegistry[t]==null)throw new Error("Cannot set flag "+t+" as it has not been registered.");this.flags[t]=e,this.flagRegistry[t].setHook!=null&&this.flagRegistry[t].setHook(e)},r.prototype.evaluateFlag=function(t){if(this.flagRegistry[t]==null)throw new Error("Cannot evaluate flag '"+t+"': no evaluation function found.");return this.flagRegistry[t].evaluationFn()},r.prototype.setFlags=function(t){this.flags=Object.assign({},t)},r.prototype.reset=function(){this.flags={},this.urlFlags={},this.populateURLFlags()},r.prototype.populateURLFlags=function(){var t=this;if(this.global!==void 0&&this.global.location!==void 0&&this.global.location.search!==void 0){var e,n,a=(e=this.global.location.search,n={},e.replace(/[?&]([^=?&]+)(?:=([^&]*))?/g,(function(o){for(var i=[],s=1;s<arguments.length;s++)i[s-1]=arguments[s];return up(n,i[0],i[1]),i.join("=")})),n);"tfjsflags"in a&&a.tfjsflags.split(",").forEach((function(o){var i=o.split(":"),s=i[0],u=i[1];t.urlFlags[s]=(function(c,l){if((l=l.toLowerCase())==="true"||l==="false")return l==="true";if(""+ +l===l)return+l;throw new Error("Could not parse value flag value "+l+" for flag "+c+".")})(s,u)}))}},r})();function up(r,t,e){r[decodeURIComponent(t)]=decodeURIComponent(e||"")}function B(){return du}var du=null,_r=new Map,no=new Map;function hu(r,t){var e=mu(r,t);return _r.get(e)}function ks(r){return no.get(r)}function Rs(r){for(var t=_r.entries(),e=[];;){var n=t.next(),a=n.done,o=n.value;if(a)break;var i=o[0],s=o[1];i.split("_")[0]===r&&e.push(s)}return e}function fu(r){var t=r.kernelName,e=r.backendName,n=mu(t,e);if(_r.has(n))throw new Error("The kernel '"+t+"' for backend '"+e+"' is already registered");_r.set(n,r)}function cp(r){var t=r.kernelName;no.has(t)&&console.warn("Overriding the gradient for '"+t+"'"),no.set(t,r)}function mu(r,t){return t+"_"+r}function Ts(r){for(var t=r.length,e=0,n=0;t>0;)n=Math.random()*t|0,e=r[--t],r[t]=r[n],r[n]=e}function Fr(r,t,e){return Math.max(r,Math.min(t,e))}function No(r){return r%2==0?r:r+1}function vu(r){for(var t=0,e=0;e<r.length;e++)t+=r[e];return t}function S(r,t){if(!r)throw new Error(typeof t=="string"?t:t())}function fe(r,t,e){e===void 0&&(e=""),S(Re(r,t),(function(){return e+" Shapes "+r+" and "+t+" must match"}))}function on(r){S(r!=null,(function(){return"The input to the tensor constructor must be a non-null value."}))}function Tt(r,t,e){if(t===void 0&&(t=[]),e===void 0&&(e=!1),t==null&&(t=[]),Array.isArray(r)||Fe(r)&&!e)for(var n=0;n<r.length;++n)Tt(r[n],t,e);else t.push(r);return t}function $(r){if(r.length===0)return 1;for(var t=r[0],e=1;e<r.length;e++)t*=r[e];return t}function Re(r,t){if(r===t)return!0;if(r==null||t==null||r.length!==t.length)return!1;for(var e=0;e<r.length;e++)if(r[e]!==t[e])return!1;return!0}function Ce(r){return r%1==0}function gu(r){if(Math.tanh!=null)return Math.tanh(r);if(r===1/0)return 1;if(r===-1/0)return-1;var t=Math.exp(2*r);return(t-1)/(t+1)}function Mr(r){var t=Math.ceil(Math.sqrt(r));return[t,Math.ceil(r/t)]}function tn(r,t){return t<=r.length?r:r+" ".repeat(t-r.length)}function ro(r,t,e){return t===void 0&&(t=function(n){return 0}),new Promise((function(n,a){var o=0,i=function(){if(r())n();else{o++;var s=t(o);e!=null&&o>=e?a():setTimeout(i,s)}};i()}))}function yu(r,t){for(var e=1,n=-1,a=0;a<r.length;++a)if(r[a]>=0)e*=r[a];else if(r[a]===-1){if(n!==-1)throw Error("Shapes can only have 1 implicit size. Found -1 at dim "+n+" and dim "+a);n=a}else if(r[a]<0)throw Error("Shapes can not be < 0. Found "+r[a]+" at dim "+a);if(n===-1){if(t>0&&t!==e)throw Error("Size("+t+") must match the product of shape "+r);return r}if(e===0)throw Error("Cannot infer the missing size in ["+r+"] when there are 0 elements");if(t%e!=0)throw Error("The implicit shape can't be a fractional number. Got "+t+" / "+e);var o=r.slice();return o[n]=t/e,o}function Te(r,t){var e=t.length;return S((r=r==null?t.map((function(n,a){return a})):[].concat(r)).every((function(n){return n>=-e&&n<e})),(function(){return"All values in axis param must be in range [-"+e+", "+e+") but got axis "+r})),S(r.every((function(n){return Ce(n)})),(function(){return"All values in axis param must be integers but got axis "+r})),r.map((function(n){return n<0?e+n:n}))}function Mt(r,t){for(var e=[],n=[],a=t!=null&&Array.isArray(t)&&t.length===0,o=t==null||a?null:Te(t,r).sort(),i=0,s=0;s<r.length;++s){if(o!=null){if(o[i]===s&&r[s]!==1)throw new Error("Can't squeeze axis "+s+" since its dim '"+r[s]+"' is not 1");(o[i]==null||o[i]>s)&&r[s]===1&&(e.push(r[s]),n.push(s)),o[i]<=s&&i++}r[s]!==1&&(e.push(r[s]),n.push(s))}return{newShape:e,keptDims:n}}function nn(r,t){var e=null;if(r==null||r==="float32")e=new Float32Array(t);else if(r==="int32")e=new Int32Array(t);else{if(r!=="bool")throw new Error("Unknown data type "+r);e=new Uint8Array(t)}return e}function Kn(r,t){var e=null;if(r==null||r==="float32")e=new Float32Array(t);else if(r==="int32")e=new Int32Array(t);else if(r==="bool")e=new Uint8Array(t);else{if(r!=="string")throw new Error("Unknown data type "+r);e=new Array(t)}return e}function xu(r,t){for(var e=0;e<r.length;e++){var n=r[e];if(isNaN(n)||!isFinite(n))throw Error("A tensor of type "+t+" being uploaded contains "+n+".")}}function bu(r){return r==="bool"||r==="complex64"||r==="float32"||r==="int32"||r==="string"}function wu(r,t){return t!=="complex64"&&(t!=="float32"||r==="complex64")&&(t!=="int32"||r==="float32"||r==="complex64")&&(t!=="bool"||r!=="bool")}function Fe(r){return r instanceof Float32Array||r instanceof Int32Array||r instanceof Uint8Array}function Eo(r){if(r==="float32"||r==="int32")return 4;if(r==="complex64")return 8;if(r==="bool")return 1;throw new Error("Unknown dtype "+r)}function Cu(r){if(r==null)return 0;var t=0;return r.forEach((function(e){return t+=e.length})),t}function Bt(r){return typeof r=="string"||r instanceof String}function Nu(r){return typeof r=="boolean"}function Eu(r){return typeof r=="number"}function Dn(r){return Array.isArray(r)?Dn(r[0]):r instanceof Float32Array?"float32":r instanceof Int32Array||r instanceof Uint8Array?"int32":Eu(r)?"float32":Bt(r)?"string":Nu(r)?"bool":"float32"}function Br(r){return!!(r&&r.constructor&&r.call&&r.apply)}function Pr(r,t){for(var e=t;e<r;++e)if(r%e==0)return e;return r}function Ge(r){var t=r.length;if(t<2)return[];var e=new Array(t-1);e[t-2]=r[t-1];for(var n=t-3;n>=0;--n)e[n]=e[n+1]*r[n+1];return e}function So(r,t,e){if(t==="string")throw new Error("Cannot convert a string[] to a TypedArray");if(Array.isArray(r)&&(r=Tt(r)),e&&xu(r,t),(function(o,i){return o instanceof Float32Array&&i==="float32"||o instanceof Int32Array&&i==="int32"||o instanceof Uint8Array&&i==="bool"})(r,t))return r;if(t==null||t==="float32"||t==="complex64")return new Float32Array(r);if(t==="int32")return new Int32Array(r);if(t==="bool"){for(var n=new Uint8Array(r.length),a=0;a<n.length;++a)Math.round(r[a])!==0&&(n[a]=1);return n}throw new Error("Unknown data type "+t)}function ao(r,t){if(r.length===0)return t[0];var e=r.reduce((function(n,a){return n*a}));if(e===0)return[];if(e!==t.length)throw new Error("["+r+"] does not match the input size.");return(function n(a,o,i){var s=new Array;if(o.length===1)for(var u=o[0],c=0;c<u;c++)s[c]=i[a+c];else{u=o[0];var l=o.slice(1),p=l.reduce((function(d,h){return d*h}));for(c=0;c<u;c++)s[c]=n(a+c*p,l,i)}return s})(0,r,t)}function Io(r,t){for(var e=On(r,t),n=0;n<e.length;n++)e[n]=1;return e}function On(r,t){if(t==null||t==="float32"||t==="complex64")return new Float32Array(r);if(t==="int32")return new Int32Array(r);if(t==="bool")return new Uint8Array(r);throw new Error("Unknown data type "+t)}function et(){return B().platform.now()}function ko(r){r.forEach((function(t){S(Number.isInteger(t)&&t>=0,(function(){return"Tensor must have a shape comprised of positive integers but got shape ["+r+"]."}))}))}function Su(r,t){return t===void 0&&(t="utf-8"),t=t||"utf-8",B().platform.encode(r,t)}function Xn(r,t){return t===void 0&&(t="utf-8"),t=t||"utf-8",B().platform.decode(r,t)}function Lr(r,t,e){if(t===0)return 0;if(t===1)return r[0];for(var n=r[r.length-1],a=0;a<r.length-1;++a)n+=e[a]*r[a];return n}function Ro(r,t,e){if(t===0)return[];if(t===1)return[r];for(var n=new Array(t),a=0;a<n.length-1;++a)n[a]=Math.floor(r/e[a]),r-=n[a]*e[a];return n[n.length-1]=r,n}var wt=Object.freeze({shuffle:Ts,clamp:Fr,nearestLargerEven:No,sum:vu,randUniform:function(r,t){var e=Math.random();return t*e+(1-e)*r},distSquared:function(r,t){for(var e=0,n=0;n<r.length;n++){var a=Number(r[n])-Number(t[n]);e+=a*a}return e},assert:S,assertShapesMatch:fe,assertNonNull:on,flatten:Tt,sizeFromShape:$,isScalarShape:function(r){return r.length===0},arraysEqual:Re,isInt:Ce,tanh:gu,sizeToSquarishShape:Mr,createShuffledIndices:function(r){for(var t=new Uint32Array(r),e=0;e<r;++e)t[e]=e;return Ts(t),t},rightPad:tn,repeatedTry:ro,inferFromImplicitShape:yu,parseAxisParam:Te,squeezeShape:Mt,getTypedArrayFromDType:nn,getArrayFromDType:Kn,checkConversionForErrors:xu,isValidDtype:bu,hasEncodingLoss:wu,isTypedArray:Fe,bytesPerElement:Eo,bytesFromStringArray:Cu,isString:Bt,isBoolean:Nu,isNumber:Eu,inferDtype:Dn,isFunction:Br,nearestDivisor:Pr,computeStrides:Ge,toTypedArray:So,toNestedArray:ao,makeOnesTypedArray:Io,makeZerosTypedArray:On,now:et,assertNonNegativeIntegerDimensions:ko,fetch:function(r,t){return B().platform.fetch(r,t)},encodeString:Su,decodeString:Xn,locToIndex:Lr,indexToLoc:Ro}),lp=(function(){function r(t,e){this.backendTimer=t,this.logger=e,e==null&&(this.logger=new pp)}return r.prototype.profileKernel=function(t,e,n){var a,o=this,i=this.backendTimer.time((function(){a=n()}));return a.forEach((function(s){s.data().then((function(u){(function(c,l,p){if(l!=="float32")return!1;for(var d=0;d<c.length;d++){var h=c[d];if(isNaN(h)||!isFinite(h))return console.warn("Found "+h+" in the result of '"+p+"'"),!0}})(u,s.dtype,t),i.then((function(c){var l="";c.getExtraProfileInfo!=null&&(l=c.getExtraProfileInfo()),o.logger.logKernelProfile(t,s,u,c.kernelMs,e,l)}))}))})),a},r})(),pp=(function(){function r(){}return r.prototype.logKernelProfile=function(t,e,n,a,o,i){var s=typeof a=="number"?tn(a+"ms",9):a.error,u=tn(t,25),c=e.rank,l=e.size,p=tn(e.shape.toString(),14),d="";for(var h in o){var f=o[h].shape||e.shape,m=f.length;d+=h+": "+m+"D "+(m>0?f:"")+" "}console.log("%c"+u+"	%c"+s+"	%c"+c+"D "+p+"	%c"+l+"	%c"+d+"	%c"+i,"font-weight:bold","color:red","color:blue","color: orange","color: green","color: steelblue")},r})(),As=20,Pn=3,Ba=7;function dp(r,t,e,n){var a=Ge(t),o=(function(c,l,p,d){var h=$(l),f=d[d.length-1],m=new Array(f).fill(0),v=l.length,g=p==="complex64"?Vn(c):c;if(v>1)for(var y=0;y<h/f;y++)for(var x=y*f,b=0;b<f;b++)m[b]=Math.max(m[b],Ln(g[x+b],0,p).length);return m})(r,t,e,a),i=t.length,s=(function c(l,p,d,h,f,m){m===void 0&&(m=!0);var v=d==="complex64"?2:1,g=p[0],y=p.length;if(y===0)return d==="complex64"?[Ln(Vn(l)[0],0,d)]:d==="bool"?[Iu(l[0])]:[l[0].toString()];if(y===1){if(g>As){var x=Pn*v,b=Array.from(l.slice(0,x)),C=Array.from(l.slice((g-Pn)*v,g*v));return d==="complex64"&&(b=Vn(b),C=Vn(C)),["["+b.map((function(P,U){return Ln(P,f[U],d)})).join(", ")+", ..., "+C.map((function(P,U){return Ln(P,f[g-Pn+U],d)})).join(", ")+"]"]}return["["+(d==="complex64"?Vn(l):Array.from(l)).map((function(P,U){return Ln(P,f[U],d)})).join(", ")+"]"]}var E=p.slice(1),R=h.slice(1),I=h[0]*v,k=[];if(g>As){for(var T=0;T<Pn;T++){var O=(_=T*I)+I;k.push.apply(k,c(l.slice(_,O),E,d,R,f,!1))}for(k.push("..."),T=g-Pn;T<g;T++)O=(_=T*I)+I,k.push.apply(k,c(l.slice(_,O),E,d,R,f,T===g-1))}else for(T=0;T<g;T++){var _;O=(_=T*I)+I,k.push.apply(k,c(l.slice(_,O),E,d,R,f,T===g-1))}var W=y===2?",":"";for(k[0]="["+k[0]+W,T=1;T<k.length-1;T++)k[T]=" "+k[T]+W;var L=`,
`;for(T=2;T<y;T++)L+=`
`;return k[k.length-1]=" "+k[k.length-1]+"]"+(m?"":L),k})(r,t,e,a,o),u=["Tensor"];return n&&(u.push("  dtype: "+e),u.push("  rank: "+i),u.push("  shape: ["+t+"]"),u.push("  values:")),u.push(s.map((function(c){return"    "+c})).join(`
`)),u.join(`
`)}function Ln(r,t,e){return tn(Array.isArray(r)?parseFloat(r[0].toFixed(Ba))+" + "+parseFloat(r[1].toFixed(Ba))+"j":Bt(r)?"'"+r+"'":e==="bool"?Iu(r):parseFloat(r.toFixed(Ba)).toString(),t)}function Iu(r){return r===0?"false":"true"}function Vn(r){for(var t=[],e=0;e<r.length;e+=2)t.push([r[e],r[e+1]]);return t}var $n=(function(){function r(t,e,n){var a=this;if(this.dtype=e,this.shape=t.slice(),this.size=$(t),n!=null){var o=n.length;S(o===this.size,(function(){return"Length of values '"+o+"' does not match the size inferred by the shape '"+a.size+"'."}))}if(e==="complex64")throw new Error("complex64 dtype TensorBuffers are not supported. Please create a TensorBuffer for the real and imaginary parts separately and call tf.complex(real, imag).");this.values=n||Kn(e,this.size),this.strides=Ge(t)}return r.prototype.set=function(t){for(var e=this,n=[],a=1;a<arguments.length;a++)n[a-1]=arguments[a];n.length===0&&(n=[0]),S(n.length===this.rank,(function(){return"The number of provided coordinates ("+n.length+") must match the rank ("+e.rank+")"}));var o=this.locToIndex(n);this.values[o]=t},r.prototype.get=function(){for(var t=[],e=0;e<arguments.length;e++)t[e]=arguments[e];t.length===0&&(t=[0]);for(var n=0,a=0,o=t;a<o.length;a++){var i=o[a];if(i<0||i>=this.shape[n]){var s="Requested out of range element at "+t+".   Buffer shape="+this.shape;throw new Error(s)}n++}for(var u=t[t.length-1],c=0;c<t.length-1;++c)u+=this.strides[c]*t[c];return this.values[u]},r.prototype.locToIndex=function(t){if(this.rank===0)return 0;if(this.rank===1)return t[0];for(var e=t[t.length-1],n=0;n<t.length-1;++n)e+=this.strides[n]*t[n];return e},r.prototype.indexToLoc=function(t){if(this.rank===0)return[];if(this.rank===1)return[t];for(var e=new Array(this.shape.length),n=0;n<e.length-1;++n)e[n]=Math.floor(t/this.strides[n]),t-=e[n]*this.strides[n];return e[e.length-1]=t,e},Object.defineProperty(r.prototype,"rank",{get:function(){return this.shape.length},enumerable:!0,configurable:!0}),r.prototype.toTensor=function(){return mt().makeTensor(this.values,this.shape,this.dtype)},r})(),mt=null,M=null,ku=null,ge=(function(){function r(t,e,n,a){this.kept=!1,this.isDisposedInternal=!1,this.shape=t.slice(),this.dtype=e||"float32",this.size=$(t),this.strides=Ge(t),this.dataId=n,this.id=a,this.rankType=this.rank<5?this.rank.toString():"higher"}return r.prototype.flatten=function(){return this.throwIfDisposed(),this.as1D()},r.prototype.asScalar=function(){return this.throwIfDisposed(),S(this.size===1,(function(){return"The array must have only 1 element."})),this.reshape([])},r.prototype.as1D=function(){return this.throwIfDisposed(),this.reshape([this.size])},r.prototype.as2D=function(t,e){return this.throwIfDisposed(),this.reshape([t,e])},r.prototype.as3D=function(t,e,n){return this.throwIfDisposed(),this.reshape([t,e,n])},r.prototype.as4D=function(t,e,n,a){return this.throwIfDisposed(),this.reshape([t,e,n,a])},r.prototype.as5D=function(t,e,n,a,o){return this.throwIfDisposed(),this.reshape([t,e,n,a,o])},r.prototype.asType=function(t){return this.throwIfDisposed(),M.cast(this,t)},Object.defineProperty(r.prototype,"rank",{get:function(){return this.shape.length},enumerable:!0,configurable:!0}),r.prototype.buffer=function(){return Y(this,void 0,void 0,(function(){var t;return Q(this,(function(e){switch(e.label){case 0:return[4,this.data()];case 1:return t=e.sent(),[2,M.buffer(this.shape,this.dtype,t)]}}))}))},r.prototype.bufferSync=function(){return M.buffer(this.shape,this.dtype,this.dataSync())},r.prototype.array=function(){return Y(this,void 0,void 0,(function(){var t;return Q(this,(function(e){switch(e.label){case 0:return[4,this.data()];case 1:return t=e.sent(),[2,ao(this.shape,t)]}}))}))},r.prototype.arraySync=function(){return ao(this.shape,this.dataSync())},r.prototype.data=function(){return Y(this,void 0,void 0,(function(){var t,e;return Q(this,(function(n){switch(n.label){case 0:return this.throwIfDisposed(),t=mt().read(this.dataId),this.dtype!=="string"?[3,2]:[4,t];case 1:e=n.sent();try{return[2,e.map((function(a){return Xn(a)}))]}catch{throw new Error("Failed to decode the string bytes into utf-8. To get the original bytes, call tensor.bytes().")}n.label=2;case 2:return[2,t]}}))}))},r.prototype.dataSync=function(){this.throwIfDisposed();var t=mt().readSync(this.dataId);if(this.dtype==="string")try{return t.map((function(e){return Xn(e)}))}catch{throw new Error("Failed to decode the string bytes into utf-8. To get the original bytes, call tensor.bytes().")}return t},r.prototype.bytes=function(){return Y(this,void 0,void 0,(function(){var t;return Q(this,(function(e){switch(e.label){case 0:return this.throwIfDisposed(),[4,mt().read(this.dataId)];case 1:return t=e.sent(),this.dtype==="string"?[2,t]:[2,new Uint8Array(t.buffer)]}}))}))},r.prototype.dispose=function(){this.isDisposed||(mt().disposeTensor(this),this.isDisposedInternal=!0)},Object.defineProperty(r.prototype,"isDisposed",{get:function(){return this.isDisposedInternal},enumerable:!0,configurable:!0}),r.prototype.throwIfDisposed=function(){if(this.isDisposed)throw new Error("Tensor is disposed.")},r.prototype.toFloat=function(){return this.asType("float32")},r.prototype.toInt=function(){return this.asType("int32")},r.prototype.toBool=function(){return this.asType("bool")},r.prototype.print=function(t){return t===void 0&&(t=!1),M.print(this,t)},r.prototype.reshape=function(t){return this.throwIfDisposed(),M.reshape(this,t)},r.prototype.reshapeAs=function(t){return this.throwIfDisposed(),this.reshape(t.shape)},r.prototype.expandDims=function(t){return t===void 0&&(t=0),M.expandDims(this,t)},r.prototype.cumsum=function(t,e,n){return t===void 0&&(t=0),e===void 0&&(e=!1),n===void 0&&(n=!1),M.cumsum(this,t,e,n)},r.prototype.squeeze=function(t){return this.throwIfDisposed(),M.squeeze(this,t)},r.prototype.clone=function(){return this.throwIfDisposed(),M.clone(this)},r.prototype.toString=function(t){return t===void 0&&(t=!1),dp(this.dataSync(),this.shape,this.dtype,t)},r.prototype.gather=function(t,e){return e===void 0&&(e=0),this.throwIfDisposed(),M.gather(this,t,e)},r.prototype.matMul=function(t,e,n){return e===void 0&&(e=!1),n===void 0&&(n=!1),this.throwIfDisposed(),M.matMul(this,t,e,n)},r.prototype.dot=function(t){return this.throwIfDisposed(),M.dot(this,t)},r.prototype.norm=function(t,e,n){return t===void 0&&(t="euclidean"),e===void 0&&(e=null),n===void 0&&(n=!1),this.throwIfDisposed(),M.norm(this,t,e,n)},r.prototype.slice=function(t,e){return this.throwIfDisposed(),M.slice(this,t,e)},r.prototype.reverse=function(t){return this.throwIfDisposed(),M.reverse(this,t)},r.prototype.concat=function(t,e){return e===void 0&&(e=0),this.throwIfDisposed(),t instanceof r&&(t=[t]),M.concat([this].concat(t),e)},r.prototype.split=function(t,e){return e===void 0&&(e=0),this.throwIfDisposed(),M.split(this,t,e)},r.prototype.stack=function(t,e){return e===void 0&&(e=0),M.stack([this,t],e)},r.prototype.unstack=function(t){return t===void 0&&(t=0),M.unstack(this,t)},r.prototype.batchNormalization=function(t,e,n,a,o){return n===void 0&&(n=.001),ku("tf.batchNormalization() is going away. Use tf.batchNorm() instead, and note the positional argument change of scale, offset, and varianceEpsilon"),this.batchNorm(t,e,o,a,n)},r.prototype.all=function(t,e){return t===void 0&&(t=null),e===void 0&&(e=!1),this.throwIfDisposed(),M.all(this,t,e)},r.prototype.any=function(t,e){return t===void 0&&(t=null),e===void 0&&(e=!1),this.throwIfDisposed(),M.any(this,t,e)},r.prototype.logSumExp=function(t,e){return t===void 0&&(t=null),e===void 0&&(e=!1),this.throwIfDisposed(),M.logSumExp(this,t,e)},r.prototype.sum=function(t,e){return t===void 0&&(t=null),e===void 0&&(e=!1),this.throwIfDisposed(),M.sum(this,t,e)},r.prototype.prod=function(t,e){return t===void 0&&(t=null),e===void 0&&(e=!1),this.throwIfDisposed(),M.prod(this,t,e)},r.prototype.mean=function(t,e){return t===void 0&&(t=null),e===void 0&&(e=!1),this.throwIfDisposed(),M.mean(this,t,e)},r.prototype.min=function(t,e){return t===void 0&&(t=null),e===void 0&&(e=!1),this.throwIfDisposed(),M.min(this,t,e)},r.prototype.max=function(t,e){return t===void 0&&(t=null),e===void 0&&(e=!1),this.throwIfDisposed(),M.max(this,t,e)},r.prototype.argMin=function(t){return t===void 0&&(t=null),this.throwIfDisposed(),M.argMin(this,t)},r.prototype.argMax=function(t){return t===void 0&&(t=null),this.throwIfDisposed(),M.argMax(this,t)},r.prototype.cast=function(t){return this.throwIfDisposed(),M.cast(this,t)},r.prototype.addStrict=function(t){return this.throwIfDisposed(),M.addStrict(this,t)},r.prototype.atan2=function(t){return this.throwIfDisposed(),M.atan2(this,t)},r.prototype.sub=function(t){return this.throwIfDisposed(),M.sub(this,t)},r.prototype.subStrict=function(t){return this.throwIfDisposed(),M.subStrict(this,t)},r.prototype.pow=function(t){return this.throwIfDisposed(),M.pow(this,t)},r.prototype.powStrict=function(t){return this.throwIfDisposed(),M.powStrict(this,t)},r.prototype.mul=function(t){return this.throwIfDisposed(),M.mul(this,t)},r.prototype.mulStrict=function(t){return this.throwIfDisposed(),M.mulStrict(this,t)},r.prototype.floorDiv=function(t){return this.throwIfDisposed(),M.floorDiv(this,t)},r.prototype.divStrict=function(t){return this.throwIfDisposed(),M.divStrict(this,t)},r.prototype.minimum=function(t){return this.throwIfDisposed(),M.minimum(this,t)},r.prototype.minimumStrict=function(t){return this.throwIfDisposed(),M.minimumStrict(this,t)},r.prototype.maximum=function(t){return this.throwIfDisposed(),M.maximum(this,t)},r.prototype.maximumStrict=function(t){return this.throwIfDisposed(),M.maximumStrict(this,t)},r.prototype.mod=function(t){return this.throwIfDisposed(),M.mod(this,t)},r.prototype.modStrict=function(t){return this.throwIfDisposed(),M.modStrict(this,t)},r.prototype.squaredDifferenceStrict=function(t){return this.throwIfDisposed(),M.squaredDifferenceStrict(this,t)},r.prototype.notEqual=function(t){return this.throwIfDisposed(),M.notEqual(this,t)},r.prototype.notEqualStrict=function(t){return this.throwIfDisposed(),M.notEqualStrict(this,t)},r.prototype.less=function(t){return this.throwIfDisposed(),M.less(this,t)},r.prototype.lessStrict=function(t){return this.throwIfDisposed(),M.lessStrict(this,t)},r.prototype.equal=function(t){return this.throwIfDisposed(),M.equal(this,t)},r.prototype.equalStrict=function(t){return this.throwIfDisposed(),M.equalStrict(this,t)},r.prototype.lessEqual=function(t){return this.throwIfDisposed(),M.lessEqual(this,t)},r.prototype.lessEqualStrict=function(t){return this.throwIfDisposed(),M.lessEqualStrict(this,t)},r.prototype.greater=function(t){return this.throwIfDisposed(),M.greater(this,t)},r.prototype.greaterStrict=function(t){return this.throwIfDisposed(),M.greaterStrict(this,t)},r.prototype.greaterEqual=function(t){return this.throwIfDisposed(),M.greaterEqual(this,t)},r.prototype.greaterEqualStrict=function(t){return this.throwIfDisposed(),M.greaterEqualStrict(this,t)},r.prototype.logicalAnd=function(t){return this.throwIfDisposed(),M.logicalAnd(this,t)},r.prototype.logicalOr=function(t){return this.throwIfDisposed(),M.logicalOr(this,t)},r.prototype.logicalNot=function(){return this.throwIfDisposed(),M.logicalNot(this)},r.prototype.logicalXor=function(t){return this.throwIfDisposed(),M.logicalXor(this,t)},r.prototype.where=function(t,e){return this.throwIfDisposed(),M.where(t,this,e)},r.prototype.neg=function(){return this.throwIfDisposed(),M.neg(this)},r.prototype.ceil=function(){return this.throwIfDisposed(),M.ceil(this)},r.prototype.floor=function(){return this.throwIfDisposed(),M.floor(this)},r.prototype.sign=function(){return this.throwIfDisposed(),M.sign(this)},r.prototype.isNaN=function(){return this.throwIfDisposed(),M.isNaN(this)},r.prototype.isInf=function(){return this.throwIfDisposed(),M.isInf(this)},r.prototype.isFinite=function(){return this.throwIfDisposed(),M.isFinite(this)},r.prototype.exp=function(){return this.throwIfDisposed(),M.exp(this)},r.prototype.expm1=function(){return this.throwIfDisposed(),M.expm1(this)},r.prototype.log=function(){return this.throwIfDisposed(),M.log(this)},r.prototype.log1p=function(){return this.throwIfDisposed(),M.log1p(this)},r.prototype.sqrt=function(){return this.throwIfDisposed(),M.sqrt(this)},r.prototype.rsqrt=function(){return this.throwIfDisposed(),M.rsqrt(this)},r.prototype.square=function(){return this.throwIfDisposed(),M.square(this)},r.prototype.reciprocal=function(){return this.throwIfDisposed(),M.reciprocal(this)},r.prototype.abs=function(){return this.throwIfDisposed(),M.abs(this)},r.prototype.clipByValue=function(t,e){return this.throwIfDisposed(),M.clipByValue(this,t,e)},r.prototype.relu=function(){return this.throwIfDisposed(),M.relu(this)},r.prototype.relu6=function(){return this.throwIfDisposed(),M.relu6(this)},r.prototype.elu=function(){return this.throwIfDisposed(),M.elu(this)},r.prototype.selu=function(){return this.throwIfDisposed(),M.selu(this)},r.prototype.leakyRelu=function(t){return t===void 0&&(t=.2),this.throwIfDisposed(),M.leakyRelu(this,t)},r.prototype.prelu=function(t){return this.throwIfDisposed(),M.prelu(this,t)},r.prototype.sigmoid=function(){return this.throwIfDisposed(),M.sigmoid(this)},r.prototype.logSigmoid=function(){return this.throwIfDisposed(),M.logSigmoid(this)},r.prototype.softplus=function(){return this.throwIfDisposed(),M.softplus(this)},r.prototype.zerosLike=function(){return this.throwIfDisposed(),M.zerosLike(this)},r.prototype.onesLike=function(){return this.throwIfDisposed(),M.onesLike(this)},r.prototype.sin=function(){return this.throwIfDisposed(),M.sin(this)},r.prototype.cos=function(){return this.throwIfDisposed(),M.cos(this)},r.prototype.tan=function(){return this.throwIfDisposed(),M.tan(this)},r.prototype.asin=function(){return this.throwIfDisposed(),M.asin(this)},r.prototype.acos=function(){return this.throwIfDisposed(),M.acos(this)},r.prototype.atan=function(){return this.throwIfDisposed(),M.atan(this)},r.prototype.sinh=function(){return this.throwIfDisposed(),M.sinh(this)},r.prototype.cosh=function(){return this.throwIfDisposed(),M.cosh(this)},r.prototype.tanh=function(){return this.throwIfDisposed(),M.tanh(this)},r.prototype.asinh=function(){return this.throwIfDisposed(),M.asinh(this)},r.prototype.acosh=function(){return this.throwIfDisposed(),M.acosh(this)},r.prototype.atanh=function(){return this.throwIfDisposed(),M.atanh(this)},r.prototype.erf=function(){return this.throwIfDisposed(),M.erf(this)},r.prototype.round=function(){return this.throwIfDisposed(),M.round(this)},r.prototype.step=function(t){return t===void 0&&(t=0),this.throwIfDisposed(),M.step(this,t)},r.prototype.softmax=function(t){return t===void 0&&(t=-1),this.throwIfDisposed(),M.softmax(this,t)},r.prototype.logSoftmax=function(t){return t===void 0&&(t=-1),this.throwIfDisposed(),M.logSoftmax(this,t)},r.prototype.resizeBilinear=function(t,e){return e===void 0&&(e=!1),this.throwIfDisposed(),M.image.resizeBilinear(this,t,e)},r.prototype.resizeNearestNeighbor=function(t,e){return e===void 0&&(e=!1),this.throwIfDisposed(),M.image.resizeNearestNeighbor(this,t,e)},r.prototype.conv1d=function(t,e,n,a,o,i){return a===void 0&&(a="NWC"),o===void 0&&(o=1),this.throwIfDisposed(),M.conv1d(this,t,e,n,a,o,i)},r.prototype.conv2d=function(t,e,n,a,o,i){return a===void 0&&(a="NHWC"),o===void 0&&(o=[1,1]),this.throwIfDisposed(),M.conv2d(this,t,e,n,a,o,i)},r.prototype.conv2dTranspose=function(t,e,n,a,o){return this.throwIfDisposed(),M.conv2dTranspose(this,t,e,n,a,o)},r.prototype.depthwiseConv2D=function(t,e,n,a,o,i){return a===void 0&&(a="NHWC"),o===void 0&&(o=[1,1]),this.throwIfDisposed(),M.depthwiseConv2d(this,t,e,n,a,o,i)},r.prototype.separableConv2d=function(t,e,n,a,o,i){return o===void 0&&(o=[1,1]),i===void 0&&(i="NHWC"),this.throwIfDisposed(),M.separableConv2d(this,t,e,n,a,o,i)},r.prototype.avgPool=function(t,e,n,a){return this.throwIfDisposed(),M.avgPool(this,t,e,n,a)},r.prototype.maxPool=function(t,e,n,a){return this.throwIfDisposed(),M.maxPool(this,t,e,n,a)},r.prototype.localResponseNormalization=function(t,e,n,a){return t===void 0&&(t=5),e===void 0&&(e=1),n===void 0&&(n=1),a===void 0&&(a=.5),M.localResponseNormalization(this,t,e,n,a)},r.prototype.pool=function(t,e,n,a,o){return this.throwIfDisposed(),M.pool(this,t,e,n,a,o)},r.prototype.variable=function(t,e,n){return t===void 0&&(t=!0),this.throwIfDisposed(),mt().makeVariable(this,t,e,n)},r.prototype.unsortedSegmentSum=function(t,e){return this.throwIfDisposed(),M.unsortedSegmentSum(this,t,e)},r.prototype.batchToSpaceND=function(t,e){return this.throwIfDisposed(),M.batchToSpaceND(this,t,e)},r.prototype.spaceToBatchND=function(t,e){return this.throwIfDisposed(),M.spaceToBatchND(this,t,e)},r.prototype.topk=function(t,e){return t===void 0&&(t=1),e===void 0&&(e=!0),this.throwIfDisposed(),M.topk(this,t,e)},r.prototype.stridedSlice=function(t,e,n,a,o,i,s,u){return a===void 0&&(a=0),o===void 0&&(o=0),i===void 0&&(i=0),s===void 0&&(s=0),u===void 0&&(u=0),this.throwIfDisposed(),M.stridedSlice(this,t,e,n,a,o,i,s,u)},r.prototype.depthToSpace=function(t,e){return this.throwIfDisposed(),M.depthToSpace(this,t,e)},r.prototype.fft=function(){return this.throwIfDisposed(),M.spectral.fft(this)},r.prototype.ifft=function(){return this.throwIfDisposed(),M.spectral.ifft(this)},r.prototype.rfft=function(){return this.throwIfDisposed(),M.spectral.rfft(this)},r.prototype.irfft=function(){return this.throwIfDisposed(),M.spectral.irfft(this)},r})();Object.defineProperty(ge,Symbol.hasInstance,{value:function(r){return!!r&&r.dataId!=null&&r.shape!=null&&r.dtype!=null}});var Ds,oo,io,so,uo,Vr=(function(r){function t(e,n,a,o){var i=r.call(this,e.shape,e.dtype,e.dataId,o)||this;return i.trainable=n,i.name=a,i}return at(t,r),t.prototype.assign=function(e){if(e.dtype!==this.dtype)throw new Error("dtype of the new value ("+e.dtype+") and previous value ("+this.dtype+") must match");if(!Re(e.shape,this.shape))throw new Error("shape of the new value ("+e.shape+") and previous value ("+this.shape+") must match");mt().disposeTensor(this),this.dataId=e.dataId,mt().incRef(this,null)},t.prototype.dispose=function(){mt().disposeVariable(this),this.isDisposedInternal=!0},t})(ge);Object.defineProperty(Vr,Symbol.hasInstance,{value:function(r){return r instanceof ge&&r.assign!=null&&r.assign instanceof Function}}),(function(r){r.R0="R0",r.R1="R1",r.R2="R2",r.R3="R3",r.R4="R4",r.R5="R5",r.R6="R6"})(Ds||(Ds={})),(function(r){r.float32="float32",r.int32="int32",r.bool="int32",r.complex64="complex64"})(oo||(oo={})),(function(r){r.float32="float32",r.int32="int32",r.bool="bool",r.complex64="complex64"})(io||(io={})),(function(r){r.float32="float32",r.int32="float32",r.bool="float32",r.complex64="complex64"})(so||(so={})),(function(r){r.float32="complex64",r.int32="complex64",r.bool="complex64",r.complex64="complex64"})(uo||(uo={}));var hp={float32:so,int32:oo,bool:io,complex64:uo};function Oe(r,t){if(r==="string"||t==="string"){if(r==="string"&&t==="string")return"string";throw new Error("Can not upcast "+r+" with "+t)}return hp[r][t]}function Pa(r){return Oe(r,"int32")}function xe(r,t){if(r.dtype===t.dtype)return[r,t];var e=Oe(r.dtype,t.dtype);return[r.cast(e),t.cast(e)]}function Ru(r,t){S(r.dtype===t.dtype,(function(){return"The dtypes of the first("+r.dtype+") and second("+t.dtype+") input must match"}))}function To(r){var t=[];return(function e(n,a,o){if(n!=null){if(n instanceof ge)return void a.push(n);if(i=n,!(!Array.isArray(i)&&typeof i!="object")){var i,s=n;for(var u in s){var c=s[u];o.has(c)||(o.add(c),e(c,a,o))}}}})(r,t,new Set),t}var La,ag=Object.freeze({makeTypesMatch:xe,assertTypesMatch:Ru,isTensorInList:function(r,t){return t.some((function(e){return e.id===r.id}))},getTensorsInContainer:To}),Os=(function(){function r(){this.registeredVariables={},this.nextTapeNodeId=0,this.numBytes=0,this.numTensors=0,this.numStringTensors=0,this.numDataBuffers=0,this.gradientDepth=0,this.kernelDepth=0,this.scopeStack=[],this.numDataMovesStack=[],this.nextScopeId=0,this.tensorInfo=new WeakMap,this.profiling=!1,this.activeProfile={newBytes:0,newTensors:0,peakBytes:0,kernels:[],result:null}}return r.prototype.dispose=function(){for(var t in this.registeredVariables)this.registeredVariables[t].dispose()},r})(),fp=(function(){function r(t){this.ENV=t,this.registry={},this.registryFactory={},this.pendingBackendInitId=0,this.state=new Os}return r.prototype.ready=function(){return Y(this,void 0,void 0,(function(){var t,e,n;return Q(this,(function(a){switch(a.label){case 0:if(this.pendingBackendInit!=null)return[2,this.pendingBackendInit.then((function(){}))];if(this.backendInstance!=null)return[2];t=this.getSortedBackends(),e=0,a.label=1;case 1:return e<t.length?(n=t[e],[4,this.initializeBackend(n).success]):[3,5];case 2:return a.sent()?[4,this.setBackend(n)]:[3,4];case 3:return a.sent(),[2];case 4:return e++,[3,1];case 5:throw new Error("Could not initialize any backends, all backend initializations failed.")}}))}))},Object.defineProperty(r.prototype,"backend",{get:function(){if(this.pendingBackendInit!=null)throw new Error("Backend '"+this.backendName+"' has not yet been initialized. Make sure to await tf.ready() or await tf.setBackend() before calling other methods");if(this.backendInstance==null){var t=this.initializeBackendsAndReturnBest(),e=t.name;if(t.asyncInit)throw new Error("The highest priority backend '"+e+"' has not yet been initialized. Make sure to await tf.ready() or await tf.setBackend() before calling other methods");this.setBackend(e)}return this.backendInstance},enumerable:!0,configurable:!0}),r.prototype.backendNames=function(){return Object.keys(this.registryFactory)},r.prototype.findBackend=function(t){return!(t in this.registry)&&(!(t in this.registryFactory)||this.initializeBackend(t).asyncInit)?null:this.registry[t]},r.prototype.findBackendFactory=function(t){return t in this.registryFactory?this.registryFactory[t].factory:null},r.prototype.registerBackend=function(t,e,n){return n===void 0&&(n=1),t in this.registryFactory?(console.warn(t+" backend was already registered. Reusing existing backend factory."),!1):(this.registryFactory[t]={factory:e,priority:n},!0)},r.prototype.setBackend=function(t){return Y(this,void 0,void 0,(function(){var e,n,a;return Q(this,(function(o){switch(o.label){case 0:if(this.registryFactory[t]==null)throw new Error("Backend name '"+t+"' not found in registry");return this.backendName=t,this.registry[t]!=null?[3,4]:(this.backendInstance=null,e=this.initializeBackend(t),n=e.success,e.asyncInit?[4,n]:[3,2]);case 1:return a=o.sent(),[3,3];case 2:a=n,o.label=3;case 3:if(!a)return[2,!1];o.label=4;case 4:return this.backendInstance=this.registry[t],this.setupRegisteredKernels(),this.profiler=new lp(this.backendInstance),[2,!0]}}))}))},r.prototype.setupRegisteredKernels=function(){var t=this;Rs(this.backendName).forEach((function(e){e.setupFunc!=null&&e.setupFunc(t.backendInstance)}))},r.prototype.disposeRegisteredKernels=function(t){var e=this;Rs(t).forEach((function(n){n.disposeFunc!=null&&n.disposeFunc(e.registry[t])}))},r.prototype.initializeBackend=function(t){var e=this,n=this.registryFactory[t];if(n==null)throw new Error("Cannot initialize backend "+t+", no registration found.");try{var a=n.factory();if(Promise.resolve(a)===a){var o=++this.pendingBackendInitId,i=a.then((function(s){return!(o<e.pendingBackendInitId)&&(e.registry[t]=s,e.pendingBackendInit=null,!0)})).catch((function(s){return!(o<e.pendingBackendInitId)&&(e.pendingBackendInit=null,console.warn("Initialization of backend "+t+" failed"),console.warn(s.stack||s.message),!1)}));return this.pendingBackendInit=i,{success:i,asyncInit:!0}}return this.registry[t]=a,{success:!0,asyncInit:!1}}catch(s){return console.warn("Initialization of backend "+t+" failed"),console.warn(s.stack||s.message),{success:!1,asyncInit:!1}}},r.prototype.removeBackend=function(t){if(!(t in this.registryFactory))throw new Error(t+" backend not found in registry");this.backendName===t&&this.pendingBackendInit!=null&&this.pendingBackendInitId++,t in this.registry&&(this.disposeRegisteredKernels(t),this.registry[t].dispose(),delete this.registry[t]),delete this.registryFactory[t],this.backendName===t&&(this.pendingBackendInit=null,this.backendName=null,this.backendInstance=null)},r.prototype.getSortedBackends=function(){var t=this;if(Object.keys(this.registryFactory).length===0)throw new Error("No backend found in registry.");return Object.keys(this.registryFactory).sort((function(e,n){return t.registryFactory[n].priority-t.registryFactory[e].priority}))},r.prototype.initializeBackendsAndReturnBest=function(){for(var t=this.getSortedBackends(),e=0;e<t.length;e++){var n=t[e],a=this.initializeBackend(n),o=a.success,i=a.asyncInit;if(i||o)return{name:n,asyncInit:i}}throw new Error("Could not initialize any backends, all backend initializations failed.")},r.prototype.moveData=function(t,e){var n=this.state.tensorInfo.get(e),a=n.backend,o=this.readSync(e);a.disposeData(e),n.backend=t,t.move(e,o,n.shape,n.dtype),this.shouldCheckForMemLeaks()&&this.state.numDataMovesStack[this.state.numDataMovesStack.length-1]++},r.prototype.tidy=function(t,e){var n,a=this,o=null;if(e==null){if(typeof t!="function")throw new Error("Please provide a function to tidy()");e=t}else{if(typeof t!="string"&&!(t instanceof String))throw new Error("When calling with two arguments, the first argument to tidy() must be a string");if(typeof e!="function")throw new Error("When calling with two arguments, the 2nd argument to tidy() must be a function");o=t}return this.scopedRun((function(){return a.startScope(o)}),(function(){return a.endScope(n)}),(function(){return(n=e())instanceof Promise&&console.error("Cannot return a Promise inside of tidy."),n}))},r.prototype.scopedRun=function(t,e,n){t();try{var a=n();return e(),a}catch(o){throw e(),o}},r.prototype.nextTensorId=function(){return r.nextTensorId++},r.prototype.nextVariableId=function(){return r.nextVariableId++},r.prototype.clone=function(t){var e=this.makeTensorFromDataId(t.dataId,t.shape,t.dtype),n={x:t};return this.addTapeNode(this.state.activeScope.name,n,[e],(function(a){return{x:function(){return a.toFloat()}}}),[],{}),e},r.prototype.runKernel=function(t,e,n,a,o){return this.runKernelFunc(null,e,null,t,n,a,o)},r.prototype.shouldCheckForMemLeaks=function(){return this.ENV.getBool("IS_TEST")},r.prototype.checkKernelForMemLeak=function(t,e,n){var a=this.backend.numDataIds(),o=0;n.forEach((function(u){o+=u.dtype==="complex64"?3:1}));var i=this.state.numDataMovesStack[this.state.numDataMovesStack.length-1],s=a-e-o-i;if(s>0)throw new Error("Backend '"+this.backendName+"' has an internal memory leak ("+s+" data ids) after running '"+t+"'")},r.prototype.runKernelFunc=function(t,e,n,a,o,i,s){var u,c=this,l=[],p=this.isTapeOn();a==null&&(a=this.state.activeScope!=null?this.state.activeScope.name:"");var d,h=this.state.numBytes,f=this.state.numTensors;this.shouldCheckForMemLeaks()&&this.state.numDataMovesStack.push(0);var m,v=hu(a,this.backendName);if(v!=null)d=function(){var y=c.backend.numDataIds();m=v.kernelFunc({inputs:e,attrs:o,backend:c.backend});var x=Array.isArray(m)?m:[m];c.shouldCheckForMemLeaks()&&c.checkKernelForMemLeak(a,y,x);var b=x.map((function(R){var I=R.dataId,k=R.shape,T=R.dtype;return c.makeTensorFromDataId(I,k,T)}));if(p){var C=c.getTensorsForGradient(a,e,b);if(C==null){s==null&&(s=[]);var E=b.filter((function(R,I){return s[I]}));C=(i||[]).slice().concat(E)}l=c.saveTensorsForBackwardMode(C)}return b};else{var g=function(y){p&&(l=y.map((function(x){return c.keep(c.clone(x))})))};d=function(){var y=c.backend.numDataIds();m=c.tidy((function(){return t(c.backend,g)}));var x=Array.isArray(m)?m:[m];return c.shouldCheckForMemLeaks()&&c.checkKernelForMemLeak(a,y,x),x}}return this.scopedRun((function(){return c.state.kernelDepth++}),(function(){return c.state.kernelDepth--}),(function(){u=c.ENV.getBool("DEBUG")?c.profiler.profileKernel(a,e,(function(){return d()})):d()})),p&&this.addTapeNode(a,e,u,n,l,o),this.state.profiling&&this.state.activeProfile.kernels.push({name:a,bytesAdded:this.state.numBytes-h,totalBytesSnapshot:this.state.numBytes,tensorsAdded:this.state.numTensors-f,totalTensorsSnapshot:this.state.numTensors,inputShapes:Object.keys(e).map((function(y){return e[y].shape})),outputShapes:u.map((function(y){return y.shape}))}),Array.isArray(m)?u:u[0]},r.prototype.saveTensorsForBackwardMode=function(t){var e=this;return t.map((function(n){return e.keep(e.clone(n))}))},r.prototype.getTensorsForGradient=function(t,e,n){var a=ks(t);if(a!=null){var o=a.inputsToSave||[],i=a.outputsToSave||[],s=void 0;a.saveAllInputs?(S(Array.isArray(e),(function(){return"saveAllInputs is true, expected inputs to be an array."})),s=Object.keys(e).map((function(c){return e[c]}))):s=o.map((function(c){return e[c]}));var u=n.filter((function(c,l){return i[l]}));return s.concat(u)}return null},r.prototype.makeTensor=function(t,e,n,a){if(t==null)throw new Error("Values passed to engine.makeTensor() are null");n=n||"float32",a=a||this.backend;var o=t;n==="string"&&Bt(t[0])&&(o=t.map((function(l){return Su(l)})));var i=a.write(o,e,n),s=new ge(e,n,i,this.nextTensorId());if(this.incRef(s,a),n==="string"){var u=this.state.tensorInfo.get(i),c=Cu(o);this.state.numBytes+=c-u.bytes,u.bytes=c}return s},r.prototype.makeTensorFromDataId=function(t,e,n,a){var o=new ge(e,n=n||"float32",t,this.nextTensorId());return this.incRef(o,a),o},r.prototype.makeVariable=function(t,e,n,a){e===void 0&&(e=!0),n=n||this.nextVariableId().toString(),a!=null&&a!==t.dtype&&(t=t.asType(a));var o=new Vr(t,e,n,this.nextTensorId());if(this.state.registeredVariables[o.name]!=null)throw new Error("Variable with name "+o.name+" was already registered");return this.state.registeredVariables[o.name]=o,this.incRef(o,this.backend),o},r.prototype.incRef=function(t,e){var n=this.state.tensorInfo.has(t.dataId)?this.state.tensorInfo.get(t.dataId).refCount:0;if(this.state.numTensors++,t.dtype==="string"&&this.state.numStringTensors++,n===0){this.state.numDataBuffers++;var a=0;t.dtype!=="complex64"&&t.dtype!=="string"&&(a=t.size*Eo(t.dtype)),this.state.tensorInfo.set(t.dataId,{backend:e||this.backend,dtype:t.dtype,shape:t.shape,bytes:a,refCount:0}),this.state.numBytes+=a}this.state.tensorInfo.get(t.dataId).refCount++,t instanceof Vr||this.track(t)},r.prototype.disposeTensor=function(t){if(this.state.tensorInfo.has(t.dataId)){this.state.numTensors--,t.dtype==="string"&&this.state.numStringTensors--;var e=this.state.tensorInfo.get(t.dataId);e.refCount<=1?(t.dtype!=="complex64"&&(this.state.numBytes-=e.bytes),this.state.numDataBuffers--,e.backend.disposeData(t.dataId),this.state.tensorInfo.delete(t.dataId)):this.state.tensorInfo.get(t.dataId).refCount--}},r.prototype.disposeVariables=function(){for(var t in this.state.registeredVariables){var e=this.state.registeredVariables[t];this.disposeVariable(e)}},r.prototype.disposeVariable=function(t){this.disposeTensor(t),this.state.registeredVariables[t.name]!=null&&delete this.state.registeredVariables[t.name]},r.prototype.memory=function(){var t=this.backend.memory();return t.numTensors=this.state.numTensors,t.numDataBuffers=this.state.numDataBuffers,t.numBytes=this.state.numBytes,this.state.numStringTensors>0&&(t.unreliable=!0,t.reasons==null&&(t.reasons=[]),t.reasons.push("Memory usage by string tensors is approximate (2 bytes per character)")),t},r.prototype.profile=function(t){return Y(this,void 0,void 0,(function(){var e,n;return Q(this,(function(a){return this.state.profiling=!0,e=this.state.numBytes,n=this.state.numTensors,this.state.activeProfile.kernels=[],this.state.activeProfile.result=t(),this.state.profiling=!1,this.state.activeProfile.peakBytes=Math.max.apply(Math,this.state.activeProfile.kernels.map((function(o){return o.totalBytesSnapshot}))),this.state.activeProfile.newBytes=this.state.numBytes-e,this.state.activeProfile.newTensors=this.state.numTensors-n,[2,this.state.activeProfile]}))}))},r.prototype.isTapeOn=function(){return this.state.gradientDepth>0&&this.state.kernelDepth===0},r.prototype.addTapeNode=function(t,e,n,a,o,i){var s=this,u={id:this.state.nextTapeNodeId++,kernelName:t,inputs:e,outputs:n,saved:o},c=ks(t);c!=null&&(a=c.gradFunc),a!=null&&(u.gradient=function(l){return l=l.map((function(p,d){if(p==null){var h=n[d],f=On(h.size,h.dtype);return s.makeTensor(f,h.shape,h.dtype)}return p})),a(l.length>1?l:l[0],o,i)}),this.state.activeTape.push(u)},r.prototype.keep=function(t){return t.kept=!0,t},r.prototype.startTape=function(){this.state.gradientDepth===0&&(this.state.activeTape=[]),this.state.gradientDepth++},r.prototype.endTape=function(){this.state.gradientDepth--},r.prototype.startScope=function(t){var e={track:[],name:"unnamed scope",id:this.state.nextScopeId++};t&&(e.name=t),this.state.scopeStack.push(e),this.state.activeScope=e},r.prototype.endScope=function(t){for(var e=this,n=To(t),a=new Set(n.map((function(u){return u.id}))),o=0;o<this.state.activeScope.track.length;o++){var i=this.state.activeScope.track[o];i.kept||a.has(i.id)||i.dispose()}var s=this.state.scopeStack.pop();this.state.activeScope=this.state.scopeStack.length===0?null:this.state.scopeStack[this.state.scopeStack.length-1],n.forEach((function(u){u.kept||u.scopeId!==s.id||e.track(u)}))},r.prototype.gradients=function(t,e,n,a){var o=this;if(a===void 0&&(a=!1),S(e.length>0,(function(){return"gradients() received an empty list of xs."})),n!=null&&n.dtype!=="float32")throw new Error("dy must have 'float32' dtype, but has '"+n.dtype+"'");var i=this.scopedRun((function(){return o.startTape()}),(function(){return o.endTape()}),(function(){return o.tidy("forward",t)}));S(i instanceof ge,(function(){return"The result y returned by f() must be a tensor."}));var s=(function(u,c,l){for(var p={},d={},h=0;h<c.length;h++)p[c[h].id]=!0;for(h=0;h<u.length;h++){var f=(E=u[h]).inputs;for(var m in f){for(var v=f[m],g=!1,y=0;y<c.length;y++)if(p[v.id]){E.outputs.forEach((function(T){return p[T.id]=!0})),g=!0,d[E.id]=!0;break}if(g)break}}var x={};x[l.id]=!0;var b={};for(h=u.length-1;h>=0;h--)for(f=(E=u[h]).inputs,y=0;y<E.outputs.length;y++)if(x[E.outputs[y].id]){for(var m in f)x[f[m].id]=!0,b[E.id]=!0;break}var C=[];for(h=0;h<u.length;h++){var E;if(d[(E=u[h]).id]&&b[E.id]){var R={};for(var m in E.inputs){var I=E.inputs[m];p[I.id]&&(R[m]=I)}var k=Object.assign({},E);k.inputs=R,k.outputs=E.outputs,C.push(k)}}return C})(this.state.activeTape,e,i);if(!a&&s.length===0&&e.length>0)throw new Error("Cannot compute gradient of y=f(x) with respect to x. Make sure that the f you passed encloses all operations that lead from x to y.");return this.tidy("backward",(function(){var u,c,l={};l[i.id]=n??(u=i.shape,c=Io($(u),"float32"),D.makeTensor(c,u,"float32")),(function(d,h,f){for(var m=function(g){var y=h[g],x=[];if(y.outputs.forEach((function(R){var I=d[R.id];I!=null?x.push(I):x.push(null)})),y.gradient==null)throw new Error("Cannot compute gradient: gradient function not found for "+y.kernelName+".");var b=y.gradient(x),C=function(R){if(!(R in b))throw new Error("Cannot backprop through input "+R+". Available gradients found: "+Object.keys(b)+".");var I=f((function(){return b[R]()}));if(I.dtype!=="float32")throw new Error("Error in gradient for op "+y.kernelName+". The gradient of input "+R+" must have 'float32' dtype, but has '"+I.dtype+"'");var k=y.inputs[R];if(!Re(I.shape,k.shape))throw new Error("Error in gradient for op "+y.kernelName+". The gradient of input '"+R+"' has shape '"+I.shape+"', which does not match the shape of the input '"+k.shape+"'");if(d[k.id]==null)d[k.id]=I;else{var T=d[k.id];d[k.id]=T.add(I),T.dispose()}};for(var E in y.inputs)C(E)},v=h.length-1;v>=0;v--)m(v)})(l,s,(function(d){return o.tidy(d)}));var p=e.map((function(d){return l[d.id]}));return o.state.gradientDepth===0&&(o.state.activeTape.forEach((function(d){for(var h=0,f=d.saved;h<f.length;h++)f[h].dispose()})),o.state.activeTape=null),{value:i,grads:p}}))},r.prototype.customGrad=function(t){var e=this;return S(Br(t),(function(){return"The f passed in customGrad(f) must be a function."})),function(){for(var n,a=[],o=0;o<arguments.length;o++)a[o]=arguments[o];S(a.every((function(s){return s instanceof ge})),(function(){return"The args passed in customGrad(f)(x1, x2,...) must all be tensors"}));var i={};return a.forEach((function(s,u){i[u]=s})),e.runKernelFunc((function(s,u){return S((n=t.apply(void 0,a.concat([u]))).value instanceof ge,(function(){return"The function f passed in customGrad(f) must return an object where `obj.value` is a tensor"})),S(Br(n.gradFunc),(function(){return"The function f passed in customGrad(f) must return an object where `obj.gradFunc` is a function."})),n.value}),i,(function(s,u){var c=n.gradFunc(s,u),l=Array.isArray(c)?c:[c];S(l.length===a.length,(function(){return"The function f passed in customGrad(f) must return an object where `obj.gradFunc` is a function that returns the same number of tensors as inputs passed to f(...)."})),S(l.every((function(d){return d instanceof ge})),(function(){return"The function f passed in customGrad(f) must return an object where `obj.gradFunc` is a function that returns a list of only tensors."}));var p={};return l.forEach((function(d,h){p[h]=function(){return d}})),p}))}},r.prototype.readSync=function(t){return this.state.tensorInfo.get(t).backend.readSync(t)},r.prototype.read=function(t){return this.state.tensorInfo.get(t).backend.read(t)},r.prototype.time=function(t){return Y(this,void 0,void 0,(function(){var e,n;return Q(this,(function(a){switch(a.label){case 0:return e=et(),[4,this.backend.time(t)];case 1:return(n=a.sent()).wallMs=et()-e,[2,n]}}))}))},r.prototype.track=function(t){return this.state.activeScope!=null&&(t.scopeId=this.state.activeScope.id,this.state.activeScope.track.push(t)),t},Object.defineProperty(r.prototype,"registeredVariables",{get:function(){return this.state.registeredVariables},enumerable:!0,configurable:!0}),r.prototype.reset=function(){for(var t in this.pendingBackendInitId++,this.state.dispose(),this.ENV.reset(),this.state=new Os,this.registry)this.disposeRegisteredKernels(t),this.registry[t].dispose(),delete this.registry[t];this.backendName=null,this.backendInstance=null,this.pendingBackendInit=null},r.nextTensorId=0,r.nextVariableId=0,r})(),D=(function(){var r=(function(){if(La==null){var e=void 0;if(typeof window<"u")e=window;else if(typeof global<"u")e=global;else if(typeof process<"u")e=process;else{if(typeof self>"u")throw new Error("Could not find a global object");e=self}La=e}return La})();if(r._tfengine==null){var t=new sp(r);r._tfengine=new fp(t)}return(function(e){du=e})(r._tfengine.ENV),mt=function(){return r._tfengine},r._tfengine})();function Tu(){return typeof window<"u"&&window.document!=null||typeof WorkerGlobalScope<"u"}var It=B();It.registerFlag("DEBUG",(function(){return!1}),(function(r){r&&console.warn("Debugging mode is ON. The output of every math call will be downloaded to CPU and checked for NaNs. This significantly impacts performance.")})),It.registerFlag("IS_BROWSER",(function(){return Tu()})),It.registerFlag("IS_NODE",(function(){return typeof process<"u"&&process.versions!==void 0&&process.versions.node!==void 0})),It.registerFlag("IS_CHROME",(function(){return typeof navigator<"u"&&navigator!=null&&navigator.userAgent!=null&&/Chrome/.test(navigator.userAgent)&&/Google Inc/.test(navigator.vendor)})),It.registerFlag("PROD",(function(){return!1})),It.registerFlag("TENSORLIKE_CHECK_SHAPE_CONSISTENCY",(function(){return It.getBool("DEBUG")})),It.registerFlag("DEPRECATION_WARNINGS_ENABLED",(function(){return!0})),It.registerFlag("IS_TEST",(function(){return!1}));var Yn,Xe,je,Yt={},Va={alpha:!1,antialias:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!1,depth:!1,stencil:!1,failIfMajorPerformanceCaveat:!0};function Au(r,t){Yt[r]=t}function Ct(r){r in Yt||(Yt[r]=(function(e){if(e!==1&&e!==2)throw new Error("Cannot get WebGL rendering context, WebGL is disabled.");var n=(function(a){if(typeof OffscreenCanvas<"u"&&a===2)return new OffscreenCanvas(300,150);if(typeof document<"u")return document.createElement("canvas");throw new Error("Cannot create a canvas in this context")})(e);return n.addEventListener("webglcontextlost",(function(a){a.preventDefault(),delete Yt[e]}),!1),e===1?n.getContext("webgl",Va)||n.getContext("experimental-webgl",Va):n.getContext("webgl2",Va)})(r));var t=Yt[r];return t.isContextLost()?(delete Yt[r],Ct(r)):(t.disable(t.DEPTH_TEST),t.disable(t.STENCIL_TEST),t.disable(t.BLEND),t.disable(t.DITHER),t.disable(t.POLYGON_OFFSET_FILL),t.disable(t.SAMPLE_COVERAGE),t.enable(t.SCISSOR_TEST),t.enable(t.CULL_FACE),t.cullFace(t.BACK),Yt[r])}function Xr(r,t){return[t,r]}function Hn(r){var t=$(r);return Mr(Math.ceil(t/4))}function nr(r,t){return[Math.max(1,Math.ceil(t/2)),Math.max(1,Math.ceil(r/2))]}function Ao(r,t){var e,n,a,o,i,s,u,c,l,p=r;return B().getNumber("WEBGL_VERSION")===2?(e=p.R32F,n=p.R16F,a=p.RGBA16F,o=p.RGBA32F,i=p.RED,s=4,u=1,c=p.HALF_FLOAT,l=p.FLOAT):(e=r.RGBA,n=r.RGBA,a=r.RGBA,o=p.RGBA,i=r.RGBA,s=4,u=4,c=t!=null?t.HALF_FLOAT_OES:null,l=r.FLOAT),{internalFormatFloat:e,internalFormatHalfFloat:n,internalFormatPackedHalfFloat:a,internalFormatPackedFloat:o,textureFormatFloat:i,downloadTextureFormat:r.RGBA,downloadUnpackNumChannels:s,defaultNumChannels:u,textureTypeHalfFloat:c,textureTypeFloat:l}}function X(r,t,e){var n=e();return t&&(function(a){var o=a.getError();if(o!==a.NO_ERROR)throw new Error("WebGL Error: "+Ou(a,o))})(r),n}(function(r){r[r.DENSE=0]="DENSE",r[r.SHARED_BATCH=1]="SHARED_BATCH"})(Yn||(Yn={})),(function(r){r[r.RENDER=0]="RENDER",r[r.UPLOAD=1]="UPLOAD",r[r.PIXELS=2]="PIXELS",r[r.DOWNLOAD=3]="DOWNLOAD"})(Xe||(Xe={})),(function(r){r[r.UNPACKED_FLOAT16=0]="UNPACKED_FLOAT16",r[r.UNPACKED_FLOAT32=1]="UNPACKED_FLOAT32",r[r.PACKED_4X1_UNSIGNED_BYTE=2]="PACKED_4X1_UNSIGNED_BYTE",r[r.PACKED_2X2_FLOAT32=3]="PACKED_2X2_FLOAT32",r[r.PACKED_2X2_FLOAT16=4]="PACKED_2X2_FLOAT16"})(je||(je={}));var mp=596e-10,vp=65504;function Du(r){return!!(B().getBool("WEBGL_RENDER_FLOAT32_ENABLED")||r===0||mp<Math.abs(r)&&Math.abs(r)<vp)}function Ou(r,t){switch(t){case r.NO_ERROR:return"NO_ERROR";case r.INVALID_ENUM:return"INVALID_ENUM";case r.INVALID_VALUE:return"INVALID_VALUE";case r.INVALID_OPERATION:return"INVALID_OPERATION";case r.INVALID_FRAMEBUFFER_OPERATION:return"INVALID_FRAMEBUFFER_OPERATION";case r.OUT_OF_MEMORY:return"OUT_OF_MEMORY";case r.CONTEXT_LOST_WEBGL:return"CONTEXT_LOST_WEBGL";default:return"Unknown error code "+t}}function zn(r,t,e){return Dt(r,t,(function(){return r.getExtension(e)}),'Extension "'+e+'" not supported on this browser.')}function _u(r,t,e){var n=Dt(r,t,(function(){return r.createShader(r.VERTEX_SHADER)}),"Unable to create vertex WebGLShader.");if(X(r,t,(function(){return r.shaderSource(n,e)})),X(r,t,(function(){return r.compileShader(n)})),r.getShaderParameter(n,r.COMPILE_STATUS)===!1)throw console.log(r.getShaderInfoLog(n)),new Error("Failed to compile vertex shader.");return n}function Fu(r,t,e){var n=Dt(r,t,(function(){return r.createShader(r.FRAGMENT_SHADER)}),"Unable to create fragment WebGLShader.");if(X(r,t,(function(){return r.shaderSource(n,e)})),X(r,t,(function(){return r.compileShader(n)})),r.getShaderParameter(n,r.COMPILE_STATUS)===!1)throw(function(a,o){var i=gp.exec(o);if(i==null)return console.log("Couldn't parse line number in error: "+o),void console.log(a);for(var s=+i[1],u=a.split(`
`),c=u.length.toString().length+2,l=u.map((function(v,g){return tn((g+1).toString(),c)+v})),p=0,d=0;d<l.length;d++)p=Math.max(l[d].length,p);var h=l.slice(0,s-1),f=l.slice(s-1,s),m=l.slice(s);console.log(h.join(`
`)),console.log(o.split(`
`)[0]),console.log("%c "+tn(f[0],p),"border:1px solid red; background-color:#e3d2d2; color:#a61717"),console.log(m.join(`
`))})(e,r.getShaderInfoLog(n)),new Error("Failed to compile fragment shader.");return n}var Ir,kr,gp=/ERROR: [0-9]+:([0-9]+):/g;function Mu(r,t){return Dt(r,t,(function(){return r.createProgram()}),"Unable to create WebGLProgram.")}function Bu(r,t,e){if(X(r,t,(function(){return r.linkProgram(e)})),r.getProgramParameter(e,r.LINK_STATUS)===!1)throw console.log(r.getProgramInfoLog(e)),new Error("Failed to link vertex and fragment shaders.")}function Rr(r,t,e){if(X(r,t,(function(){return r.validateProgram(e)})),r.getProgramParameter(e,r.VALIDATE_STATUS)===!1)throw console.log(r.getProgramInfoLog(e)),new Error("Shader program validation failed.")}function Pu(r,t,e){var n=Dt(r,t,(function(){return r.createBuffer()}),"Unable to create WebGLBuffer");return X(r,t,(function(){return r.bindBuffer(r.ARRAY_BUFFER,n)})),X(r,t,(function(){return r.bufferData(r.ARRAY_BUFFER,e,r.STATIC_DRAW)})),n}function Lu(r,t,e){var n=Dt(r,t,(function(){return r.createBuffer()}),"Unable to create WebGLBuffer");return X(r,t,(function(){return r.bindBuffer(r.ELEMENT_ARRAY_BUFFER,n)})),X(r,t,(function(){return r.bufferData(r.ELEMENT_ARRAY_BUFFER,e,r.STATIC_DRAW)})),n}function Vu(r,t){return Dt(r,t,(function(){return r.createTexture()}),"Unable to create WebGLTexture.")}function Wu(r,t){var e=B().getNumber("WEBGL_MAX_TEXTURE_SIZE");if(r<=0||t<=0){var n="["+r+"x"+t+"]";throw new Error("Requested texture size "+n+" is invalid.")}if(r>e||t>e)throw n="["+r+"x"+t+"]",new Error("Requested texture size "+n+" greater than WebGL maximum on this browser / GPU "+("["+e+"x"+e+"]")+".")}function zu(r,t){return Dt(r,t,(function(){return r.createFramebuffer()}),"Unable to create WebGLFramebuffer.")}function co(r,t,e,n,a,o,i,s){var u=r.getAttribLocation(e,n);return u!==-1&&(X(r,t,(function(){return r.bindBuffer(r.ARRAY_BUFFER,a)})),X(r,t,(function(){return r.vertexAttribPointer(u,o,r.FLOAT,!1,i,s)})),X(r,t,(function(){return r.enableVertexAttribArray(u)})),!0)}function Uu(r,t,e,n){Ku(r,n),X(r,t,(function(){return r.activeTexture(r.TEXTURE0+n)})),X(r,t,(function(){return r.bindTexture(r.TEXTURE_2D,e)}))}function Gu(r,t,e,n){return Dt(r,t,(function(){return r.getUniformLocation(e,n)}),'uniform "'+n+'" not present in program.')}function Hu(r,t,e){return r.getUniformLocation(t,e)}function qu(r,t,e,n,a,o){X(r,t,(function(){return Uu(r,t,n,o)})),X(r,t,(function(){return r.uniform1i(a,o)}))}function Tr(r,t,e,n){X(r,t,(function(){return r.bindFramebuffer(r.FRAMEBUFFER,n)})),X(r,t,(function(){return r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,e,0)}))}function lo(r,t,e){X(r,t,(function(){return r.bindFramebuffer(r.FRAMEBUFFER,e)})),X(r,t,(function(){return r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,null,0)}))}function Un(r){var t=r.checkFramebufferStatus(r.FRAMEBUFFER);if(t!==r.FRAMEBUFFER_COMPLETE)throw new Error("Error binding framebuffer: "+ju(r,t))}function ju(r,t){switch(t){case r.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:return"FRAMEBUFFER_INCOMPLETE_ATTACHMENT";case r.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:return"FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT";case r.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:return"FRAMEBUFFER_INCOMPLETE_DIMENSIONS";case r.FRAMEBUFFER_UNSUPPORTED:return"FRAMEBUFFER_UNSUPPORTED";default:return"unknown error "+t}}function Dt(r,t,e,n){var a=X(r,t,(function(){return e()}));if(a==null)throw new Error(n);return a}function Ku(r,t){var e=r.MAX_COMBINED_TEXTURE_IMAGE_UNITS-1,n=t+r.TEXTURE0;if(n<r.TEXTURE0||n>e)throw new Error("textureUnit must be in "+("[gl.TEXTURE0, gl.TEXTURE"+e+"]")+".")}function Qn(r,t){return t===void 0&&(t=2),$(r.slice(0,r.length-t))}function Jn(r){if(r.length===0)throw Error("Cannot get rows and columns of an empty shape array.");return[r.length>1?r[r.length-2]:1,r[r.length-1]]}function Ar(r){var t=[1,1,1];return r.length===0||r.length===1&&r[0]===1||(t=[Qn(r)].concat(Jn(r))),t}function Xu(r,t){var e;t===void 0&&(t=!1);var n=B().getNumber("WEBGL_MAX_TEXTURE_SIZE");if(t&&(n*=2,(r=r.map((function(c,l){return l>=r.length-2?No(r[l]):r[l]}))).length===1&&(r=[2,r[0]])),r.length!==2){var a=Mt(r);r=a.newShape}var o=$(r);if(r.length<=1&&o<=n)return[1,o];if(r.length===2&&r[0]<=n&&r[1]<=n)return r;if(r.length===3&&r[0]*r[1]<=n&&r[2]<=n)return[r[0]*r[1],r[2]];if(r.length===3&&r[0]<=n&&r[1]*r[2]<=n)return[r[0],r[1]*r[2]];if(r.length===4&&r[0]*r[1]*r[2]<=n&&r[3]<=n)return[r[0]*r[1]*r[2],r[3]];if(r.length===4&&r[0]<=n&&r[1]*r[2]*r[3]<=n)return[r[0],r[1]*r[2]*r[3]];if(t){var i=Qn(r),s=2,u=2;return r.length&&(s=(e=Jn(r))[0],u=e[1]),Mr(o=i*(s/2)*(u/2)).map((function(c){return 2*c}))}return Mr(o)}function gr(r){return r%2==0}function Gn(r,t){if(Re(r=r.slice(-2),t=t.slice(-2))||!r.length||!t.length||r[0]===0||r[1]===0||t[0]===0||t[1]===0)return!0;if(r.length!==t.length){var e=r.slice(-1)[0],n=t.slice(-1)[0];if(e===n||gr(e)&&gr(n)&&(r[0]===1||t[0]===1))return!0}return r[1]===t[1]&&gr(r[0])&&gr(t[0])}function $u(r){if(Ir==null){var t=Ct(r);Ir=t.getParameter(t.MAX_TEXTURE_SIZE)}return Ir}function Yu(r){if(kr==null){var t=Ct(r);kr=t.getParameter(t.MAX_TEXTURE_IMAGE_UNITS)}return Math.min(16,kr)}function Qu(r){if(r===0)return 0;var t=Ct(r);return $e(t,"EXT_disjoint_timer_query_webgl2")&&r===2?2:$e(t,"EXT_disjoint_timer_query")?1:0}function $e(r,t){return r.getExtension(t)!=null}function po(r){try{if(Ct(r)!=null)return!0}catch{return!1}return!1}function Ju(r){if(r===0)return!1;var t=Ct(r);if(r===1){if(!$e(t,"OES_texture_float"))return!1}else if(!$e(t,"EXT_color_buffer_float"))return!1;return ho(t)}function Zu(r){if(r===0)return!1;var t=Ct(r);if(r!==1){if($e(t,"EXT_color_buffer_float"))return ho(t);if($e(t,"EXT_color_buffer_half_float")){var e=t.getExtension("EXT_color_buffer_half_float");return(function(n,a){var o=Ao(n,a),i=n.createTexture();n.bindTexture(n.TEXTURE_2D,i),n.texImage2D(n.TEXTURE_2D,0,o.internalFormatHalfFloat,1,1,0,o.textureFormatFloat,o.textureTypeHalfFloat,null);var s=n.createFramebuffer();n.bindFramebuffer(n.FRAMEBUFFER,s),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,i,0);var u=n.checkFramebufferStatus(n.FRAMEBUFFER)===n.FRAMEBUFFER_COMPLETE;return n.bindTexture(n.TEXTURE_2D,null),n.bindFramebuffer(n.FRAMEBUFFER,null),n.deleteTexture(i),n.deleteFramebuffer(s),u})(t,e)}return!1}return!!$e(t,"OES_texture_float")&&!!$e(t,"WEBGL_color_buffer_float")&&ho(t)}function ho(r){var t=Ao(r),e=r.createTexture();r.bindTexture(r.TEXTURE_2D,e),r.texImage2D(r.TEXTURE_2D,0,t.internalFormatFloat,1,1,0,t.textureFormatFloat,t.textureTypeFloat,null);var n=r.createFramebuffer();r.bindFramebuffer(r.FRAMEBUFFER,n),r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,e,0);var a=r.checkFramebufferStatus(r.FRAMEBUFFER)===r.FRAMEBUFFER_COMPLETE;return r.bindTexture(r.TEXTURE_2D,null),r.bindFramebuffer(r.FRAMEBUFFER,null),r.deleteTexture(e),r.deleteFramebuffer(n),a}function ec(r){return r===2&&Ct(r).fenceSync!=null}var yp=Object.freeze({callAndCheck:X,canBeRepresented:Du,getWebGLErrorMessage:Ou,getExtensionOrThrow:zn,createVertexShader:_u,createFragmentShader:Fu,createProgram:Mu,linkProgram:Bu,validateProgram:Rr,createStaticVertexBuffer:Pu,createStaticIndexBuffer:Lu,getNumChannels:function(){return B().getNumber("WEBGL_VERSION")===2?1:4},createTexture:Vu,validateTextureSize:Wu,createFramebuffer:zu,bindVertexBufferToProgramAttribute:co,bindTextureUnit:Uu,unbindTextureUnit:function(r,t,e){Ku(r,e),X(r,t,(function(){return r.activeTexture(r.TEXTURE0+e)})),X(r,t,(function(){return r.bindTexture(r.TEXTURE_2D,null)}))},getProgramUniformLocationOrThrow:Gu,getProgramUniformLocation:Hu,bindTextureToProgramUniformSampler:qu,bindCanvasToFramebuffer:function(r,t){X(r,t,(function(){return r.bindFramebuffer(r.FRAMEBUFFER,null)})),X(r,t,(function(){return r.viewport(0,0,r.canvas.width,r.canvas.height)})),X(r,t,(function(){return r.scissor(0,0,r.canvas.width,r.canvas.height)}))},bindColorTextureToFramebuffer:Tr,unbindColorTextureFromFramebuffer:lo,validateFramebuffer:Un,getFramebufferErrorMessage:ju,getBatchDim:Qn,getRowsCols:Jn,getShapeAs3D:Ar,getTextureShapeFromLogicalShape:Xu,isReshapeFree:Gn,getWebGLMaxTextureSize:$u,resetMaxTextureSize:function(){Ir=null},resetMaxTexturesInShader:function(){kr=null},getMaxTexturesInShader:Yu,getWebGLDisjointQueryTimerVersion:Qu,hasExtension:$e,isWebGLVersionEnabled:po,isCapableOfRenderingToFloatTexture:Ju,isDownloadFloatTextureEnabled:Zu,isWebGLFenceEnabled:ec}),ee=B();function tc(r){B().getBool("DEPRECATION_WARNINGS_ENABLED")&&console.warn(r+" You can disable deprecation warnings with tf.disableDeprecationWarnings().")}function oe(r,t){return D.tidy(r,t)}function He(r){To(r).forEach((function(t){return t.dispose()}))}function xp(r){return D.keep(r)}function nc(){return D.ready()}function Wr(){for(var r=[],t=0;t<arguments.length;t++)r[t]=arguments[t];B().getBool("IS_TEST")||console.warn.apply(console,r)}function gt(r,t){var e=r;if(Fe(r))return t==="string"?[]:[r.length];if(!Array.isArray(r))return[];for(var n=[];Array.isArray(e)||Fe(e)&&t!=="string";)n.push(e.length),e=e[0];return Array.isArray(r)&&B().getBool("TENSORLIKE_CHECK_SHAPE_CONSISTENCY")&&(function a(o,i,s){if(s=s||[],!Array.isArray(o)&&!Fe(o))return void S(i.length===0,(function(){return"Element arr["+s.join("][")+"] is a primitive, but should be an array/TypedArray of "+i[0]+" elements"}));S(i.length>0,(function(){return"Element arr["+s.join("][")+"] should be a primitive, but is an array of "+o.length+" elements"})),S(o.length===i[0],(function(){return"Element arr["+s.join("][")+"] should have "+i[0]+" elements, but has "+o.length+" elements"}));for(var u=i.slice(1),c=0;c<o.length;++c)a(o[c],u,s.concat(c))})(r,n,[]),n}function _s(r,t,e,n){if(r!=null&&(r!=="numeric"&&r!==t||r==="numeric"&&t==="string"))throw new Error("Argument '"+e+"' passed to '"+n+"' must be "+r+" tensor, but got "+t+" tensor")}function N(r,t,e,n){if(n===void 0&&(n="numeric"),r instanceof ge)return _s(n,r.dtype,t,e),r;var a=Dn(r);if(a!=="string"&&["bool","int32","float32"].indexOf(n)>=0&&(a=n),_s(n,a,t,e),r==null||!Fe(r)&&!Array.isArray(r)&&typeof r!="number"&&typeof r!="boolean"&&typeof r!="string"){var o=r==null?"null":r.constructor.name;throw new Error("Argument '"+t+"' passed to '"+e+"' must be a Tensor or TensorLike, but got '"+o+"'")}var i=gt(r,a);Fe(r)||Array.isArray(r)||(r=[r]);var s=a!=="string"?So(r,a,B().getBool("DEBUG")):Tt(r,[],!0);return D.makeTensor(s,i,a)}function zr(r,t,e,n){if(n===void 0&&(n="numeric"),!Array.isArray(r))throw new Error("Argument "+t+" passed to "+e+" must be a `Tensor[]` or `TensorLike[]`");return r.map((function(a,o){return N(a,t+"["+o+"]",e)}),n)}function Do(r,t){for(var e=0;e<r.length;++e)if(r[r.length-e-1]!==t-1-e)return!1;return!0}function rc(r,t,e){for(var n=r.length+t.length,a=[],o=0,i=0,s=0;s<n;s++)e.indexOf(s)===-1?a.push(r[o++]):a.push(t[i++]);return a}function _e(r,t){for(var e=[],n=r.length,a=0;a<n;a++)t.indexOf(a)===-1&&e.push(r[a]);return[e,t.map((function(o){return r[o]}))]}function Le(r,t){return rc(r,t.map((function(e){return 1})),t)}function We(r,t,e){S(Do(t,e),(function(){return r+" supports only inner-most axes for now. Got axes "+t+" and rank-"+e+" input."}))}function ot(r,t){if(Do(r,t))return null;for(var e=[],n=0;n<t;++n)r.indexOf(n)===-1&&e.push(n);return r.forEach((function(a){return e.push(a)})),e}function $r(r){return r.map((function(t,e){return[e,t]})).sort((function(t,e){return t[1]-e[1]})).map((function(t){return t[0]}))}function it(r,t){for(var e=[],n=t-r;n<t;++n)e.push(n);return e}function ac(r,t){var e=r[0].length;r.forEach((function(a,o){S(a.length===e,(function(){return"Error in concat"+e+"D: rank of tensors["+o+"] must be the same as the rank of the rest ("+e+")"}))})),S(t>=0&&t<e,(function(){return"Error in concat"+e+"D: axis must be between 0 and "+(e-1)+"."}));var n=r[0];r.forEach((function(a,o){for(var i=0;i<e;i++)S(i===t||a[i]===n[i],(function(){return"Error in concat"+e+"D: Shape of tensors["+o+"] ("+a+") does not match the shape of the rest ("+n+") along the non-concatenated axis "+o+"."}))}))}function rn(r,t){for(var e=r[0].slice(),n=1;n<r.length;n++)e[t]+=r[n][t];return e}function A(r){var t=Object.keys(r);if(t.length!==1)throw new Error("Please provide an object with a single key (operation name) mapping to a function. Got an object with "+t.length+" keys.");var e=t[0],n=r[e];e.endsWith("_")&&(e=e.substring(0,e.length-1));var a=function(){for(var o=[],i=0;i<arguments.length;i++)o[i]=arguments[i];D.startScope(e);try{var s=n.apply(void 0,o);return s instanceof Promise&&console.error("Cannot return a Promise inside of tidy."),D.endScope(s),s}catch(u){throw D.endScope(null),u}};return Object.defineProperty(a,"name",{value:e,configurable:!0}),a}ee.registerFlag("HAS_WEBGL",(function(){return ee.getNumber("WEBGL_VERSION")>0})),ee.registerFlag("WEBGL_VERSION",(function(){return po(2)?2:po(1)?1:0})),ee.registerFlag("WEBGL_BUFFER_SUPPORTED",(function(){return ee.get("WEBGL_VERSION")===2})),ee.registerFlag("WEBGL_CPU_FORWARD",(function(){return!0})),ee.registerFlag("WEBGL_FORCE_F16_TEXTURES",(function(){return!1})),ee.registerFlag("WEBGL_PACK",(function(){return ee.getBool("HAS_WEBGL")})),ee.registerFlag("WEBGL_PACK_NORMALIZATION",(function(){return ee.getBool("WEBGL_PACK")})),ee.registerFlag("WEBGL_PACK_CLIP",(function(){return ee.getBool("WEBGL_PACK")})),ee.registerFlag("WEBGL_PACK_DEPTHWISECONV",(function(){return!1})),ee.registerFlag("WEBGL_PACK_BINARY_OPERATIONS",(function(){return ee.getBool("WEBGL_PACK")})),ee.registerFlag("WEBGL_PACK_UNARY_OPERATIONS",(function(){return ee.getBool("WEBGL_PACK")})),ee.registerFlag("WEBGL_PACK_ARRAY_OPERATIONS",(function(){return ee.getBool("WEBGL_PACK")})),ee.registerFlag("WEBGL_PACK_IMAGE_OPERATIONS",(function(){return ee.getBool("WEBGL_PACK")})),ee.registerFlag("WEBGL_PACK_REDUCE",(function(){return ee.getBool("WEBGL_PACK")})),ee.registerFlag("WEBGL_LAZILY_UNPACK",(function(){return ee.getBool("WEBGL_PACK")})),ee.registerFlag("WEBGL_CONV_IM2COL",(function(){return ee.getBool("WEBGL_PACK")})),ee.registerFlag("WEBGL_MAX_TEXTURE_SIZE",(function(){return $u(ee.getNumber("WEBGL_VERSION"))})),ee.registerFlag("WEBGL_MAX_TEXTURES_IN_SHADER",(function(){return Yu(ee.getNumber("WEBGL_VERSION"))})),ee.registerFlag("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION",(function(){var r=ee.getNumber("WEBGL_VERSION");return r===0?0:Qu(r)})),ee.registerFlag("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_RELIABLE",(function(){return ee.getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION")>0&&(r=navigator.userAgent||navigator.vendor||window.opera,!(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(r)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(r.substr(0,4))));var r})),ee.registerFlag("WEBGL_RENDER_FLOAT32_CAPABLE",(function(){return Ju(ee.getNumber("WEBGL_VERSION"))})),ee.registerFlag("WEBGL_RENDER_FLOAT32_ENABLED",(function(){return!ee.getBool("WEBGL_FORCE_F16_TEXTURES")&&ee.getBool("WEBGL_RENDER_FLOAT32_CAPABLE")})),ee.registerFlag("WEBGL_DOWNLOAD_FLOAT_ENABLED",(function(){return Zu(ee.getNumber("WEBGL_VERSION"))})),ee.registerFlag("WEBGL_FENCE_API_ENABLED",(function(){return ec(ee.getNumber("WEBGL_VERSION"))})),ee.registerFlag("WEBGL_SIZE_UPLOAD_UNIFORM",(function(){return ee.getBool("WEBGL_RENDER_FLOAT32_ENABLED")?4:0})),ku=tc;var Ae=A({complex_:function(r,t){var e=N(r,"real","complex"),n=N(t,"imag","complex");return fe(e.shape,n.shape,"real and imag shapes, "+e.shape+" and "+n.shape+", must match in call to tf.complex()."),D.runKernelFunc((function(a){return a.complex(e,n)}),{$real:e,$imag:n})}}),ze=A({real_:function(r){var t=N(r,"input","real");return D.runKernelFunc((function(e){return e.real(t)}),{$input:t})}}),Ze=A({imag_:function(r){var t=N(r,"input","imag");return D.runKernelFunc((function(e){return e.imag(t)}),{$input:t})}});function De(r,t,e){return Ut(r,t,gt(r,e),e)}function Ut(r,t,e,n){if(n==null&&(n=Dn(r)),n==="complex64")throw new Error("Cannot construct a complex64 tensor directly. Please use tf.complex(real, imag).");if(!Fe(r)&&!Array.isArray(r)&&typeof r!="number"&&typeof r!="boolean"&&typeof r!="string")throw new Error("values passed to tensor(values) must be a number/boolean/string or an array of numbers/booleans/strings, or a TypedArray");if(t!=null){ko(t);var a=$(t),o=$(e);S(a===o,(function(){return"Based on the provided shape, ["+t+"], the tensor should have "+a+" values but has "+o}));for(var i=0;i<e.length;++i){var s=e[i],u=i!==e.length-1||s!==$(t.slice(i));S(e[i]===t[i]||!u,(function(){return"Error creating a new Tensor. Inferred shape ("+e+") does not match the provided shape ("+t+"). "}))}}return Fe(r)||Array.isArray(r)||(r=[r]),t=t||e,r=n!=="string"?So(r,n,B().getBool("DEBUG")):Tt(r,[],!0),D.makeTensor(r,t,n)}function K(r,t){if((Fe(r)&&t!=="string"||Array.isArray(r))&&t!=="complex64")throw new Error("Error creating a new Scalar: value must be a primitive (number|boolean|string)");if(t==="string"&&Fe(r)&&!(r instanceof Uint8Array))throw new Error("When making a scalar from encoded string, the value must be `Uint8Array`.");return Ut(r,[],[],t)}function nt(r,t){on(r);var e=gt(r,t);if(e.length!==1)throw new Error("tensor1d() requires values to be a flat/TypedArray");return Ut(r,null,e,t)}function Lt(r,t,e){if(on(r),t!=null&&t.length!==2)throw new Error("tensor2d() requires shape to have two numbers");var n=gt(r,e);if(n.length!==2&&n.length!==1)throw new Error("tensor2d() requires values to be number[][] or flat/TypedArray");if(n.length===1&&t==null)throw new Error("tensor2d() requires shape to be provided when `values` are a flat/TypedArray");return Ut(r,t,n,e)}function oc(r,t,e){if(on(r),t!=null&&t.length!==3)throw new Error("tensor3d() requires shape to have three numbers");var n=gt(r,e);if(n.length!==3&&n.length!==1)throw new Error("tensor3d() requires values to be number[][][] or flat/TypedArray");if(n.length===1&&t==null)throw new Error("tensor3d() requires shape to be provided when `values` are a flat array");return Ut(r,t,n,e)}function Qt(r,t,e){if(on(r),t!=null&&t.length!==4)throw new Error("tensor4d() requires shape to have four numbers");var n=gt(r,e);if(n.length!==4&&n.length!==1)throw new Error("tensor4d() requires values to be number[][][][] or flat/TypedArray");if(n.length===1&&t==null)throw new Error("tensor4d() requires shape to be provided when `values` are a flat array");return Ut(r,t,n,e)}function bp(r,t,e){if(on(r),t!=null&&t.length!==5)throw new Error("tensor5d() requires shape to have five numbers");var n=gt(r,e);if(n.length!==5&&n.length!==1)throw new Error("tensor5d() requires values to be number[][][][][] or flat/TypedArray");if(n.length===1&&t==null)throw new Error("tensor5d() requires shape to be provided when `values` are a flat array");return Ut(r,t,n,e)}function wp(r,t,e){if(on(r),t!=null&&t.length!==6)throw new Error("tensor6d() requires shape to have six numbers");var n=gt(r,e);if(n.length!==6&&n.length!==1)throw new Error("tensor6d() requires values to be number[][][][][][] or flat/TypedArray");if(n.length===1&&t==null)throw new Error("tensor6d() requires shape to be provided when `values` are a flat array");return Ut(r,t=t||n,n,e)}function Cp(r,t,e,n){return t===void 0&&(t=!0),D.makeVariable(r,t,e,n)}function Gt(r,t){if(t===void 0&&(t="float32"),t==="complex64"){var e=Gt(r,"float32"),n=ye(r,"float32");return Ae(e,n)}var a=Io($(r),t);return D.makeTensor(a,r,t)}function ye(r,t){if(t===void 0&&(t="float32"),t==="complex64"){var e=ye(r,"float32"),n=ye(r,"float32");return Ae(e,n)}var a=On($(r),t);return D.makeTensor(a,r,t)}function rr(r,t,e){return D.runKernelFunc((function(n){return n.fill(r,t,e)}),{})}function Oo(r,t,e){if(e<=0)throw new Error("The number of values should be positive.");return D.runKernelFunc((function(n){return n.linspace(r,t,e)}),{})}function kn(r,t,e,n){if(e===void 0&&(e=1),n===void 0&&(n="float32"),e===0)throw new Error("Cannot have a step of zero");if(r===t||r<t&&e<0||t<r&&e>1)return ye([0],n);var a=On(Math.abs(Math.ceil((t-r)/e)),n);t<r&&e===1&&(e=-1),a[0]=r;for(var o=1;o<a.length;o++)a[o]=a[o-1]+e;return nt(a,n)}var Yr=A({onesLike_:function(r){var t=N(r,"x","onesLike");if(t.dtype==="complex64"){var e=Yr(ze(t)),n=ue(Ze(t));return Ae(e,n)}return D.runKernelFunc((function(a){return a.onesLike(t)}),{x:t},(function(a,o){return{x:function(){return ue(a)}}}),"OnesLike")}}),ue=A({zerosLike_:function(r){var t=N(r,"x","zerosLike");return D.runKernelFunc((function(e){return e.zerosLike(t)}),{x:t},(function(e,n){return{x:function(){return ue(e)}}}),"ZerosLike")}}),Qe=A({concat_:function(r,t){t===void 0&&(t=0),S(r.length>=1,(function(){return"Pass at least one tensor to concat"}));var e=zr(r,"tensors","concat");e[0].dtype==="complex64"&&e.forEach((function(s){if(s.dtype!=="complex64")throw new Error(`Cannot concatenate complex64 tensors with a tensor
          with dtype `+s.dtype+". ")})),t=Te(t,e[0].shape)[0];var n=rn(e.map((function(s){return s.shape})),t);if($(n)===0)return De([],n);if((e=e.filter((function(s){return s.size>0}))).length===1)return e[0];var a=e.map((function(s){return s.shape}));ac(a,t);var o=e,i={axis:t};return D.runKernelFunc((function(s){return s.concat(e,t)}),o,(function(s){var u=a.map((function(c){return c[t]}));return ar(s,u,t).map((function(c){return function(){return c}}))}),"Concat",i)}}),Np=A({concat1d_:function(r){return Qe(r,0)}}),Ep=A({concat2d_:function(r,t){return Qe(r,t)}}),Sp=A({concat3d_:function(r,t){return Qe(r,t)}}),Ip=A({concat4d_:function(r,t){return Qe(r,t)}}),ar=A({split_:function(r,t,e){e===void 0&&(e=0);var n,a=N(r,"x","split");return e=Te(e,a.shape)[0],typeof t=="number"?(S(a.shape[e]%t==0,(function(){return"Number of splits must evenly divide the axis."})),n=new Array(t).fill(a.shape[e]/t)):(S(a.shape[e]===t.reduce((function(o,i){return o+i})),(function(){return"The sum of sizes must match the size of the axis dimension."})),n=t),D.runKernelFunc((function(o){return o.split(a,n,e)}),{$x:a},(function(o){return{$x:function(){return Qe(o,e)}}}))}});function te(r,t,e){return t===void 0&&(t="float32"),t=t||"float32",ko(r),new $n(r,t,e)}function kp(r,t){t===void 0&&(t=!1),console.log(r.toString(t))}var Qr=A({batchToSpaceND_:function(r,t,e){var n=N(r,"x","batchToSpaceND"),a=t.reduce((function(o,i){return o*i}));return S(n.rank>=1+t.length,(function(){return"input rank is "+n.rank+" but should be > than blockShape.length "+t.length})),S(e.length===t.length,(function(){return"crops.length is "+e.length+" but should be equal to blockShape.length  "+t.length})),S(n.shape[0]%a==0,(function(){return"input tensor batch is "+n.shape[0]+" but is not divisible by the product of the elements of blockShape "+t.join(" * ")+" === "+a})),D.runKernelFunc((function(o){return o.batchToSpaceND(n,t,e)}),{$x:n},(function(o){return{$x:function(){return o.spaceToBatchND(t,e)}}}))}}),_o=A({cast_:function(r,t){var e=N(r,"x","cast");if(!bu(t))throw new Error("Failed to cast to unknown dtype "+t);if(t==="string"&&e.dtype!=="string"||t!=="string"&&e.dtype==="string")throw new Error("Only strings can be casted to strings");var n={dtype:t};return D.runKernelFunc((function(a){return a.cast(e,t)}),{x:e},(function(a){return{x:function(){return a.clone()}}}),"Cast",n)}}),Rp=A({cumsum_:function(r,t,e,n){t===void 0&&(t=0),e===void 0&&(e=!1),n===void 0&&(n=!1);var a=N(r,"x","cumsum"),o=ot([t|=0],a.rank),i=a;o!=null&&(i=a.transpose(o));var s=it(1,a.rank)[0],u=D.runKernelFunc((function(c){return c.cumsum(i,s,e,n)}),{permutedX:i},(function(c){return{permutedX:function(){return c.cumsum(t,e,!n)}}}));return o!=null&&(u=u.transpose(o)),u}}),Fo=A({depthToSpace_:function(r,t,e){e===void 0&&(e="NHWC");var n=N(r,"x","depthToSpace"),a=e==="NHWC"?n.shape[1]:n.shape[2],o=e==="NHWC"?n.shape[2]:n.shape[3],i=e==="NHWC"?n.shape[3]:n.shape[1];return S(a*t>=0,(function(){return`Negative dimension size caused by overflow when multiplying
      `+a+" and "+t+`  for depthToSpace with input shape
      `+n.shape})),S(o*t>=0,(function(){return`Negative dimension size caused by overflow when multiplying
      `+o+" and "+t+` for depthToSpace with input shape
          `+n.shape})),S(i%(t*t)==0,(function(){return"Dimension size must be evenly divisible by "+t*t+" but is "+i+" for depthToSpace with input shape "+n.shape})),D.runKernelFunc((function(s){return s.depthToSpace(n,t,e)}),{$x:n})}}),ht=A({expandDims_:function(r,t){t===void 0&&(t=0);var e=N(r,"x","expandDims",null);S(t<=e.rank,(function(){return"Axis must be <= rank of the tensor"}));var n=e.shape.slice();return t<0&&(S(-(e.rank+1)<=t,(function(){return"Axis must be in the interval ["+-(e.rank+1)+", "+e.rank+"]"})),t=e.rank+t+1),n.splice(t,0,1),tt(e,n)}}),tt=A({reshape_:function(r,t){var e=N(r,"x","reshape",null);t=yu(t,e.size),S(e.size===$(t),(function(){return"new shape and old shape must have the same number of elements."}));var n={shape:t};return D.runKernelFunc((function(a){return a.reshape(e,t)}),{x:e},(function(a){return{x:function(){return a.reshape(e.shape)}}}),"Reshape",n)}}),Jr=A({spaceToBatchND_:function(r,t,e){var n=N(r,"x","spaceToBatchND");return S(n.rank>=1+t.length,(function(){return"input rank "+n.rank+" should be > than [blockShape] "+t.length})),S(e.length===t.length,(function(){return"paddings.shape[0] "+e.length+" must be equal to [blockShape] "+t.length})),S(n.shape.reduce((function(a,o,i){return i>0&&i<=t.length?a&&(o+e[i-1][0]+e[i-1][1])%t[i-1]==0:a}),!0),(function(){return"input spatial dimensions "+n.shape.slice(1)+" with paddings "+e.toString()+" must be divisible by blockShapes "+t.toString()})),D.runKernelFunc((function(a){return a.spaceToBatchND(n,t,e)}),{$x:n},(function(a){return{$x:function(){return a.batchToSpaceND(t,e)}}}))}}),Zr=A({squeeze_:function(r,t){var e=N(r,"x","squeeze");return tt(e,Mt(e.shape,t).newShape)}}),yt=A({stack_:function(r,t){t===void 0&&(t=0);var e=zr(r,"tensors","stack");if(S(e.length>=1,(function(){return"Pass at least one tensor to tf.stack"})),e.length===1)return e[0].expandDims(t);var n=e[0].rank,a=e[0].shape,o=e[0].dtype;S(t<=n,(function(){return"Axis must be <= rank of the tensor"})),e.forEach((function(s){fe(a,s.shape,"All tensors passed to stack must have matching shapes")})),e.forEach((function(s){S(o===s.dtype,(function(){return"All tensors passed to stack must have matching dtypes"}))}));var i=e.map((function(s){return s.expandDims(t)}));return Qe(i,t)}}),_n=A({unstack_:function(r,t){t===void 0&&(t=0),t=t||0;var e=N(r,"x","unstack");S(t>=-e.shape.length&&t<e.shape.length,(function(){return"Axis = "+t+" is not in [-"+e.shape.length+", "+e.shape.length+")"})),t<0&&(t+=e.shape.length);var n={axis:t};return D.runKernelFunc((function(a){return a.unstack(e,t)}),{x:e},(function(a){return{x:function(){return yt(a,t)}}}),"Unpack",n)}}),Mo=function(r,t){return Y(this,void 0,void 0,(function(){var e,n,a,o,i,s,u,c,l,p;return Q(this,(function(d){switch(d.label){case 0:return e=N(r,"x","setdiff1d"),n=N(t,"y","setdiff1d"),S(e.dtype===n.dtype,(function(){return"x and y should have the same dtype, but got x ("+e.dtype+") and y ("+n.dtype+")."})),S(e.rank===1,(function(){return"x should be 1D tensor, but got x ("+e.shape+")."})),S(n.rank===1,(function(){return"y should be 1D tensor, but got y ("+n.shape+")."})),[4,e.data()];case 1:return a=d.sent(),[4,n.data()];case 2:for(o=d.sent(),i=new Set(o),s=0,l=0;l<a.length;l++)i.has(a[l])||s++;for(u=new $n([s],e.dtype),c=new $n([s],"int32"),l=0,p=0;l<a.length;l++)i.has(a[l])||(u.values[p]=a[l],c.values[p]=l,p++);return[2,[u.toTensor(),c.toTensor()]]}}))}))};function Ur(r,t,e,n){n===void 0&&(n=!0);var a=[];if(n)(a=a.concat(t.slice(0))).push(r[0]/e),a=a.concat(r.slice(1));else{a=a.concat(r[0]);for(var o=t.length,i=0;i<o;++i)a=a.concat([r[i+1]/t[i],t[i]]);a=a.concat(r.slice(o+1))}return a}function Gr(r,t,e){e===void 0&&(e=!0);var n=[];if(e){n.push(t);for(var a=t+1;a<r;++a)a<=2*t?(n.push(a),n.push(a-(t+1))):n.push(a)}else{var o=[],i=[];for(a=1;a<r;++a)a>=2*t+1||a%2==1?i.push(a):o.push(a);n.push.apply(n,o),n.push(0),n.push.apply(n,i)}return n}function Hr(r,t,e,n){n===void 0&&(n=!0);var a=[];n?a.push(r[0]/e):a.push(r[0]*e);for(var o=1;o<r.length;++o)o<=t.length?n?a.push(t[o-1]*r[o]):a.push(r[o]/t[o-1]):a.push(r[o]);return a}function ic(r,t){for(var e=[0],n=0;n<t;++n)e.push(r[n][0]);return e}function sc(r,t,e){for(var n=r.slice(0,1),a=0;a<e;++a)n.push(r[a+1]-t[a][0]-t[a][1]);return n}var uc="Add";var ea="Div";var ta="SquaredDifference";var cc="BroadcastTo",lc="OneHot",pc="Identity",dc="Tile",hc="PadV2";var xt=A({add_:function(r,t){var e,n=N(r,"a","add"),a=N(t,"b","add");e=xe(n,a),n=e[0],a=e[1];var o={a:n,b:a};return D.runKernelFunc((function(i,s){var u=i.add(n,a);return s([n,a]),u}),o,null,uc)}});function Rt(r,t){for(var e=r.length,n=[],a=0;a<e;a++){var o=e-1-a,i=r[o]||1;(t[t.length-1-a]||1)>1&&i===1&&n.unshift(o)}return n}function ke(r,t){for(var e=[],n=0;n<t.length;n++){var a=r[r.length-n-1],o=t.length-n-1,i=t[o];(a==null||a===1&&i>1)&&e.unshift(o)}return e}function ie(r,t){for(var e=[],n=Math.max(r.length,t.length),a=0;a<n;a++){var o=r[r.length-a-1];o==null&&(o=1);var i=t[t.length-a-1];if(i==null&&(i=1),o===1)e.unshift(i);else if(i===1)e.unshift(o);else{if(o!==i)throw Error("Operands could not be broadcast together with shapes "+r+" and "+t+".");e.unshift(o)}}return e}var Bo=A({abs_:function(r){var t=N(r,"x","abs");return t.dtype==="complex64"?D.runKernelFunc((function(e){return e.complexAbs(t)}),{$x:t}):D.runKernelFunc((function(e,n){var a=e.abs(t);return n([t]),a}),{x:t},(function(e,n){var a=n[0];return{x:function(){return e.mul(a.toFloat().step(-1))}}}),"Abs")}}),Po=A({acos_:function(r){var t=N(r,"x","acos");return D.runKernelFunc((function(e,n){var a=e.acos(t);return n([t]),a}),{$x:t},(function(e,n){var a=n[0];return{$x:function(){return e.divStrict(K(1).sub(a.toFloat().square()).sqrt()).neg()}}}))}}),Lo=A({acosh_:function(r){var t=N(r,"x","acosh");return D.runKernelFunc((function(e,n){var a=e.acosh(t);return n([t]),a}),{$x:t},(function(e,n){var a=n[0];return{$x:function(){return e.divStrict(a.toFloat().square().sub(1).sqrt())}}}))}}),Vo=A({asin_:function(r){var t=N(r,"x","asin");return D.runKernelFunc((function(e,n){var a=e.asin(t);return n([t]),a}),{$x:t},(function(e,n){var a=n[0];return{$x:function(){return e.divStrict(K(1).sub(a.toFloat().square()).sqrt())}}}))}}),Wo=A({asinh_:function(r){var t=N(r,"x","asinh");return D.runKernelFunc((function(e,n){var a=e.asinh(t);return n([t]),a}),{$x:t},(function(e,n){var a=n[0];return{$x:function(){return e.divStrict(K(1).add(a.toFloat().square()).sqrt())}}}))}}),zo=A({atan_:function(r){var t=N(r,"x","atan");return D.runKernelFunc((function(e,n){var a=e.atan(t);return n([t]),a}),{$x:t},(function(e,n){var a=n[0];return{$x:function(){return e.div(a.toFloat().square().add(1))}}}))}}),Uo=A({atanh_:function(r){var t=N(r,"x","atanh");return D.runKernelFunc((function(e,n){var a=e.atanh(t);return n([t]),a}),{$x:t},(function(e,n){var a=n[0];return{$x:function(){return e.div(K(1).sub(a.toFloat().square()))}}}))}}),Go=A({ceil_:function(r){var t=N(r,"x","ceil");return D.runKernelFunc((function(e){return e.ceil(t)}),{$x:t},(function(e){return{$x:function(){return ue(e)}}}))}}),Ho=A({clipByValue_:function(r,t,e){var n=N(r,"x","clipByValue");S(t<=e,(function(){return"Error in clip: min ("+t+") must be less than or equal to max ("+e+")."}));var a=[n],o={min:t,max:e};return D.runKernelFunc((function(i,s){var u=i.clip(n,t,e);return s([n]),u}),{x:n},(function(i,s){var u=s[0];return{x:function(){return i.where(u.greaterEqual(t).logicalAnd(u.lessEqual(e)),ue(i))}}}),"ClipByValue",o,a)}}),qo=A({cos_:function(r){var t=N(r,"x","cos"),e=[t];return D.runKernelFunc((function(n,a){var o=n.cos(t);return a([t]),o}),{x:t},(function(n,a){var o=a[0];return{x:function(){return o.toFloat().sin().neg().mul(n)}}}),"Cos",{},e)}}),jo=A({cosh_:function(r){var t=N(r,"x","cosh");return D.runKernelFunc((function(e,n){var a=e.cosh(t);return n([t]),a}),{$x:t},(function(e,n){var a=n[0];return{$x:function(){return a.toFloat().sinh().mulStrict(e)}}}))}}),Ko=A({erf_:function(r){var t=N(r,"x","erf");return S(t.dtype==="int32"||t.dtype==="float32",(function(){return"Input dtype must be `int32` or `float32`."})),t.dtype==="int32"&&(t=t.toFloat()),D.runKernelFunc((function(e,n){var a=e.erf(t);return n([t]),a}),{$x:t},(function(e,n){var a=n[0];return{$x:function(){return e.mul(a.square().neg().exp().mul(2/Math.sqrt(Math.PI)))}}}))}}),Xo=A({exp_:function(r){var t=N(r,"x","exp");return D.runKernelFunc((function(e,n){var a=e.exp(t);return n([a]),a}),{x:t},(function(e,n){return{x:function(){return e.mulStrict(n[0])}}}),"Exp",{},[],[!0])}}),$o=A({expm1_:function(r){var t=N(r,"x","expm1");return D.runKernelFunc((function(e,n){var a=e.expm1(t);return n([t]),a}),{$x:t},(function(e,n){var a=n[0];return{$x:function(){return e.mul(a.exp())}}}))}}),Yo=A({floor_:function(r){var t=N(r,"x","floor");return D.runKernelFunc((function(e){return e.floor(t)}),{$x:t},(function(e){return{$x:function(){return ue(e)}}}))}}),Qo=A({log_:function(r){var t=N(r,"x","log"),e=[t];return D.runKernelFunc((function(n,a){var o=n.log(t);return a([t]),o}),{x:t},(function(n,a){var o=a[0];return{x:function(){return n.div(o.toFloat())}}}),"Log",{},e)}}),Jo=A({log1p_:function(r){var t=N(r,"x","log1p");return D.runKernelFunc((function(e,n){var a=e.log1p(t);return n([t]),a}),{$x:t},(function(e,n){var a=n[0];return{$x:function(){return e.div(a.add(1))}}}))}}),Tp=A({logSigmoid_:function(r){var t=N(r,"x","logSigmoid");return D.runKernelFunc((function(e,n){var a=e.softplus(t.neg()).neg();return n([t]),a}),{$x:t},(function(e,n){var a=n[0];return{$x:function(){return e.mul(a.neg().sigmoid())}}}))}}),or=A({neg_:function(r){var t=N(r,"x","neg"),e=[t];return D.runKernelFunc((function(n){return n.neg(t)}),{x:t},(function(n){return{x:function(){return n.neg()}}}),"Neg",{},e)}}),Zo=A({reciprocal_:function(r){var t=N(r,"x","reciprocal");return D.runKernelFunc((function(e,n){var a=e.reciprocal(t);return n([t]),a}),{$x:t},(function(e,n){var a=n[0];return{$x:function(){return e.div(a.square().neg())}}}))}}),ei=A({round_:function(r){var t=N(r,"x","round");return D.runKernelFunc((function(e){return e.round(t)}),{$x:t},(function(e){return{$x:function(){return ue(e)}}}))}}),na=A({rsqrt_:function(r){var t=N(r,"x","rsqrt"),e=[t];return D.runKernelFunc((function(n,a){var o=n.rsqrt(t);return a([t]),o}),{x:t},(function(n,a){var o=a[0];return{x:function(){return n.div(o.pow(1.5).mul(2)).neg()}}}),"Rsqrt",{},e)}}),ti=A({sigmoid_:function(r){var t=N(r,"x","sigmoid");return D.runKernelFunc((function(e,n){var a=e.sigmoid(t);return n([a]),a}),{x:t},(function(e,n){var a=n[0];return{x:function(){return e.mul(a.mul(K(1).sub(a)))}}}),"Sigmoid")}}),ni=A({sign_:function(r){var t=N(r,"x","sign");return D.runKernelFunc((function(e){return e.sign(t)}),{$x:t},(function(e){return{$x:function(){return ue(e)}}}))}}),Ap=A({isNaN_:function(r){var t=N(r,"x","isNaN");return D.runKernelFunc((function(e){return e.isNaN(t)}),{$x:t},(function(e){return{$x:function(){return ue(e)}}}))}}),Dp=A({isInf_:function(r){var t=N(r,"x","isInf");return D.runKernelFunc((function(e){return e.isInf(t)}),{$x:t},(function(e){return{$x:function(){return ue(e)}}}))}}),Op=A({isFinite_:function(r){var t=N(r,"x","isFinite");return D.runKernelFunc((function(e){return e.isFinite(t)}),{$x:t},(function(e){return{$x:function(){return ue(e)}}}))}}),ri=A({sin_:function(r){var t=N(r,"x","sin"),e=[t];return D.runKernelFunc((function(n,a){var o=n.sin(t);return a([t]),o}),{x:t},(function(n,a){var o=a[0];return{x:function(){return o.toFloat().cos().mul(n)}}}),"Sin",{},e)}}),ai=A({sinh_:function(r){var t=N(r,"x","sinh");return D.runKernelFunc((function(e,n){var a=e.sinh(t);return n([t]),a}),{$x:t},(function(e,n){var a=n[0];return{$x:function(){return a.toFloat().cosh().mulStrict(e)}}}))}}),oi=A({softplus_:function(r){var t=N(r,"x","softplus");return D.runKernelFunc((function(e,n){var a=e.softplus(t);return n([t]),a}),{$x:t},(function(e,n){var a=n[0];return{$x:function(){return e.mul(a.sigmoid())}}}))}}),ii=A({sqrt_:function(r){var t=N(r,"x","sqrt");return D.runKernelFunc((function(e,n){var a=e.sqrt(t);return n([t]),a}),{$x:t},(function(e,n){var a=n[0];return{$x:function(){return e.div(a.toFloat().sqrt().mul(2))}}}))}}),_p=A({step_:function(r,t){t===void 0&&(t=0);var e=N(r,"x","step");return D.runKernelFunc((function(n){return n.step(e,t)}),{$x:e},(function(n){return{$x:function(){return ue(n)}}}))}}),si=A({tan_:function(r){var t=N(r,"x","tan");return D.runKernelFunc((function(e,n){var a=e.tan(t);return n([t]),a}),{$x:t},(function(e,n){var a=n[0];return{$x:function(){return e.div(a.cos().square())}}}))}}),ui=A({tanh_:function(r){var t=N(r,"x","tanh");return D.runKernelFunc((function(e,n){var a=e.tanh(t);return n([a]),a}),{x:t},(function(e,n){var a=n[0];return{x:function(){return K(1).sub(a.square()).mulStrict(e)}}}),"Tanh",{},null,[!0])}}),Fp=A({addStrict_:function(r,t){var e=N(r,"a","addStrict"),n=N(t,"b","addStrict");return fe(e.shape,n.shape,"Error in addStrict: "),e.add(n)}}),ci=A({atan2_:function(r,t){var e,n=N(r,"a","atan2"),a=N(t,"b","atan2");e=xe(n,a),n=e[0],a=e[1];var o=ie(n.shape,a.shape);return D.runKernelFunc((function(i,s){var u=i.atan2(n,a);return s([n,a]),u}),{$a:n,$b:a},(function(i,s){var u=s[0],c=s[1];return{$a:function(){var l=xt(u.square(),c.square()),p=i.mul(c.div(l)),d=ke(u.shape,o);return d.length>0&&(p=p.sum(d)),p.reshape(u.shape)},$b:function(){var l=xt(u.square(),c.square()),p=or(i.mul(u.div(l))),d=ke(c.shape,o);return d.length>0&&(p=p.sum(d)),p.reshape(c.shape)}}}))}}),Mp=A({divStrict_:function(r,t){var e=N(r,"a","div"),n=N(t,"b","div");return fe(e.shape,n.shape,"Error in divideStrict: "),e.div(n)}}),ra=A({floorDiv_:function(r,t){var e,n=N(r,"a","floorDiv"),a=N(t,"b","floorDiv");e=xe(n,a),n=e[0],a=e[1];var o=ie(n.shape,a.shape);return D.runKernelFunc((function(i,s){var u=i.floorDiv(n,a);return s([n,a]),u}),{a:n,b:a},(function(i,s){var u=s[0],c=s[1];return{a:function(){var l=i.div(c.toFloat()),p=ke(u.shape,o);return p.length>0?l.sum(p).reshape(u.shape):l},b:function(){var l=i.mul(u.toFloat()),p=ke(c.shape,o);p.length>0&&(l=l.sum(p).reshape(c.shape));var d=c.square();return l.div(d.toFloat()).neg()}}}),"FloorDiv")}}),ir=A({maximum_:function(r,t){var e,n=N(r,"a","maximum"),a=N(t,"b","maximum");return e=xe(n,a),n=e[0],a=e[1],n.dtype==="bool"&&(n=n.toInt(),a=a.toInt()),ie(n.shape,a.shape),D.runKernelFunc((function(o,i){var s=o.maximum(n,a);return i([n,a]),s}),{a:n,b:a},(function(o,i){var s=i[0],u=i[1];return{a:function(){return o.mul(s.greaterEqual(u).toFloat())},b:function(){return o.mul(s.less(u).toFloat())}}}),"Maximum")}}),Bp=A({maximumStrict_:function(r,t){var e=N(r,"a","maximumStrict"),n=N(t,"b","maximumStrict");return fe(e.shape,n.shape,"Error in maximumStrict: "),e.maximum(n)}}),aa=A({minimum_:function(r,t){var e,n=N(r,"a","minimum"),a=N(t,"b","minimum");return e=xe(n,a),n=e[0],a=e[1],n.dtype==="bool"&&(n=n.toInt(),a=a.toInt()),ie(n.shape,a.shape),D.runKernelFunc((function(o,i){var s=o.minimum(n,a);return i([n,a]),s}),{a:n,b:a},(function(o,i){var s=i[0],u=i[1];return{a:function(){return o.mul(s.lessEqual(u).toFloat())},b:function(){return o.mul(s.greater(u).toFloat())}}}),"Minimum")}}),Pp=A({minimumStrict_:function(r,t){var e=N(r,"a","minimumStrict"),n=N(t,"b","minimumStrict");return fe(e.shape,n.shape,"Error in minimumStrict: "),e.minimum(n)}}),li=A({mod_:function(r,t){var e,n=N(r,"a","mod"),a=N(t,"b","mod");e=xe(n,a),n=e[0],a=e[1];var o=ie(n.shape,a.shape);return D.runKernelFunc((function(i,s){var u=i.mod(n,a);return s([n,a]),u}),{$a:n,$b:a},(function(i,s){var u=s[0],c=s[1];return{$a:function(){var l=ke(u.shape,o);return l.length>0?i.sum(l).reshape(u.shape):i},$b:function(){var l=i.mul(u.div(c).floor().neg()),p=ke(c.shape,o);return p.length>0?l.sum(p).reshape(c.shape):l}}}))}}),Lp=A({modStrict_:function(r,t){var e=N(r,"a","modStrict"),n=N(t,"b","modStrict");return fe(e.shape,n.shape,"Error in modStrict: "),e.mod(n)}}),Se=A({mul_:function(r,t){var e,n=N(r,"a","mul"),a=N(t,"b","mul");e=xe(n,a),n=e[0],a=e[1];var o=ie(n.shape,a.shape);return D.runKernelFunc((function(i,s){var u=i.multiply(n,a);return s([n,a]),u}),{a:n,b:a},(function(i,s){var u=s[0],c=s[1];return{a:function(){var l=i.mul(c.toFloat()),p=ke(u.shape,o);return p.length>0?l.sum(p).reshape(u.shape):l},b:function(){var l=i.mul(u.toFloat()),p=ke(c.shape,o);return p.length>0?l.sum(p).reshape(c.shape):l}}}),"Mul")}}),Vp=A({mulStrict_:function(r,t){var e=N(r,"a","mul"),n=N(t,"b","mul");return fe(e.shape,n.shape,"Error in multiplyStrict: "),e.mul(n)}}),Rn=A({pow_:function(r,t){var e,n=N(r,"base","pow"),a=N(t,"exp","pow");e=xe(n,a),n=e[0],a=e[1];var o=ie(n.shape,a.shape),i=[n,a];return D.runKernelFunc((function(s,u){var c=s.pow(n,a);return u([n,a,c]),c}),{a:n,b:a},(function(s,u){var c=u[0],l=u[1],p=u[2];return{a:function(){var d=l.toFloat(),h=s.mul(d.mul(c.pow(d.sub(K(1))))),f=ke(c.shape,o);return f.length>0&&(h=h.sum(f)),h.reshape(c.shape)},b:function(){var d=c.greater(0),h=c.log().where(d,ue(c)),f=s.mul(p.mul(h)),m=ke(l.shape,o);return m.length>0&&(f=f.sum(m)),f.reshape(l.shape)}}}),"Pow",{},i,[!0])}}),Wp=A({powStrict_:function(r,t){return fe(r.shape,t.shape,"Error in powStrict: "),r.pow(t)}}),zp=A({squaredDifferenceStrict_:function(r,t){var e=N(r,"a","squaredDifferenceStrict"),n=N(t,"b","squaredDifferenceStrict");return fe(e.shape,n.shape,"Error in squaredDifferenceStrict: "),e.squaredDifference(n)}}),vt=A({sub_:function(r,t){var e,n=N(r,"a","sub"),a=N(t,"b","sub");e=xe(n,a),n=e[0],a=e[1];var o=ie(n.shape,a.shape);return D.runKernelFunc((function(i){return i.subtract(n,a)}),{a:n,b:a},(function(i){return{a:function(){var s=i,u=ke(n.shape,o);return u.length>0&&(s=s.sum(u)),s.reshape(n.shape)},b:function(){var s=i,u=ke(a.shape,o);return u.length>0&&(s=s.sum(u)),s.neg().reshape(a.shape)}}}),"Sub")}}),Up=A({subStrict_:function(r,t){var e=N(r,"a","subStrict"),n=N(t,"b","subStrict");return fe(e.shape,n.shape,"Error in subStrict: "),e.sub(n)}}),bt=A({div_:function(r,t){var e,n=N(r,"a","div"),a=N(t,"b","div");if(e=xe(n,a),n=e[0],a=e[1],n.dtype==="int32"&&a.dtype==="int32")return ra(n,a);var o={a:n,b:a};return D.runKernelFunc((function(i,s){var u=i.realDivide(n,a);return s([n,a]),u}),o,null,ea,{})}});function pi(r,t){if(r.rank<1)throw new Error("tf.gatherND() expects the input to be rank 1 or higher, but the rank was "+r.rank+".");if(t.rank<1)throw new Error("tf.gatherND() expects the indices to be rank 1 or higher, but the rank was "+t.rank+".");if(t.dtype!=="int32")throw new Error("tf.gatherND() expects the indices to be int32 type, but the dtype was "+t.dtype+".");if(t.shape[t.rank-1]>r.rank)throw new Error("index innermost dimension length must be <= tensor rank; saw: "+t.shape[t.rank-1]+" vs. "+r.rank);if(r.size===0)throw new Error("Requested more than 0 entries, but input is empty. Input shape: "+r.shape+".");for(var e=t.shape,n=e[e.length-1],a=1,o=0;o<e.length-1;++o)a*=e[o];var i=r.shape,s=e.slice();s.pop();var u=1;for(o=n;o<r.rank;++o)u*=i[o],s.push(i[o]);var c=Ge(r.shape).map((function(l){return l/u})).concat([1]).slice(0,n);return[s,a,u,c]}var og=Object.freeze({prepareAndValidate:pi}),di=30;function Dr(r){return r<=di?r:Pr(r,Math.floor(Math.sqrt(r)))}function fc(r,t,e){var n=t.rank>1?t.shape[t.rank-1]:1,a=t.rank>1?t.rank-1:1,o="Must have updates.shape = indices.shape[:batchDim] + shape[sliceDim:], got updates.shape: "+e.shape+", indices.shape: "+t.shape+", shape: "+r+", sliceDim: "+n+", and batchDim: "+a+".";if(e.rank<a)throw new Error(o+" update.rank < "+a+". ");if(r.length<n+(e.rank-a))throw new Error(o+" Output shape length < "+(n+(e.rank-a)));if(e.rank!==a+r.length-n)throw new Error(o+" update.rank != "+(a+r.length-n));for(var i=0;i<a;++i)if(e.shape[i]!==t.shape[i])throw new Error(o+" updates.shape["+i+"] ("+e.shape[i]+") != indices.shape["+i+"] ("+t.shape[i]+").");for(i=0;i<e.rank-a;++i)if(e.shape[i+a]!==r[i+n])throw new Error(o+" updates.shape["+(i+a)+"] ("+e.shape[i+a]+") != shape["+(i+a)+"] ("+r[i+a]+")")}function mc(r,t,e){if(t.rank<1)throw new Error("tf.scatterND() expects the indices to be rank 1 or higher, but the rank was "+t.rank+".");if(r.rank<1)throw new Error("tf.scatterND() expects the updates to be rank 1 or higher, but the rank was "+r.rank+".");if(t.dtype!=="int32")throw new Error("The dtype of 'indices' should be int32, but got dtype: "+t.dtype);if(e.length<1)throw new Error("Output rank must be greater or equal to 1, but got shape: "+e);if(e.length===0){if(t.size===0)throw new Error("Indices specified for empty output. indices shape: "+t.shape);if(r.size===0)throw new Error("Updates specified for empty output. updates shape: "+r.shape)}fc(e,t,r)}function Zn(r,t,e){for(var n=t.shape.length,a=n>1?t.shape[n-1]:1,o=e.length,i=1,s=a;s<o;++s)i*=e[s];var u=a<1?1:a;return{sliceRank:a,numUpdates:$(t.shape)/u,sliceSize:i,strides:Ge(e.slice(0,a)).concat([1]),outputSize:$(e)}}var ig=Object.freeze({validateUpdateShape:fc,validateInput:mc,calculateShapes:Zn});function vc(r,t,e){S(r.rank===t.length,(function(){return"Error in slice"+r.rank+"D: Length of begin "+t+" must match the rank of the array ("+r.rank+")."})),S(r.rank===e.length,(function(){return"Error in slice"+r.rank+"D: Length of size "+e+" must match the rank of the array ("+r.rank+")."}));for(var n=function(o){S(t[o]+e[o]<=r.shape[o],(function(){return"Error in slice"+r.rank+"D: begin["+o+"] + size["+o+"] ("+(t[o]+e[o])+") would overflow input.shape["+o+"] ("+r.shape[o]+")"}))},a=0;a<r.rank;++a)n(a)}function fo(r){for(var t=[],e=0;r>0;)1&r&&t.push(e),r/=2,e++;return t}function oa(r,t,e){for(var n=[],a=0;a<r.length;a++)n[a]=Math.ceil((t[a]-r[a])/e[a]);return n}function gc(r,t,e,n,a){var o=t[a],i=e[a]||1;(r&1<<a||o==null)&&(o=i>0?Number.MIN_SAFE_INTEGER:Number.MAX_SAFE_INTEGER);var s=n[a];return o<0&&(o+=s),o=Fr(0,o,s-1)}function yc(r,t,e,n,a){var o=t[a],i=e[a]||1;(r&1<<a||o==null)&&(o=i>0?Number.MAX_SAFE_INTEGER:Number.MIN_SAFE_INTEGER);var s=n[a];return o<0&&(o+=s),o=i>0?Fr(0,o,s):Fr(-1,o,s-1)}function hi(r,t,e){for(var n=e.length,a=0;a<e.length;a++)if(e[a]>1){n=a;break}for(a=n+1;a<e.length;a++)if(t[a]>0||e[a]!==r[a])return!1;return!0}function fi(r,t){for(var e=r.length>0?r[r.length-1]:1,n=0;n<r.length-1;n++)e+=r[n]*t[n];return e}var sg=Object.freeze({assertParamsValid:vc,maskToAxes:fo,computeOutShape:oa,startForAxis:gc,stopForAxis:yc,isSliceContinous:hi,computeFlatOffset:fi});function Gp(r,t){S(Br(r),(function(){return"The f passed in variableGrads(f) must be a function"})),S(t==null||Array.isArray(t)&&t.every((function(l){return l instanceof Vr})),(function(){return"The varList passed in variableGrads(f, varList) must be an array of variables"}));var e=t!=null;if(!e)for(var n in t=[],D.registeredVariables)t.push(D.registeredVariables[n]);var a=e?t.filter((function(l){return!l.trainable})):null,o=t.length;S((t=t.filter((function(l){return l.trainable}))).length>0,(function(){return"variableGrads() expects at least one of the input variables to be trainable, but none of the "+o+" variables is trainable."}));var i=D.gradients(r,t,null,!0),s=i.value,u=i.grads;S(u.some((function(l){return l!=null})),(function(){return"Cannot find a connection between any variable and the result of the loss function y=f(x). Please make sure the operations that use variables are inside the function f passed to minimize()."})),S(s.rank===0,(function(){return"The f passed in variableGrads(f) must return a scalar, but it returned a rank-"+s.rank+" tensor"}));var c={};return t.forEach((function(l,p){u[p]!=null&&(c[l.name]=u[p])})),a?.forEach((function(l){return c[l.name]=null})),{value:s,grads:c}}function ia(r){return D.customGrad(r)}var sr=A({softmax_:function(r,t){t===void 0&&(t=-1);var e=N(r,"logits","softmax","float32");if(t===-1&&(t=e.rank-1),t!==e.rank-1)throw Error("Softmax along a non-last dimension is not yet supported. Logits was rank "+e.rank+" and dim was "+t);return D.runKernelFunc((function(n,a){var o=n.softmax(e,t);return a([o]),o}),{logits:e},(function(n,a){var o=a[0],i=n.mul(o);return{logits:function(){return i.sub(i.sum([t],!0).mul(o))}}}),"Softmax",{dim:t},[],[!0])}}),mi=A({logSoftmax_:function(r,t){t===void 0&&(t=-1);var e=N(r,"logits","logSoftmax");if(t===-1&&(t=e.rank-1),t!==e.rank-1)throw Error("Log Softmax along a non-last dimension is not yet supported. Logits was rank "+e.rank+" and axis was "+t);return ia((function(n,a){var o=n.max(t,!0),i=n.sub(o),s=i.toFloat().sub(i.exp().sum(t,!0).log());return a([s]),{value:s,gradFunc:function(u,c){var l=c[0].exp();return u.sub(u.sum(t,!0).mul(l))}}}))(e)}}),Ke=A({transpose_:function(r,t){var e=N(r,"x","transpose");if(t==null&&(t=e.shape.map((function(a,o){return o})).reverse()),S(e.rank===t.length,(function(){return"Error in transpose: rank of input "+e.rank+" must match length of perm "+t+"."})),t.forEach((function(a){S(a>=0&&a<e.rank,(function(){return"All entries in 'perm' must be between 0 and "+(e.rank-1)+" but got "+t}))})),e.rank<=1)return e.clone();var n={perm:t};return D.runKernelFunc((function(a){return a.transpose(e,t)}),{x:e},null,"Transpose",n)}}),xc=(function(){function r(t,e){this.backend=t,this.dataMover=e,this.data=new WeakMap,this.dataIdsCount=0}return r.prototype.get=function(t){return this.data.has(t)||this.dataMover.moveData(this.backend,t),this.data.get(t)},r.prototype.set=function(t,e){this.dataIdsCount++,this.data.set(t,e)},r.prototype.has=function(t){return this.data.has(t)},r.prototype.delete=function(t){return this.dataIdsCount--,this.data.delete(t)},r.prototype.numDataIds=function(){return this.dataIdsCount},r})(),bc=(function(){function r(){}return r.prototype.time=function(t){return F("time")},r.prototype.read=function(t){return F("read")},r.prototype.readSync=function(t){return F("readSync")},r.prototype.numDataIds=function(){return F("numDataIds")},r.prototype.disposeData=function(t){return F("disposeData")},r.prototype.write=function(t,e,n){return F("write")},r.prototype.move=function(t,e,n,a){return F("move")},r.prototype.memory=function(){return F("memory")},r.prototype.floatPrecision=function(){return F("floatPrecision")},r.prototype.epsilon=function(){return this.floatPrecision()===32?1e-7:1e-4},r.prototype.batchMatMul=function(t,e,n,a){return F("batchMatMul")},r.prototype.fusedBatchMatMul=function(t){return t.a,t.b,t.transposeA,t.transposeB,t.bias,t.activation,t.preluActivationWeights,F("fusedBatchMatMul")},r.prototype.slice=function(t,e,n){return F("slice")},r.prototype.stridedSlice=function(t,e,n,a){return F("stridedSlice")},r.prototype.unstack=function(t,e){return F("unstack")},r.prototype.reverse=function(t,e){return F("reverse")},r.prototype.concat=function(t,e){return F("concat")},r.prototype.neg=function(t){return F("neg")},r.prototype.add=function(t,e){return F("add")},r.prototype.addN=function(t){return F("addN")},r.prototype.subtract=function(t,e){return F("subtract")},r.prototype.multiply=function(t,e){return F("multiply")},r.prototype.realDivide=function(t,e){return F("realDivide")},r.prototype.floorDiv=function(t,e){return F("floorDiv")},r.prototype.sum=function(t,e){return F("sum")},r.prototype.prod=function(t,e){return F("prod")},r.prototype.unsortedSegmentSum=function(t,e,n){return F("unsortedSegmentSum")},r.prototype.argMin=function(t,e){return F("argMin")},r.prototype.argMax=function(t,e){return F("argMax")},r.prototype.equal=function(t,e){return F("equal")},r.prototype.notEqual=function(t,e){return F("notEqual")},r.prototype.less=function(t,e){return F("less")},r.prototype.lessEqual=function(t,e){return F("lessEqual")},r.prototype.greater=function(t,e){return F("greater")},r.prototype.greaterEqual=function(t,e){return F("greaterEqual")},r.prototype.logicalNot=function(t){return F("logicalNot")},r.prototype.logicalAnd=function(t,e){return F("logicalAnd")},r.prototype.logicalOr=function(t,e){return F("logicalOr")},r.prototype.where=function(t){return F("where")},r.prototype.select=function(t,e,n){return F("select")},r.prototype.topk=function(t,e,n){return F("topk")},r.prototype.min=function(t,e){return F("min")},r.prototype.minimum=function(t,e){return F("minimum")},r.prototype.mod=function(t,e){return F("mod")},r.prototype.max=function(t,e){return F("max")},r.prototype.maximum=function(t,e){return F("maximum")},r.prototype.all=function(t,e){return F("all")},r.prototype.any=function(t,e){return F("any")},r.prototype.squaredDifference=function(t,e){return F("squaredDifference")},r.prototype.ceil=function(t){return F("ceil")},r.prototype.floor=function(t){return F("floor")},r.prototype.round=function(t){return F("round")},r.prototype.sign=function(t){return F("sign")},r.prototype.isNaN=function(t){return F("isNaN")},r.prototype.isInf=function(t){return F("isInf")},r.prototype.isFinite=function(t){return F("isFinite")},r.prototype.pow=function(t,e){return F("pow")},r.prototype.exp=function(t){return F("exp")},r.prototype.expm1=function(t){return F("expm1")},r.prototype.softmax=function(t,e){return F("softmax")},r.prototype.log=function(t){return F("log")},r.prototype.log1p=function(t){return F("log1p")},r.prototype.sqrt=function(t){return F("sqrt")},r.prototype.rsqrt=function(t){return F("rsqrt")},r.prototype.square=function(t){return F("square")},r.prototype.reciprocal=function(t){return F("reciprocal")},r.prototype.relu=function(t){return F("relu")},r.prototype.relu6=function(t){return F("relu6")},r.prototype.prelu=function(t,e){return F("prelu")},r.prototype.elu=function(t){return F("elu")},r.prototype.eluDer=function(t,e){return F("eluDer")},r.prototype.selu=function(t){return F("selu")},r.prototype.int=function(t){return F("int")},r.prototype.clip=function(t,e,n){return F("clip")},r.prototype.abs=function(t){return F("abs")},r.prototype.complexAbs=function(t){return F("complexAbs")},r.prototype.sigmoid=function(t){return F("sigmoid")},r.prototype.softplus=function(t){return F("softplus")},r.prototype.sin=function(t){return F("sin")},r.prototype.cos=function(t){return F("cos")},r.prototype.tan=function(t){return F("tan")},r.prototype.asin=function(t){return F("asin")},r.prototype.acos=function(t){return F("acos")},r.prototype.atan=function(t){return F("atan")},r.prototype.atan2=function(t,e){return F("atan2")},r.prototype.sinh=function(t){return F("sinh")},r.prototype.cosh=function(t){return F("cosh")},r.prototype.tanh=function(t){return F("tanh")},r.prototype.asinh=function(t){return F("asinh")},r.prototype.acosh=function(t){return F("acosh")},r.prototype.atanh=function(t){return F("atanh")},r.prototype.erf=function(t){return F("erf")},r.prototype.step=function(t,e){return F("step")},r.prototype.fusedConv2d=function(t){return t.input,t.filter,t.convInfo,t.bias,t.activation,t.preluActivationWeights,F("fusedConv2d")},r.prototype.conv2d=function(t,e,n){return F("conv2d")},r.prototype.conv2dDerInput=function(t,e,n){return F("conv2dDerInput")},r.prototype.conv2dDerFilter=function(t,e,n){return F("conv2dDerFilter")},r.prototype.fusedDepthwiseConv2D=function(t){return t.input,t.filter,t.convInfo,t.bias,t.activation,t.preluActivationWeights,F("fusedDepthwiseConv2D")},r.prototype.depthwiseConv2D=function(t,e,n){return F("depthwiseConv2D")},r.prototype.depthwiseConv2DDerInput=function(t,e,n){return F("depthwiseConv2DDerInput")},r.prototype.depthwiseConv2DDerFilter=function(t,e,n){return F("depthwiseConv2DDerFilter")},r.prototype.conv3d=function(t,e,n){return F("conv3d")},r.prototype.conv3dDerInput=function(t,e,n){return F("conv3dDerInput")},r.prototype.conv3dDerFilter=function(t,e,n){return F("conv3dDerFilter")},r.prototype.maxPool=function(t,e){return F("maxPool")},r.prototype.maxPoolBackprop=function(t,e,n,a){return F("maxPoolBackprop")},r.prototype.avgPool=function(t,e){return F("avgPool")},r.prototype.avgPoolBackprop=function(t,e,n){return F("avgPoolBackprop")},r.prototype.avgPool3d=function(t,e){return F("avgPool3d")},r.prototype.avgPool3dBackprop=function(t,e,n){return F("avgPool3dBackprop")},r.prototype.maxPool3d=function(t,e){return F("maxPool3d")},r.prototype.maxPool3dBackprop=function(t,e,n,a){return F("maxPool3dBackprop")},r.prototype.reshape=function(t,e){return F("reshape")},r.prototype.cast=function(t,e){return F("cast")},r.prototype.tile=function(t,e){return F("tile")},r.prototype.pad=function(t,e,n){return F("pad")},r.prototype.transpose=function(t,e){return F("transpose")},r.prototype.gather=function(t,e,n){return F("gather")},r.prototype.gatherND=function(t,e){return F("gatherND")},r.prototype.scatterND=function(t,e,n){return F("scatterND")},r.prototype.batchToSpaceND=function(t,e,n){return F("batchToSpaceND")},r.prototype.spaceToBatchND=function(t,e,n){return F("spaceToBatchND")},r.prototype.resizeBilinear=function(t,e,n,a){return F("resizeBilinear")},r.prototype.resizeBilinearBackprop=function(t,e,n){return F("resizeBilinearBackprop")},r.prototype.resizeNearestNeighbor=function(t,e,n,a){return F("resizeNearestNeighbor")},r.prototype.resizeNearestNeighborBackprop=function(t,e,n){return F("resizeNearestNeighborBackprop")},r.prototype.batchNormalization=function(t,e,n,a,o,i){return F("batchNormalization")},r.prototype.localResponseNormalization4D=function(t,e,n,a,o){return F("localResponseNormalization4D")},r.prototype.LRNGrad=function(t,e,n,a,o,i,s){return F("LRNGrad")},r.prototype.multinomial=function(t,e,n,a){return F("multinomial")},r.prototype.oneHot=function(t,e,n,a){return F("oneHot")},r.prototype.cumsum=function(t,e,n,a){return F("cumsum")},r.prototype.nonMaxSuppression=function(t,e,n,a,o){return F("nonMaxSuppression")},r.prototype.fft=function(t){return F("fft")},r.prototype.ifft=function(t){return F("ifft")},r.prototype.complex=function(t,e){return F("complex")},r.prototype.real=function(t){return F("real")},r.prototype.imag=function(t){return F("imag")},r.prototype.cropAndResize=function(t,e,n,a,o,i){return F("cropAndResize")},r.prototype.depthToSpace=function(t,e,n){return F("depthToSpace")},r.prototype.split=function(t,e,n){return F("split")},r.prototype.sparseToDense=function(t,e,n,a){return F("sparseToDense")},r.prototype.diag=function(t){return F("diag")},r.prototype.fill=function(t,e,n){return F("fill")},r.prototype.onesLike=function(t){return F("onesLike")},r.prototype.zerosLike=function(t){return F("zerosLike")},r.prototype.linspace=function(t,e,n){return F("linspace")},r.prototype.dispose=function(){return F("dispose")},r})();function F(r){throw new Error("'"+r+"' not yet implemented or not found in the registry. Did you forget to import the kernel?")}function zt(r,t,e,n,a,o,i){i===void 0&&(i="channelsLast");var s,u=qr(t),c=u[0],l=u[1];if(i==="channelsLast")s=[c,l,r[3],r[3]];else{if(i!=="channelsFirst")throw new Error("Unknown dataFormat "+i);s=[c,l,r[1],r[1]]}return Ht(r,s,e,n,a,o,!1,i)}function er(r,t,e,n,a,o,i){i===void 0&&(i="NDHWC");var s,u,c=mo(t),l=c[0],p=c[1],d=c[2];if(i==="NDHWC")u="channelsLast",s=[l,p,d,r[4],r[4]];else{if(i!=="NCDHW")throw new Error("Unknown dataFormat "+i);u="channelsFirst",s=[l,p,d,r[1],r[1]]}return tr(r,s,e,n,a,!1,u,o)}function Ht(r,t,e,n,a,o,i,s){i===void 0&&(i=!1),s===void 0&&(s="channelsLast");var u=[-1,-1,-1,-1],c=u[0],l=u[1],p=u[2],d=u[3];if(s==="channelsLast")c=r[0],l=r[1],p=r[2],d=r[3];else{if(s!=="channelsFirst")throw new Error("Unknown dataFormat "+s);c=r[0],d=r[1],l=r[2],p=r[3]}var h,f=t[0],m=t[1],v=t[3],g=qr(e),y=g[0],x=g[1],b=qr(n),C=b[0],E=b[1],R=Nn(f,C),I=Nn(m,E),k=(function(L,P,U,G,V,H,q,j){var J,Z,re;if(typeof L=="number"){J={top:L,bottom:L,left:L,right:L,type:L===0?"VALID":"NUMBER"};var ae=(function(le,me,he,Ne,be){Ne==null&&(Ne=vi(le,me,he));var we=le[0],ct=le[1],lt=qn((we-me+2*Ne)/he+1,be);S(Ce(lt),(function(){return"The output # of rows ("+lt+") must be an integer. Change the stride and/or zero pad parameters"}));var qe=qn((ct-me+2*Ne)/he+1,be);return S(Ce(qe),(function(){return"The output # of columns ("+qe+") must be an integer. Change the stride and/or zero pad parameters"})),[lt,qe]})([P,U],H,G,L,j);Z=ae[0],re=ae[1]}else if(L==="same"){Z=Math.ceil(P/G),re=Math.ceil(U/V);var se=Math.max(0,(Z-1)*G+H-P),pe=Math.max(0,(re-1)*V+q-U),ce=Math.floor(se/2),de=se-ce,Ie=Math.floor(pe/2);J={top:ce,bottom:de,left:Ie,right:pe-Ie,type:"SAME"}}else{if(L!=="valid")throw Error("Unknown padding parameter: "+L);J={top:0,bottom:0,left:0,right:0,type:"VALID"},Z=Math.ceil((P-H+1)/G),re=Math.ceil((U-q+1)/V)}return{padInfo:J,outHeight:Z,outWidth:re}})(a,l,p,y,x,R,I,o),T=k.padInfo,O=k.outHeight,_=k.outWidth,W=i?v*d:v;return s==="channelsFirst"?h=[c,W,O,_]:s==="channelsLast"&&(h=[c,O,_,W]),{batchSize:c,dataFormat:s,inHeight:l,inWidth:p,inChannels:d,outHeight:O,outWidth:_,outChannels:W,padInfo:T,strideHeight:y,strideWidth:x,filterHeight:f,filterWidth:m,effectiveFilterHeight:R,effectiveFilterWidth:I,dilationHeight:C,dilationWidth:E,inShape:r,outShape:h,filterShape:t}}function tr(r,t,e,n,a,o,i,s){o===void 0&&(o=!1),i===void 0&&(i="channelsLast");var u=[-1,-1,-1,-1,-1],c=u[0],l=u[1],p=u[2],d=u[3],h=u[4];if(i==="channelsLast")c=r[0],l=r[1],p=r[2],d=r[3],h=r[4];else{if(i!=="channelsFirst")throw new Error("Unknown dataFormat "+i);c=r[0],h=r[1],l=r[2],p=r[3],d=r[4]}var f,m=t[0],v=t[1],g=t[2],y=t[4],x=mo(e),b=x[0],C=x[1],E=x[2],R=mo(n),I=R[0],k=R[1],T=R[2],O=Nn(m,I),_=Nn(v,k),W=Nn(g,T),L=(function(q,j,J,Z,re,ae,se,pe,ce,de,Ie){var le,me,he,Ne;if(typeof q=="number"){le={top:q,bottom:q,left:q,right:q,front:q,back:q,type:q===0?"VALID":"NUMBER"};var be=(function(fn,St,Aa,mn,pt,Da){pt==null&&(pt=vi(fn,St,mn));var ap=fn[0],op=fn[1],ip=fn[2],Oa=qn((ap-St+2*pt)/mn+1,Da);S(Ce(Oa),(function(){return"The output # of depths ("+Oa+") must be an integer. Change the stride and/or zero pad parameters"}));var _a=qn((op-St+2*pt)/mn+1,Da);S(Ce(_a),(function(){return"The output # of rows ("+_a+") must be an integer. Change the stride and/or zero pad parameters"}));var Fa=qn((ip-St+2*pt)/mn+1,Da);return S(Ce(Fa),(function(){return"The output # of columns ("+Fa+") must be an integer. Change the stride and/or zero pad parameters"})),[Oa,_a,Fa,Aa]})([j,J,Z,1],pe,1,re,q,Ie);me=be[0],he=be[1],Ne=be[2]}else if(q==="same"){me=Math.ceil(j/re),he=Math.ceil(J/ae),Ne=Math.ceil(Z/se);var we=(me-1)*re+pe-j,ct=(he-1)*ae+ce-J,lt=(Ne-1)*se+de-Z,qe=Math.floor(we/2),hn=we-qe,Nt=Math.floor(ct/2),Ft=ct-Nt,Et=Math.floor(lt/2);le={top:Nt,bottom:Ft,left:Et,right:lt-Et,front:qe,back:hn,type:"SAME"}}else{if(q!=="valid")throw Error("Unknown padding parameter: "+q);le={top:0,bottom:0,left:0,right:0,front:0,back:0,type:"VALID"},me=Math.ceil((j-pe+1)/re),he=Math.ceil((J-ce+1)/ae),Ne=Math.ceil((Z-de+1)/se)}return{padInfo:le,outDepth:me,outHeight:he,outWidth:Ne}})(a,l,p,d,b,C,E,O,_,W,s),P=L.padInfo,U=L.outDepth,G=L.outHeight,V=L.outWidth,H=o?y*h:y;return i==="channelsFirst"?f=[c,H,U,G,V]:i==="channelsLast"&&(f=[c,U,G,V,H]),{batchSize:c,dataFormat:i,inDepth:l,inHeight:p,inWidth:d,inChannels:h,outDepth:U,outHeight:G,outWidth:V,outChannels:H,padInfo:P,strideDepth:b,strideHeight:C,strideWidth:E,filterDepth:m,filterHeight:v,filterWidth:g,effectiveFilterDepth:O,effectiveFilterHeight:_,effectiveFilterWidth:W,dilationDepth:I,dilationHeight:k,dilationWidth:T,inShape:r,outShape:f,filterShape:t}}function vi(r,t,e,n){n===void 0&&(n=1);var a=Nn(t,n);return Math.floor((r[0]*(e-1)-e+a)/2)}function qr(r){return typeof r=="number"?[r,r,r]:r.length===2?[r[0],r[1],1]:r}function mo(r){return typeof r=="number"?[r,r,r]:r}function Nn(r,t){return t<=1?r:r+(r-1)*(t-1)}function qn(r,t){if(!t)return r;switch(t){case"round":return Math.round(r);case"ceil":return Math.ceil(r);case"floor":return Math.floor(r);default:throw new Error("Unknown roundingMode "+t)}}function an(r){var t=qr(r),e=t[0],n=t[1],a=t[2];return e===1&&n===1&&a===1}function Pe(r,t){return an(r)||an(t)}function sa(r){if(r==="NHWC")return"channelsLast";if(r==="NCHW")return"channelsFirst";throw new Error("Unknown dataFormat "+r)}function gi(r,t,e){if(t==="complex64"){if(r.dtype==="complex64")return r.clone();var n=ye(r.shape),a=r.toFloat(),o=e.complex(a,n);return n.dispose(),a.dispose(),o}if(!wu(r.dtype,t))return D.makeTensorFromDataId(r.dataId,r.shape,t);if(r.dtype==="complex64"){var i=e.real(r);return o=i.cast(t),i.dispose(),o}if(t==="int32")return e.int(r);if(t==="bool"){var s=K(0,r.dtype);return o=e.notEqual(r,s),s.dispose(),o}throw new Error("Error in Cast: failed to cast "+r.dtype+" to "+t)}function jr(r,t){return D.makeTensorFromDataId(r.dataId,t,r.dtype)}function yi(r,t,e){var n=(t-r)/(e-1),a=On(e,"float32");a[0]=r;for(var o=1;o<a.length;o++)a[o]=a[o-1]+n;return nt(a,"float32")}var ug=Object.freeze({castTensor:gi,reshapeTensor:jr,linspaceImpl:yi,upcastType:Oe,axesAreInnerMostDims:Do,combineLocations:rc,computeOutAndReduceShapes:_e,expandShapeToKeepDim:Le,assertAxesAreInnerMostDims:We,getAxesPermutation:ot,getUndoAxesPermutation:$r,getInnerMostAxes:it,getBroadcastDims:Rt,getReductionAxes:ke,assertAndGetBroadcastShape:ie,assertParamsConsistent:ac,computeOutShape:rn,computePool2DInfo:zt,computePool3DInfo:er,computeConv2DInfo:Ht,computeConv3DInfo:tr,computeDefaultPad:vi,tupleValuesAreOne:an,eitherStridesOrDilationsAreOne:Pe,convertConv2DDataFormat:sa,PARALLELIZE_THRESHOLD:di,computeOptimalWindowSize:Dr});function vo(r,t){if(r.length!==t.length)throw new Error("Cannot merge real and imag arrays of different lengths. real:"+r.length+", imag: "+t.length+".");for(var e=new Float32Array(2*r.length),n=0;n<e.length;n+=2)e[n]=r[n/2],e[n+1]=t[n/2];return e}function Fs(r,t){return{real:r[2*t],imag:r[2*t+1]}}function Hp(r,t,e,n){r[2*n]=t,r[2*n+1]=e}function qp(r,t,e){var n=(e?2:-2)*Math.PI*(r/t);return{real:Math.cos(n),imag:Math.sin(n)}}function jp(r,t,e){var n=(function(o,i,s){return(function(u,c,l){for(var p=0,d=u.length,h=0,f=!1;p<d;){var m=l(c,u[h=p+(d-p>>>1)]);m>0?p=h+1:(d=h,f=!m)}return f?p:-p-1})(o,i,s||Kp)})(r,t,e),a=n<0?-(n+1):n;r.splice(a,0,t)}function Kp(r,t){return r>t?1:r<t?-1:0}function xi(r,t,e,n,a){return wc(r,t,e,n,a,0).selectedIndices}function bi(r,t,e,n,a,o){var i=wc(r,t,e,n,a,o,!0);return i.numValidOutputs.dispose(),{selectedIndices:i.selectedIndices,selectedScores:i.selectedScores}}function wc(r,t,e,n,a,o,i,s){i===void 0&&(i=!1),s===void 0&&(s=!1);for(var u=Array.from(t).map((function(b,C){return{score:b,boxIndex:C,suppressBeginIndex:0}})).filter((function(b){return b.score>a})).sort(Ms),c=o>0?-.5/o:0,l=[],p=[];l.length<e&&u.length>0;){var d=u.pop(),h=d.score,f=d.boxIndex,m=d.suppressBeginIndex;if(h<a)break;for(var v=!1,g=l.length-1;g>=m;--g){var y=Xp(r,f,l[g]);if(y>=n){v=!0;break}if(d.score=d.score*$p(n,c,y),d.score<=a)break}d.suppressBeginIndex=l.length,v||(d.score===h?(l.push(f),p.push(d.score)):d.score>a&&jp(u,d,Ms))}var x=l.length;return s&&(l.fill(0,x),p.fill(0,x)),{selectedIndices:nt(l,"int32"),selectedScores:nt(p,"float32"),numValidOutputs:K(x,"int32")}}function Xp(r,t,e){var n=r.subarray(4*t,4*t+4),a=r.subarray(4*e,4*e+4),o=Math.min(n[0],n[2]),i=Math.min(n[1],n[3]),s=Math.max(n[0],n[2]),u=Math.max(n[1],n[3]),c=Math.min(a[0],a[2]),l=Math.min(a[1],a[3]),p=Math.max(a[0],a[2]),d=Math.max(a[1],a[3]),h=(s-o)*(u-i),f=(p-c)*(d-l);if(h<=0||f<=0)return 0;var m=Math.max(o,c),v=Math.max(i,l),g=Math.min(s,p),y=Math.min(u,d),x=Math.max(g-m,0)*Math.max(y-v,0);return x/(h+f-x)}function $p(r,t,e){var n=Math.exp(t*e*e);return e<=r?n:0}function Ms(r,t){return r.score-t.score||r.score===t.score&&t.boxIndex-r.boxIndex}function Cc(r,t,e){var n=new Array(r.rank).fill(0),a=r.shape.slice();return t.map((function(o){a[e]=o;var i=r.slice(n,a);return n[e]+=o,i}))}function Nc(r,t){for(var e=new Array(r.rank),n=0;n<e.length;n++)e[n]=r.shape[n]*t[n];var a=te(e,r.dtype);for(n=0;n<a.values.length;++n){for(var o=a.indexToLoc(n),i=new Array(r.rank),s=0;s<i.length;s++)i[s]=o[s]%r.shape[s];var u=r.locToIndex(i);a.values[n]=r.values[u]}return a.toTensor()}function Ec(r,t,e,n,a){for(var o=t[t.length-1],i=[r.length/o,o],s=i[0],u=i[1],c=nn(e,s*n),l=nn("int32",s*n),p=0;p<s;p++){for(var d=p*u,h=r.subarray(d,d+u),f=[],m=0;m<h.length;m++)f.push({value:h[m],index:m});f.sort((function(b,C){return C.value-b.value}));var v=p*n,g=c.subarray(v,v+n),y=l.subarray(v,v+n);for(m=0;m<n;m++)g[m]=f[m].value,y[m]=f[m].index}var x=t.slice();return x[x.length-1]=n,[De(c,x,e),De(l,x,"int32")]}function wi(r,t){for(var e=[],n=0;n<t.length;n++)t[n]&&e.push(n);var a=te(r,"int32"),o=te([e.length,r.length],"int32");for(n=0;n<e.length;n++){var i=a.indexToLoc(e[n]),s=n*r.length;o.values.set(i,s)}return o.toTensor()}var Yp=function(r,t){this.outputShape=[],this.outputShape=r,this.variableNames=t.map((function(a,o){return"T"+o}));var e=[];this.variableNames.forEach((function(a){e.push("float v"+a+" = get"+a+"AtOutCoords();")}));var n=this.variableNames.map((function(a){return"v"+a})).join(" + ");this.userCode=`
      void main() {
        `+e.join(`
        `)+`

        float result = `+n+`;
        setOutput(result);
      }
    `},Qp=function(r,t){this.outputShape=[],this.packedInputs=!0,this.packedOutput=!0,this.outputShape=r,this.variableNames=t.map((function(a,o){return"T"+o}));var e=[];this.variableNames.forEach((function(a){e.push("vec4 v"+a+" = get"+a+"AtOutCoords();")}));var n=this.variableNames.map((function(a){return"v"+a})).join(" + ");this.userCode=`
      void main() {
        `+e.join(`
        `)+`

        vec4 result = `+n+`;
        setOutput(result);
      }
    `},Jp=function(r,t,e){this.variableNames=["A"];var n=r.windowSize,a=r.batchSize,o=r.inSize,i=Math.ceil(o/n);e||this.variableNames.push("bestIndicesA"),this.outputShape=[a,i];var s=t==="max"?">":"<",u=e?"inOffset + i;":"round(getBestIndicesA(batch, inOffset + i));";this.userCode=`
      void main() {
        ivec2 coords = getOutputCoords();
        int batch = coords[0];
        int outIdx = coords[1];
        int inOffset = outIdx * `+n+`;

        int bestIndex = inOffset;
        float bestValue = getA(batch, bestIndex);

        for (int i = 0; i < `+n+`; i++) {
          int inIdx = `+u+`;
          float candidate = getA(batch, inIdx);
          if (candidate `+s+` bestValue) {
            bestValue = candidate;
            bestIndex = inIdx;
          }
        }
        setOutput(float(bestIndex));
      }
    `};function Sc(r,t){return["x","y","z","w","u","v"].slice(0,t).map((function(e){return r+"."+e}))}function Ue(r,t){return t===1?[r]:Sc(r,t)}function Me(){var r,t,e,n,a,o,i,s,u,c;return B().getNumber("WEBGL_VERSION")===2?(r="#version 300 es",t="in",e="out",n="in",a="texture",o="outputColor",i="out vec4 outputColor;",s=`
      bool isnan_custom(float val) {
        return (val > 0.0 || val < 0.0) ? false : val != 0.0;
      }

      bvec4 isnan_custom(vec4 val) {
        return bvec4(isnan_custom(val.x),
          isnan_custom(val.y), isnan_custom(val.z), isnan_custom(val.w));
      }

      #define isnan(value) isnan_custom(value)
    `,u="",c=`
      #define round(value) newRound(value)
      int newRound(float value) {
        return int(floor(value + 0.5));
      }

      ivec4 newRound(vec4 value) {
        return ivec4(floor(value + vec4(0.5)));
      }
    `):(r="",t="attribute",e="varying",n="varying",a="texture2D",o="gl_FragColor",i="",s=`
      #define isnan(value) isnan_custom(value)
      bool isnan_custom(float val) {
        return (val > 0. || val < 1. || val == 0.) ? false : true;
      }
      bvec4 isnan_custom(vec4 val) {
        return bvec4(isnan(val.x), isnan(val.y), isnan(val.z), isnan(val.w));
      }
    `,u=`
      uniform float INFINITY;

      bool isinf(float val) {
        return abs(val) == INFINITY;
      }
      bvec4 isinf(vec4 val) {
        return equal(abs(val), vec4(INFINITY));
      }
    `,c=`
      int round(float value) {
        return int(floor(value + 0.5));
      }

      ivec4 round(vec4 value) {
        return ivec4(floor(value + vec4(0.5)));
      }
    `),{version:r,attribute:t,varyingVs:e,varyingFs:n,texture2D:a,output:o,defineOutput:i,defineSpecialNaN:s,defineSpecialInf:u,defineRound:c}}function Zt(r,t,e){e===void 0&&(e="index");var n=Ge(t);return n.map((function(a,o){return"int "+r[o]+" = "+e+" / "+a+"; "+(o===n.length-1?"int "+r[o+1]+" = "+e+" - "+r[o]+" * "+a:"index -= "+r[o]+" * "+a)+";"})).join("")}function Ci(r){var t=Ge(r).map((function(e){return e.toString()}));return`
  int getFlatIndex(ivec3 coords) {
    return coords.x * `+t[0]+" + coords.y * "+t[1]+` + coords.z;
  }
`}var Ic=`
  const float FLOAT_MAX = 1.70141184e38;
  const float FLOAT_MIN = 1.17549435e-38;

  lowp vec4 encode_float(highp float v) {
    if (isnan(v)) {
      return vec4(255, 255, 255, 255);
    }

    highp float av = abs(v);

    if(av < FLOAT_MIN) {
      return vec4(0.0, 0.0, 0.0, 0.0);
    } else if(v > FLOAT_MAX) {
      return vec4(0.0, 0.0, 128.0, 127.0) / 255.0;
    } else if(v < -FLOAT_MAX) {
      return vec4(0.0, 0.0,  128.0, 255.0) / 255.0;
    }

    highp vec4 c = vec4(0,0,0,0);

    highp float e = floor(log2(av));
    highp float m = exp2(fract(log2(av))) - 1.0;

    c[2] = floor(128.0 * m);
    m -= c[2] / 128.0;
    c[1] = floor(32768.0 * m);
    m -= c[1] / 32768.0;
    c[0] = floor(8388608.0 * m);

    highp float ebias = e + 127.0;
    c[3] = floor(ebias / 2.0);
    ebias -= c[3] * 2.0;
    c[2] += floor(ebias) * 128.0;

    c[3] += 128.0 * step(0.0, -v);

    return c / 255.0;
  }
`;function Zp(r,t,e,n){var a=[];r.forEach((function(h){var f=$(h.shapeInfo.logicalShape);h.shapeInfo.isUniform?a.push("uniform float "+h.name+(f>1?"["+f+"]":"")+";"):(a.push("uniform sampler2D "+h.name+";"),a.push("uniform int offset"+h.name+";"))}));var o,i,s=a.join(`
`),u=r.map((function(h){return(function(f,m,v){v===void 0&&(v=!1);var g="";g+=v?kc(f):xn(f);var y=f.shapeInfo.logicalShape,x=m.logicalShape;return y.length<=x.length&&(g+=v?(function(b,C){var E,R=b.name,I=R.charAt(0).toUpperCase()+R.slice(1),k="get"+I+"AtOutCoords",T=b.shapeInfo.logicalShape.length,O=C.logicalShape.length,_=Rt(b.shapeInfo.logicalShape,C.logicalShape),W=ve(O),L=O-T,P=["x","y","z","w","u","v"];E=T===0?"":O<2&&_.length>=1?"coords = 0;":_.map((function(J){return"coords."+P[J+L]+" = 0;"})).join(`
`);var U="";U=O<2&&T>0?"coords":b.shapeInfo.logicalShape.map((function(J,Z){return"coords."+P[Z+L]})).join(", ");var G="return outputValue;",V=$(b.shapeInfo.logicalShape)===1,H=$(C.logicalShape)===1;if(T!==1||V||H){if(V&&!H)G=O===1?`
        return vec4(outputValue.x, outputValue.x, 0., 0.);
      `:`
        return vec4(outputValue.x);
      `;else if(_.length){var q=T-2,j=T-1;_.indexOf(q)>-1&&_.indexOf(j)>-1?G="return vec4(outputValue.x);":_.indexOf(q)>-1?G="return vec4(outputValue.x, outputValue.y, outputValue.x, outputValue.y);":_.indexOf(j)>-1&&(G="return vec4(outputValue.xx, outputValue.zz);")}}else G=`
      return vec4(outputValue.xy, outputValue.xy);
    `;return`
    vec4 `+k+`() {
      `+W+` coords = getOutputCoords();
      `+E+`
      vec4 outputValue = get`+I+"("+U+`);
      `+G+`
    }
  `})(f,m):(function(b,C){var E=b.name,R=E.charAt(0).toUpperCase()+E.slice(1),I="get"+R+"AtOutCoords",k=C.texShape,T=b.shapeInfo.texShape,O=b.shapeInfo.logicalShape.length,_=C.logicalShape.length;if(!b.shapeInfo.isUniform&&O===_&&b.shapeInfo.flatOffset==null&&Re(T,k))return`
      float `+I+`() {
        return sampleTexture(`+E+`, resultUV);
      }
    `;var W,L=ve(_),P=Rt(b.shapeInfo.logicalShape,C.logicalShape),U=_-O,G=["x","y","z","w","u","v"];W=O===0?"":_<2&&P.length>=1?"coords = 0;":P.map((function(H){return"coords."+G[H+U]+" = 0;"})).join(`
`);var V="";return V=_<2&&O>0?"coords":b.shapeInfo.logicalShape.map((function(H,q){return"coords."+G[q+U]})).join(", "),`
    float `+I+`() {
      `+L+` coords = getOutputCoords();
      `+W+`
      return get`+R+"("+V+`);
    }
  `})(f,m)),g})(h,t,n)})).join(`
`),c=t.texShape,l=Me(),p=(function(h){return`
    float sampleTexture(sampler2D textureSampler, vec2 uv) {
      return `+h.texture2D+`(textureSampler, uv).r;
    }
  `})(l),d=(function(h){return h.version+`
    precision highp float;
    precision highp int;
    precision highp sampler2D;
    `+h.varyingFs+` vec2 resultUV;
    `+h.defineOutput+`
    const vec2 halfCR = vec2(0.5, 0.5);

    struct ivec5
    {
      int x;
      int y;
      int z;
      int w;
      int u;
    };

    struct ivec6
    {
      int x;
      int y;
      int z;
      int w;
      int u;
      int v;
    };

    uniform float NAN;
    `+h.defineSpecialNaN+`
    `+h.defineSpecialInf+`
    `+h.defineRound+`

    int imod(int x, int y) {
      return x - y * (x / y);
    }

    int idiv(int a, int b, float sign) {
      int res = a / b;
      int mod = imod(a, b);
      if (sign < 0. && mod != 0) {
        res -= 1;
      }
      return res;
    }

    //Based on the work of Dave Hoskins
    //https://www.shadertoy.com/view/4djSRW
    #define HASHSCALE1 443.8975
    float random(float seed){
      vec2 p = resultUV * seed;
      vec3 p3  = fract(vec3(p.xyx) * HASHSCALE1);
      p3 += dot(p3, p3.yzx + 19.19);
      return fract((p3.x + p3.y) * p3.z);
    }

    `+ed+`
    `+td+`
    `+nd+`
  `})(l);return t.isPacked?(o=(function(h,f){switch(h.length){case 0:return`
    int getOutputCoords() {
      return 0;
    }
  `;case 1:return(function(b,C){var E=[Math.ceil(C[0]/2),Math.ceil(C[1]/2)];return E[0]===1?`
      int getOutputCoords() {
        return 2 * int(resultUV.x * `+E[1]+`.0);
      }
    `:E[1]===1?`
      int getOutputCoords() {
        return 2 * int(resultUV.y * `+E[0]+`.0);
      }
    `:`
    int getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(`+E[0]+", "+E[1]+`));
      return 2 * (resTexRC.x * `+E[1]+` + resTexRC.y);
    }
  `})(0,f);case 2:return(function(b,C){var E=[Math.ceil(C[0]/2),Math.ceil(C[1]/2)];if(Re(b,C))return`
      ivec2 getOutputCoords() {
        return 2 * ivec2(resultUV.yx * vec2(`+E[0]+", "+E[1]+`));
      }
    `;var R=Math.ceil(b[1]/2);return`
    ivec2 getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(`+E[0]+", "+E[1]+`));

      int index = resTexRC.x * `+E[1]+` + resTexRC.y;
      int r = 2 * (index / `+R+`);
      int c = imod(index, `+R+`) * 2;

      return ivec2(r, c);
    }
  `})(h,f);case 3:return m=h,v=f,g=[Math.ceil(v[0]/2),Math.ceil(v[1]/2)],y=Math.ceil(m[2]/2),x=y*Math.ceil(m[1]/2),`
    ivec3 getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(`+g[0]+", "+g[1]+`));
      int index = resTexRC.x * `+g[1]+` + resTexRC.y;

      int b = index / `+x+`;
      index -= b * `+x+`;

      int r = 2 * (index / `+y+`);
      int c = imod(index, `+y+`) * 2;

      return ivec3(b, r, c);
    }
  `;default:return(function(b,C){for(var E=[Math.ceil(C[0]/2),Math.ceil(C[1]/2)],R=Math.ceil(b[b.length-1]/2),I=R*Math.ceil(b[b.length-2]/2),k=I,T="",O="b, r, c",_=2;_<b.length-1;_++)k*=b[b.length-_-1],T=`
      int b`+_+" = index / "+k+`;
      index -= b`+_+" * "+k+`;
    `+T,O="b"+_+", "+O;return`
    ivec`+b.length+` getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(`+E[0]+", "+E[1]+`));
      int index = resTexRC.x * `+E[1]+` + resTexRC.y;

      `+T+`

      int b = index / `+I+`;
      index -= b * `+I+`;

      int r = 2 * (index / `+R+`);
      int c = imod(index, `+R+`) * 2;

      return ivec`+b.length+"("+O+`);
    }
  `})(h,f)}var m,v,g,y,x})(t.logicalShape,c),i=(function(h){return`
    void setOutput(vec4 val) {
      `+h.output+` = val;
    }
  `})(l)):(o=(function(h,f){switch(h.length){case 0:return`
    int getOutputCoords() {
      return 0;
    }
  `;case 1:return(function(g,y){return y[0]===1?`
      int getOutputCoords() {
        return int(resultUV.x * `+y[1]+`.0);
      }
    `:y[1]===1?`
      int getOutputCoords() {
        return int(resultUV.y * `+y[0]+`.0);
      }
    `:`
    int getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(`+y[0]+", "+y[1]+`));
      return resTexRC.x * `+y[1]+` + resTexRC.y;
    }
  `})(0,f);case 2:return(function(g,y){return Re(g,y)?`
      ivec2 getOutputCoords() {
        return ivec2(resultUV.yx * vec2(`+y[0]+", "+y[1]+`));
      }
    `:g[1]===1?`
      ivec2 getOutputCoords() {
        ivec2 resTexRC = ivec2(resultUV.yx *
                               vec2(`+y[0]+", "+y[1]+`));
        int index = resTexRC.x * `+y[1]+` + resTexRC.y;
        return ivec2(index, 0);
      }
    `:g[0]===1?`
      ivec2 getOutputCoords() {
        ivec2 resTexRC = ivec2(resultUV.yx *
                               vec2(`+y[0]+", "+y[1]+`));
        int index = resTexRC.x * `+y[1]+` + resTexRC.y;
        return ivec2(0, index);
      }
    `:`
    ivec2 getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(`+y[0]+", "+y[1]+`));
      int index = resTexRC.x * `+y[1]+` + resTexRC.y;
      int r = index / `+g[1]+`;
      int c = index - r * `+g[1]+`;
      return ivec2(r, c);
    }
  `})(h,f);case 3:return m=f,v=Zt(["r","c","d"],h),`
    ivec3 getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
                             vec2(`+m[0]+", "+m[1]+`));
      int index = resTexRC.x * `+m[1]+` + resTexRC.y;
      `+v+`
      return ivec3(r, c, d);
    }
  `;case 4:return(function(g,y){var x=Zt(["r","c","d","d2"],g);return`
    ivec4 getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
        vec2(`+y[0]+", "+y[1]+`));
      int index = resTexRC.x * `+y[1]+` + resTexRC.y;
      `+x+`
      return ivec4(r, c, d, d2);
    }
  `})(h,f);case 5:return(function(g,y){var x=Zt(["r","c","d","d2","d3"],g);return`
    ivec5 getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx * vec2(`+y[0]+`,
                             `+y[1]+`));

      int index = resTexRC.x * `+y[1]+` + resTexRC.y;

      `+x+`

      ivec5 outShape = ivec5(r, c, d, d2, d3);
      return outShape;
    }
  `})(h,f);case 6:return(function(g,y){var x=Zt(["r","c","d","d2","d3","d4"],g);return`
    ivec6 getOutputCoords() {
      ivec2 resTexRC = ivec2(resultUV.yx *
        vec2(`+y[0]+", "+y[1]+`));
      int index = resTexRC.x * `+y[1]+` + resTexRC.y;

      `+x+`

      ivec6 result = ivec6(r, c, d, d2, d3, d4);
      return result;
    }
  `})(h,f);default:throw new Error(h.length+"-D output sampling is not yet supported")}var m,v})(t.logicalShape,c),i=(function(h){return`
    void setOutput(float val) {
      `+h.output+` = vec4(val, 0, 0, 0);
    }
  `})(l)),n&&(d+=rd),[d,p,i,s,o,u,e].join(`
`)}function xn(r){var t=r.shapeInfo.logicalShape;switch(t.length){case 0:return(function(e){var n=e.name,a="get"+n.charAt(0).toUpperCase()+n.slice(1);if(e.shapeInfo.isUniform)return"float "+a+"() {return "+n+";}";var o=e.shapeInfo.texShape,i=o[0],s=o[1];if(i===1&&s===1)return`
      float `+a+`() {
        return sampleTexture(`+n+`, halfCR);
      }
    `;var u=e.shapeInfo.texShape,c=u[0],l=u[1],p=Xt(n);return`
    float `+a+`() {
      vec2 uv = uvFromFlat(`+c+", "+l+", "+p+`);
      return sampleTexture(`+n+`, uv);
    }
  `})(r);case 1:return(function(e){var n=e.name,a="get"+n.charAt(0).toUpperCase()+n.slice(1);if(e.shapeInfo.isUniform)return`
      float `+a+`(int index) {
        `+vn(e)+`
      }
    `;var o=e.shapeInfo.texShape,i=o[0],s=o[1];if(s===1&&i===1)return`
      float `+a+`(int index) {
        return sampleTexture(`+n+`, halfCR);
      }
    `;var u=Xt(n);return s===1?`
      float `+a+`(int index) {
        vec2 uv = vec2(0.5, (float(index + `+u+") + 0.5) / "+i+`.0);
        return sampleTexture(`+n+`, uv);
      }
    `:i===1?`
      float `+a+`(int index) {
        vec2 uv = vec2((float(index + `+u+") + 0.5) / "+s+`.0, 0.5);
        return sampleTexture(`+n+`, uv);
      }
    `:`
    float `+a+`(int index) {
      vec2 uv = uvFromFlat(`+i+", "+s+", index + "+u+`);
      return sampleTexture(`+n+`, uv);
    }
  `})(r);case 2:return(function(e){var n=e.shapeInfo.logicalShape,a=e.name,o="get"+a.charAt(0).toUpperCase()+a.slice(1),i=e.shapeInfo.texShape;if(i!=null&&Re(n,i)){var s=i[0],u=i[1];return`
    float `+o+`(int row, int col) {
      vec2 uv = (vec2(col, row) + halfCR) / vec2(`+u+".0, "+s+`.0);
      return sampleTexture(`+a+`, uv);
    }
  `}var c=Mt(n),l=c.newShape,p=c.keptDims,d=l;if(d.length<n.length){var h=bn(e,d);return`
      `+xn(h)+`
      float `+o+`(int row, int col) {
        return `+o+"("+wn(["row","col"],p)+`);
      }
    `}if(e.shapeInfo.isUniform)return`
      float `+o+`(int row, int col) {
        int index = round(dot(vec2(row, col), vec2(`+n[1]+`, 1)));
        `+vn(e)+`
      }
    `;var f=i[0],m=i[1],v=Xt(a);return m===1?`
    float `+o+`(int row, int col) {
      float index = dot(vec3(row, col, `+v+"), vec3("+n[1]+`, 1, 1));
      vec2 uv = vec2(0.5, (index + 0.5) / `+f+`.0);
      return sampleTexture(`+a+`, uv);
    }
  `:f===1?`
    float `+o+`(int row, int col) {
      float index = dot(vec3(row, col, `+v+"), vec3("+n[1]+`, 1, 1));
      vec2 uv = vec2((index + 0.5) / `+m+`.0, 0.5);
      return sampleTexture(`+a+`, uv);
    }
  `:`
  float `+o+`(int row, int col) {
    // Explicitly use integer operations as dot() only works on floats.
    int index = row * `+n[1]+" + col + "+v+`;
    vec2 uv = uvFromFlat(`+f+", "+m+`, index);
    return sampleTexture(`+a+`, uv);
  }
`})(r);case 3:return(function(e){var n=e.shapeInfo.logicalShape,a=e.name,o="get"+a.charAt(0).toUpperCase()+a.slice(1),i=n[1]*n[2],s=n[2],u=Mt(n),c=u.newShape,l=u.keptDims,p=c;if(p.length<n.length){var d=bn(e,p);return`
        `+xn(d)+`
        float `+o+`(int row, int col, int depth) {
          return `+o+"("+wn(["row","col","depth"],l)+`);
        }
      `}if(e.shapeInfo.isUniform)return`
      float `+o+`(int row, int col, int depth) {
        int index = round(dot(vec3(row, col, depth),
                          vec3(`+i+", "+s+`, 1)));
        `+vn(e)+`
      }
    `;var h=e.shapeInfo.texShape,f=h[0],m=h[1],v=e.shapeInfo.flatOffset;if(m===i&&v==null)return`
        float `+o+`(int row, int col, int depth) {
          float texR = float(row);
          float texC = dot(vec2(col, depth), vec2(`+s+`, 1));
          vec2 uv = (vec2(texC, texR) + halfCR) /
                     vec2(`+m+".0, "+f+`.0);
          return sampleTexture(`+a+`, uv);
        }
      `;if(m===s&&v==null)return`
    float `+o+`(int row, int col, int depth) {
      float texR = dot(vec2(row, col), vec2(`+n[1]+`, 1));
      float texC = float(depth);
      vec2 uv = (vec2(texC, texR) + halfCR) / vec2(`+m+".0, "+f+`.0);
      return sampleTexture(`+a+`, uv);
    }
  `;var g=Xt(a);return`
      float `+o+`(int row, int col, int depth) {
        // Explicitly use integer operations as dot() only works on floats.
        int index = row * `+i+" + col * "+s+" + depth + "+g+`;
        vec2 uv = uvFromFlat(`+f+", "+m+`, index);
        return sampleTexture(`+a+`, uv);
      }
  `})(r);case 4:return(function(e){var n=e.shapeInfo.logicalShape,a=e.name,o="get"+a.charAt(0).toUpperCase()+a.slice(1),i=n[3],s=n[2]*i,u=n[1]*s,c=Mt(n),l=c.newShape,p=c.keptDims;if(l.length<n.length){var d=bn(e,l);return`
      `+xn(d)+`
      float `+o+`(int row, int col, int depth, int depth2) {
        return `+o+"("+wn(["row","col","depth","depth2"],p)+`);
      }
    `}if(e.shapeInfo.isUniform)return`
      float `+o+`(int row, int col, int depth, int depth2) {
        int index = round(dot(vec4(row, col, depth, depth2),
                          vec4(`+u+", "+s+", "+i+`, 1)));
        `+vn(e)+`
      }
    `;var h=e.shapeInfo.flatOffset,f=e.shapeInfo.texShape,m=f[0],v=f[1];if(v===u&&h==null)return`
      float `+o+`(int row, int col, int depth, int depth2) {
        float texR = float(row);
        float texC =
            dot(vec3(col, depth, depth2),
                vec3(`+s+", "+i+`, 1));
        vec2 uv = (vec2(texC, texR) + halfCR) /
                   vec2(`+v+".0, "+m+`.0);
        return sampleTexture(`+a+`, uv);
      }
    `;if(v===i&&h==null)return`
      float `+o+`(int row, int col, int depth, int depth2) {
        float texR = dot(vec3(row, col, depth),
                         vec3(`+n[1]*n[2]+", "+n[2]+`, 1));
        float texC = float(depth2);
        vec2 uv = (vec2(texC, texR) + halfCR) /
                  vec2(`+v+".0, "+m+`.0);
        return sampleTexture(`+a+`, uv);
      }
    `;var g=Xt(a);return`
    float `+o+`(int row, int col, int depth, int depth2) {
      // Explicitly use integer operations as dot() only works on floats.
      int index = row * `+u+" + col * "+s+` +
          depth * `+i+` + depth2;
      vec2 uv = uvFromFlat(`+m+", "+v+", index + "+g+`);
      return sampleTexture(`+a+`, uv);
    }
  `})(r);case 5:return(function(e){var n=e.shapeInfo.logicalShape,a=e.name,o="get"+a.charAt(0).toUpperCase()+a.slice(1),i=n[4],s=n[3]*i,u=n[2]*s,c=n[1]*u,l=Mt(n),p=l.newShape,d=l.keptDims;if(p.length<n.length){var h=bn(e,p);return`
      `+xn(h)+`
      float `+o+`(int row, int col, int depth, int depth2, int depth3) {
        return `+o+"("+wn(["row","col","depth","depth2","depth3"],d)+`);
      }
    `}if(e.shapeInfo.isUniform)return`
      float `+o+`(int row, int col, int depth, int depth2, int depth3) {
        float index = dot(
          vec4(row, col, depth, depth2),
          vec4(`+c+", "+u+", "+s+", "+i+`)) +
          depth3;
        `+vn(e)+`
      }
    `;var f=e.shapeInfo.flatOffset,m=e.shapeInfo.texShape,v=m[0],g=m[1];if(g===c&&f==null)return`
      float `+o+`(int row, int col, int depth, int depth2, int depth3) {
        int texR = row;
        float texC = dot(vec4(col, depth, depth2, depth3),
                         vec4(`+u+", "+s+", "+i+`, 1));
        vec2 uv = (vec2(texC, texR) + halfCR) /
                   vec2(`+g+".0, "+v+`.0);
        return sampleTexture(`+a+`, uv);
      }
    `;if(g===i&&f==null)return`
      float `+o+`(int row, int col, int depth, int depth2, int depth3) {
        float texR = dot(
          vec4(row, col, depth, depth2),
          vec4(`+n[1]*n[2]*n[3]+`,
               `+n[2]*n[3]+", "+n[3]+`, 1));
        int texC = depth3;
        vec2 uv = (vec2(texC, texR) + halfCR) /
                  vec2(`+g+".0, "+v+`.0);
        return sampleTexture(`+a+`, uv);
      }
    `;var y=Xt(a);return`
    float `+o+`(int row, int col, int depth, int depth2, int depth3) {
      // Explicitly use integer operations as dot() only works on floats.
      int index = row * `+c+" + col * "+u+" + depth * "+s+` +
          depth2 * `+i+" + depth3 + "+y+`;
      vec2 uv = uvFromFlat(`+v+", "+g+`, index);
      return sampleTexture(`+a+`, uv);
    }
  `})(r);case 6:return(function(e){var n=e.shapeInfo.logicalShape,a=e.name,o="get"+a.charAt(0).toUpperCase()+a.slice(1),i=Mt(n),s=i.newShape,u=i.keptDims;if(s.length<n.length){var c=bn(e,s);return`
      `+xn(c)+`
      float `+o+`(int row, int col, int depth,
                    int depth2, int depth3, int depth4) {
        return `+o+"("+wn(["row","col","depth","depth2","depth3","depth4"],u)+`);
      }
    `}var l=n[5],p=n[4]*l,d=n[3]*p,h=n[2]*d,f=n[1]*h;if(e.shapeInfo.isUniform)return`
      float `+o+`(int row, int col, int depth,
                  int depth2, int depth3, int depth4) {
        int index = round(dot(
          vec4(row, col, depth, depth2),
          vec4(`+f+", "+h+", "+d+", "+p+`)) +
          dot(
            vec2(depth3, depth4),
            vec2(`+l+`, 1)));
        `+vn(e)+`
      }
    `;var m=e.shapeInfo.flatOffset,v=e.shapeInfo.texShape,g=v[0],y=v[1];if(y===f&&m==null)return`
      float `+o+`(int row, int col, int depth,
                    int depth2, int depth3, int depth4) {
        int texR = row;
        float texC = dot(vec4(col, depth, depth2, depth3),
          vec4(`+h+", "+d+", "+p+", "+l+`)) +
               float(depth4);
        vec2 uv = (vec2(texC, texR) + halfCR) /
                   vec2(`+y+".0, "+g+`.0);
        return sampleTexture(`+a+`, uv);
      }
    `;if(y===l&&m==null)return`
      float `+o+`(int row, int col, int depth,
                    int depth2, int depth3, int depth4) {
        float texR = dot(vec4(row, col, depth, depth2),
          vec4(`+n[1]*n[2]*n[3]*n[4]+`,
               `+n[2]*n[3]*n[4]+`,
               `+n[3]*n[4]+`,
               `+n[4]+`)) + float(depth3);
        int texC = depth4;
        vec2 uv = (vec2(texC, texR) + halfCR) /
                  vec2(`+y+".0, "+g+`.0);
        return sampleTexture(`+a+`, uv);
      }
    `;var x=Xt(a);return`
    float `+o+`(int row, int col, int depth,
                  int depth2, int depth3, int depth4) {
      // Explicitly use integer operations as dot() only works on floats.
      int index = row * `+f+" + col * "+h+" + depth * "+d+` +
          depth2 * `+p+" + depth3 * "+l+" + depth4 + "+x+`;
      vec2 uv = uvFromFlat(`+g+", "+y+`, index);
      return sampleTexture(`+a+`, uv);
    }
  `})(r);default:throw new Error(t.length+"-D input sampling is not yet supported")}}function kc(r){var t,e,n;switch(r.shapeInfo.logicalShape.length){case 0:return t=r.name,e="get"+t.charAt(0).toUpperCase()+t.slice(1),n=Me(),`
    vec4 `+e+`() {
      return `+n.texture2D+"("+t+`, halfCR);
    }
  `;case 1:return(function(a){var o=a.name,i="get"+o.charAt(0).toUpperCase()+o.slice(1),s=a.shapeInfo.texShape,u=[Math.ceil(s[0]/2),Math.ceil(s[1]/2)],c=Me();return`
    vec4 `+i+`(int index) {
      vec2 uv = packedUVfrom1D(
        `+u[0]+", "+u[1]+`, index);
      return `+c.texture2D+"("+o+`, uv);
    }
  `})(r);case 2:return(function(a){var o=a.shapeInfo.logicalShape,i=a.name,s="get"+i.charAt(0).toUpperCase()+i.slice(1),u=a.shapeInfo.texShape,c=u[0],l=u[1],p=Me();if(u!=null&&Re(o,u))return`
      vec4 `+s+`(int row, int col) {
        vec2 uv = (vec2(col, row) + halfCR) / vec2(`+l+".0, "+c+`.0);

        return `+p.texture2D+"("+i+`, uv);
      }
    `;var d=[Math.ceil(u[0]/2),Math.ceil(u[1]/2)],h=Math.ceil(o[1]/2);return`
    vec4 `+s+`(int row, int col) {
      vec2 uv = packedUVfrom2D(`+h+", "+d[0]+", "+d[1]+`, row, col);
      return `+p.texture2D+"("+i+`, uv);
    }
  `})(r);case 3:return(function(a){var o=a.shapeInfo.logicalShape,i=a.name,s="get"+i.charAt(0).toUpperCase()+i.slice(1),u=a.shapeInfo.texShape,c=[Math.ceil(u[0]/2),Math.ceil(u[1]/2)];if(o[0]===1){var l=o.slice(1),p=bn(a,l);return`
        `+kc(p)+`
        vec4 `+s+`(int b, int row, int col) {
          return `+s+"("+wn(["b","row","col"],[1,2])+`);
        }
      `}var d=c[0],h=c[1],f=Math.ceil(o[2]/2),m=f*Math.ceil(o[1]/2),v=Me();return`
    vec4 `+s+`(int b, int row, int col) {
      vec2 uv = packedUVfrom3D(
        `+d+", "+h+", "+m+", "+f+`, b, row, col);
      return `+v.texture2D+"("+i+`, uv);
    }
  `})(r);default:return(function(a){for(var o=a.shapeInfo.logicalShape,i=o.length,s=a.name,u="get"+s.charAt(0).toUpperCase()+s.slice(1),c=a.shapeInfo.texShape,l=[Math.ceil(c[0]/2),Math.ceil(c[1]/2)],p=l[0],d=l[1],h=Math.ceil(o[i-1]/2),f=h*Math.ceil(o[i-2]/2),m="int b, int row, int col",v="b * "+f+" + (row / 2) * "+h+" + (col / 2)",g=2;g<i-1;g++)m="int b"+g+", "+m,f*=o[i-g-1],v="b"+g+" * "+f+" + "+v;var y=Me();return`
    vec4 `+u+"("+m+`) {
      int index = `+v+`;
      int texR = index / `+d+`;
      int texC = index - texR * `+d+`;
      vec2 uv = (vec2(texC, texR) + halfCR) / vec2(`+d+", "+p+`);
      return `+y.texture2D+"("+s+`, uv);
    }
  `})(r)}}var ed=`
vec2 uvFromFlat(int texNumR, int texNumC, int index) {
  int texR = index / texNumC;
  int texC = index - texR * texNumC;
  return (vec2(texC, texR) + halfCR) / vec2(texNumC, texNumR);
}
vec2 packedUVfrom1D(int texNumR, int texNumC, int index) {
  int texelIndex = index / 2;
  int texR = texelIndex / texNumC;
  int texC = texelIndex - texR * texNumC;
  return (vec2(texC, texR) + halfCR) / vec2(texNumC, texNumR);
}
`,td=`
vec2 packedUVfrom2D(int texelsInLogicalRow, int texNumR,
  int texNumC, int row, int col) {
  int texelIndex = (row / 2) * texelsInLogicalRow + (col / 2);
  int texR = texelIndex / texNumC;
  int texC = texelIndex - texR * texNumC;
  return (vec2(texC, texR) + halfCR) / vec2(texNumC, texNumR);
}
`,nd=`
vec2 packedUVfrom3D(int texNumR, int texNumC,
    int texelsInBatch, int texelsInLogicalRow, int b,
    int row, int col) {
  int index = b * texelsInBatch + (row / 2) * texelsInLogicalRow + (col / 2);
  int texR = index / texNumC;
  int texC = index - texR * texNumC;
  return (vec2(texC, texR) + halfCR) / vec2(texNumC, texNumR);
}
`,rd=`
  float getChannel(vec4 frag, vec2 innerDims) {
    vec2 modCoord = mod(innerDims, 2.);
    return modCoord.x == 0. ?
      (modCoord.y == 0. ? frag.r : frag.g) :
      (modCoord.y == 0. ? frag.b : frag.a);
  }
  float getChannel(vec4 frag, int dim) {
    float modCoord = mod(float(dim), 2.);
    return modCoord == 0. ? frag.r : frag.g;
  }
`;function Xt(r){return"offset"+r}function vn(r){var t=r.name,e=$(r.shapeInfo.logicalShape);return e<2?"return "+t+";":`
    for (int i = 0; i < `+e+`; i++) {
      if (i == index) {
        return `+t+`[i];
      }
    }
  `}function ve(r){if(r<=1)return"int";if(r===2)return"ivec2";if(r===3)return"ivec3";if(r===4)return"ivec4";if(r===5)return"ivec5";if(r===6)return"ivec6";throw Error("GPU for rank "+r+" is not yet supported")}function bn(r,t){var e=JSON.parse(JSON.stringify(r));return e.shapeInfo.logicalShape=t,e}function wn(r,t){return t.map((function(e){return r[e]})).join(", ")}var ad=function(r,t,e,n){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!0,S(r.length>2,(function(){return"Packed arg"+(e.charAt(0).toUpperCase()+e.slice(1))+" supports only inputs with rank above 2."}));var a=r[r.length-1],o=Math.ceil(a/t);this.outputShape=r.slice(0,-1),o>1&&this.outputShape.push(o),n||this.variableNames.push("bestIndicesA");var i,s,u=this.outputShape,c=u.length,l=ve(c),p=Ue("coords",c);if(o===1){var d=ve(s=c+1);i=`
        `+d+" sourceLocR = "+d+"("+p.join()+`, 0);
        ++`+p[c-1]+`;
        `+d+" sourceLocG = "+d+"("+p.join()+`, 0);
        ++`+p[c-2]+`;
        `+d+" sourceLocA = "+d+"("+p.join()+`, 0);
        --`+p[c-1]+`;
        `+d+" sourceLocB = "+d+"("+p.join()+`, 0);
        --`+p[c-2]+";"}else s=c,i=`
        `+l+` sourceLocR = coords;
        ++`+p[c-1]+`;
        `+l+` sourceLocG = coords;
        ++`+p[c-2]+`;
        `+l+` sourceLocA = coords;
        --`+p[c-1]+`;
        `+l+` sourceLocB = coords;
        --`+p[c-2]+";";var h=["x","y","z","w","u","v"].slice(0,s),f="."+h[s-1],m=h.map((function(I){return"int "+I})),v=Ue("sourceLocR",s-1).concat("inIdx.r"),g=Ue("sourceLocG",s-1).concat("inIdx.g"),y=Ue("sourceLocB",s-1).concat("inIdx.b"),x=Ue("sourceLocA",s-1).concat("inIdx.a"),b=e==="max"?"greaterThan":"lessThan",C=n?"":`
          inIdx = round(vec4(getBestIndicesAChannel(`+v.join()+`),
                             getBestIndicesAChannel(`+g.join()+`),
                             getBestIndicesAChannel(`+y.join()+`),
                             getBestIndicesAChannel(`+x.join()+")));",E=`vec4(
            getAChannel(`+v.join()+`),
            hasNextCol ? getAChannel(`+g.join()+`) : 0.,
            hasNextRow ? getAChannel(`+y.join()+`) : 0.,
            hasNextRow && hasNextCol ? getAChannel(`+x.join()+") : 0.)",R=n?"":`
      float getBestIndicesAChannel(`+m.join()+`) {
        return getChannel(getBestIndicesA(`+h.join()+`),
                                          vec2(`+h.slice(-2).join()+`));
      }`;this.userCode=`
      float getAChannel(`+m.join()+`) {
        return getChannel(getA(`+h.join()+`),
                               vec2(`+h.slice(-2).join()+`));
      }
      `+R+`
      void main() {
        `+l+` coords = getOutputCoords();
        bool hasNextCol = `+p[c-1]+" < "+(u[c-1]-1)+`;
        bool hasNextRow = `+p[c-2]+" < "+(u[c-2]-1)+`;
        `+i+`
        ivec4 srcIdx = ivec4(sourceLocR`+f+", sourceLocG"+f+`,
          sourceLocB`+f+", sourceLocA"+f+") * "+t+`;
        ivec4 inIdx = srcIdx;
        vec4 bestIndex = vec4(inIdx);
        vec4 bestValue = `+E+`;

        for (int i = 0; i < `+t+`; i++) {
          inIdx = srcIdx;
          `+C+`
          vec4 candidate = `+E+`;
          bvec4 nan = isnan(candidate);
          bvec4 replace = bvec4(
            vec4(`+b+`(candidate, bestValue)) * (vec4(1.0) - vec4(nan)));

          bestValue = vec4(replace.x  ? candidate.x : bestValue.x,
                           replace.y  ? candidate.y : bestValue.y,
                           replace.z  ? candidate.z : bestValue.z,
                           replace.w  ? candidate.w : bestValue.w);
          bestIndex = mix(bestIndex, vec4(inIdx), vec4(replace));
          srcIdx++;
        }
        setOutput(bestIndex);
      }
    `},od=function(r){this.variableNames=["dy"],this.outputShape=r.inShape;var t=r.filterHeight,e=r.filterWidth,n=r.strideHeight,a=r.strideWidth,o=r.dilationHeight,i=r.dilationWidth,s=r.effectiveFilterHeight,u=r.effectiveFilterWidth,c=s-1-r.padInfo.top,l=u-1-r.padInfo.left,p=1/(t*e);this.userCode=`
      const ivec2 pads = ivec2(`+c+", "+l+`);
      const float avgMultiplier = float(`+p+`);

      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int d = coords[3];

        ivec2 dyRCCorner = coords.yz - pads;
        int dyRCorner = dyRCCorner.x;
        int dyCCorner = dyRCCorner.y;

        // Convolve dy(?, ?, d) with pos mask(:, :, d) to get dx(xR, xC, d).
        // ? = to be determined. : = across all values in that axis.
        float dotProd = 0.0;
        for (int wR = 0; wR < `+s+`;
            wR += `+o+`) {
          float dyR = float(dyRCorner + wR) / `+n+`.0;

          if (dyR < 0.0 || dyR >= `+r.outHeight+`.0 || fract(dyR) > 0.0) {
            continue;
          }
          int idyR = int(dyR);

          for (int wC = 0; wC < `+u+`;
            wC+= `+i+`) {
            float dyC = float(dyCCorner + wC) / `+a+`.0;

            if (dyC < 0.0 || dyC >= `+r.outWidth+`.0 ||
                fract(dyC) > 0.0) {
              continue;
            }
            int idyC = int(dyC);

            float dyValue = getDy(b, idyR, idyC, d);

            dotProd += dyValue * avgMultiplier;
          }
        }
        setOutput(dotProd);
      }
    `},id=function(r){this.variableNames=["dy"],this.outputShape=r.inShape;var t=r.filterDepth,e=r.filterHeight,n=r.filterWidth,a=r.strideDepth,o=r.strideHeight,i=r.strideWidth,s=r.dilationDepth,u=r.dilationHeight,c=r.dilationWidth,l=r.effectiveFilterDepth,p=r.effectiveFilterHeight,d=r.effectiveFilterWidth,h=l-1-r.padInfo.front,f=p-1-r.padInfo.top,m=d-1-r.padInfo.left,v=1/(t*e*n);this.userCode=`
      const ivec3 pads = ivec3(`+h+", "+f+", "+m+`);
      const float avgMultiplier = float(`+v+`);

      void main() {
        ivec5 coords = getOutputCoords();
        int batch = coords.x;
        int ch = coords.u;

        ivec3 dyCorner = ivec3(coords.y, coords.z, coords.w) - pads;
        int dyDCorner = dyCorner.x;
        int dyRCorner = dyCorner.y;
        int dyCCorner = dyCorner.z;

        // Convolve dy(?, ?, ?, d) with pos mask(:, :, :, ch) to get
        // dx(xD, xR, xC, ch).
        // ? = to be determined. : = across all values in that axis.
        float dotProd = 0.0;

        for (int wD = 0; wD < `+l+`;
            wD += `+s+`) {
          float dyD = float(dyDCorner + wD) / `+a+`.0;

          if (dyD < 0.0 || dyD >= `+r.outDepth+`.0 || fract(dyD) > 0.0) {
            continue;
          }
          int idyD = int(dyD);

          for (int wR = 0; wR < `+p+`;
              wR += `+u+`) {
            float dyR = float(dyRCorner + wR) / `+o+`.0;

            if (dyR < 0.0 || dyR >= `+r.outHeight+`.0 ||
                fract(dyR) > 0.0) {
              continue;
            }
            int idyR = int(dyR);

            for (int wC = 0; wC < `+d+`;
                wC += `+c+`) {
              float dyC = float(dyCCorner + wC) / `+i+`.0;

              if (dyC < 0.0 || dyC >= `+r.outWidth+`.0 ||
                  fract(dyC) > 0.0) {
                continue;
              }
              int idyC = int(dyC);

              float dyValue = getDy(batch, idyD, idyR, idyC, ch);

              dotProd += dyValue * avgMultiplier;
            }
          }
        }
        setOutput(dotProd);
      }
    `},sd=function(r,t,e,n,a,o){this.outputShape=[],this.variableNames=["x","mean","variance"],ie(r,t),ie(r,e);var i="0.0";n!=null&&(ie(r,n),this.variableNames.push("offset"),i="getOffsetAtOutCoords()");var s="1.0";a!=null&&(ie(r,a),this.variableNames.push("scale"),s="getScaleAtOutCoords()"),this.outputShape=r,this.userCode=`
      void main() {
        float x = getXAtOutCoords();
        float mean = getMeanAtOutCoords();
        float variance = getVarianceAtOutCoords();
        float offset = `+i+`;
        float scale = `+s+`;
        float inv = scale * inversesqrt(variance + float(`+o+`));
        setOutput(dot(vec3(x, -mean, offset), vec3(inv, inv, 1)));
      }
    `},ud=function(r,t,e,n,a,o){this.packedInputs=!0,this.packedOutput=!0,this.variableNames=["x","mean","variance"],ie(r,t),ie(r,e);var i="vec4(0.0)";n!=null&&(ie(r,n),this.variableNames.push("offset"),i="getOffsetAtOutCoords()");var s="vec4(1.0)";a!=null&&(ie(r,a),this.variableNames.push("scale"),s="getScaleAtOutCoords()"),this.outputShape=r,this.userCode=`
      void main() {
        vec4 offset = `+i+`;
        vec4 scale = `+s+`;

        vec4 x = getXAtOutCoords();
        vec4 mean = getMeanAtOutCoords();
        vec4 variance = getVarianceAtOutCoords();

        vec4 inv = scale * inversesqrt(variance + vec4(`+o+`));

        setOutput((x - mean) * inv + offset);
      }
    `},cd="return areal * breal - aimag * bimag;",ld="return areal * bimag + aimag * breal;",Bs=function(r,t,e){this.variableNames=["AReal","AImag","BReal","BImag"],this.outputShape=ie(t,e),this.userCode=`
      float binaryOpComplex(
          float areal, float aimag, float breal, float bimag) {
        `+r+`
      }

      void main() {
        float areal = getARealAtOutCoords();
        float aimag = getAImagAtOutCoords();
        float breal = getBRealAtOutCoords();
        float bimag = getBImagAtOutCoords();
        setOutput(binaryOpComplex(areal, aimag, breal, bimag));
      }
    `},Wa="return a + b;",za="return a - b;",Ps="return a * b;",pd=`
if (a == b) {
  return 1.0;
};
return a / b;`,Rc="return (a < 0.) ? b * a : a;",Ee=function(r,t,e){this.variableNames=["A","B"],this.outputShape=ie(t,e),this.userCode=`
      float binaryOperation(float a, float b) {
        `+r+`
      }

      void main() {
        float a = getAAtOutCoords();
        float b = getBAtOutCoords();
        setOutput(binaryOperation(a, b));
      }
    `},dd=`
  // vec4 one = vec4(equal(a, b));
  // return one + (vec4(1.0) - one) * a / b;
  vec4 result = a / b;
  if(a.x == b.x) {
    result.x = 1.;
  }
  if(a.y == b.y) {
    result.y = 1.;
  }
  if(a.z == b.z) {
    result.z = 1.;
  }
  if(a.w == b.w) {
    result.w = 1.;
  }

  return result;
`,Tc=`
  vec4 aLessThanZero = vec4(lessThan(a, vec4(0.)));
  return (aLessThanZero * (b * a)) + ((vec4(1.0) - aLessThanZero) * a);
`,dt=function(r,t,e,n){n===void 0&&(n=!1),this.variableNames=["A","B"],this.supportsBroadcasting=!0,this.packedInputs=!0,this.packedOutput=!0,this.outputShape=ie(t,e);var a=this.outputShape.length,o="";if(n)if(a===0||$(this.outputShape)===1)o=`
          result.y = 0.;
          result.z = 0.;
          result.w = 0.;
        `;else if(o=`
          `+ve(a)+` coords = getOutputCoords();
        `,a===1)o+=`
            result.y = (coords + 1) >= `+this.outputShape[0]+` ? 0. : result.y;
            result.z = 0.;
            result.w = 0.;
          `;else{var i=Ue("coords",a);o+=`
            bool nextRowOutOfBounds =
              (`+i[a-2]+" + 1) >= "+this.outputShape[a-2]+`;
            bool nextColOutOfBounds =
              (`+i[a-1]+" + 1) >= "+this.outputShape[a-1]+`;
            result.y = nextColOutOfBounds ? 0. : result.y;
            result.z = nextRowOutOfBounds ? 0. : result.z;
            result.w = nextColOutOfBounds || nextRowOutOfBounds ? 0. : result.w;
          `}this.userCode=`
      vec4 binaryOperation(vec4 a, vec4 b) {
        `+r+`
      }

      void main() {
        vec4 a = getAAtOutCoords();
        vec4 b = getBAtOutCoords();

        vec4 result = binaryOperation(a, b);
        `+o+`

        setOutput(result);
      }
    `},hd=(function(){function r(t){this.variableNames=["A"],this.outputShape=t,this.userCode=`
      uniform float minVal;
      uniform float maxVal;

      void main() {
        float value = getAAtOutCoords();
        if (isnan(value)) {
          setOutput(value);
          return;
        }

        setOutput(clamp(value, minVal, maxVal));
      }
    `}return r.prototype.getCustomSetupFunc=function(t,e){var n=this;return function(a,o){n.minLoc==null&&(n.minLoc=a.getUniformLocationNoThrow(o,"minVal"),n.maxLoc=a.getUniformLocationNoThrow(o,"maxVal")),a.gl.uniform1f(n.minLoc,t),a.gl.uniform1f(n.maxLoc,e)}},r})(),fd=(function(){function r(t){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!0,this.outputShape=t,this.userCode=`
      uniform float minVal;
      uniform float maxVal;

      void main() {
        vec4 value = getAAtOutCoords();

        if (any(isnan(value))) {
          setOutput(value);
          return;
        }

        setOutput(clamp(value, vec4(minVal), vec4(maxVal)));
      }
    `}return r.prototype.getCustomSetupFunc=function(t,e){var n=this;return function(a,o){n.minLoc==null&&(n.minLoc=a.getUniformLocationNoThrow(o,"minVal"),n.maxLoc=a.getUniformLocationNoThrow(o,"maxVal")),a.gl.uniform1f(n.minLoc,t),a.gl.uniform1f(n.maxLoc,e)}},r})(),md=function(r){this.variableNames=["real","imag"],this.outputShape=r,this.userCode=`
      void main() {
        float re = abs(getRealAtOutCoords());
        float im = abs(getImagAtOutCoords());
        float mx = max(re, im);

        // sadly the length function in glsl is not underflow-safe
        // (at least not on Intel GPUs). So the safe solution is
        // to ensure underflow-safety in all cases.
        setOutput(
          mx == 0.0 ? 0.0 : mx * length(vec2(1, min(re, im)/mx))
        );
      }
    `},vd=function(r){this.outputShape=[],this.outputShape=rn(r,1),this.variableNames=r.map((function(s,u){return"T"+u}));var t=new Array(r.length-1);t[0]=r[0][1];for(var e=1;e<t.length;e++)t[e]=t[e-1]+r[e][1];var n=["if (yC < "+t[0]+") setOutput(getT0(yR, yC));"];for(e=1;e<t.length;e++){var a=t[e-1];n.push("else if (yC < "+t[e]+") setOutput(getT"+e+"(yR, yC-"+a+"));")}var o=t.length,i=t[t.length-1];n.push("else setOutput(getT"+o+"(yR, yC-"+i+"));"),this.userCode=`
      void main() {
        ivec2 coords = getOutputCoords();
        int yR = coords.x;
        int yC = coords.y;

        `+n.join(`
        `)+`
      }
    `},gd=function(r,t){this.packedInputs=!0,this.packedOutput=!0,this.outputShape=[],this.outputShape=rn(r,t);var e=this.outputShape,n=e.length,a=ve(n),o=Ue("coords",n),i=["x","y","z","w","u","v"].slice(0,n);this.variableNames=r.map((function(v,g){return"T"+g}));var s=new Array(r.length-1);s[0]=r[0][t];for(var u=1;u<s.length;u++)s[u]=s[u-1]+r[u][t];var c=i[t],l=i.slice(-2),p=i.join(),d="if ("+c+" < "+s[0]+`) {
        return getChannel(
            getT0(`+p+"), vec2("+l.join()+`));
        }`;for(u=1;u<s.length;u++){var h=s[u-1];d+=`
        if (`+c+" < "+s[u]+"  && "+c+" >= "+s[u-1]+`) {
          return getChannel(
            getT`+u+"("+yr(i,c,h)+`),
            vec2(`+yr(l,c,h)+`));
        }`}var f=s.length,m=s[s.length-1];d+=`
        return getChannel(
          getT`+f+"("+yr(i,c,m)+`),
          vec2(`+yr(l,c,m)+"));",this.userCode=`
      float getValue(`+i.map((function(v){return"int "+v}))+`) {
        `+d+`
      }

      void main() {
        `+a+` coords = getOutputCoords();
        vec4 result = vec4(getValue(`+o+`), 0., 0., 0.);

        `+o[n-1]+" = "+o[n-1]+` + 1;
        if (`+o[n-1]+" < "+e[n-1]+`) {
          result.g = getValue(`+o+`);
        }

        `+o[n-2]+" = "+o[n-2]+` + 1;
        if (`+o[n-2]+" < "+e[n-2]+`) {
          result.a = getValue(`+o+`);
        }

        `+o[n-1]+" = "+o[n-1]+` - 1;
        if (`+o[n-2]+" < "+e[n-2]+` &&
            `+o[n-1]+" < "+e[n-1]+`) {
          result.b = getValue(`+o+`);
        }
        setOutput(result);
      }
    `};function yr(r,t,e){var n=r.indexOf(t);return r.map((function(a,o){return o===n?a+" - "+e:a})).join()}var yd=function(r){this.variableNames=["x","dy"],this.outputShape=r.filterShape;var t=r.strideHeight,e=r.strideWidth,n=r.padInfo.top,a=r.padInfo.left,o=r.dataFormat==="channelsLast";this.userCode=`
      void main() {
        ivec4 coords = getOutputCoords();
        int wR = coords.x;
        int wC = coords.y;
        int d1 = coords.z;
        int d2 = coords.w;

        // Convolve x(?, ?, d1) with dy(:, :, d2) to get dw(wR, wC, d1, d2).
        // ? = to be determined. : = across all values in that axis.
        float dotProd = 0.0;

        for (int b = 0; b < `+r.batchSize+`; b++) {
          for (int yR = 0; yR < `+r.outHeight+`; yR++) {
            int xR = wR + yR * `+t+" - "+n+`;

            if (xR < 0 || xR >= `+r.inHeight+`) {
              continue;
            }

            for (int yC = 0; yC < `+r.outWidth+`; yC++) {
              int xC = wC + yC * `+e+" - "+a+`;

              if (xC < 0 || xC >= `+r.inWidth+`) {
                continue;
              }

              if (`+o+`) {
                float dyValue = getDy(b, yR, yC, d2);
                float xValue = getX(b, xR, xC, d1);
                dotProd += (xValue * dyValue);
              } else {
                float dyValue = getDy(b, d2, yR, yC);
                float xValue = getX(b, d1, xR, xC);
                dotProd += (xValue * dyValue);
              }

            }
          }
        }
        setOutput(dotProd);
      }
    `},xd=function(r){this.variableNames=["dy","W"],this.outputShape=r.inShape;var t=r.filterHeight,e=r.filterWidth,n=r.strideHeight,a=r.strideWidth,o=r.dataFormat==="channelsLast",i=t-1-r.padInfo.top,s=e-1-r.padInfo.left,u=o?1:2,c=o?2:3,l=o?3:1;this.userCode=`
      const ivec2 pads = ivec2(`+i+", "+s+`);

      void main() {
        ivec4 coords = getOutputCoords();
        int batch = coords[0];
        int d1 = coords[`+l+`];

        ivec2 dyCorner = ivec2(coords[`+u+"], coords["+c+`]) - pads;
        int dyRCorner = dyCorner.x;
        int dyCCorner = dyCorner.y;

        // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).
        // ? = to be determined. : = across all values in that axis.
        float dotProd = 0.0;
        for (int wR = 0; wR < `+t+`; wR++) {
          float dyR = float(dyRCorner + wR) / `+n+`.0;

          if (dyR < 0.0 || dyR >= `+r.outHeight+`.0 || fract(dyR) > 0.0) {
            continue;
          }
          int idyR = int(dyR);

          int wRPerm = `+t+` - 1 - wR;

          for (int wC = 0; wC < `+e+`; wC++) {
            float dyC = float(dyCCorner + wC) / `+a+`.0;

            if (dyC < 0.0 || dyC >= `+r.outWidth+`.0 ||
                fract(dyC) > 0.0) {
              continue;
            }
            int idyC = int(dyC);

            int wCPerm = `+e+` - 1 - wC;

            for (int d2 = 0; d2 < `+r.outChannels+`; d2++) {

              if (`+o+`) {
                float xValue = getDy(batch, idyR, idyC, d2);
                float wValue = getW(wRPerm, wCPerm, d1, d2);
                dotProd += xValue * wValue;
              } else {
                float xValue = getDy(batch, d2, idyR, idyC);
                float wValue = getW(wRPerm, wCPerm, d1, d2);
                dotProd += xValue * wValue;
              }

            }
          }
        }
        setOutput(dotProd);
      }
    `},bd=function(r){this.variableNames=["x","dy"],this.outputShape=r.filterShape;var t=r.strideDepth,e=r.strideHeight,n=r.strideWidth,a=r.padInfo.front,o=r.padInfo.top,i=r.padInfo.left;this.userCode=`
      void main() {
        ivec5 coords = getOutputCoords();
        int wF = coords.x;
        int wR = coords.y;
        int wC = coords.z;
        int d1 = coords.w;
        int d2 = coords.u;

        float dotProd = 0.0;

        for (int b = 0; b < `+r.batchSize+`; b++) {
          for (int yF = 0; yF < `+r.outDepth+`; yF++) {
            int xF = wF + yF * `+t+" - "+a+`;

            if (xF < 0 || xF >= `+r.inDepth+`) {
              continue;
            }

            for (int yR = 0; yR < `+r.outHeight+`; yR++) {
              int xR = wR + yR * `+e+" - "+o+`;

              if (xR < 0 || xR >= `+r.inHeight+`) {
                continue;
              }

              for (int yC = 0; yC < `+r.outWidth+`; yC++) {
                int xC = wC + yC * `+n+" - "+i+`;

                if (xC < 0 || xC >= `+r.inWidth+`) {
                  continue;
                }

                float dyValue = getDy(b, yF, yR, yC, d2);
                float xValue = getX(b, xF, xR, xC, d1);
                dotProd += (xValue * dyValue);
              }
            }
          }
        }
        setOutput(dotProd);
      }
    `},wd=function(r){this.variableNames=["dy","W"],this.outputShape=r.inShape;var t=r.filterDepth,e=r.filterHeight,n=r.filterWidth,a=r.strideDepth,o=r.strideHeight,i=r.strideWidth,s=t-1-r.padInfo.front,u=e-1-r.padInfo.top,c=n-1-r.padInfo.left;this.userCode=`
      const ivec3 pads = ivec3(`+s+", "+u+", "+c+`);

      void main() {
        ivec5 coords = getOutputCoords();
        int batch = coords.x;
        int d1 = coords.u;


        ivec3 dyCorner = ivec3(coords.y, coords.z, coords.w) - pads;
        int dyFCorner = dyCorner.x;
        int dyRCorner = dyCorner.y;
        int dyCCorner = dyCorner.z;

        float dotProd = 0.0;
        for (int wF = 0; wF < `+t+`; wF++) {
          float dyF = float(dyFCorner + wF) / `+a+`.0;

          if (dyF < 0.0 || dyF >= `+r.outDepth+`.0 || fract(dyF) > 0.0) {
            continue;
          }
          int idyF = int(dyF);

          int wFPerm = `+t+` - 1 - wF;

          for (int wR = 0; wR < `+e+`; wR++) {
            float dyR = float(dyRCorner + wR) / `+o+`.0;

            if (dyR < 0.0 || dyR >= `+r.outHeight+`.0 ||
              fract(dyR) > 0.0) {
              continue;
            }
            int idyR = int(dyR);

            int wRPerm = `+e+` - 1 - wR;

            for (int wC = 0; wC < `+n+`; wC++) {
              float dyC = float(dyCCorner + wC) / `+i+`.0;

              if (dyC < 0.0 || dyC >= `+r.outWidth+`.0 ||
                  fract(dyC) > 0.0) {
                continue;
              }
              int idyC = int(dyC);

              int wCPerm = `+n+` - 1 - wC;

              for (int d2 = 0; d2 < `+r.outChannels+`; d2++) {
                float xValue = getDy(batch, idyF, idyR, idyC, d2);
                float wValue = getW(wFPerm, wRPerm, wCPerm, d1, d2);
                dotProd += xValue * wValue;
              }
            }
          }
        }
        setOutput(dotProd);
      }
    `},Cd=function(r){this.variableNames=["x","dy"],this.outputShape=r.filterShape;var t=r.strideHeight,e=r.strideWidth,n=r.padInfo.top,a=r.padInfo.left,o=r.outChannels/r.inChannels;this.userCode=`
      void main() {
        ivec4 coords = getOutputCoords();
        int wR = coords.x;
        int wC = coords.y;
        int d1 = coords.z;
        int dm = coords.w;
        int d2 = d1 * `+o+` + dm;

        float dotProd = 0.0;

        // TO DO: Vec4 over the batch size
        for (int b = 0; b < `+r.batchSize+`; b++) {
          for (int yR = 0; yR < `+r.outHeight+`; yR++) {
            int xR = wR + yR * `+t+" - "+n+`;

            if (xR < 0 || xR >= `+r.inHeight+`) {
              continue;
            }

            for (int yC = 0; yC < `+r.outWidth+`; yC++) {
              int xC = wC + yC * `+e+" - "+a+`;

              if (xC < 0 || xC >= `+r.inWidth+`) {
                continue;
              }

              float dyValue = getDy(b, yR, yC, d2);
              float xValue = getX(b, xR, xC, d1);
              dotProd += (xValue * dyValue);
            }
          }
        }
        setOutput(dotProd);
      }
    `},Nd=function(r){this.variableNames=["dy","W"],this.outputShape=r.inShape;var t=r.filterHeight,e=r.filterWidth,n=r.strideHeight,a=r.strideWidth,o=t-1-r.padInfo.top,i=e-1-r.padInfo.left,s=r.outChannels/r.inChannels;this.userCode=`
      const ivec2 pads = ivec2(`+o+", "+i+`);

      void main() {
        ivec4 coords = getOutputCoords();
        int batch = coords[0];
        int d1 = coords[3];
        ivec2 dyCorner = coords.yz - pads;
        int dyRCorner = dyCorner.x;
        int dyCCorner = dyCorner.y;

        float dotProd = 0.0;

        for (int wR = 0; wR < `+t+`; wR++) {
          float dyR = float(dyRCorner + wR) / `+n+`.0;

          if (dyR < 0.0 || dyR >= `+r.outHeight+`.0 || fract(dyR) > 0.0) {
            continue;
          }
          int idyR = int(dyR);

          int wRPerm = `+t+` - 1 - wR;

          for (int wC = 0; wC < `+e+`; wC++) {
            float dyC = float(dyCCorner + wC) / `+a+`.0;

            if (dyC < 0.0 || dyC >= `+r.outWidth+`.0 ||
                fract(dyC) > 0.0) {
              continue;
            }
            int idyC = int(dyC);

            int wCPerm = `+e+` - 1 - wC;

            // TO DO: Vec4 over the channelMul
            for (int dm = 0; dm < `+s+`; dm++) {
              int d2 = d1 * `+s+` + dm;
              float xValue = getDy(batch, idyR, idyC, d2);
              float wValue = getW(wRPerm, wCPerm, d1, dm);
              dotProd += xValue * wValue;
            }
          }
        }
        setOutput(dotProd);
      }
    `},Ls=function(r,t,e,n){t===void 0&&(t=!1),e===void 0&&(e=null),n===void 0&&(n=!1),this.variableNames=["x","W"],this.outputShape=r.outShape;var a=r.padInfo.top,o=r.padInfo.left,i=r.strideHeight,s=r.strideWidth,u=r.dilationHeight,c=r.dilationWidth,l=r.filterHeight,p=r.filterWidth,d=4*Math.floor(r.inChannels/4),h=r.inChannels%4,f=r.dataFormat==="channelsLast",m=f?1:2,v=f?2:3,g=f?3:1,y="",x="";e&&(y=n?`float activation(float a) {
          float b = getPreluActivationWeightsAtOutCoords();
          `+e+`
        }`:`
          float activation(float x) {
            `+e+`
          }
        `,x="result = activation(result);");var b=t?"result += getBiasAtOutCoords();":"";t&&this.variableNames.push("bias"),n&&this.variableNames.push("preluActivationWeights"),this.userCode=`
      `+y+`

      const ivec2 strides = ivec2(`+i+", "+s+`);
      const ivec2 pads = ivec2(`+a+", "+o+`);

      void main() {
        ivec4 coords = getOutputCoords();
        int batch = coords[0];
        int d2 = coords[`+g+`];

        ivec2 xRCCorner =
            ivec2(coords[`+m+"], coords["+v+`]) * strides - pads;
        int xRCorner = xRCCorner.x;
        int xCCorner = xRCCorner.y;

        // Convolve x(?, ?, d1) with w(:, :, d1, d2) to get y(yR, yC, d2).
        // ? = to be determined. : = across all values in that axis.
        float dotProd = 0.0;
        for (int wR = 0; wR < `+l+`; wR++) {
          int xR = xRCorner + wR * `+u+`;

          if (xR < 0 || xR >= `+r.inHeight+`) {
            continue;
          }

          for (int wC = 0; wC < `+p+`; wC++) {
            int xC = xCCorner + wC * `+c+`;

            if (xC < 0 || xC >= `+r.inWidth+`) {
              continue;
            }

            for (int d1 = 0; d1 < `+d+`; d1 += 4) {
              vec4 wValues = vec4(
                getW(wR, wC, d1, d2),
                getW(wR, wC, d1 + 1, d2),
                getW(wR, wC, d1 + 2, d2),
                getW(wR, wC, d1 + 3, d2)
              );

              if (`+f+`) {
                vec4 xValues = vec4(
                  getX(batch, xR, xC, d1),
                  getX(batch, xR, xC, d1 + 1),
                  getX(batch, xR, xC, d1 + 2),
                  getX(batch, xR, xC, d1 + 3)
                );
                dotProd += dot(xValues, wValues);
              } else {
                vec4 xValues = vec4(
                  getX(batch, d1, xR, xC),
                  getX(batch, d1 + 1, xR, xC),
                  getX(batch, d1 + 2, xR, xC),
                  getX(batch, d1 + 3, xR, xC)
                );
                dotProd += dot(xValues, wValues);
              }
            }

            if (`+(h===1)+`) {

              if (`+f+`) {
                dotProd +=
                    getX(batch, xR, xC, `+d+`) *
                    getW(wR, wC, `+d+`, d2);
              } else {
                dotProd +=
                    getX(batch, `+d+`, xR, xC) *
                    getW(wR, wC, `+d+`, d2);
              }

            } else if (`+(h===2)+`) {
              vec2 wValues = vec2(
                getW(wR, wC, `+d+`, d2),
                getW(wR, wC, `+d+` + 1, d2)
              );

              if (`+f+`) {
                vec2 xValues = vec2(
                  getX(batch, xR, xC, `+d+`),
                  getX(batch, xR, xC, `+d+` + 1)
                );
                dotProd += dot(xValues, wValues);
              } else {
                vec2 xValues = vec2(
                  getX(batch, `+d+`, xR, xC),
                  getX(batch, `+d+` + 1, xR, xC)
                );
                dotProd += dot(xValues, wValues);
              }

            } else if (`+(h===3)+`) {
              vec3 wValues = vec3(
                getW(wR, wC, `+d+`, d2),
                getW(wR, wC, `+d+` + 1, d2),
                getW(wR, wC, `+d+` + 2, d2)
              );

              if (`+f+`) {
                vec3 xValues = vec3(
                  getX(batch, xR, xC, `+d+`),
                  getX(batch, xR, xC, `+d+` + 1),
                  getX(batch, xR, xC, `+d+` + 2)
                );
                dotProd += dot(xValues, wValues);
              } else {
                vec3 xValues = vec3(
                  getX(batch, `+d+`, xR, xC),
                  getX(batch, `+d+` + 1, xR, xC),
                  getX(batch, `+d+` + 2, xR, xC)
                );
                dotProd += dot(xValues, wValues);
              }

            }
          }
        }

        float result = dotProd;
        `+b+`
        `+x+`
        setOutput(result);
      }
    `},Ed=function(r){this.variableNames=["x","W"],this.outputShape=r.outShape;var t=r.padInfo.front,e=r.padInfo.top,n=r.padInfo.left,a=r.strideDepth,o=r.strideHeight,i=r.strideWidth,s=r.dilationDepth,u=r.dilationHeight,c=r.dilationWidth,l=r.filterDepth,p=r.filterHeight,d=r.filterWidth,h=4*Math.floor(r.inChannels/4),f=r.inChannels%4;this.userCode=`
      const ivec3 strides = ivec3(`+a+", "+o+", "+i+`);
      const ivec3 pads = ivec3(`+t+", "+e+", "+n+`);

      void main() {
        ivec5 coords = getOutputCoords();
        int batch = coords.x;
        int d2 = coords.u;

        ivec3 xFRCCorner = ivec3(coords.y, coords.z, coords.w) * strides - pads;
        int xFCorner = xFRCCorner.x;
        int xRCorner = xFRCCorner.y;
        int xCCorner = xFRCCorner.z;

        // Convolve x(?, ?, ?, d1) with w(:, :, :, d1, d2) to get
        // y(yF, yR, yC, d2). ? = to be determined. : = across all
        // values in that axis.
        float dotProd = 0.0;
        for (int wF = 0; wF < `+l+`; wF++) {
          int xF = xFCorner + wF * `+s+`;

          if (xF < 0 || xF >= `+r.inDepth+`) {
            continue;
          }

          for (int wR = 0; wR < `+p+`; wR++) {
            int xR = xRCorner + wR * `+u+`;

            if (xR < 0 || xR >= `+r.inHeight+`) {
              continue;
            }

            for (int wC = 0; wC < `+d+`; wC++) {
              int xC = xCCorner + wC * `+c+`;

              if (xC < 0 || xC >= `+r.inWidth+`) {
                continue;
              }

              for (int d1 = 0; d1 < `+h+`; d1 += 4) {
                vec4 xValues = vec4(
                  getX(batch, xF, xR, xC, d1),
                  getX(batch, xF, xR, xC, d1 + 1),
                  getX(batch, xF, xR, xC, d1 + 2),
                  getX(batch, xF, xR, xC, d1 + 3)
                );
                vec4 wValues = vec4(
                  getW(wF, wR, wC, d1, d2),
                  getW(wF, wR, wC, d1 + 1, d2),
                  getW(wF, wR, wC, d1 + 2, d2),
                  getW(wF, wR, wC, d1 + 3, d2)
                );

                dotProd += dot(xValues, wValues);
              }

              if (`+(f===1)+`) {
                dotProd +=
                  getX(batch, xF, xR, xC, `+h+`) *
                  getW(wF, wR, wC, `+h+`, d2);
              } else if (`+(f===2)+`) {
                vec2 xValues = vec2(
                  getX(batch, xF, xR, xC, `+h+`),
                  getX(batch, xF, xR, xC, `+h+` + 1)
                );
                vec2 wValues = vec2(
                  getW(wF, wR, wC, `+h+`, d2),
                  getW(wF, wR, wC, `+h+` + 1, d2)
                );
                dotProd += dot(xValues, wValues);
              } else if (`+(f===3)+`) {
                vec3 xValues = vec3(
                  getX(batch, xF, xR, xC, `+h+`),
                  getX(batch, xF, xR, xC, `+h+` + 1),
                  getX(batch, xF, xR, xC, `+h+` + 2)
                );
                vec3 wValues = vec3(
                  getW(wF, wR, wC, `+h+`, d2),
                  getW(wF, wR, wC, `+h+` + 1, d2),
                  getW(wF, wR, wC, `+h+` + 2, d2)
                );
                dotProd += dot(xValues, wValues);
              }
            }
          }
        }
        setOutput(dotProd);
      }
    `},Vs=function(r,t,e,n){t===void 0&&(t=!1),e===void 0&&(e=null),n===void 0&&(n=!1),this.variableNames=["x","W"],this.outputShape=r.outShape;var a=r.inHeight,o=r.inWidth,i=r.padInfo.top,s=r.padInfo.left,u=r.strideHeight,c=r.strideWidth,l=r.dilationHeight,p=r.dilationWidth,d=r.filterHeight,h=r.filterWidth,f=r.outChannels/r.inChannels,m="",v="";e&&(m=n?`float activation(float a) {
          float b = getPreluActivationWeightsAtOutCoords();
          `+e+`
        }`:`
          float activation(float x) {
            `+e+`
          }
        `,v="result = activation(result);");var g=t?"result += getBiasAtOutCoords();":"";t&&this.variableNames.push("bias"),n&&this.variableNames.push("preluActivationWeights"),this.userCode=`
      `+m+`

      const ivec2 strides = ivec2(`+u+", "+c+`);
      const ivec2 pads = ivec2(`+i+", "+s+`);

      void main() {
        ivec4 coords = getOutputCoords();
        int batch = coords.x;
        ivec2 xRCCorner = coords.yz * strides - pads;
        int d2 = coords.w;
        int d1 = d2 / `+f+`;
        int q = d2 - d1 * `+f+`;

        int xRCorner = xRCCorner.x;
        int xCCorner = xRCCorner.y;

        // Convolve x(?, ?, d1) with w(:, :, d1, q) to get y(yR, yC, d2).
        // ? = to be determined. : = across all values in that axis.
        float dotProd = 0.0;
        // TO DO(dsmilkov): Flatten the two for loops and vec4 the operations.
        for (int wR = 0; wR < `+d+`; wR++) {
          int xR = xRCorner + wR * `+l+`;

          if (xR < 0 || xR >= `+a+`) {
            continue;
          }

          for (int wC = 0; wC < `+h+`; wC++) {
            int xC = xCCorner + wC * `+p+`;

            if (xC < 0 || xC >= `+o+`) {
              continue;
            }

            float xVal = getX(batch, xR, xC, d1);
            float wVal = getW(wR, wC, d1, q);
            dotProd += xVal * wVal;
          }
        }

        float result = dotProd;
        `+g+`
        `+v+`
        setOutput(result);
      }
    `},Ws=function(r,t,e,n){t===void 0&&(t=!1),e===void 0&&(e=null),n===void 0&&(n=!1),this.variableNames=["x","W"],this.packedInputs=!0,this.packedOutput=!0,this.outputShape=r.outShape;for(var a=r.inHeight,o=r.inWidth,i=r.padInfo.top,s=r.padInfo.left,u=r.strideHeight,c=r.strideWidth,l=r.dilationHeight,p=r.dilationWidth,d=r.filterHeight,h=r.filterWidth,f=h,m="int xR; int xC; int xCOffset;",v=0;v<d;v++)for(var g=0;g<h;g++)m+=`
          vec4 xTexelR`+v+"C"+2*g+` = vec4(0.);
          vec4 wR`+v+"C"+g+` = vec4(0.);
          vec4 xR`+v+"C"+g+" = vec4(0.);";for(v=0;v<d;v++)for(var y=0;y<f;y++){if(m+=`
          xR = xRCorner + `+v*l+`;
          xC = xCCorner + `+(g=2*y)*p+`;
        `,c===1){if(g<h&&(m+=s%2==1?`
                xCOffset = xC + 1;
                if(xR >= 0 && xR < `+a+" && xCOffset >= 0 && xCOffset < "+o+`) {
                  xTexelR`+v+"C"+g+` = getX(batch, xR, xCOffset, d1);

                  // Need to manually clear unused channels in case
                  // we're reading from recycled texture.
                  if(xCOffset + 1 >= `+o+`) {
                    xTexelR`+v+"C"+g+`.zw = vec2(0.);
                  }
                } else {
                  xTexelR`+v+"C"+g+` = vec4(0.);
                }

                xCOffset = xC + 1 - 2;
                if(xR >= 0 && xR < `+a+" && xCOffset >= 0 && xCOffset < "+o+`) {
                  vec4 previous = getX(batch, xR, xCOffset, d1);

                  // Need to manually clear unused channels in case
                  // we're reading from recycled texture.
                  if(xCOffset + 1 >= `+o+`) {
                    previous.zw = vec2(0.);
                  }

                  xR`+v+"C"+g+" = vec4(previous.zw, xTexelR"+v+"C"+g+`.xy);
                } else {
                  xR`+v+"C"+g+" = vec4(0, 0, xTexelR"+v+"C"+g+`.xy);
                }
              `:`
                if(xR >= 0 && xR < `+a+" && xC >= 0 && xC < "+o+`) {
                  xTexelR`+v+"C"+g+` = getX(batch, xR, xC, d1);
                } else {
                  xTexelR`+v+"C"+g+` = vec4(0.);
                }

                xR`+v+"C"+g+" = xTexelR"+v+"C"+g+`;
              `,g+1<h)){var x=s%2==0?No(p):p;p%2==0&&s%2==1||p%2!=0&&s%2!=1?(m+=`
                  xCOffset = xC + `+s%2+" + "+x+`;

                  if(xR >= 0 && xR < `+a+` &&
                    xCOffset >= 0 && xCOffset < `+o+`) {
                    xTexelR`+v+"C"+(g+2)+` = getX(batch, xR, xCOffset, d1);
                  }
                `,p>1&&(m+=`
                    xCOffset -= 2;
                    if(xR >= 0 && xR < `+a+` &&
                      xCOffset >= 0 && xCOffset < `+o+`) {
                      xTexelR`+v+"C"+g+` = getX(batch, xR, xCOffset, d1);
                    } else {
                      xTexelR`+v+"C"+g+` = vec4(0.);
                    }
                  `),m+=`
                  xR`+v+"C"+(g+1)+` = vec4(
                    xTexelR`+v+"C"+g+".zw, xTexelR"+v+"C"+(g+2)+`.xy);
                `):m+=`
                  xCOffset = xC + `+x+`;

                  if(xR >= 0 && xR < `+a+` &&
                    xCOffset >= 0 && xCOffset < `+o+`) {
                    xTexelR`+v+"C"+(g+2)+` = getX(batch, xR, xCOffset, d1);
                  }

                  xR`+v+"C"+(g+1)+" = xTexelR"+v+"C"+(g+2)+`;
                `}}else g<h&&(m+=`
              if(xR >= 0 && xR < `+a+`) {
            `,s%2==1?(m+=`
                xCOffset = xC + 1 - `+c+`;
                if(xCOffset >= 0 && xCOffset < `+o+`) {
                  xTexelR`+v+"C"+g+` = getX(batch, xR, xCOffset, d1);
                } else {
                  xTexelR`+v+"C"+g+` = vec4(0.);
                }

                if(xC + 1 >= 0 && xC + 1 < `+o+`) {
                  xTexelR`+v+"C"+(g+2)+` = getX(batch, xR, xC + 1, d1);
                } else {
                  xTexelR`+v+"C"+(g+2)+` = vec4(0.);
                }

                xR`+v+"C"+g+` = vec4(
                  xTexelR`+v+"C"+g+".zw, xTexelR"+v+"C"+(g+2)+`.zw);
              `,g+1<h&&(m+=`
                  vec4 final = vec4(0.);
                  xCOffset = xC + 1 + `+c+`;
                  if(xCOffset >= 0 && xCOffset < `+o+`) {
                    final = getX(batch, xR, xCOffset, d1);
                  }
                  xR`+v+"C"+(g+1)+" = vec4(xTexelR"+v+"C"+(g+2)+`.xy, final.xy);
                `)):(m+=`
                if(xC >= 0 && xC < `+o+`) {
                  xTexelR`+v+"C"+g+` = getX(batch, xR, xC, d1);
                } else {
                  xTexelR`+v+"C"+g+` = vec4(0.);
                }

                xCOffset = xC + `+c+`;
                if(xCOffset >= 0 && xCOffset < `+o+`) {
                  xTexelR`+v+"C"+(g+2)+` = getX(batch, xR, xCOffset, d1);
                } else {
                  xTexelR`+v+"C"+(g+2)+` = vec4(0.);
                }

                xR`+v+"C"+g+` = vec4(
                  xTexelR`+v+"C"+g+".xy, xTexelR"+v+"C"+(g+2)+`.xy);
              `,g+1<h&&(m+=`
                  xR`+v+"C"+(g+1)+` = vec4(
                    xTexelR`+v+"C"+g+".zw, xTexelR"+v+"C"+(g+2)+`.zw);
                `)),m+="}");g<h&&(m+=`
            vec4 wTexelR`+v+"C"+g+" = getW("+v+", "+g+`, d1, q);
            wR`+v+"C"+g+" = vec4(wTexelR"+v+"C"+g+".xz, wTexelR"+v+"C"+g+`.xz);
          `,g+1<h&&(m+=`
              vec4 wTexelR`+v+"C"+(g+1)+" = getW("+v+", "+(g+1)+`, d1, q);
              wR`+v+"C"+(g+1)+` =
                vec4(wTexelR`+v+"C"+(g+1)+".xz, wTexelR"+v+"C"+(g+1)+".xz);"))}for(v=0;v<d;v++)for(g=0;g<h;g++)m+="dotProd += xR"+v+"C"+g+" * wR"+v+"C"+g+";";var b="",C="";e&&(b=n?`vec4 activation(vec4 a) {
          vec4 b = getPreluActivationWeightsAtOutCoords();
          `+e+`
        }`:`vec4 activation(vec4 x) {
          `+e+`
        }`,C="result = activation(result);");var E=t?"result += getBiasAtOutCoords();":"";t&&this.variableNames.push("bias"),n&&this.variableNames.push("preluActivationWeights"),this.userCode=`
      `+b+`

      const ivec2 strides = ivec2(`+u+", "+c+`);
      const ivec2 pads = ivec2(`+i+", "+s+`);

      void main() {

        ivec4 coords = getOutputCoords();
        int batch = coords.x;
        ivec2 xRCCorner = coords.yz * strides - pads;
        int d2 = coords.w;
        int d1 = d2;
        int q = 0;
        int xRCorner = xRCCorner.x;
        int xCCorner = xRCCorner.y;

        vec4 dotProd = vec4(0.);

        `+m+`

        vec4 result = dotProd;
        `+E+`
        `+C+`
        setOutput(result);
      }
    `},Sd=function(r,t,e,n,a){this.variableNames=["Image","Boxes","BoxInd"],this.outputShape=[];var o=r[0],i=r[1],s=r[2],u=r[3],c=t[0],l=e[0],p=e[1];this.outputShape=[c,l,p,u];var d=n==="bilinear"?1:0,h=[i-1+".0",s-1+".0"],f=h[0],m=h[1],v=l>1?[""+(i-1)/(l-1),"(y2-y1) * height_ratio","y1*"+f+" + float(y)*(height_scale)"]:["0.0","0.0","0.5 * (y1+y2) * "+f],g=v[0],y=v[1],x=v[2],b=p>1?[""+(s-1)/(p-1),"(x2-x1) * width_ratio","x1*"+m+" + float(x)*(width_scale)"]:["0.0","0.0","0.5 * (x1+x2) * "+m],C=b[0],E=b[1],R=b[2];this.userCode=`
      const float height_ratio = float(`+g+`);
      const float width_ratio = float(`+C+`);
      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int y = coords[1];
        int x = coords[2];
        int d = coords[3];

        // get box vals
        float y1 = getBoxes(b,0);
        float x1 = getBoxes(b,1);
        float y2 = getBoxes(b,2);
        float x2 = getBoxes(b,3);

        // get image in batch index
        int bInd = round(getBoxInd(b));
        if(bInd < 0 || bInd >= `+o+`) {
          return;
        }

        float height_scale = `+y+`;
        float width_scale = `+E+`;

        float in_y = `+x+`;
        if( in_y < 0.0 || in_y > `+f+` ) {
          setOutput(float(`+a+`));
          return;
        }
        float in_x = `+R+`;
        if( in_x < 0.0 || in_x > `+m+` ) {
          setOutput(float(`+a+`));
          return;
        }

        vec2 sourceFracIndexCR = vec2(in_x,in_y);
        if(`+d+` == 1) {
          // Compute the four integer indices.
          ivec2 sourceFloorCR = ivec2(sourceFracIndexCR);
          ivec2 sourceCeilCR = ivec2(ceil(sourceFracIndexCR));

          float topLeft = getImage(b, sourceFloorCR.y, sourceFloorCR.x, d);
          float bottomLeft = getImage(b, sourceCeilCR.y, sourceFloorCR.x, d);
          float topRight = getImage(b, sourceFloorCR.y, sourceCeilCR.x, d);
          float bottomRight = getImage(b, sourceCeilCR.y, sourceCeilCR.x, d);

          vec2 fracCR = sourceFracIndexCR - vec2(sourceFloorCR);

          float top = topLeft + (topRight - topLeft) * fracCR.x;
          float bottom = bottomLeft + (bottomRight - bottomLeft) * fracCR.x;
          float newValue = top + (bottom - top) * fracCR.y;
          setOutput(newValue);
        } else {
          // Compute the coordinators of nearest neighbor point.
          ivec2 sourceNearestCR = ivec2(floor(
            sourceFracIndexCR + vec2(0.5,0.5)));
          float newValue = getImage(b, sourceNearestCR.y, sourceNearestCR.x, d);
          setOutput(newValue);
        }
      }
    `},Id=function(r,t,e){this.variableNames=["x"],this.outputShape=r;var n=r.length,a=r[r.length-1],o=e?"<":">";this.userCode=`
      int getIndex(int i) {
        `+(e?"return "+a+" -i - 1;":"return i;")+`
      }

      void main() {
        `+ve(n)+` coords = getOutputCoords();
        int end = `+zs(n,"coords")+`;
        float val = 0.0;
        for (int i = `+a+` - 1; i >= 0; i -= 1) {
          int idx = getIndex(i);
          if (idx `+o+` end) {
            continue;
          }
          if (idx == end && `+t+`) {
            continue;
          }
          `+zs(n,"coords")+` = idx;
          val += getX(`+(function(i,s){if(i===1)return""+s;if(i===2)return s+".x, "+s+".y";if(i===3)return s+".x, "+s+".y, "+s+".z";if(i===4)return s+".x, "+s+".y, "+s+".z, "+s+".w";throw Error("Cumulative sum for rank "+i+" is not yet supported")})(n,"coords")+`);
        }
        setOutput(val);
      }
    `};function zs(r,t){if(r===1)return""+t;if(r===2)return t+".y";if(r===3)return t+".z";if(r===4)return t+".w";throw Error("Cumulative sum for rank "+r+" is not yet supported")}var kd=function(r){this.variableNames=["A"],this.packedInputs=!1,this.packedOutput=!0,this.outPackingScheme=Yn.DENSE;var t=Hn(r),e=Me();this.outputShape=r,this.userCode=`
      ivec3 outCoordsFromFlatIndex(int index) {
        `+Zt(["r","c","d"],r)+`
        return ivec3(r, c, d);
      }

      void main() {
        ivec2 resTexRC = ivec2(resultUV.yx *
          vec2(`+t[0]+", "+t[1]+`));
        int index = 4 * (resTexRC.x * `+t[1]+` + resTexRC.y);

        vec4 result = vec4(0.);

        for (int i=0; i<4; i++) {
          int flatIndex = index + i;
          ivec3 rc = outCoordsFromFlatIndex(flatIndex);
          result[i] = getA(rc.x, rc.y, rc.z);
        }

        `+e.output+` = result;
      }
    `},Rd=function(r){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!0,this.outPackingScheme=Yn.DENSE;var t=Hn(r),e=Me();this.outputShape=r,this.userCode=`
      ivec3 outCoordsFromFlatIndex(int index) {
        `+Zt(["r","c","d"],r)+`
        return ivec3(r, c, d);
      }

      void main() {
        ivec2 resTexRC = ivec2(resultUV.yx *
          vec2(`+t[0]+", "+t[1]+`));
        int index = 4 * (resTexRC.x * `+t[1]+` + resTexRC.y);

        vec4 result = vec4(0.);

        for (int i=0; i<4; i++) {
          int flatIndex = index + i;
          ivec3 rc = outCoordsFromFlatIndex(flatIndex);
          result[i] = getChannel(getA(rc.x, rc.y, rc.z), vec2(rc.y, rc.z));
        }

        `+e.output+` = result;
      }
    `},Td=(function(){function r(t,e,n){this.variableNames=["x"],this.outputShape=[],this.outputShape=t,this.blockSize=e,this.dataFormat=n,this.userCode=`
    void main() {
      ivec4 coords = getOutputCoords();
      int b = coords[0];
      int h = `+this.getHeightCoordString()+`;
      int w = `+this.getWidthCoordString()+`;
      int d = `+this.getDepthCoordString()+`;

      int in_h = h / `+e+`;
      int offset_h = imod(h, `+e+`);
      int in_w = w / `+e+`;
      int offset_w = imod(w, `+e+`);
      int offset_d = (offset_h * `+e+` + offset_w) *
        `+this.getOutputDepthSize()+`;
      int in_d = d + offset_d;

      float result = `+this.getInputSamplingString()+`;
      setOutput(result);
    }
  `}return r.prototype.getHeightCoordString=function(){return this.dataFormat==="NHWC"?"coords[1]":"coords[2]"},r.prototype.getWidthCoordString=function(){return this.dataFormat==="NHWC"?"coords[2]":"coords[3]"},r.prototype.getDepthCoordString=function(){return this.dataFormat==="NHWC"?"coords[3]":"coords[1]"},r.prototype.getOutputDepthSize=function(){return this.dataFormat==="NHWC"?this.outputShape[3]:this.outputShape[1]},r.prototype.getInputSamplingString=function(){return this.dataFormat==="NHWC"?"getX(b, in_h, in_w, in_d)":"getX(b, in_d, in_h, in_w)"},r})(),Ad=function(r){this.variableNames=["X"],this.outputShape=[r,r],this.userCode=`
      void main() {
          ivec2 coords = getOutputCoords();
          float val = coords[0] == coords[1] ? getX(coords[0]) : 0.0;
          setOutput(val);
      }
    `},Dd=function(r){this.variableNames=["A"],this.outTexUsage=Xe.DOWNLOAD;var t=Me();this.outputShape=r,this.userCode=`
      `+Ic+`

      void main() {
        float x = getAAtOutCoords();
        `+t.output+` = encode_float(x);
      }
    `},Od=function(r){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!1,this.outTexUsage=Xe.DOWNLOAD;var t=Me();this.outputShape=r,this.userCode=`
      `+Ic+`

      void main() {
        ivec3 coords = getOutputCoords();
        float x = getChannel(getAAtOutCoords(), vec2(coords.y, coords.z));
        `+t.output+` = encode_float(x);
      }
    `},_d=function(r,t,e){e===void 0&&(e=!1),this.variableNames=["A"];var n=Me(),a=t[0],o=t[1];this.outputShape=r;var i="result";e&&(i="floor(result * 255. + 0.5)"),this.userCode=`
      `+Ci(r)+`

      void main() {
        ivec3 coords = getOutputCoords();

        int flatIndex = getFlatIndex(coords);
        int offset = imod(flatIndex, 4);

        flatIndex = idiv(flatIndex, 4, 1.);
        
        int r = flatIndex / `+o+`;
        int c = imod(flatIndex, `+o+`);
        vec2 uv = (vec2(c, r) + halfCR) / vec2(`+o+".0, "+a+`.0);
        vec4 values = `+n.texture2D+`(A, uv);

        float result;

        if(offset == 0) {
          result = values[0];
        } else if(offset == 1) {
          result = values[1];
        } else if(offset == 2) {
          result = values[2];
        } else {
          result = values[3];
        }

        `+n.output+" = vec4("+i+`, 0., 0., 0.);
      }
    `},Fd=function(r,t,e){e===void 0&&(e=!1),this.variableNames=["A"],this.packedInputs=!1,this.packedOutput=!0;var n=Me(),a=t[0],o=t[1];this.outputShape=r;var i="",s="result";e&&(s="floor(result * 255. + 0.5)");for(var u=0;u<=1;u++)for(var c=0;c<=1;c++){var l=2*u+c;i+=`
          localCoords = coords;
          if(localCoords[2] + `+c+" < "+r[2]+`) {
            localCoords[2] += `+c+`;
            if(localCoords[1] + `+u+" < "+r[1]+`) {
              localCoords[1] += `+u+`;

              flatIndex = getFlatIndex(localCoords);
              offset = imod(flatIndex, 4);

              flatIndex = idiv(flatIndex, 4, 1.);

              r = flatIndex / `+o+`;
              c = imod(flatIndex, `+o+`);
              uv = (vec2(c, r) + halfCR) / vec2(`+o+".0, "+a+`.0);
              values = `+n.texture2D+`(A, uv);

              if(offset == 0) {
                result[`+l+`] = values[0];
              } else if(offset == 1) {
                result[`+l+`] = values[1];
              } else if(offset == 2) {
                result[`+l+`] = values[2];
              } else {
                result[`+l+`] = values[3];
              }
            }
          }
        `}this.userCode=`
      `+Ci(r)+`

      void main() {
        ivec3 coords = getOutputCoords();

        vec4 result = vec4(0.);
        int flatIndex, r, c, offset;
        ivec3 localCoords;
        vec2 uv;
        vec4 values;

        `+i+`

        `+n.output+" = "+s+`;
      }
    `},Md="return real * expR - imag * expI;",Bd="return real * expI + imag * expR;",Us=function(r,t,e){this.variableNames=["real","imag"];var n=t[1];this.outputShape=t;var a=e?"2.0 * "+Math.PI:"-2.0 * "+Math.PI,o=e?n+".0":"1.0";this.userCode=`
      const float exponentMultiplier = `+a+`;

      float unaryOpComplex(float real, float expR, float imag, float expI) {
        `+r+`
      }

      float mulMatDFT(int batch, int index) {
        float indexRatio = float(index) / float(`+n+`);
        float exponentMultiplierTimesIndexRatio =
            exponentMultiplier * indexRatio;

        float result = 0.0;

        for (int i = 0; i < `+n+`; i++) {
          // x = (-2|2 * PI / N) * index * i;
          float x = exponentMultiplierTimesIndexRatio * float(i);
          float expR = cos(x);
          float expI = sin(x);
          float real = getReal(batch, i);
          float imag = getImag(batch, i);

          result +=
              unaryOpComplex(real, expR, imag, expI) / `+o+`;
        }

        return result;
      }

      void main() {
        ivec2 coords = getOutputCoords();
        setOutput(mulMatDFT(coords[0], coords[1]));
      }
    `},Pd=(function(){function r(t,e){this.outputShape=[],this.variableNames=["x"],this.outputShape=t,this.userCode=`
      uniform float value;
      void main() {
        // Input can be obtained from uniform value.
        setOutput(value);
      }
    `}return r.prototype.getCustomSetupFunc=function(t){var e=this;return function(n,a){e.valueLoc==null&&(e.valueLoc=n.getUniformLocationNoThrow(a,"value")),n.gl.uniform1f(e.valueLoc,t)}},r})(),Ld=function(r,t,e){this.variableNames=["A","indices"];var n=r.slice();n[e]=t,this.outputShape=n,this.rank=n.length;var a=ve(this.rank),o=(function(i,s){var u=i.length;if(u>4)throw Error("Gather for rank "+u+" is not yet supported");if(u===1)return"int(getIndices(resRC))";for(var c=["resRC.x","resRC.y","resRC.z","resRC.w"],l=[],p=0;p<i.length;p++)p===s?l.push("int(getIndices("+c[p]+"))"):l.push(""+c[p]);return l.join()})(r,e);this.userCode=`
      void main() {
        `+a+` resRC = getOutputCoords();
        setOutput(getA(`+o+`));
      }
    `},Vd=function(r,t,e){this.sliceDim=r,this.strides=t,this.variableNames=["x","indices"],this.outputShape=e;var n=ve(t.length),a=ve(e.length),o=this.sliceDim>1?"strides[j]":"strides";this.userCode=`
        `+n+" strides = "+n+"("+this.strides+`);
         void main() {
          `+a+` coords = getOutputCoords();
          int flattenIndex = 0;
          for (int j = 0; j < `+this.sliceDim+`; j++) {
            int index = round(getIndices(coords[0], j));
            flattenIndex += index * `+o+`;
          }
          setOutput(getX(flattenIndex, coords[1]));
        }
      `};function Ac(r,t){var e=Me();return _u(r,t,e.version+`
    precision highp float;
    `+e.attribute+` vec3 clipSpacePos;
    `+e.attribute+` vec2 uv;
    `+e.varyingVs+` vec2 resultUV;

    void main() {
      gl_Position = vec4(clipSpacePos, 1);
      resultUV = uv;
    }`)}function Dc(r,t){return Pu(r,t,new Float32Array([-1,1,0,0,1,-1,-1,0,0,0,1,1,0,1,1,1,-1,0,1,0]))}function Oc(r,t){return Lu(r,t,new Uint16Array([0,1,2,2,1,3]))}function ur(r,t,e,n,a,o,i){Wu(e,n);var s=Vu(r,t),u=r.TEXTURE_2D;return X(r,t,(function(){return r.bindTexture(u,s)})),X(r,t,(function(){return r.texParameteri(u,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE)})),X(r,t,(function(){return r.texParameteri(u,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE)})),X(r,t,(function(){return r.texParameteri(u,r.TEXTURE_MIN_FILTER,r.NEAREST)})),X(r,t,(function(){return r.texParameteri(u,r.TEXTURE_MAG_FILTER,r.NEAREST)})),X(r,t,(function(){return r.texImage2D(u,0,a,e,n,0,o,i,null)})),X(r,t,(function(){return r.bindTexture(r.TEXTURE_2D,null)})),s}function _c(r,t,e,n,a){var o=Xr(e,n);return ur(r,t,o[0],o[1],a.internalFormatFloat,a.textureFormatFloat,r.FLOAT)}function Fc(r,t,e,n,a){var o=Xr(e,n);return ur(r,t,o[0],o[1],a.internalFormatHalfFloat,a.textureFormatFloat,a.textureTypeHalfFloat)}function Mc(r,t,e,n,a){var o=Xr(e,n);return ur(r,t,o[0],o[1],r.RGBA,r.RGBA,r.UNSIGNED_BYTE)}function Bc(r,t,e,n,a){var o=nr(e,n);return ur(r,t,o[0],o[1],a.internalFormatPackedFloat,r.RGBA,r.FLOAT)}function Pc(r,t,e,n,a){var o=nr(e,n);return ur(r,t,o[0],o[1],a.internalFormatPackedHalfFloat,r.RGBA,a.textureTypeHalfFloat)}function Lc(r,t,e,n){return X(r,t,(function(){return r.bindBuffer(r.ARRAY_BUFFER,n)})),co(r,t,e,"clipSpacePos",n,3,20,0)&&co(r,t,e,"uv",n,2,20,12)}function Vc(r,t,e,n,a,o,i){var s,u,c;X(r,t,(function(){return r.bindTexture(r.TEXTURE_2D,e)})),o instanceof Uint8Array?(s=new Uint8Array(n*a*4),u=r.UNSIGNED_BYTE,c=r.RGBA):(s=new Float32Array(n*a*4),u=r.FLOAT,c=i.internalFormatPackedFloat),s.set(o),X(r,t,(function(){return r.texImage2D(r.TEXTURE_2D,0,c,n,a,0,r.RGBA,u,s)})),X(r,t,(function(){return r.bindTexture(r.TEXTURE_2D,null)}))}function Wc(r,t,e,n){X(r,t,(function(){return r.bindTexture(r.TEXTURE_2D,e)})),n.data instanceof Uint8Array?X(r,t,(function(){return r.texImage2D(r.TEXTURE_2D,0,r.RGBA,n.width,n.height,0,r.RGBA,r.UNSIGNED_BYTE,n.data)})):X(r,t,(function(){return r.texImage2D(r.TEXTURE_2D,0,r.RGBA,r.RGBA,r.UNSIGNED_BYTE,n)})),X(r,t,(function(){return r.bindTexture(r.TEXTURE_2D,null)}))}function zc(r,t,e,n,a){var o=r.createBuffer();X(r,t,(function(){return r.bindBuffer(r.PIXEL_PACK_BUFFER,o)}));var i=16*e*n;return X(r,t,(function(){return r.bufferData(r.PIXEL_PACK_BUFFER,i,r.STREAM_READ)})),X(r,t,(function(){return r.readPixels(0,0,n,e,r.RGBA,r.FLOAT,0)})),X(r,t,(function(){return r.bindBuffer(r.PIXEL_PACK_BUFFER,null)})),o}function Uc(r,t,e){var n=r,a=new Float32Array(e);return n.bindBuffer(n.PIXEL_PACK_BUFFER,t),n.getBufferSubData(n.PIXEL_PACK_BUFFER,0,a),n.bindBuffer(n.PIXEL_PACK_BUFFER,null),a}function Gc(r,t,e,n,a){var o=Xr(e,n),i=o[0],s=o[1],u=new Uint8Array(e*n*4);return X(r,t,(function(){return r.readPixels(0,0,i,s,a.downloadTextureFormat,r.UNSIGNED_BYTE,u)})),new Float32Array(u.buffer)}function Hc(r,t,e,n,a,o,i,s){var u=r,c=new Float32Array((function(l,p){var d=nr(l,p);return d[0]*d[1]*4})(o,i));return u.bindBuffer(u.PIXEL_PACK_BUFFER,t),u.getBufferSubData(u.PIXEL_PACK_BUFFER,0,c),u.bindBuffer(u.PIXEL_PACK_BUFFER,null),c}function qc(r,t,e,n){var a=new Float32Array(e*n*4);return X(r,t,(function(){return r.readPixels(0,0,n,e,r.RGBA,r.FLOAT,a)})),a}var Wd=Object.freeze({createVertexShader:Ac,createVertexBuffer:Dc,createIndexBuffer:Oc,createFloat32MatrixTexture:_c,createFloat16MatrixTexture:Fc,createUnsignedBytesMatrixTexture:Mc,createPackedMatrixTexture:Bc,createFloat16PackedMatrixTexture:Pc,bindVertexProgramAttributeStreams:Lc,uploadDenseMatrixToTexture:Vc,uploadPixelDataToTexture:Wc,createBufferFromOutputTexture:zc,downloadFloat32MatrixFromBuffer:Uc,downloadByteEncodedFloatMatrixFromOutputTexture:Gc,downloadPackedMatrixFromBuffer:Hc,downloadMatrixFromPackedOutputTexture:qc}),jc=(function(){function r(t){this.outputTexture=null,this.program=null,this.disposed=!1,this.vertexAttrsAreBound=!1,this.itemsToPoll=[];var e=B().getNumber("WEBGL_VERSION");t!=null?(this.gl=t,Au(e,t)):this.gl=Ct(e);var n="WEBGL_color_buffer_float";if(B().getNumber("WEBGL_VERSION")===1){if(this.textureFloatExtension=zn(this.gl,this.debug,"OES_texture_float"),$e(this.gl,"OES_texture_half_float"))this.textureHalfFloatExtension=zn(this.gl,this.debug,"OES_texture_half_float");else if(B().get("WEBGL_FORCE_F16_TEXTURES"))throw new Error("GL context does not support half float textures, yet the environment flag WEBGL_FORCE_F16_TEXTURES is set to true.");if(this.colorBufferFloatExtension=this.gl.getExtension(n),$e(this.gl,"EXT_color_buffer_half_float"))this.colorBufferHalfFloatExtension=zn(this.gl,this.debug,"EXT_color_buffer_half_float");else if(B().get("WEBGL_FORCE_F16_TEXTURES"))throw new Error("GL context does not support color renderable half floats, yet the environment flag WEBGL_FORCE_F16_TEXTURES is set to true.")}else if(n="EXT_color_buffer_float",$e(this.gl,n))this.colorBufferFloatExtension=this.gl.getExtension(n);else{if(!$e(this.gl,"EXT_color_buffer_half_float"))throw new Error("GL context does not support color renderable floats");this.colorBufferHalfFloatExtension=this.gl.getExtension("EXT_color_buffer_half_float")}this.vertexBuffer=Dc(this.gl,this.debug),this.indexBuffer=Oc(this.gl,this.debug),this.framebuffer=zu(this.gl,this.debug),this.textureConfig=Ao(this.gl,this.textureHalfFloatExtension)}return Object.defineProperty(r.prototype,"debug",{get:function(){return B().getBool("DEBUG")},enumerable:!0,configurable:!0}),r.prototype.dispose=function(){var t=this;if(!this.disposed){this.program!=null&&console.warn("Disposing a GPGPUContext that still has a bound WebGLProgram. This is probably a resource leak, delete the program with GPGPUContext.deleteProgram before disposing."),this.outputTexture!=null&&console.warn("Disposing a GPGPUContext that still has a bound output matrix texture.  This is probably a resource leak, delete the output matrix texture with GPGPUContext.deleteMatrixTexture before disposing.");var e=this.gl;X(e,this.debug,(function(){return e.finish()})),X(e,this.debug,(function(){return e.bindFramebuffer(e.FRAMEBUFFER,null)})),X(e,this.debug,(function(){return e.deleteFramebuffer(t.framebuffer)})),X(e,this.debug,(function(){return e.bindBuffer(e.ARRAY_BUFFER,null)})),X(e,this.debug,(function(){return e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null)})),X(e,this.debug,(function(){return e.deleteBuffer(t.indexBuffer)})),this.disposed=!0}},r.prototype.createFloat32MatrixTexture=function(t,e){return this.throwIfDisposed(),_c(this.gl,this.debug,t,e,this.textureConfig)},r.prototype.createFloat16MatrixTexture=function(t,e){return this.throwIfDisposed(),Fc(this.gl,this.debug,t,e,this.textureConfig)},r.prototype.createUnsignedBytesMatrixTexture=function(t,e){return this.throwIfDisposed(),Mc(this.gl,this.debug,t,e,this.textureConfig)},r.prototype.uploadPixelDataToTexture=function(t,e){this.throwIfDisposed(),Wc(this.gl,this.debug,t,e)},r.prototype.uploadDenseMatrixToTexture=function(t,e,n,a){this.throwIfDisposed(),Vc(this.gl,this.debug,t,e,n,a,this.textureConfig)},r.prototype.createFloat16PackedMatrixTexture=function(t,e){return this.throwIfDisposed(),Pc(this.gl,this.debug,t,e,this.textureConfig)},r.prototype.createPackedMatrixTexture=function(t,e){return this.throwIfDisposed(),Bc(this.gl,this.debug,t,e,this.textureConfig)},r.prototype.deleteMatrixTexture=function(t){var e=this;this.throwIfDisposed(),this.outputTexture===t&&(lo(this.gl,this.debug,this.framebuffer),this.outputTexture=null),X(this.gl,this.debug,(function(){return e.gl.deleteTexture(t)}))},r.prototype.downloadByteEncodedFloatMatrixFromOutputTexture=function(t,e,n){var a=this;return this.downloadMatrixDriver(t,(function(){return Gc(a.gl,a.debug,e,n,a.textureConfig)}))},r.prototype.downloadPackedMatrixFromBuffer=function(t,e,n,a,o,i){return Hc(this.gl,t,0,0,0,o,i,this.textureConfig)},r.prototype.downloadFloat32MatrixFromBuffer=function(t,e){return Uc(this.gl,t,e)},r.prototype.createBufferFromTexture=function(t,e,n){this.bindTextureToFrameBuffer(t);var a=zc(this.gl,this.debug,e,n,this.textureConfig);return this.unbindTextureToFrameBuffer(),a},r.prototype.createAndWaitForFence=function(){var t=this.createFence(this.gl);return this.pollFence(t)},r.prototype.createFence=function(t){var e,n,a=this;if(B().getBool("WEBGL_FENCE_API_ENABLED")){var o=t,i=o.fenceSync(o.SYNC_GPU_COMMANDS_COMPLETE,0);t.flush(),n=function(){var s=o.clientWaitSync(i,0,0);return s===o.ALREADY_SIGNALED||s===o.CONDITION_SATISFIED},e=i}else B().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION")>0?(e=this.beginQuery(),this.endQuery(),n=function(){return a.isQueryAvailable(e,B().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION"))}):n=function(){return!0};return{query:e,isFencePassed:n}},r.prototype.downloadMatrixFromPackedTexture=function(t,e,n){var a=this;return this.downloadMatrixDriver(t,(function(){return qc(a.gl,a.debug,e,n)}))},r.prototype.createProgram=function(t){this.throwIfDisposed();var e=this.gl,n=Fu(e,this.debug,t),a=Ac(e,this.debug),o=Mu(e,this.debug);return X(e,this.debug,(function(){return e.attachShader(o,a)})),X(e,this.debug,(function(){return e.attachShader(o,n)})),Bu(e,this.debug,o),this.debug&&Rr(e,this.debug,o),this.vertexAttrsAreBound||(this.setProgram(o),this.vertexAttrsAreBound=Lc(e,this.debug,this.program,this.vertexBuffer)),o},r.prototype.deleteProgram=function(t){var e=this;this.throwIfDisposed(),t===this.program&&(this.program=null),t!=null&&X(this.gl,this.debug,(function(){return e.gl.deleteProgram(t)}))},r.prototype.setProgram=function(t){var e=this;this.throwIfDisposed(),this.program=t,this.program!=null&&this.debug&&Rr(this.gl,this.debug,this.program),X(this.gl,this.debug,(function(){return e.gl.useProgram(t)}))},r.prototype.getUniformLocation=function(t,e,n){return n===void 0&&(n=!0),this.throwIfDisposed(),n?Gu(this.gl,this.debug,t,e):Hu(this.gl,t,e)},r.prototype.getAttributeLocation=function(t,e){var n=this;return this.throwIfDisposed(),X(this.gl,this.debug,(function(){return n.gl.getAttribLocation(t,e)}))},r.prototype.getUniformLocationNoThrow=function(t,e){return this.throwIfDisposed(),this.gl.getUniformLocation(t,e)},r.prototype.setInputMatrixTexture=function(t,e,n){this.throwIfDisposed(),this.throwIfNoProgram(),qu(this.gl,this.debug,this.program,t,e,n)},r.prototype.setOutputMatrixTexture=function(t,e,n){this.setOutputMatrixTextureDriver(t,n,e)},r.prototype.setOutputPackedMatrixTexture=function(t,e,n){this.throwIfDisposed();var a=nr(e,n),o=a[0],i=a[1];this.setOutputMatrixTextureDriver(t,o,i)},r.prototype.setOutputMatrixWriteRegion=function(t,e,n,a){this.setOutputMatrixWriteRegionDriver(n,t,a,e)},r.prototype.setOutputPackedMatrixWriteRegion=function(t,e,n,a){throw new Error("setOutputPackedMatrixWriteRegion not implemented.")},r.prototype.debugValidate=function(){this.program!=null&&Rr(this.gl,this.debug,this.program),Un(this.gl)},r.prototype.executeProgram=function(){this.throwIfDisposed(),this.throwIfNoProgram();var t=this.gl;this.debug&&this.debugValidate(),X(t,this.debug,(function(){return t.drawElements(t.TRIANGLES,6,t.UNSIGNED_SHORT,0)}))},r.prototype.blockUntilAllProgramsCompleted=function(){var t=this;this.throwIfDisposed(),X(this.gl,this.debug,(function(){return t.gl.finish()}))},r.prototype.getQueryTimerExtension=function(){return this.disjointQueryTimerExtension==null&&(this.disjointQueryTimerExtension=zn(this.gl,this.debug,B().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION")===2?"EXT_disjoint_timer_query_webgl2":"EXT_disjoint_timer_query")),this.disjointQueryTimerExtension},r.prototype.getQueryTimerExtensionWebGL2=function(){return this.getQueryTimerExtension()},r.prototype.getQueryTimerExtensionWebGL1=function(){return this.getQueryTimerExtension()},r.prototype.beginQuery=function(){if(B().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION")===2){var t=this.gl,e=this.getQueryTimerExtensionWebGL2(),n=t.createQuery();return t.beginQuery(e.TIME_ELAPSED_EXT,n),n}var a=this.getQueryTimerExtensionWebGL1(),o=a.createQueryEXT();return a.beginQueryEXT(a.TIME_ELAPSED_EXT,o),o},r.prototype.endQuery=function(){if(B().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION")!==2){var t=this.getQueryTimerExtensionWebGL1();t.endQueryEXT(t.TIME_ELAPSED_EXT)}else{var e=this.gl,n=this.getQueryTimerExtensionWebGL2();e.endQuery(n.TIME_ELAPSED_EXT)}},r.prototype.waitForQueryAndGetTime=function(t){return Y(this,void 0,void 0,(function(){var e=this;return Q(this,(function(n){switch(n.label){case 0:return[4,ro((function(){return e.disposed||e.isQueryAvailable(t,B().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION"))}))];case 1:return n.sent(),[2,this.getQueryTime(t,B().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_VERSION"))]}}))}))},r.prototype.getQueryTime=function(t,e){if(e===0)return null;if(e===2){var n=this.gl;return n.getQueryParameter(t,n.QUERY_RESULT)/1e6}var a=this.getQueryTimerExtensionWebGL1();return a.getQueryObjectEXT(t,a.QUERY_RESULT_EXT)/1e6},r.prototype.isQueryAvailable=function(t,e){if(e===0)return!0;if(e===2){var n=this.gl,a=this.getQueryTimerExtensionWebGL2(),o=n.getQueryParameter(t,n.QUERY_RESULT_AVAILABLE);return this.disjoint==null&&(this.disjoint=this.gl.getParameter(a.GPU_DISJOINT_EXT)),o&&!this.disjoint}return o=(a=this.getQueryTimerExtensionWebGL1()).getQueryObjectEXT(t,a.QUERY_RESULT_AVAILABLE_EXT),this.disjoint==null&&(this.disjoint=this.gl.getParameter(a.GPU_DISJOINT_EXT)),o&&!this.disjoint},r.prototype.pollFence=function(t){var e=this;return new Promise((function(n){e.addItemToPoll((function(){return t.isFencePassed()}),(function(){return n()}))}))},r.prototype.pollItems=function(){for(var t=(function(n){for(var a=0;a<n.length&&n[a]();++a);return a-1})(this.itemsToPoll.map((function(n){return n.isDoneFn}))),e=0;e<=t;++e)(0,this.itemsToPoll[e].resolveFn)();this.itemsToPoll=this.itemsToPoll.slice(t+1)},r.prototype.addItemToPoll=function(t,e){var n=this;this.itemsToPoll.push({isDoneFn:t,resolveFn:e}),this.itemsToPoll.length>1||ro((function(){return n.pollItems(),n.itemsToPoll.length===0}))},r.prototype.bindTextureToFrameBuffer=function(t){this.throwIfDisposed(),Tr(this.gl,this.debug,t,this.framebuffer),this.debug&&Un(this.gl)},r.prototype.unbindTextureToFrameBuffer=function(){this.outputTexture!=null?(Tr(this.gl,this.debug,this.outputTexture,this.framebuffer),this.debug&&Un(this.gl)):lo(this.gl,this.debug,this.framebuffer)},r.prototype.downloadMatrixDriver=function(t,e){this.bindTextureToFrameBuffer(t);var n=e();return this.unbindTextureToFrameBuffer(),n},r.prototype.setOutputMatrixTextureDriver=function(t,e,n){this.throwIfDisposed();var a=this.gl;Tr(a,this.debug,t,this.framebuffer),this.debug&&Un(a),this.outputTexture=t,X(a,this.debug,(function(){return a.viewport(0,0,e,n)})),X(a,this.debug,(function(){return a.scissor(0,0,e,n)}))},r.prototype.setOutputMatrixWriteRegionDriver=function(t,e,n,a){var o=this;this.throwIfDisposed(),X(this.gl,this.debug,(function(){return o.gl.scissor(t,e,n,a)}))},r.prototype.throwIfDisposed=function(){if(this.disposed)throw new Error("Attempted to use disposed GPGPUContext.")},r.prototype.throwIfNoProgram=function(){if(this.program==null)throw new Error("No GPU program is currently set.")},r})();function Gs(r,t){if(r.length!==t.length)throw Error("Binary was compiled with "+r.length+" inputs, but was executed with "+t.length+" inputs");r.forEach((function(e,n){var a=e.logicalShape,o=t[n],i=o.shape;if(!Re(a,i))throw Error("Binary was compiled with different shapes than the current args. Shapes "+a+" and "+i+" must match");if(!e.isUniform||!o.isUniform){var s=e.texShape,u=o.isUniform?null:o.texData.texShape;if(!Re(s,u))throw Error("Binary was compiled with different texture shapes than the current args. Shape "+s+" and "+u+" must match")}}))}var zd=function(r,t,e){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!0,this.outputShape=r;for(var n=e.filterWidth,a=e.inChannels,o=e.strideWidth,i=e.strideHeight,s=e.padInfo,u=e.outWidth,c=e.dilationWidth,l=e.dilationHeight,p=e.dataFormat,d=s.left,h=s.top,f=a*n,m=Me(),v=p==="channelsLast",g=v?0:1,y=v?1:2,x="",b=0;b<=1;b++)for(var C=0;C<=1;C++)x+=`
          blockIndex = rc.y + `+C+`;
          pos = rc.x + `+b+`;

          if(blockIndex < `+r[1]+" && pos < "+r[0]+`) {
            offsetY = int(blockIndex / (`+u+")) * "+i+" - "+h+`;
            d0 = offsetY + `+l+" * (pos / "+f+`);

            if(d0 < `+t[g]+` && d0 >= 0) {

              offsetX = int(mod(float(blockIndex), `+u+".) * "+o+". - "+d+`.);
              d1 = offsetX + `+c+" * (int(mod(float(pos), "+f+".) / "+a+`.));

              if(d1 < `+t[y]+` && d1 >= 0) {

                ch = int(mod(float(pos), `+a+`.));

                if (`+v+`) {
                  innerDims = vec2(d1, ch);
                  result[`+(2*b+C)+`] = getChannel(
                    getA(d0, int(innerDims.x),
                    int(innerDims.y)), innerDims);
                } else {
                  innerDims = vec2(d0, d1);
                  result[`+(2*b+C)+`] = getChannel(
                    getA(ch, int(innerDims.x),
                    int(innerDims.y)), innerDims);
                }
              }
            }
          }
        `;this.userCode=`
      void main() {
        ivec2 rc = getOutputCoords();

        vec4 result = vec4(0);

        int blockIndex, pos, offsetY, d0, offsetX, d1, ch;
        vec2 innerDims;

        `+x+`

        `+m.output+` = result;
      }
    `},Ud=function(r,t,e,n,a){this.variableNames=["x"],this.outputShape=[];var o,i=t,s=r[3]-1;this.outputShape=r;var u="float("+e+") + float("+n+") * sum";o=a===.5?"inversesqrt("+u+")":a===1?"1.0/("+u+")":"exp(log("+u+") * float(-"+a+"));",this.userCode=`
      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int r = coords[1];
        int c = coords[2];
        int d = coords[3];
        float x = getX(b, r, c, d);
        float sum = 0.0;
        for (int j = -`+i+"; j <= "+i+`; j++) {
          int idx = d + j;
          if (idx >= 0 && idx <=  `+s+`) {
            float z = getX(b, r, c, idx);
            sum += z * z;
          }
        }
        float val = x * `+o+`;
        setOutput(val);
      }
    `},Gd=function(r,t,e,n,a){this.variableNames=["inputImage","outputImage","dy"],this.outputShape=[],this.outputShape=r,this.depth=r[3],this.depthRadius=t,this.bias=e,this.alpha=n,this.beta=a,this.userCode=`
      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int r = coords[1];
        int c = coords[2];

        float result = 0.0;
        for (int d = 0; d < `+this.depth+`; ++d) {
          int depthBegin = int(max(0.0, float(d - `+t+`)));
          int depthEnd = int(min(float(`+this.depth+`),
              float(d + `+t+` + 1)));

          const int MIN_DEPTH_BEGIN = 0;
          const int MAX_DEPTH_END = `+this.depth+`;

          float norm = 0.0;
          for (int k = MIN_DEPTH_BEGIN; k < MAX_DEPTH_END; ++k) {
            if (k < depthBegin){
              continue;
            }
            else if (k >= depthBegin && k < depthEnd) {
              norm += getInputImage(b, r, c, k) * getInputImage(b, r, c, k);
            }
            else {
              break;
            }
          }

          norm = float(`+n+") * norm + float("+e+`);

          for(int k = MIN_DEPTH_BEGIN; k < MAX_DEPTH_END; ++k){
            if (k < depthBegin){
              continue;
            }
            else if (k >= depthBegin && k < depthEnd){
              float dyi = -2.0 * float(`+n+`)
                * float(`+a+`)
                * getInputImage(b ,r ,c, k) * getOutputImage(b, r, c, d)
                / norm;
              if (k == d) {
                dyi += pow(norm, -1.0 * `+a+`);
              }
              if (k == coords[3]) {
                dyi *= getDy(b, r, c, d);
                result += dyi;
              }
            }
            else {
              break;
            }
          }
      }
      setOutput(result);
      }
    `},Hd=function(r,t,e,n,a){this.variableNames=["x"],this.outputShape=[],this.packedInputs=!0,this.packedOutput=!0;var o,i=t,s=r[3]-1;this.outputShape=r;var u="float("+e+") + float("+n+") * sum";o=a===.5?"inversesqrt("+u+")":a===1?"1.0/("+u+")":"exp(log("+u+") * float(-"+a+"));",this.userCode=`
      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords.x;
        int r = coords.y;
        int c = coords.z;
        int d = coords.w;

        bool hasNextCol = d < `+this.outputShape[3]+`;
        bool hasNextRow = c < `+this.outputShape[2]+`;

        vec4 sum = vec4(0.);
        vec4 xFragAtOutputCoords = getX(b, r, c, d);

        vec4 xAtOutputCoords = vec4(
          getChannel(xFragAtOutputCoords, vec2(c, d)),
          hasNextCol ?
            getChannel(xFragAtOutputCoords, vec2(c, d + 1)) : 0.0,
          hasNextRow ?
            getChannel(xFragAtOutputCoords , vec2(c + 1, d)) : 0.0,
          (hasNextRow && hasNextCol) ?
            getChannel(xFragAtOutputCoords, vec2(c + 1, d + 1)) : 0.0
        );

        int firstChannel = d - `+i+`;
        vec2 cache = vec2(0.);
        if(firstChannel >= 0){
          vec4 firstChannelFrag = getX(b, r, c, firstChannel);
          cache.x = getChannel(firstChannelFrag, vec2(c, firstChannel));
            if(hasNextRow){
              cache.y = getChannel(firstChannelFrag, vec2(c + 1, firstChannel));
            }
        }

        ivec2 depth = ivec2(d, d + 1);
        for (int j = - `+i+"; j <= "+i+`; j++) {
          ivec2 idx = depth + j;
          bvec2 aboveLowerBound = greaterThanEqual(idx, ivec2(0));
          bvec2 belowUpperBound = lessThanEqual(idx, ivec2(`+s+`));

          bool depthInRange = aboveLowerBound.x && belowUpperBound.x;
          bool depthPlusOneInRange = aboveLowerBound.y && belowUpperBound.y;

          if(depthInRange || depthPlusOneInRange){
            vec4 z = vec4(0.);
            vec4 xFragAtCurrentDepth;
            z.xz = cache.xy;
            if(depthPlusOneInRange && hasNextCol){
              xFragAtCurrentDepth = idx.y != d ?
                getX(b, r, c, idx.y) : xFragAtOutputCoords;
              z.y = getChannel(xFragAtCurrentDepth, vec2(c, idx.y));
              if(hasNextRow){
                z.w = getChannel(xFragAtCurrentDepth, vec2(c + 1, idx.y));
              }
            }
            cache.xy = z.yw;
            sum += z * z;
          }
        }
        vec4 result = xAtOutputCoords * `+o+`;
        setOutput(result);
      }
    `},qd=function(r){this.variableNames=["dy","maxPos"],this.outputShape=r.inShape;var t=r.strideHeight,e=r.strideWidth,n=r.dilationHeight,a=r.effectiveFilterHeight,o=r.effectiveFilterWidth,i=a-1-r.padInfo.top,s=o-1-r.padInfo.left,u=a*o-1;this.userCode=`
      const ivec2 pads = ivec2(`+i+", "+s+`);

      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int d = coords[3];

        ivec2 dyRCCorner = coords.yz - pads;
        int dyRCorner = dyRCCorner.x;
        int dyCCorner = dyRCCorner.y;

        // Convolve dy(?, ?, d) with pos mask(:, :, d) to get dx(xR, xC, d).
        // ? = to be determined. : = across all values in that axis.
        float dotProd = 0.0;
        for (int wR = 0; wR < `+a+`;
          wR += `+n+`) {
          float dyR = float(dyRCorner + wR) / `+t+`.0;

          if (dyR < 0.0 || dyR >= `+r.outHeight+`.0 || fract(dyR) > 0.0) {
            continue;
          }
          int idyR = int(dyR);

          for (int wC = 0; wC < `+o+`; wC++) {
            float dyC = float(dyCCorner + wC) / `+e+`.0;

            if (dyC < 0.0 || dyC >= `+r.outWidth+`.0 ||
                fract(dyC) > 0.0) {
              continue;
            }
            int idyC = int(dyC);

            float dyValue = getDy(b, idyR, idyC, d);
            int maxPosValue = `+u+` - int(getMaxPos(b, idyR, idyC, d));

            // Get the current value, check it against the value from the
            // position matrix.
            int curPosValue = wR * `+o+` + wC;
            float mask = float(maxPosValue == curPosValue ? 1.0 : 0.0);

            dotProd += dyValue * mask;
          }
        }
        setOutput(dotProd);
      }
    `},jd=function(r){this.variableNames=["dy","maxPos"],this.outputShape=r.inShape;var t=r.strideDepth,e=r.strideHeight,n=r.strideWidth,a=r.dilationDepth,o=r.dilationHeight,i=r.dilationWidth,s=r.effectiveFilterDepth,u=r.effectiveFilterHeight,c=r.effectiveFilterWidth,l=s-1-r.padInfo.front,p=u-1-r.padInfo.top,d=c-1-r.padInfo.left,h=s*u*c-1;this.userCode=`
      const ivec3 pads = ivec3(`+l+", "+p+", "+d+`);

      void main() {
        ivec5 coords = getOutputCoords();
        int batch = coords.x;
        int ch = coords.u;

        ivec3 dyCorner = ivec3(coords.y, coords.z, coords.w) - pads;
        int dyDCorner = dyCorner.x;
        int dyRCorner = dyCorner.y;
        int dyCCorner = dyCorner.z;

        // Convolve dy(?, ?, ?, ch) with pos mask(:, :, :, d) to get
        // dx(xD, xR, xC, ch).
        // ? = to be determined. : = across all values in that axis.
        float dotProd = 0.0;

        for (int wD = 0; wD < `+s+`;
           wD += `+a+`) {
          float dyD = float(dyDCorner + wD) / `+t+`.0;

          if (dyD < 0.0 || dyD >= `+r.outDepth+`.0 || fract(dyD) > 0.0) {
            continue;
          }
          int idyD = int(dyD);

          for (int wR = 0; wR < `+u+`;
              wR += `+o+`) {
            float dyR = float(dyRCorner + wR) / `+e+`.0;

            if (dyR < 0.0 || dyR >= `+r.outHeight+`.0 ||
                fract(dyR) > 0.0) {
              continue;
            }
            int idyR = int(dyR);

            for (int wC = 0; wC < `+c+`;
                wC += `+i+`) {
              float dyC = float(dyCCorner + wC) / `+n+`.0;

              if (dyC < 0.0 || dyC >= `+r.outWidth+`.0 ||
                  fract(dyC) > 0.0) {
                continue;
              }
              int idyC = int(dyC);

              float dyValue = getDy(batch, idyD, idyR, idyC, ch);
              int maxPosValue = `+h+` -
                  int(getMaxPos(batch, idyD, idyR, idyC, ch));

              // Get the current value, check it against the value from the
              // position matrix.
              int curPosValue =
                  wD * `+u+" * "+c+` +
                  wR * `+c+` + wC;
              float mask = float(maxPosValue == curPosValue ? 1.0 : 0.0);

              dotProd += dyValue * mask;
            }
          }
        }
        setOutput(dotProd);
      }
    `},Ua=function(r,t,e,n,a,o,i){e===void 0&&(e=!1),n===void 0&&(n=!1),a===void 0&&(a=!1),o===void 0&&(o=null),i===void 0&&(i=!1),this.variableNames=["matrixA","matrixB"],this.packedInputs=!0,this.packedOutput=!0,this.outputShape=t;var s=e?r[1]:r[2],u=Math.ceil(s/2),c=e?"i * 2, rc.y":"rc.y, i * 2",l=n?"rc.z, i * 2":"i * 2, rc.z",p=e?["a.xxyy","a.zzww"]:["a.xxzz","a.yyww"],d=n?["b.xzxz","b.ywyw"]:["b.xyxy","b.zwzw"],h="",f="";o&&(h=i?`vec4 activation(vec4 a) {
          vec4 b = getPreluActivationWeightsAtOutCoords();
          `+o+`
        }`:`vec4 activation(vec4 x) {
          `+o+`
        }`,f="result = activation(result);");var m=a?"result += getBiasAtOutCoords();":"";a&&this.variableNames.push("bias"),i&&this.variableNames.push("preluActivationWeights"),this.userCode=`
      `+h+`

      const float sharedDimension = `+u+`.0;

      vec4 dot2x2ARowBCol(ivec3 rc) {
        vec4 result = vec4(0);
        for (int i = 0; i < `+u+`; i++) {
          vec4 a = getMatrixA(rc.x, `+c+`);
          vec4 b = getMatrixB(rc.x, `+l+`);

          // These swizzled products need to be separately added.
          // See: https://github.com/tensorflow/tfjs/issues/1735
          result += (`+p[0]+" * "+d[0]+`);
          result += (`+p[1]+" * "+d[1]+`);
        }
        return result;
      }

      void main() {
        ivec3 rc = getOutputCoords();
        vec4 result = dot2x2ARowBCol(rc);

        `+m+`

        `+f+`

        setOutput(result);
      }
    `},Kd=(function(){function r(t,e,n){this.variableNames=["probs"],this.outputShape=[t,n],this.userCode=`
      uniform float seed;

      void main() {
        ivec2 coords = getOutputCoords();
        int batch = coords[0];

        float r = random(seed);
        float cdf = 0.0;

        for (int i = 0; i < `+(e-1)+`; i++) {
          cdf += getProbs(batch, i);

          if (r < cdf) {
            setOutput(float(i));
            return;
          }
        }

        // If no other event happened, last event happened.
        setOutput(float(`+(e-1)+`));
      }
    `}return r.prototype.getCustomSetupFunc=function(t){var e=this;return function(n,a){e.seedLoc==null&&(e.seedLoc=n.getUniformLocation(a,"seed")),n.gl.uniform1f(e.seedLoc,t)}},r})(),Xd=function(r,t,e,n){this.variableNames=["indices"],this.outputShape=[r,t],this.userCode=`
      void main() {
        ivec2 coords = getOutputCoords();
        int index = round(getIndices(coords.x));
        setOutput(mix(float(`+n+"), float("+e+`),
                      float(index == coords.y)));
      }
    `},$d=function(r){this.variableNames=["A"],this.packedInputs=!1,this.packedOutput=!0,this.outputShape=r;var t=r.length;if(t===0)this.userCode=`
        void main() {
          setOutput(vec4(getA(), 0., 0., 0.));
        }
      `;else{var e=Ue("rc",t),n=ve(t),a=(function(s,u,c){if(s===1)return"rc > "+u[0];for(var l="",p=s-2;p<s;p++)l+=c[p]+" >= "+u[p],p<s-1&&(l+="||");return l})(t,r,e),o=(function(s,u,c,l){if(s===1)return"";var p=l.slice(-2);return`
    int r = `+p[0]+`;
    int c = `+p[1]+`;
    int rp1 = r + 1;
    int cp1 = c + 1;

    bool cEdge = cp1 >= `+u+`;
    bool rEdge = rp1 >= `+c+`;
  `})(t,r[r.length-1],r[r.length-2],e),i=(function(s,u){var c=s.length,l=(function(p,d){for(var h=[],f=0;f<=1;f++)for(var m=0;m<=1;m++){for(var v=(f===0?"r":"rp1")+", "+(m===0?"c":"cp1"),g=2;g<p;g++)v=d[d.length-1-g]+","+v;h.push(v)}return h})(c,u);return c===1?`getA(rc),
            rc + 1 >= `+s[0]+` ? 0. : getA(rc + 1),
            0, 0`:"getA("+l[0]+`),
          cEdge ? 0. : getA(`+l[1]+`),
          rEdge ? 0. : getA(`+l[2]+`),
          rEdge || cEdge ? 0. : getA(`+l[3]+")"})(r,e);this.userCode=`
        void main() {
          `+n+` rc = getOutputCoords();

          if(`+a+`) {
            setOutput(vec4(0));
          } else {
            `+o+`

            setOutput(vec4(`+i+`));
          }
        }
      `}},Yd=function(r,t,e){this.variableNames=["x"],this.outputShape=t.map((function(u,c){return u[0]+r[c]+u[1]}));var n=r.length,a=ve(n),o=t.map((function(u){return u[0]})).join(","),i=t.map((function(u,c){return u[0]+r[c]})).join(","),s=["coords[0]","coords[1]","coords[2]","coords[3]"].slice(0,n);this.userCode=n!==1?`
      `+a+" start = "+a+"("+o+`);
      `+a+" end = "+a+"("+i+`);

      void main() {
        `+a+` outC = getOutputCoords();
        if (any(lessThan(outC, start)) || any(greaterThanEqual(outC, end))) {
          setOutput(float(`+e+`));
        } else {
          `+a+` coords = outC - start;
          setOutput(getX(`+s+`));
        }
      }
    `:`
        int start = `+o+`;
        int end = `+i+`;

        void main() {
          int outC = getOutputCoords();
          if (outC < start || outC >= end) {
            setOutput(float(`+e+`));
          } else {
            setOutput(getX(outC - start));
          }
        }
      `},Qd=function(r,t,e){this.variableNames=["x"],this.packedInputs=!0,this.packedOutput=!0,this.outputShape=t.map((function(v,g){return v[0]+r[g]+v[1]}));for(var n=r.length,a=ve(n),o=t.map((function(v){return v[0]})).join(","),i=t.map((function(v,g){return v[0]+r[g]})).join(","),s=Ue("rc",n),u=Ue("source",n),c=s[n-1]+" < "+this.outputShape[n-1],l=n===1?"source":"vec2("+u.slice(-2).join()+")",p=[a+" rc = outputLoc;",s[n-1]+` += 1;
       if(`+c+`) {
      `,n===1?"":`}
       rc = outputLoc;
       `+s[n-2]+` += 1;
       if(`+s[n-2]+" < "+this.outputShape[n-2]+") {",n===1?"":"  "+s[n-1]+` += 1;
         if(`+c+") {"],d=n===1?"rc < start || rc >= end":"any(lessThan(rc, start)) || any(greaterThanEqual(rc, end))",h="",f=0,m=n===1?2:4;f<m;f++)h+=`
        `+p[f]+`
        if (`+d+`) {
          result[`+f+"] = float("+e+`);
        } else {
          `+a+` source = rc - start;
          result[`+f+"] = getChannel(getX("+u.join()+"), "+l+`);
        }
      `;h+=n===1?"} ":"}}",this.userCode=`
      const `+a+" start = "+a+"("+o+`);
      const `+a+" end = "+a+"("+i+`);

      void main() {
        `+a+` outputLoc = getOutputCoords();
        vec4 result = vec4(0.);
        `+h+`
        setOutput(result);
      }
    `},jn=function(r,t,e,n,a){if(n===void 0&&(n=!1),a===void 0&&(a=!1),this.variableNames=["x"],t==="avg"&&e)throw new Error("Cannot compute positions for average pool.");var o=r.filterWidth,i=r.strideHeight,s=r.strideWidth,u=r.dilationHeight,c=r.dilationWidth,l=r.effectiveFilterHeight,p=r.effectiveFilterWidth,d=r.padInfo.top,h=r.padInfo.left;this.outputShape=r.outShape;var f=t==="avg",m="((batch  * "+r.inHeight+" + xR) * "+r.inWidth+" + xC) * "+r.inChannels+" + d",v="(xR * "+r.inWidth+" + xC) * "+r.inChannels+" + d",g="0.0";if(f||(g="-1.0 / 1e-20"),e)this.userCode=`
        const ivec2 strides = ivec2(`+i+", "+s+`);
        const ivec2 pads = ivec2(`+d+", "+h+`);

        void main() {
          ivec4 coords = getOutputCoords();
          int batch = coords[0];
          int d = coords[3];

          ivec2 xRCCorner = coords.yz * strides - pads;
          int xRCorner = xRCCorner.x;
          int xCCorner = xRCCorner.y;

          // max/min x(?, ?, d) to get y(yR, yC, d).
          // ? = to be determined
          float minMaxValue = 0.0;
          float minMaxValueFound = 0.0;
          int minMaxPosition = 0;
          float avgValue = 0.0;

          for (int wR = 0; wR < `+l+`;
              wR += `+u+`) {
            int xR = xRCorner + wR;

            if (xR < 0 || xR >= `+r.inHeight+`) {
              continue;
            }

            for (int wC = 0; wC < `+p+`;
                wC += `+c+`) {
              int xC = xCCorner + wC;

              if (xC < 0 || xC >= `+r.inWidth+`) {
                continue;
              }

              float value = getX(batch, xR, xC, d);

              // If a min / max value has already been found, use it. If not,
              // use the current value.
              float currMinMaxValue = mix(
                  value, minMaxValue, minMaxValueFound);
              if (value >= currMinMaxValue) {
                minMaxValue = value;
                minMaxValueFound = 1.0;
                minMaxPosition = `+(n?a?m:v:"wR * "+p+" + wC")+`;
              }
            }
          }
          setOutput(float(minMaxPosition));
        }
      `;else{var y=t+"("+t+"("+t+"(minMaxValue[0], minMaxValue[1]), minMaxValue[2]), minMaxValue[3])";t==="avg"&&(y="avgValue / count");var x=4*Math.floor(o/4),b=o%4,C=`
      if (`+f+`) {
        avgValue += dot(values, ones);
      } else {
        minMaxValue = max(values, minMaxValue);
      }
    `;this.userCode=`
      const ivec2 strides = ivec2(`+i+", "+s+`);
      const ivec2 pads = ivec2(`+d+", "+h+`);
      const float initializationValue = `+g+`;
      const vec4 ones = vec4(1.0, 1.0, 1.0, 1.0);

      float count = 0.0;

      float getValue(int batch, int xR, int xC, int d) {
        if (xC < 0 || xC >= `+r.inWidth+`) {
          return initializationValue;
        }
        count += 1.0;
        return getX(batch, xR, xC, d);
      }

      void main() {
        ivec4 coords = getOutputCoords();
        int batch = coords[0];
        int d = coords[3];

        ivec2 xRCCorner = coords.yz * strides - pads;
        int xRCorner = xRCCorner.x;
        int xCCorner = xRCCorner.y;

        // max/min x(?, ?, d) to get y(yR, yC, d).
        // ? = to be determined
        vec4 minMaxValue = vec4(`+g+`);
        float avgValue = 0.0;
        count = 0.0;

        for (int wR = 0; wR < `+l+`;
            wR += `+u+`) {
          int xR = xRCorner + wR;

          if (xR < 0 || xR >= `+r.inHeight+`) {
            continue;
          }

          for (int wC = 0; wC < `+x+`; wC += 4) {
            int xC = xCCorner + wC * `+c+`;

            vec4 values = vec4(
              getValue(batch, xR, xC, d),
              getValue(batch, xR, xC + `+c+`, d),
              getValue(batch, xR, xC + 2 * `+c+`, d),
              getValue(batch, xR, xC + 3 * `+c+`, d)
            );

            `+C+`
          }

          int xC = xCCorner + `+x+`;
          if (`+(b===1)+`) {
            vec4 values = vec4(
              getValue(batch, xR, xC, d),
              initializationValue,
              initializationValue,
              initializationValue
            );

            `+C+`
          } else if (`+(b===2)+`) {
            vec4 values = vec4(
              getValue(batch, xR, xC, d),
              getValue(batch, xR, xC + `+c+`, d),
              initializationValue,
              initializationValue
            );

            `+C+`
          } else if (`+(b===3)+`) {
            vec4 values = vec4(
              getValue(batch, xR, xC, d),
              getValue(batch, xR, xC + `+c+`, d),
              getValue(batch, xR, xC + 2 * `+c+`, d),
              initializationValue
            );

            `+C+`
          }
        }
        setOutput(`+y+`);
      }
    `}},Ga=function(r,t,e,n,a){if(n===void 0&&(n=!1),a===void 0&&(a=!1),this.variableNames=["x"],t==="avg"&&e)throw new Error("Cannot compute positions for average pool.");var o=r.filterWidth,i=r.strideDepth,s=r.strideHeight,u=r.strideWidth,c=r.dilationDepth,l=r.dilationHeight,p=r.dilationWidth,d=r.effectiveFilterDepth,h=r.effectiveFilterHeight,f=r.effectiveFilterWidth,m=r.padInfo.front,v=r.padInfo.top,g=r.padInfo.left;this.outputShape=r.outShape;var y=t==="avg",x="0.0";if(y||(x="-1.0 / 1e-20"),e)this.userCode=`
        const ivec3 strides =
            ivec3(`+i+", "+s+", "+u+`);
        const ivec3 pads = ivec3(`+m+", "+v+", "+g+`);

        void main() {
          ivec5 coords = getOutputCoords();
          int batch = coords.x;
          int ch = coords.u;

          ivec3 xCorner = ivec3(coords.y, coords.z, coords.w) * strides - pads;
          int xDCorner = xCorner.x;
          int xRCorner = xCorner.y;
          int xCCorner = xCorner.z;

          // max/min x(?, ?, ?, ch) to get y(yD, yR, yC, ch).
          // ? = to be determined
          float minMaxValue = 0.0;
          float minMaxValueFound = 0.0;
          int minMaxPosition = 0;

          for (int wD = 0; wD < `+d+`;
              wD += `+c+`) {
            int xD = xDCorner + wD;

            if (xD < 0 || xD >= `+r.inDepth+`) {
              continue;
            }

            for (int wR = 0; wR < `+h+`;
                wR += `+l+`) {
              int xR = xRCorner + wR;

              if (xR < 0 || xR >= `+r.inHeight+`) {
                continue;
              }

              for (int wC = 0; wC < `+f+`;
                  wC += `+p+`) {
                int xC = xCCorner + wC;

                if (xC < 0 || xC >= `+r.inWidth+`) {
                  continue;
                }

                float value = getX(batch, xD, xR, xC, ch);

                // If a min / max value has already been found, use it. If not,
                // use the current value.
                float currMinMaxValue = mix(
                    value, minMaxValue, minMaxValueFound);
                if (value >= currMinMaxValue) {
                  minMaxValue = value;
                  minMaxValueFound = 1.0;
                  minMaxPosition = `+(n?a?"(((batch * "+r.inDepth+" + xD) * "+r.inHeight+" + xR) * "+r.inWidth+" + xC) * "+r.inChannels+" + ch":"((xD * "+r.inHeight+" + xR) * "+r.inWidth+" + xC) * "+r.inChannels+" + ch":"wD * "+h+" * "+f+` +
                      wR * `+f+" + wC")+`;
                }
              }
            }
          }
          setOutput(float(minMaxPosition));
        }
      `;else{var b=t+"("+t+"("+t+"(minMaxValue[0], minMaxValue[1]), minMaxValue[2]), minMaxValue[3])";t==="avg"&&(b="avgValue / count");var C=4*Math.floor(o/4),E=o%4,R=`
      if (`+y+`) {
        avgValue += dot(values, ones);
      } else {
        minMaxValue = max(values, minMaxValue);
      }
    `;this.userCode=`
      const ivec3 strides =
        ivec3(`+i+", "+s+", "+u+`);
      const ivec3 pads = ivec3(`+m+", "+v+", "+g+`);
      const float initializationValue = `+x+`;
      const vec4 ones = vec4(1.0, 1.0, 1.0, 1.0);

      float count = 0.0;

      float getValue(int batch, int xD, int xR, int xC, int ch) {
        if (xC < 0 || xC >= `+r.inWidth+`) {
          return initializationValue;
        }
        count += 1.0;
        return getX(batch, xD, xR, xC, ch);
      }

      void main() {
        ivec5 coords = getOutputCoords();
        int batch = coords.x;
        int ch = coords.u;

        ivec3 xCorner = ivec3(coords.y, coords.z, coords.w) * strides - pads;
        int xDCorner = xCorner.x;
        int xRCorner = xCorner.y;
        int xCCorner = xCorner.z;

        // max/min x(?, ?, ?, d) to get y(yD, yR, yC, ch).
        // ? = to be determined
        vec4 minMaxValue = vec4(`+x+`);
        float avgValue = 0.0;
        count = 0.0;

        for (int wD = 0; wD < `+d+`;
            wD += `+c+`) {
          int xD = xDCorner + wD;

          if (xD < 0 || xD >= `+r.inDepth+`) {
            continue;
          }

          for (int wR = 0; wR < `+h+`;
            wR += `+l+`) {
            int xR = xRCorner + wR;

            if (xR < 0 || xR >= `+r.inHeight+`) {
              continue;
            }

            for (int wC = 0; wC < `+C+`; wC += 4) {
              int xC = xCCorner + wC * `+p+`;

              vec4 values = vec4(
                getValue(batch, xD, xR, xC, ch),
                getValue(batch, xD, xR, xC + `+p+`, ch),
                getValue(batch, xD, xR, xC + 2 * `+p+`, ch),
                getValue(batch, xD, xR, xC + 3 * `+p+`, ch)
              );

              `+R+`
            }

            int xC = xCCorner + `+C+`;
            if (`+(E===1)+`) {
              vec4 values = vec4(
                getValue(batch, xD, xR, xC, ch),
                initializationValue,
                initializationValue,
                initializationValue
              );

              `+R+`
            } else if (`+(E===2)+`) {
              vec4 values = vec4(
                getValue(batch, xD, xR, xC, ch),
                getValue(batch, xD, xR, xC + `+p+`, ch),
                initializationValue,
                initializationValue
              );

              `+R+`
            } else if (`+(E===3)+`) {
              vec4 values = vec4(
                getValue(batch, xD, xR, xC, ch),
                getValue(batch, xD, xR, xC + `+p+`, ch),
                getValue(batch, xD, xR, xC + 2 * `+p+`, ch),
                initializationValue
              );

              `+R+`
            }
          }
          setOutput(`+b+`);
        }
      }
    `}},Jd=function(r,t){this.variableNames=["x"];var e=r.windowSize,n=r.batchSize,a=r.inSize,o=Math.ceil(a/e);this.outputShape=[n,o];var i="0.0",s="";t==="prod"?i="1.0":t==="min"?(i="1.0 / 1e-20",s="min"):t==="max"&&(i="-1.0 / 1e-20",s="max");var u=t+"("+t+"("+t+"(minMaxValue[0], minMaxValue[1]), minMaxValue[2]), minMaxValue[3])";t==="sum"?u="sumValue":t==="prod"?u="prodValue":t==="all"?u="allValue":t==="any"&&(u="anyValue");var c=4*Math.floor(e/4),l=e%4,p=`
      if (`+(t==="sum")+`) {
        sumValue += dot(values, ones);
      } else if (`+(t==="prod")+`) {
        vec2 tmp = vec2(values[0], values[1]) * vec2(values[2], values[3]);
        prodValue *= tmp[0] * tmp[1];
      } else {
        minMaxValue = `+s+`(values, minMaxValue);
      }
    `,d="vec4";t==="all"?(i="1.0",p=`
        bool reducedAllValue = all(values);
        float floatedReducedAllValue = float(reducedAllValue);
        allValue = float(allValue >= 1.0 && floatedReducedAllValue >= 1.0);
      `,d="bvec4"):t==="any"&&(i="0.0",p=`
        bool reducedAnyValue = any(values);
        float floatedReducedAnyValue = float(reducedAnyValue);
        anyValue = float(anyValue >= 1.0 || floatedReducedAnyValue >= 1.0);
      `,d="bvec4");var h="";a%e>0&&(h=`
        if (inIdx < 0 || inIdx >= `+a+`) {
          return initializationValue;
        }
      `),this.userCode=`
      const float initializationValue = `+i+`;
      const vec4 ones = vec4(1.0, 1.0, 1.0, 1.0);

      float getValue(int batch, int inIdx) {
        `+h+`
        return getX(batch, inIdx);
      }

      void main() {
        ivec2 coords = getOutputCoords();
        int batch = coords[0];
        int outIdx = coords[1];
        int inOffset = outIdx * `+e+`;

        vec4 minMaxValue = vec4(`+i+`);
        float prodValue = 1.0;
        float sumValue = 0.0;
        float allValue = 1.0;
        float anyValue = 0.0;

        for (int i = 0; i < `+c+`; i += 4) {
          int inIdx = inOffset + i;
          `+d+" values = "+d+`(
            getValue(batch, inIdx),
            getValue(batch, inIdx + 1),
            getValue(batch, inIdx + 2),
            getValue(batch, inIdx + 3)
          );

          `+p+`
        }

        int inIdx = inOffset + `+c+`;
        if (`+(l===1)+`) {
          `+d+" values = "+d+`(
            getValue(batch, inIdx),
            initializationValue,
            initializationValue,
            initializationValue
          );

          `+p+`
        } else if (`+(l===2)+`) {
          `+d+" values = "+d+`(
            getValue(batch, inIdx),
            getValue(batch, inIdx + 1),
            initializationValue,
            initializationValue
          );

          `+p+`
        } else if (`+(l===3)+`) {
          `+d+" values = "+d+`(
            getValue(batch, inIdx),
            getValue(batch, inIdx + 1),
            getValue(batch, inIdx + 2),
            initializationValue
          );

          `+p+`
        }
        setOutput(`+u+`);
      }
    `},Zd=function(r,t){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!0,this.outputShape=r;for(var e="",n=0;n<4;n++){var a="thisRC = rc;";n%2==1&&(a+="thisRC.z += 1;"),n>1&&(a+="thisRC.y += 1;"),e+=`
        `+a+`
        `+(n>0?"if(thisRC.y < rows && thisRC.z < cols){":"")+`
          int flatIndex = getFlatIndex(thisRC);

          ivec3 inputRC = inputCoordsFromReshapedOutCoords(flatIndex);
          vec2 inputRCInnerDims = vec2(float(inputRC.y),float(inputRC.z));

          result[`+n+`] =
            getChannel(getA(inputRC.x, inputRC.y, inputRC.z), inputRCInnerDims);
        `+(n>0?"}":"")+`
      `}this.userCode=`
      
    ivec3 inputCoordsFromReshapedOutCoords(int index) {
      `+Zt(["r","c","d"],t)+`
      return ivec3(r, c, d);
    }
  
      `+Ci(r)+`

      void main() {
        ivec3 rc = getOutputCoords();

        vec4 result = vec4(0.);

        ivec3 thisRC;
        int rows = `+r[1]+`;
        int cols = `+r[2]+`;

        `+e+`

        setOutput(result);
      }
    `},eh=function(r,t,e){this.variableNames=["dy"],this.outputShape=[],this.outputShape=t.shape;var n=t.shape,a=n[1],o=n[2],i=r.shape,s=i[1],u=i[2],c=[e&&s>1?a-1:a,e&&u>1?o-1:o],l=[e&&s>1?s-1:s,e&&u>1?u-1:u],p=c[0]/l[0],d=c[1]/l[1],h=1/p,f=1/d,m=2*Math.ceil(h)+2,v=2*Math.ceil(f)+2;this.userCode=`
      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int d = coords[3];
        int r = coords[1];
        int c = coords[2];

        float accumulator = 0.0;

        const float heightScale = float(`+p+`);
        const float widthScale = float(`+d+`);

        const float invHeightScale = float(`+h+`);
        const float invWidthScale = float(`+f+`);

        const int winHeight = int(`+m+`);
        const int winWidth = int(`+v+`);

        // Compute bounds for where in dy we will look
        float startRLerp = floor(float(r) * invHeightScale);
        int startDyR = int(startRLerp - float(winHeight / 2));

        float startCLerp = floor(float(c) * invWidthScale);
        int startDyC = int(startCLerp - float(winWidth / 2));

        // Loop over dy
        for (int dyROffset = 0; dyROffset < winHeight; dyROffset++) {
          int dyR = dyROffset + startDyR;

          // Guard against the window exceeding the bounds of dy
          if (dyR < 0 || dyR >= `+s+`) {
            continue;
          }

          for (int dyCOffset = 0; dyCOffset < winWidth; dyCOffset++) {
            int dyC = dyCOffset + startDyC;

            // Guard against the window exceeding the bounds of dy
            if (dyC < 0 || dyC >= `+u+`) {
              continue;
            }

            float dxR = float(dyR) * heightScale;
            int topDxRIndex = int(floor(dxR));
            int bottomDxRIndex = int(min(ceil(dxR), `+(a-1)+`.0));
            float dxRLerp = dxR - float(topDxRIndex);
            float inverseDxRLerp = 1.0 - dxRLerp;

            float dxC = float(dyC) * widthScale;
            int leftDxCIndex = int(floor(dxC));
            int rightDxCIndex = int(min(ceil(dxC), `+(o-1)+`.0));
            float dxCLerp = dxC - float(leftDxCIndex);
            float inverseDxCLerp = 1.0 - dxCLerp;

            if (r == topDxRIndex && c == leftDxCIndex) {
              // topLeft
              accumulator +=
                getDy(b, dyR, dyC, d) * inverseDxRLerp * inverseDxCLerp;
            }

            if (r == topDxRIndex && c == rightDxCIndex) {
              // topRight
              accumulator += getDy(b, dyR, dyC, d) * inverseDxRLerp * dxCLerp;
            }

            if (r == bottomDxRIndex && c == leftDxCIndex) {
              // bottomLeft
              accumulator += getDy(b, dyR, dyC, d) * dxRLerp * inverseDxCLerp;
            }

            if (r == bottomDxRIndex && c == rightDxCIndex) {
              // bottomRight
              accumulator += getDy(b, dyR, dyC, d) * dxRLerp * dxCLerp;
            }
          }
        }
        // End loop over dy

        setOutput(accumulator);
      }
    `},th=function(r,t,e,n){this.variableNames=["A"],this.outputShape=[];var a=r[0],o=r[1],i=r[2],s=r[3];this.outputShape=[a,t,e,s];var u=[n&&t>1?o-1:o,n&&e>1?i-1:i],c=[n&&t>1?t-1:t,n&&e>1?e-1:e];this.userCode=`
      const vec2 effectiveInputOverOutputRatioRC = vec2(
          `+u[0]/c[0]+`,
          `+u[1]/c[1]+`);
      const vec2 inputShapeRC = vec2(`+o+".0, "+i+`.0);

      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int d = coords[3];
        ivec2 yRC = coords.yz;

        // Fractional source index.
        vec2 sourceFracIndexRC = vec2(yRC) * effectiveInputOverOutputRatioRC;

        // Compute the four integer indices.
        ivec2 sourceFloorRC = ivec2(sourceFracIndexRC);
        ivec2 sourceCeilRC = ivec2(
          min(inputShapeRC - 1.0, ceil(sourceFracIndexRC)));

        float topLeft = getA(b, sourceFloorRC.x, sourceFloorRC.y, d);
        float bottomLeft = getA(b, sourceCeilRC.x, sourceFloorRC.y, d);
        float topRight = getA(b, sourceFloorRC.x, sourceCeilRC.y, d);
        float bottomRight = getA(b, sourceCeilRC.x, sourceCeilRC.y, d);

        vec2 fracRC = sourceFracIndexRC - vec2(sourceFloorRC);

        float top = topLeft + (topRight - topLeft) * fracRC.y;
        float bottom = bottomLeft + (bottomRight - bottomLeft) * fracRC.y;
        float newValue = top + (bottom - top) * fracRC.x;

        setOutput(newValue);
      }
    `},nh=function(r,t,e,n){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!0,this.outputShape=[];var a=r[0],o=r[1],i=r[2],s=r[3];this.outputShape=[a,t,e,s];var u=[n&&t>1?o-1:o,n&&e>1?i-1:i],c=[n&&t>1?t-1:t,n&&e>1?e-1:e];this.userCode=`
      const vec3 effectiveInputOverOutputRatioRC = vec3(
          `+u[0]/c[0]+`,
          `+u[1]/c[1]+`,
          `+u[1]/c[1]+`);
      const vec3 inputShapeRC = vec3(`+o+".0, "+i+`.0,
                                     `+i+`.0);

      float getAValue(int b, int r, int c, int d) {
        return getChannel(getA(b, r, c, d), vec2(c, d));
      }

      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int d = coords[3];
        // Calculate values for next column in yRC.z.
        ivec3 yRC = coords.yzz + ivec3(0, 0, 1);

        // Fractional source index.
        vec3 sourceFracIndexRC = vec3(yRC) * effectiveInputOverOutputRatioRC;

        // Compute the four integer indices.
        ivec3 sourceFloorRC = ivec3(sourceFracIndexRC);
        ivec3 sourceCeilRC = ivec3(
          min(inputShapeRC - 1.0, ceil(sourceFracIndexRC)));

        // Should we calculate next column and row elements in 2x2 packed cell.
        bool hasNextCol = d < `+(s-1)+`;
        bool hasNextRow = coords.z < `+(e-1)+`;

        // In parallel, construct four corners for all four components in
        // packed 2x2 cell.
        vec4 topLeft = vec4(
          getAValue(b, sourceFloorRC.x, sourceFloorRC.y, d),
          hasNextCol ? getAValue(b, sourceFloorRC.x, sourceFloorRC.y, d + 1)
                     : 0.0,
          hasNextRow ? getAValue(b, sourceFloorRC.x, sourceFloorRC.z, d)
                     : 0.0,
          (hasNextRow && hasNextCol) ?
            getAValue(b, sourceFloorRC.x, sourceFloorRC.z, d + 1) : 0.0);

        vec4 bottomLeft = vec4(
          getAValue(b, sourceCeilRC.x, sourceFloorRC.y, d),
          hasNextCol ? getAValue(b, sourceCeilRC.x, sourceFloorRC.y, d + 1)
                     : 0.0,
          hasNextRow ? getAValue(b, sourceCeilRC.x, sourceFloorRC.z, d)
                     : 0.0,
          (hasNextRow && hasNextCol) ?
            getAValue(b, sourceCeilRC.x, sourceFloorRC.z, d + 1) : 0.0);

        vec4 topRight = vec4(
          getAValue(b, sourceFloorRC.x, sourceCeilRC.y, d),
          hasNextCol ? getAValue(b, sourceFloorRC.x, sourceCeilRC.y, d + 1)
                     : 0.0,
          hasNextRow ? getAValue(b, sourceFloorRC.x, sourceCeilRC.z, d)
                     : 0.0,
          (hasNextRow && hasNextCol) ?
            getAValue(b, sourceFloorRC.x, sourceCeilRC.z, d + 1) : 0.0);

        vec4 bottomRight = vec4(
          getAValue(b, sourceCeilRC.x, sourceCeilRC.y, d),
          hasNextCol ? getAValue(b, sourceCeilRC.x, sourceCeilRC.y, d + 1)
                     : 0.0,
          hasNextRow ? getAValue(b, sourceCeilRC.x, sourceCeilRC.z, d)
                     : 0.0,
          (hasNextRow && hasNextCol) ?
            getAValue(b, sourceCeilRC.x, sourceCeilRC.z, d + 1) : 0.0);

        vec3 fracRC = sourceFracIndexRC - vec3(sourceFloorRC);

        vec4 top = mix(topLeft, topRight, fracRC.yyzz);
        vec4 bottom = mix(bottomLeft, bottomRight, fracRC.yyzz);
        vec4 newValue = mix(top, bottom, fracRC.x);

        setOutput(newValue);
      }
    `},rh=function(r,t,e){this.variableNames=["dy"],this.outputShape=[],this.outputShape=t.shape;var n=t.shape,a=n[1],o=n[2],i=r.shape,s=i[1],u=i[2],c=[e&&s>1?a-1:a,e&&u>1?o-1:o],l=[e&&s>1?s-1:s,e&&u>1?u-1:u],p=c[0]/l[0],d=c[1]/l[1],h=1/p,f=1/d,m=2*Math.ceil(h)+2,v=2*Math.ceil(f)+2;this.userCode=`
      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int d = coords[3];
        int r = coords[1];
        int c = coords[2];

        float accumulator = 0.0;

        const float heightScale = float(`+p+`);
        const float widthScale = float(`+d+`);

        const float invHeightScale = float(`+h+`);
        const float invWidthScale = float(`+f+`);

        const int winHeight = int(`+m+`);
        const int winWidth = int(`+v+`);

        // Compute bounds for where in dy we will look
        float startRLerp = floor(float(r) * invHeightScale);
        int startDyR = int(floor(startRLerp - float(winHeight / 2)));

        float startCLerp = floor(float(c) * invWidthScale);
        int startDyC = int(floor(startCLerp - float(winWidth / 2)));

        // Loop over dy
        for (int dyROffset = 0; dyROffset < winHeight; dyROffset++) {
          int dyR = dyROffset + startDyR;

          // Guard against the window exceeding the bounds of dy
          if (dyR < 0 || dyR >= `+s+`) {
            continue;
          }

          for (int dyCOffset = 0; dyCOffset < winWidth; dyCOffset++) {
            int dyC = dyCOffset + startDyC;

            // Guard against the window exceeding the bounds of dy
            if (dyC < 0 || dyC >= `+u+`) {
              continue;
            }

            float sourceFracRow =
              float(`+c[0]+`) *
                (float(dyR) / float(`+l[0]+`));

            float sourceFracCol =
                float(`+c[1]+`) *
                  (float(dyC) / float(`+l[1]+`));

            int sourceNearestRow = int(min(
                float(int(`+a+`) - 1),
                `+e+` ? float(round(sourceFracRow)) :
                                  float(floor(sourceFracRow))));

            int sourceNearestCol = int(min(
                float(int(`+o+`) - 1),
                `+e+` ? float(round(sourceFracCol)) :
                                  float(floor(sourceFracCol))));

            if (r == sourceNearestRow && c == sourceNearestCol) {
              accumulator += getDy(b, dyR, dyC, d);
            }
          }
        }
        // End loop over dy

        setOutput(accumulator);
      }
    `},ah=function(r,t,e,n){this.variableNames=["A"],this.outputShape=[];var a=r[0],o=r[1],i=r[2],s=r[3];this.outputShape=[a,t,e,s];var u=[n&&t>1?o-1:o,n&&e>1?i-1:i],c=[n&&t>1?t-1:t,n&&e>1?e-1:e],l=n?"0.5":"0.0";this.userCode=`
      const vec2 effectiveInputOverOutputRatioRC = vec2(
          `+u[0]/c[0]+`,
          `+u[1]/c[1]+`);
      const vec2 inputShapeRC = vec2(`+o+".0, "+i+`.0);

      void main() {
        ivec4 coords = getOutputCoords();
        int b = coords[0];
        int d = coords[3];
        ivec2 yRC = coords.yz;

        // Fractional source index.
        vec2 sourceFracIndexRC = vec2(yRC) * effectiveInputOverOutputRatioRC;

        // Compute the coordinators of nearest neighbor point.
        ivec2 sourceNearestRC = ivec2(
          min(inputShapeRC - 1.0, floor(sourceFracIndexRC + `+l+`)));

        float newValue = getA(b, sourceNearestRC.x, sourceNearestRC.y, d);

        setOutput(newValue);
      }
    `},oh=function(r,t){this.variableNames=["x"];var e=r.length;if(e>4)throw new Error("WebGL backend: Reverse of rank-"+e+" tensor is not yet supported");if(this.outputShape=r,e!==1){var n=r.map((function(o,i){return(function(s){return t.indexOf(s)!==-1&&r[s]!==1?r[s]+" - coords["+s+"] - 1":"coords["+s+"]"})(i)})).join(","),a=ve(e);this.userCode=`
      void main() {
        `+a+` coords = getOutputCoords();
        setOutput(getX(`+n+`));
      }
    `}else this.userCode=`
        void main() {
          int coord = getOutputCoords();
          setOutput(getX(`+r[0]+` - coord - 1));
        }
      `},ih=function(r,t){this.variableNames=["x"],this.packedInputs=!0,this.packedOutput=!0;var e=r.length;if(e>4)throw new Error("WebGL backend: Reverse of rank-"+e+" tensor is not yet supported");this.outputShape=r;var n=Ue("rc",e),a=n[e-1]+" + 1 < "+this.outputShape[e-1],o=n[e-2]+" + 1 < "+this.outputShape[e-2],i=ve(e);function s(u){var c=r.map((function(l,p){return(function(d,h){return t.indexOf(d)!==-1&&r[d]!==1?r[d]+" - "+h[d]+" - 1":""+h[d]})(p,u)}));return"getChannel(getX("+c.join(",")+"), vec2("+c.slice(-2).join(",")+"))"}this.userCode=e===1?`
        void main(){
          int rc = getOutputCoords();
          vec4 result = vec4(0.);
          result.r = getChannel(getX(`+r[0]+` - rc - 1),
            `+r[0]+` - rc - 1);
          if(`+a+`){
              result.g = getChannel(getX(`+r[0]+` - (rc  + 1) - 1),
                `+r[0]+` - (rc  + 1) - 1);
          }
          setOutput(result);
        }
      `:`
        void main() {
          `+i+` rc = getOutputCoords();
          vec4 result = vec4(0.);
          result.r = `+(function(u){return s(u)})(n.slice())+`;
          if(`+a+`){
            result.g = `+(function(u){return u[e-1]="("+u[e-1]+" + 1)",s(u)})(n.slice())+`;
          }
          if(`+o+`) {
            result.b = `+(function(u){return u[e-2]="("+u[e-2]+" + 1)",s(u)})(n.slice())+`;
            if(`+a+`) {
              result.a = `+(function(u){return u[e-1]="("+u[e-1]+" + 1)",u[e-2]="("+u[e-2]+" + 1)",s(u)})(n.slice())+`;
            }
          }
          setOutput(result);
        }
    `},Hs=function(r,t,e,n,a,o,i){i===void 0&&(i=!0),this.variableNames=["updates","indices","defaultValue"],this.outputShape=o;var s=ve(a.length),u=ve(o.length),c="";e===1?c="i":e===2&&(c="i, j");var l="getIndices("+c+")",p="";n===1?p="i":n===2&&(p="i, coords[1]");var d="getUpdates("+p+")",h=t>1?"strides[j]":"strides";this.userCode=`
        `+s+" strides = "+s+"("+a+`);

        void main() {
          `+u+` coords = getOutputCoords();
          float sum = 0.0;
          bool found = false;
          for (int i = 0; i < `+r+`; i++) {
            int flattenedIndex = 0;
            for (int j = 0; j < `+t+`; j++) {
              int index = round(`+l+`);
              flattenedIndex += index * `+h+`;
            }
            if (flattenedIndex == coords[0]) {
              sum += `+d+`;
              found = true;
            }
          }
          setOutput(mix(getDefaultValue(), sum, float(found)));
        }
      `},sh=function(r,t){this.variableNames=["x","segmentIds"];var e=r.windowSize,n=r.batchSize,a=r.inSize,o=r.numSegments,i=o*Math.ceil(a/e);this.outputShape=[n,i];var s=4*Math.floor(e/4),u=e%4,c=`
        sumValue += dot(values, segFilter);
    `,l="";a%e>0&&(l=`
        if (inIdx < 0 || inIdx >= `+a+`) {
          return initializationValue;
        }
      `);var p="";a%e>0&&(p=`
        if (inIdx < 0 || inIdx >= `+a+`) {
          return -1.0;
        }
      `),this.userCode=`
      const float initializationValue = 0.0;

      float getValue(int batch, int inIdx) {
        `+l+`
        return getX(batch, inIdx);
      }

      float getSegmentIdAtIndex(int inIdx) {
        `+p+`
        return getSegmentIds(inIdx);
      }

      void main() {
        ivec2 coords = getOutputCoords();
        int batch = coords[0];
        int outIdx = coords[1];
        int inOffset = int(floor(float(outIdx) / float(
          `+o+")) * float("+e+`));
        int currentSeg = int(mod(float(outIdx), float(`+o+`)));

        float sumValue = 0.0;

        for (int i = 0; i < `+s+`; i += 4) {
          int inIdx = inOffset + i;
          vec4 values = vec4(
            getValue(batch, inIdx),
            getValue(batch, inIdx + 1),
            getValue(batch, inIdx + 2),
            getValue(batch, inIdx + 3)
          );

          vec4 segFilter = vec4(
            int(getSegmentIdAtIndex(inIdx)) == currentSeg ? 1 : 0,
            int(getSegmentIdAtIndex(inIdx + 1)) == currentSeg ? 1 : 0,
            int(getSegmentIdAtIndex(inIdx + 2)) == currentSeg ? 1 : 0,
            int(getSegmentIdAtIndex(inIdx + 3)) == currentSeg ? 1 : 0
          );

          `+c+`
        }

        int inIdx = inOffset + `+s+`;
        if (`+(u===1)+`) {
          vec4 values = vec4(
            getValue(batch, inIdx),
            initializationValue,
            initializationValue,
            initializationValue
          );

          int inIdxSeg = int(getSegmentIdAtIndex(inIdx));

          vec4 segFilter = vec4(
            int(getSegmentIdAtIndex(inIdx)) == currentSeg ? 1 : 0,
            0,
            0,
            0
          );

          `+c+`
        } else if (`+(u===2)+`) {
          vec4 values = vec4(
            getValue(batch, inIdx),
            getValue(batch, inIdx + 1),
            initializationValue,
            initializationValue
          );

          vec4 segFilter = vec4(
            int(getSegmentIdAtIndex(inIdx)) == currentSeg ? 1 : 0,
            int(getSegmentIdAtIndex(inIdx + 1)) == currentSeg ? 1 : 0,
              0,
              0
          );

          `+c+`
        } else if (`+(u===3)+`) {
          vec4 values = vec4(
            getValue(batch, inIdx),
            getValue(batch, inIdx + 1),
            getValue(batch, inIdx + 2),
            initializationValue
          );

          vec4 segFilter = vec4(
            int(getSegmentIdAtIndex(inIdx)) == currentSeg ? 1 : 0,
            int(getSegmentIdAtIndex(inIdx + 1)) == currentSeg ? 1 : 0,
            int(getSegmentIdAtIndex(inIdx + 2)) == currentSeg ? 1 : 0,
            0
          );

          `+c+`
        }
        setOutput(sumValue);
      }
    `},uh=function(r,t,e){var n,a;if(this.variableNames=["c","a","b"],this.outputShape=t,e>4)throw Error("Where for rank "+e+" is not yet supported");if(e===1)a="resRC",n="resRC";else{for(var o=["resRC.x","resRC.y","resRC.z","resRC.w"],i=[],s=[],u=0;u<t.length;u++)s.push(""+o[u]),u<r&&i.push(""+o[u]);n=i.join(),a=s.join()}var c=ve(e);this.userCode=`
      void main() {
        `+c+` resRC = getOutputCoords();
        float cVal = getC(`+n+`);
        if (cVal >= 1.0) {
          setOutput(getA(`+a+`));
        } else {
          setOutput(getB(`+a+`));
        }
      }
    `},ch=(function(){function r(t){this.variableNames=["source"],this.outputShape=t,this.rank=t.length;var e,n=ve(this.rank),a="uniform int start["+this.rank+"];",o=(function(i){if(i===1)return"sourceLoc";if(i<=6)return Ha.slice(0,i).map((function(s){return"sourceLoc."+s})).join(",");throw Error("Slicing for rank "+i+" is not yet supported")})(this.rank);e=`
        `+n+` sourceLoc;
        `+n+` coords = getOutputCoords();
        `+t.map((function(i,s){return"sourceLoc."+Ha[s]+" = start["+s+"] + coords."+Ha[s]+";"})).join(`
`)+`
      `,this.userCode=`
      `+a+`
      void main() {
        `+e+`
        setOutput(getSource(`+o+`));
      }
    `}return r.prototype.getCustomSetupFunc=function(t){var e=this;if(t.length!==this.rank)throw Error("The rank ("+this.rank+") of the program must match the length of start ("+t.length+")");return function(n,a){e.startLoc==null&&(e.startLoc=n.getUniformLocationNoThrow(a,"start"),e.startLoc==null)||n.gl.uniform1iv(e.startLoc,t)}},r})(),Ha=["x","y","z","w","u","v"],lh=(function(){function r(t){this.variableNames=["source"],this.packedInputs=!0,this.packedOutput=!0,this.outputShape=t,this.rank=t.length;var e=ve(this.rank),n=Ue("coords",this.rank),a=Ue("sourceLoc",this.rank),o=this.rank===1?"sourceLoc":"vec2("+a.slice(-2).join()+")",i="getChannel(getSource("+a.join()+"), "+o+")",s=`
      result.x = `+i+`;
      if (++`+n[this.rank-1]+" < "+t[this.rank-1]+`) {
        ++`+a[this.rank-1]+`;
        result.y = `+i+`;
        --`+a[this.rank-1]+`;
      }
    `,u=this.rank===1?"":`
      --`+n[this.rank-1]+`;
      if (++`+n[this.rank-2]+" < "+t[this.rank-2]+`) {
        ++`+a[this.rank-2]+`;
        result.z = `+i+`;
        if (++`+n[this.rank-1]+" < "+t[this.rank-1]+`) {
          ++`+a[this.rank-1]+`;
          result.w = `+i+`;
        }
      }
    `,c=this.rank<=4?`sourceLoc = coords +
            `+e+"("+t.map((function(l,p){return"start["+p+"]"})).join()+");":t.map((function(l,p){return a[p]+" = "+n[p]+" + start["+p+"];"})).join(`
`);this.userCode=`
      uniform int start[`+this.rank+`];
      void main() {
        `+e+` coords = getOutputCoords();
        `+e+` sourceLoc;
        `+c+`
        vec4 result = vec4(0.);
        `+s+`
        `+u+`
        setOutput(result);
      }
    `}return r.prototype.getCustomSetupFunc=function(t){var e=this;if(t.length!==this.rank)throw Error("The rank ("+this.rank+") of the program must match the length of start ("+t.length+")");return function(n,a){e.startLoc==null&&(e.startLoc=n.getUniformLocationNoThrow(a,"start"),e.startLoc==null)||n.gl.uniform1iv(e.startLoc,t)}},r})(),ph=function(r,t,e){this.variableNames=["x"],this.outputShape=e;var n=e.length,a=ve(e.length),o=ve(e.length),i="";if(n===1)i="coords * strides + begin";else{var s=0;i=e.map((function(u,c){return s++,e.length===1?"coords * strides["+c+"] + begin["+c+"]":"coords["+(s-1)+"] * strides["+c+"] + begin["+c+"]"})).join(",")}this.userCode=`
      `+a+" begin = "+a+"("+r+`);
      `+a+" strides = "+a+"("+t+`);

      void main() {
        `+o+` coords = getOutputCoords();
        setOutput(getX(`+i+`));
      }
    `},dh=(function(){function r(t){this.gpgpu=t,this.numUsedTextures=0,this.numFreeTextures=0,this.freeTextures={},this.logEnabled=!1,this.usedTextures={}}return r.prototype.acquireTexture=function(t,e,n){var a,o=qs(e,n),i=js(t,o,n);if(i in this.freeTextures||(this.freeTextures[i]=[]),i in this.usedTextures||(this.usedTextures[i]=[]),this.freeTextures[i].length>0){this.numFreeTextures--,this.numUsedTextures++,this.log();var s=this.freeTextures[i].shift();return this.usedTextures[i].push(s),s}return this.numUsedTextures++,this.log(),o===je.PACKED_2X2_FLOAT32?a=this.gpgpu.createPackedMatrixTexture(t[0],t[1]):o===je.PACKED_2X2_FLOAT16?a=this.gpgpu.createFloat16PackedMatrixTexture(t[0],t[1]):o===je.UNPACKED_FLOAT32?a=this.gpgpu.createFloat32MatrixTexture(t[0],t[1]):o===je.UNPACKED_FLOAT16?a=this.gpgpu.createFloat16MatrixTexture(t[0],t[1]):o===je.PACKED_4X1_UNSIGNED_BYTE&&(a=this.gpgpu.createUnsignedBytesMatrixTexture(t[0],t[1])),this.usedTextures[i].push(a),a},r.prototype.releaseTexture=function(t,e,n,a){if(this.freeTextures!=null){var o=js(e,qs(n,a),a);o in this.freeTextures||(this.freeTextures[o]=[]),this.freeTextures[o].push(t),this.numFreeTextures++,this.numUsedTextures--;var i=this.usedTextures[o],s=i.indexOf(t);if(s<0)throw new Error("Cannot release a texture that was never provided by this texture manager");i.splice(s,1),this.log()}},r.prototype.log=function(){if(this.logEnabled){var t=this.numFreeTextures+this.numUsedTextures;console.log("Free/Used",this.numFreeTextures+" / "+this.numUsedTextures,"("+t+")")}},r.prototype.getNumUsedTextures=function(){return this.numUsedTextures},r.prototype.getNumFreeTextures=function(){return this.numFreeTextures},r.prototype.dispose=function(){var t=this;if(this.freeTextures!=null){for(var e in this.freeTextures)this.freeTextures[e].forEach((function(n){t.gpgpu.deleteMatrixTexture(n)}));for(var e in this.usedTextures)this.usedTextures[e].forEach((function(a){t.gpgpu.deleteMatrixTexture(a)}));this.freeTextures=null,this.usedTextures=null,this.numUsedTextures=0,this.numFreeTextures=0}},r})();function qs(r,t){if(r===Xe.UPLOAD)return je.PACKED_2X2_FLOAT32;if(r===Xe.RENDER||r==null)return(function(e){return B().getBool("WEBGL_RENDER_FLOAT32_ENABLED")?e?je.PACKED_2X2_FLOAT32:je.UNPACKED_FLOAT32:e?je.PACKED_2X2_FLOAT16:je.UNPACKED_FLOAT16})(t);if(r===Xe.DOWNLOAD||r===Xe.PIXELS)return je.PACKED_4X1_UNSIGNED_BYTE;throw new Error("Unknown logical texture type "+r)}function js(r,t,e){return r[0]+"_"+r[1]+"_"+t+"_"+e}var hh=function(r,t){this.variableNames=["A"];for(var e=new Array(r.length),n=0;n<e.length;n++)e[n]=r[n]*t[n];this.outputShape=e,this.rank=e.length;var a=ve(this.rank),o=(function(i){var s=i.length;if(s>5)throw Error("Tile for rank "+s+" is not yet supported");if(s===1)return"imod(resRC, "+i[0]+")";for(var u=["resRC.x","resRC.y","resRC.z","resRC.w","resRC.u"],c=[],l=0;l<i.length;l++)c.push("imod("+u[l]+", "+i[l]+")");return c.join()})(r);this.userCode=`
      void main() {
        `+a+` resRC = getOutputCoords();
        setOutput(getA(`+o+`));
      }
    `},Ni=1.7580993408473768,Ei=1.0507009873554805,ne=function(r,t){this.variableNames=["A"],this.outputShape=r,this.userCode=`
      float unaryOperation(float x) {
        `+t+`
      }

      void main() {
        float x = getAAtOutCoords();
        float y = unaryOperation(x);

        setOutput(y);
      }
    `},st="if (isnan(x)) return x;",fh="return x;",Ks="return abs(x);",Kc=st+`
  return (x < 0.0) ? 0.0 : x;
`,Xc=st+`
  return (x < 0.0) ? 0.0 : min(6.0, x);
`,$c="return (x >= 0.0) ? x : (exp(x) - 1.0);",mh=`
  // Stable and Attracting Fixed Point (0, 1) for Normalized Weights.
  // see: https://arxiv.org/abs/1706.02515
  float scaleAlpha = `+Ni+`;
  float scale = `+Ei+`;
  return (x >= 0.0) ? scale * x : scaleAlpha * (exp(x) - 1.0);
`,Xs="return -x;",$s="return ceil(x);",Ys="return floor(x);",Qs="return exp(x);",Js="return exp(x) - 1.0;",vh=st+`
  return sin(x);
`,gh=st+`
  return cos(x);
`,yh=st+`
  if (abs(x) > 1.) {
    return NAN;
  }
  return asin(x);
`,xh=st+`
  if (abs(x) > 1.) {
    return NAN;
  }
  return acos(x);
`,bh=st+`
  return atan(x);
`,wh=st+"return log(x + sqrt(x * x + 1.0));",Ch=st+`
  if (x < 1.0) return NAN;
  return log(x + sqrt(x * x - 1.0));`,Nh=st+`
  if ((x < -1.0) || (x > 1.0)) return NAN;
  return (log(1.0 + x) - log(1.0 - x)) / 2.0;`,xr="return x;",Eh="return x;",Yc=`
  vec4 result = x * vec4(greaterThanEqual(x, vec4(0.0)));
  bvec4 isNaN = isnan(x);

  result.r = isNaN.r ? x.r : result.r;
  result.g = isNaN.g ? x.g : result.g;
  result.b = isNaN.b ? x.b : result.b;
  result.a = isNaN.a ? x.a : result.a;

  return result;
`,Qc=`
  vec4 result = min(x, vec4(6.)) * vec4(greaterThanEqual(x, vec4(0.0)));
  bvec4 isNaN = isnan(x);

  result.r = isNaN.r ? x.r : result.r;
  result.g = isNaN.g ? x.g : result.g;
  result.b = isNaN.b ? x.b : result.b;
  result.a = isNaN.a ? x.a : result.a;

  return result;
`,Jc=`
  vec4 result;

  result.r = (x.r >= 0.0) ? x.r : (exp(x.r) - 1.0);
  result.g = (x.g >= 0.0) ? x.g : (exp(x.g) - 1.0);
  result.b = (x.b >= 0.0) ? x.b : (exp(x.b) - 1.0);
  result.a = (x.a >= 0.0) ? x.a : (exp(x.a) - 1.0);

  return result;
`,Wn=function(r,t){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!0,this.outputShape=r,this.userCode=`
      vec4 unaryOperation(vec4 x) {
        `+t+`
      }

      void main() {
        vec4 x = getAAtOutCoords();
        vec4 y = unaryOperation(x);

        setOutput(y);
      }
    `},Sh=function(r){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!1,this.outputShape=r;var t=r.length,e=Ue("rc",t),n=ve(t),a=(function(s,u){if(s===1)return"rc";for(var c="",l=0;l<s;l++)c+=u[l],l<s-1&&(c+=",");return c})(t,e),o=e.slice(-2),i=t<=1?"rc":"vec2("+o.join(",")+")";this.userCode=`
      void main() {
        `+n+` rc = getOutputCoords();
        vec4 packedInput = getA(`+a+`);

        setOutput(getChannel(packedInput, `+i+`));
      }
    `},br={};function wr(r,t){if(t===void 0&&(t=!1),r==="linear")return t?Eh:fh;if(r==="relu")return t?Yc:Kc;if(r==="elu")return t?Jc:$c;if(r==="relu6")return t?Qc:Xc;if(r==="prelu")return t?Tc:Rc;throw new Error("Activation "+r+" has not been implemented for the WebGL backend.")}var Ih=600,Zc=(function(r){function t(e){var n,a=r.call(this)||this;if(a.pendingRead=new WeakMap,a.pendingDisposal=new WeakSet,a.dataRefCount=new WeakMap,a.numBytesInGPU=0,a.uploadWaitMs=0,a.downloadWaitMs=0,a.warnedAboutMemory=!1,a.pendingDeletes=0,a.disposed=!1,!B().getBool("HAS_WEBGL"))throw new Error("WebGL is not supported on this device");if(e==null){var o=Ct(B().getNumber("WEBGL_VERSION"));a.binaryCache=((n=B().getNumber("WEBGL_VERSION"))in br||(br[n]={}),br[n]),a.gpgpu=new jc(o),a.canvas=o.canvas,a.gpgpuCreatedLocally=!0}else a.gpgpu=e,a.binaryCache={},a.gpgpuCreatedLocally=!1,a.canvas=e.gl.canvas;return a.textureManager=new dh(a.gpgpu),a.numMBBeforeWarning=B().global.screen==null?1024:B().global.screen.height*B().global.screen.width*window.devicePixelRatio*Ih/1024/1024,a.texData=new xc(a,D),a}return at(t,r),t.prototype.numDataIds=function(){return this.texData.numDataIds()+(this.cpuBackend?this.cpuBackend.numDataIds():0)-this.pendingDeletes},t.prototype.write=function(e,n,a){if(B().getBool("DEBUG")&&this.checkNumericalProblems(e),a==="complex64"&&e!=null)throw new Error("Cannot write to a complex64 dtype. Please use tf.complex(real, imag).");var o={};return this.texData.set(o,{shape:n,dtype:a,values:e,usage:Xe.UPLOAD}),o},t.prototype.move=function(e,n,a,o){if(B().getBool("DEBUG")&&this.checkNumericalProblems(n),o==="complex64")throw new Error("Cannot write to a complex64 dtype. Please use tf.complex(real, imag).");this.texData.set(e,{shape:a,dtype:o,values:n,usage:Xe.UPLOAD})},t.prototype.readSync=function(e){var n=this.texData.get(e),a=n.values,o=n.dtype,i=n.complexTensors,s=n.slice,u=n.shape,c=n.isPacked;if(s!=null){var l=void 0;l=c?new Wn(u,xr):new ne(u,xr);var p=this.runWebGLProgram(l,[{dataId:e,shape:u,dtype:o}],o),d=this.readSync(p.dataId);return this.disposeData(p.dataId),d}if(a!=null)return this.convertAndCacheOnCPU(e);if(o==="string")return a;var h,f,m=this.activeTimers!=null;return m&&(h=et()),o==="complex64"?f=vo(i.real.dataSync(),i.imag.dataSync()):f=this.getValuesFromTexture(e),m&&(this.downloadWaitMs+=et()-h),this.convertAndCacheOnCPU(e,f)},t.prototype.read=function(e){return Y(this,void 0,void 0,(function(){var n,a,o,i,s,u,c,l,p,d,h,f,m,v,g,y,x,b,C,E,R,I;return Q(this,(function(k){switch(k.label){case 0:if(this.pendingRead.has(e))return n=this.pendingRead.get(e),[2,new Promise((function(T){return n.push(T)}))];if(a=this.texData.get(e),o=a.values,i=a.shape,s=a.slice,u=a.dtype,c=a.complexTensors,l=a.isPacked,s!=null)return p=void 0,p=l?new Wn(i,xr):new ne(i,xr),d=this.runWebGLProgram(p,[{dataId:e,shape:i,dtype:u}],u),h=this.read(d.dataId),this.disposeData(d.dataId),[2,h];if(o!=null)return[2,this.convertAndCacheOnCPU(e)];if(!B().getBool("WEBGL_DOWNLOAD_FLOAT_ENABLED")&&B().getNumber("WEBGL_VERSION")===2)throw new Error("tensor.data() with WEBGL_DOWNLOAD_FLOAT_ENABLED=false and WEBGL_VERSION=2 not yet supported.");return f=null,u!=="complex64"&&B().get("WEBGL_BUFFER_SUPPORTED")&&(m=this.decode(e),v=this.texData.get(m.dataId),f=(I=this.gpgpu).createBufferFromTexture.apply(I,[v.texture].concat(Hn(i)))),this.pendingRead.set(e,[]),u==="complex64"?[3,2]:[4,this.gpgpu.createAndWaitForFence()];case 1:k.sent(),k.label=2;case 2:return u!=="complex64"?[3,4]:[4,Promise.all([c.real.data(),c.imag.data()])];case 3:return y=k.sent(),x=y[0],b=y[1],g=vo(x,b),[3,5];case 4:f==null?g=this.getValuesFromTexture(e):(C=$(i),g=this.gpgpu.downloadFloat32MatrixFromBuffer(f,C)),k.label=5;case 5:return m!=null&&this.disposeData(m.dataId),E=this.convertAndCacheOnCPU(e,g),R=this.pendingRead.get(e),this.pendingRead.delete(e),R.forEach((function(T){return T(E)})),this.pendingDisposal.has(e)&&(this.pendingDisposal.delete(e),this.disposeData(e),this.pendingDeletes--),[2,E]}}))}))},t.prototype.checkNumericalProblems=function(e){if(e!=null)for(var n=0;n<e.length;n++){var a=e[n];if(!Du(a))throw B().getBool("WEBGL_RENDER_FLOAT32_CAPABLE")?Error("The value "+a+" cannot be represented with your current settings. Consider enabling float32 rendering: 'tf.env().set('WEBGL_RENDER_FLOAT32_ENABLED', true);'"):Error("The value "+a+" cannot be represented on this device.")}},t.prototype.getValuesFromTexture=function(e){var n,a=this.texData.get(e),o=a.shape,i=a.dtype,s=a.isPacked,u=$(o);if(B().getBool("WEBGL_DOWNLOAD_FLOAT_ENABLED")){var c=this.decode(e),l=this.texData.get(c.dataId),p=(n=this.gpgpu).downloadMatrixFromPackedTexture.apply(n,[l.texture].concat(Hn(o))).subarray(0,u);return this.disposeData(c.dataId),p}var d=B().getBool("WEBGL_PACK")&&s===!0,h=d?Ar(o):o,f=d?new Od(h):new Dd(h),m=this.runWebGLProgram(f,[{shape:h,dtype:i,dataId:e}],"float32"),v=this.texData.get(m.dataId),g=this.gpgpu.downloadByteEncodedFloatMatrixFromOutputTexture(v.texture,v.texShape[0],v.texShape[1]).subarray(0,u);return this.disposeData(m.dataId),g},t.prototype.time=function(e){return Y(this,void 0,void 0,(function(){var n,a,o,i,s,u,c;return Q(this,(function(l){switch(l.label){case 0:return n=this.activeTimers,a=[],o=!1,this.programTimersStack==null?(this.programTimersStack=a,o=!0):this.activeTimers.push(a),this.activeTimers=a,e(),i=Tt(this.activeTimers.map((function(p){return p.query}))).filter((function(p){return p!=null})),s=Tt(this.activeTimers.map((function(p){return p.name}))).filter((function(p){return p!=null})),this.activeTimers=n,o&&(this.programTimersStack=null),u={uploadWaitMs:this.uploadWaitMs,downloadWaitMs:this.downloadWaitMs,kernelMs:null,wallMs:null},B().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_RELIABLE")>0?[4,Promise.all(i)]:[3,2];case 1:return c=l.sent(),u.kernelMs=vu(c),u.getExtraProfileInfo=function(){return c.map((function(p,d){return{name:s[d],ms:p}})).map((function(p){return p.name+": "+p.ms})).join(", ")},[3,3];case 2:u.kernelMs={error:"WebGL query timers are not supported in this environment."},l.label=3;case 3:return this.uploadWaitMs=0,this.downloadWaitMs=0,[2,u]}}))}))},t.prototype.memory=function(){return{unreliable:!1,numBytesInGPU:this.numBytesInGPU}},t.prototype.startTimer=function(){return B().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_RELIABLE")>0?this.gpgpu.beginQuery():{startMs:et(),endMs:null}},t.prototype.endTimer=function(e){return B().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_RELIABLE")>0?(this.gpgpu.endQuery(),e):(e.endMs=et(),e)},t.prototype.getQueryTime=function(e){return Y(this,void 0,void 0,(function(){var n;return Q(this,(function(a){return B().getNumber("WEBGL_DISJOINT_QUERY_TIMER_EXTENSION_RELIABLE")>0?[2,this.gpgpu.waitForQueryAndGetTime(e)]:[2,(n=e).endMs-n.startMs]}))}))},t.prototype.disposeData=function(e){if(!this.pendingDisposal.has(e)){if(this.pendingRead.has(e))return this.pendingDisposal.add(e),void this.pendingDeletes++;if(this.texData.has(e)){this.releaseGPUData(e);var n=this.texData.get(e).complexTensors;n!=null&&(n.real.dispose(),n.imag.dispose()),this.texData.delete(e)}}},t.prototype.releaseGPUData=function(e){var n=this.texData.get(e),a=n.texture,o=n.dtype,i=n.texShape,s=n.usage,u=n.isPacked,c=n.slice,l=c&&c.origDataId||e,p=this.dataRefCount.get(l);p>1?this.dataRefCount.set(l,p-1):(this.dataRefCount.delete(l),a!=null&&(this.numBytesInGPU-=this.computeBytes(i,o),this.textureManager.releaseTexture(a,i,s,u)));var d=this.texData.get(e);d.texture=null,d.texShape=null,d.isPacked=!1,d.slice=null},t.prototype.getTexture=function(e){return this.uploadToGPU(e),this.texData.get(e).texture},t.prototype.getDataInfo=function(e){return this.texData.get(e)},t.prototype.getCPUBackend=function(){return B().getBool("WEBGL_CPU_FORWARD")?(this.cpuBackend==null&&(this.cpuBackend=D.findBackend("cpu")),this.cpuBackend):null},t.prototype.shouldExecuteOnCPU=function(e,n){var a=this;return n===void 0&&(n=128),this.getCPUBackend()!=null&&e.every((function(o){return a.texData.get(o.dataId).texture==null&&$(o.shape)<n}))},t.prototype.getGPGPUContext=function(){return this.gpgpu},t.prototype.complex=function(e,n){var a=this.makeOutput(e.shape,"complex64");return this.texData.get(a.dataId).complexTensors={real:D.keep(e.clone()),imag:D.keep(n.clone())},a},t.prototype.real=function(e){return this.texData.get(e.dataId).complexTensors.real.clone()},t.prototype.imag=function(e){return this.texData.get(e.dataId).complexTensors.imag.clone()},t.prototype.slice=function(e,n,a){if(this.shouldExecuteOnCPU([e]))return this.cpuBackend.slice(e,n,a);if($(a)===0)return De([],a,e.dtype);var o=this.texData.get(e.dataId).isPacked,i=hi(e.shape,n,a);if(o||!i){var s=B().getBool("WEBGL_PACK_ARRAY_OPERATIONS")?new lh(a):new ch(a),u=s.getCustomSetupFunc(n);return this.compileAndRun(s,[e],null,u)}return this.uploadToGPU(e.dataId),this.shallowSlice(e,n,a)},t.prototype.shallowSlice=function(e,n,a){var o=this.texData.get(e.dataId),i=this.makeOutput(a,e.dtype),s=this.texData.get(i.dataId);Object.assign(s,o),s.shape=a,s.dtype=e.dtype;var u=fi(n,e.strides);o.slice&&(u+=o.slice.flatOffset),s.slice={flatOffset:u,origDataId:o.slice&&o.slice.origDataId||e.dataId};var c=this.dataRefCount.get(s.slice.origDataId)||1;return this.dataRefCount.set(s.slice.origDataId,c+1),i},t.prototype.stridedSlice=function(e,n,a,o){if(this.shouldExecuteOnCPU([e]))return this.cpuBackend.stridedSlice(e,n,a,o);var i=oa(n,a,o);if(i.some((function(u){return u===0})))return De([],i);var s=new ph(n,o,i);return this.compileAndRun(s,[e])},t.prototype.reverse=function(e,n){var a=B().getBool("WEBGL_PACK_ARRAY_OPERATIONS")?new ih(e.shape,n):new oh(e.shape,n);return this.compileAndRun(a,[e])},t.prototype.concat=function(e,n){if(e[0].dtype==="complex64"){var a=e.map((function(h){return ze(h)})),o=e.map((function(h){return Ze(h)}));return Ae(this.concat(a,n),this.concat(o,n))}if(this.shouldExecuteOnCPU(e))return this.cpuBackend.concat(e,n);if(e.length===1)return e[0];if(e.length>B().getNumber("WEBGL_MAX_TEXTURES_IN_SHADER")){var i=Math.floor(e.length/2),s=this.concat(e.slice(0,i),n),u=this.concat(e.slice(i),n);return this.concat([s,u],n)}if(B().getBool("WEBGL_PACK_ARRAY_OPERATIONS")&&e[0].rank>1){var c=new gd(e.map((function(h){return h.shape})),n);return this.compileAndRun(c,e)}var l=rn(e.map((function(h){return h.shape})),n),p=e.map((function(h){return h.as2D(-1,$(h.shape.slice(n)))})),d=new vd(p.map((function(h){return h.shape})));return this.compileAndRun(d,p).reshape(l)},t.prototype.neg=function(e){if(this.shouldExecuteOnCPU([e]))return this.cpuBackend.neg(e);if(B().getBool("WEBGL_PACK_UNARY_OPERATIONS"))return this.packedUnaryOp(e,Xs,e.dtype);var n=new ne(e.shape,Xs);return this.compileAndRun(n,[e])},t.prototype.batchMatMul=function(e,n,a,o){var i=a?e.shape[2]:e.shape[1],s=o?n.shape[1]:n.shape[2],u=a?e.shape[1]:e.shape[2],c=e.shape[0];if((i===1||s===1)&&u>1e3){a&&(e=Ke(e,[0,2,1])),o&&(n=Ke(n,[0,2,1]));var l=s===1?e:e.as3D(c,u,1),p=s===1?2:1,d=s===1?n.as3D(c,1,u):n;return this.multiply(l,d).sum(p,!0)}var h=Oe(e.dtype,n.dtype),f=new Ua(e.shape,[c,i,s],a,o);return this.compileAndRun(f,[e,n],h)},t.prototype.fusedBatchMatMul=function(e){var n=e.a,a=e.b,o=e.transposeA,i=e.transposeB,s=e.bias,u=e.activation,c=e.preluActivationWeights,l=o?n.shape[2]:n.shape[1],p=i?a.shape[1]:a.shape[2],d=n.shape[0],h=Oe(n.dtype,a.dtype),f=s!=null,m=c!=null,v=u?wr(u,!0):null,g=new Ua(n.shape,[d,l,p],o,i,f,v,m),y=[n,a];return s&&y.push(s),c&&y.push(c),this.compileAndRun(g,y,h)},t.prototype.multiply=function(e,n){if(e.dtype==="complex64"){var a=this.texData.get(e.dataId),o=this.texData.get(n.dataId),i=new Bs(cd,e.shape,n.shape),s=new Bs(ld,e.shape,n.shape),u=[this.makeComplexComponentTensorInfo(e,a.complexTensors.real),this.makeComplexComponentTensorInfo(e,a.complexTensors.imag),this.makeComplexComponentTensorInfo(n,o.complexTensors.real),this.makeComplexComponentTensorInfo(n,o.complexTensors.imag)],c=this.compileAndRun(i,u),l=this.compileAndRun(s,u),p=this.complex(c,l);return c.dispose(),l.dispose(),p}if(this.shouldExecuteOnCPU([e,n]))return this.cpuBackend.multiply(e,n);if(B().getBool("WEBGL_PACK_BINARY_OPERATIONS"))return this.packedBinaryOp(e,n,Ps,e.dtype);var d=new Ee(Ps,e.shape,n.shape);return this.compileAndRun(d,[e,n],e.dtype)},t.prototype.batchNormalization=function(e,n,a,o,i,s){var u=[e,n,a],c=null;s!=null&&(c=s.shape,u.push(s));var l=null;if(i!=null&&(l=i.shape,u.push(i)),B().getBool("WEBGL_PACK_NORMALIZATION")){var p=new ud(e.shape,n.shape,a.shape,c,l,o);return this.compileAndRun(p,u)}var d=new sd(e.shape,n.shape,a.shape,c,l,o);return this.compileAndRun(d,u)},t.prototype.localResponseNormalization4D=function(e,n,a,o,i){var s=B().getBool("WEBGL_PACK_NORMALIZATION")?new Hd(e.shape,n,a,o,i):new Ud(e.shape,n,a,o,i);return this.compileAndRun(s,[e])},t.prototype.LRNGrad=function(e,n,a,o,i,s,u){var c=new Gd(n.shape,o,i,s,u);return this.compileAndRun(c,[n,a,e])},t.prototype.tile=function(e,n){if(e.dtype==="string"){var a=this.readSync(e.dataId).map((function(i){return Xn(i)}));return Nc(te(e.shape,e.dtype,a),n)}var o=new hh(e.shape,n);return this.compileAndRun(o,[e])},t.prototype.pad=function(e,n,a){var o=B().getBool("WEBGL_PACK_ARRAY_OPERATIONS")?new Qd(e.shape,n,a):new Yd(e.shape,n,a);return this.compileAndRun(o,[e])},t.prototype.gather=function(e,n,a){if(this.shouldExecuteOnCPU([e,n]))return this.cpuBackend.gather(e,n,a);var o=new Ld(e.shape,n.size,a);return this.compileAndRun(o,[e,n])},t.prototype.batchToSpaceND=function(e,n,a){S(e.rank<=4,(function(){return"batchToSpaceND for rank > 4 with a WebGL backend not implemented yet"}));var o=n.reduce((function(p,d){return p*d})),i=Ur(e.shape,n,o),s=Gr(i.length,n.length),u=Hr(e.shape,n,o),c=ic(a,n.length),l=sc(u,a,n.length);return Ke(e.reshape(i),s).reshape(u).slice(c,l)},t.prototype.spaceToBatchND=function(e,n,a){S(e.rank<=4,(function(){return"spaceToBatchND for rank > 4 with a WebGL backend not implemented yet"}));var o=n.reduce((function(d,h){return d*h})),i=[[0,0]];i.push.apply(i,a);for(var s=1+n.length;s<e.shape.length;++s)i.push([0,0]);var u=e.pad(i),c=Ur(u.shape,n,o,!1),l=Gr(c.length,n.length,!1),p=Hr(u.shape,n,o,!1);return Ke(u.reshape(c),l).reshape(p)},t.prototype.reduce=function(e,n,a){var o=e.shape[0],i=e.shape[1],s=Dr(i),u=new Jd({windowSize:s,inSize:i,batchSize:o},n),c=this.compileAndRun(u,[e],a);return c.shape[1]===1?c:this.reduce(c,n,a)},t.prototype.argReduce=function(e,n,a){a===void 0&&(a=null);var o=e.shape[0],i=e.shape[1];a!=null&&(o=a.shape[0],i=a.shape[1]);var s=Dr(i),u=new Jp({windowSize:s,inSize:i,batchSize:o},n,a==null),c=[e];a!=null&&c.push(a);var l=this.compileAndRun(u,c,"int32");return l.shape[1]===1?l:this.argReduce(e,n,l)},t.prototype.argReducePacked=function(e,n,a){a===void 0&&(a=null);var o=a!=null?a.shape:e.shape,i=Dr(o[o.length-1]),s=new ad(o,i,n,a==null),u=a==null?[e]:[e,a],c=this.compileAndRun(s,u,"int32");return c.rank===e.rank?this.argReducePacked(e,n,c):c},t.prototype.sum=function(e,n){We("sum",n,e.rank);var a=_e(e.shape,n),o=a[0],i=$(a[1]),s=e.as2D(-1,i),u=Pa(e.dtype);return this.reduce(s,"sum",u).reshape(o)},t.prototype.prod=function(e,n){if(this.shouldExecuteOnCPU([e]))return this.cpuBackend.prod(e,n);var a=_e(e.shape,n),o=a[0],i=$(a[1]),s=e.as2D(-1,i),u=Pa(e.dtype);return this.reduce(s,"prod",u).reshape(o)},t.prototype.unsortedSegmentSum=function(e,n,a){var o=0,i=ot([o],e.rank),s=e;i!=null&&(s=Ke(e,i),o=it(1,e.rank)[0]);var u=(function(h,f,m){for(var v=[],g=h.length,y=0;y<g;y++)y!==f?v.push(h[y]):v.push(m);return v})(s.shape,o,a),c=$([s.shape[o]]),l=s.as2D(-1,c),p=Pa(e.dtype),d=this.segOpCompute(l,"unsortedSegmentSum",n,p,a).reshape(u);return i!=null&&(d=Ke(d,$r(i))),d},t.prototype.segOpCompute=function(e,n,a,o,i){var s=e.shape[0],u=e.shape[1],c=(function(d,h){var f,m=!1;for(d<=di?(f=d,m=!0):f=Pr(d,Math.floor(Math.sqrt(d)));!m;)f>h||f===d?m=!0:f=Pr(d,f+1);return f})(u,i),l=new sh({windowSize:c,inSize:u,batchSize:s,numSegments:i},n),p=this.compileAndRun(l,[e,a],o);return p.shape[1]===i?p:(a=kn(0,i).tile([u/c]),this.segOpCompute(p,n,a,o,i))},t.prototype.argMinMaxReduce=function(e,n,a){var o=[n];if(We("arg"+a.charAt(0).toUpperCase()+a.slice(1),o,e.rank),!B().getBool("WEBGL_PACK_REDUCE")||e.rank<=2){var i=_e(e.shape,o),s=i[0],u=$(i[1]),c=e.as2D(-1,u);return this.argReduce(c,a).reshape(s)}return this.argReducePacked(e,a)},t.prototype.argMin=function(e,n){return this.argMinMaxReduce(e,n,"min")},t.prototype.argMax=function(e,n){return this.argMinMaxReduce(e,n,"max")},t.prototype.cumsum=function(e,n,a,o){if(n!==e.rank-1)throw new Error("WebGL cumsum shader expects an inner-most axis="+(e.rank-1)+" but got axis="+n);var i=new Id(e.shape,a,o);return this.compileAndRun(i,[e])},t.prototype.equal=function(e,n){if(B().getBool("WEBGL_PACK_BINARY_OPERATIONS"))return this.packedBinaryOp(e,n,`
  return vec4(equal(a, b));
`,"bool");var a=new Ee("return float(a == b);",e.shape,n.shape);return this.compileAndRun(a,[e,n],"bool")},t.prototype.notEqual=function(e,n){if(B().getBool("WEBGL_PACK_BINARY_OPERATIONS"))return this.packedBinaryOp(e,n,`
  return vec4(notEqual(a, b));
`,"bool");var a=new Ee("return float(a != b);",e.shape,n.shape);return this.compileAndRun(a,[e,n],"bool")},t.prototype.less=function(e,n){if(this.shouldExecuteOnCPU([e,n]))return this.cpuBackend.less(e,n);if(B().getBool("WEBGL_PACK_BINARY_OPERATIONS"))return this.packedBinaryOp(e,n,`
  return vec4(lessThan(a, b));
`,"bool");var a=new Ee("return float(a < b);",e.shape,n.shape);return this.compileAndRun(a,[e,n],"bool")},t.prototype.lessEqual=function(e,n){if(B().getBool("WEBGL_PACK_BINARY_OPERATIONS"))return this.packedBinaryOp(e,n,`
  return vec4(lessThanEqual(a, b));
`,"bool");var a=new Ee("return float(a <= b);",e.shape,n.shape);return this.compileAndRun(a,[e,n],"bool")},t.prototype.greater=function(e,n){if(this.shouldExecuteOnCPU([e,n]))return this.cpuBackend.greater(e,n);if(B().getBool("WEBGL_PACK_BINARY_OPERATIONS"))return this.packedBinaryOp(e,n,`
  return vec4(greaterThan(a, b));
`,"bool");var a=new Ee("return float(a > b);",e.shape,n.shape);return this.compileAndRun(a,[e,n],"bool")},t.prototype.greaterEqual=function(e,n){if(B().getBool("WEBGL_PACK_BINARY_OPERATIONS"))return this.packedBinaryOp(e,n,`
  return vec4(greaterThanEqual(a, b));
`,"bool");var a=new Ee("return float(a >= b);",e.shape,n.shape);return this.compileAndRun(a,[e,n],"bool")},t.prototype.logicalNot=function(e){var n=new ne(e.shape,"return float(!(x >= 1.0));");return this.compileAndRun(n,[e])},t.prototype.logicalAnd=function(e,n){if(B().getBool("WEBGL_PACK_BINARY_OPERATIONS"))return this.packedBinaryOp(e,n,`
  return vec4(
    vec4(greaterThanEqual(a, vec4(1.0))) *
    vec4(greaterThanEqual(b, vec4(1.0))));
`,"bool");var a=new Ee("return float(a >= 1.0 && b >= 1.0);",e.shape,n.shape);return this.compileAndRun(a,[e,n],"bool")},t.prototype.logicalOr=function(e,n){if(B().getBool("WEBGL_PACK_BINARY_OPERATIONS"))return this.packedBinaryOp(e,n,`
  return min(
    vec4(greaterThanEqual(a, vec4(1.0))) +
    vec4(greaterThanEqual(b, vec4(1.0))),
    vec4(1.0));
`,"bool");var a=new Ee("return float(a >= 1.0 || b >= 1.0);",e.shape,n.shape);return this.compileAndRun(a,[e,n],"bool")},t.prototype.select=function(e,n,a){var o=new uh(e.rank,n.shape,n.rank);return this.compileAndRun(o,[e,n,a],Oe(n.dtype,a.dtype))},t.prototype.where=function(e){Wr("tf.where() in webgl locks the UI thread. Call tf.whereAsync() instead");var n=e.dataSync();return wi(e.shape,n)},t.prototype.topk=function(e,n,a){return Ec(e.dataSync(),e.shape,e.dtype,n)},t.prototype.min=function(e,n){We("min",n,e.rank);var a=_e(e.shape,n),o=a[0],i=$(a[1]),s=e.as2D(-1,i);return this.reduce(s,"min",s.dtype).reshape(o)},t.prototype.minimum=function(e,n){if(this.shouldExecuteOnCPU([e,n]))return this.cpuBackend.minimum(e,n);var a=B().getBool("WEBGL_PACK_BINARY_OPERATIONS")?new dt(`
  vec4 result = vec4(min(a, b));
  vec4 isNaN = min(vec4(isnan(a)) + vec4(isnan(b)), vec4(1.0));
  
  result.r = isNaN.r > 0. ? NAN : result.r;
  result.g = isNaN.g > 0. ? NAN : result.g;
  result.b = isNaN.b > 0. ? NAN : result.b;
  result.a = isNaN.a > 0. ? NAN : result.a;

  return result;
`,e.shape,n.shape):new Ee(`
  if (isnan(a)) return a;
  if (isnan(b)) return b;

  return min(a, b);
`,e.shape,n.shape);return this.compileAndRun(a,[e,n])},t.prototype.mod=function(e,n){var a=B().getBool("WEBGL_PACK_BINARY_OPERATIONS")?new dt(`
  vec4 result = mod(a, b);
  vec4 isNaN = vec4(equal(b, vec4(0.0)));
  
  result.r = isNaN.r > 0. ? NAN : result.r;
  result.g = isNaN.g > 0. ? NAN : result.g;
  result.b = isNaN.b > 0. ? NAN : result.b;
  result.a = isNaN.a > 0. ? NAN : result.a;

  return result;
`,e.shape,n.shape):new Ee(`if (b == 0.0) return NAN;
  return mod(a, b);`,e.shape,n.shape);return this.compileAndRun(a,[e,n])},t.prototype.max=function(e,n){if(this.shouldExecuteOnCPU([e]))return this.cpuBackend.max(e,n);We("max",n,e.rank);var a=_e(e.shape,n),o=a[0],i=$(a[1]),s=e.as2D(-1,i);return this.reduce(s,"max",s.dtype).reshape(o)},t.prototype.maximum=function(e,n){if(this.shouldExecuteOnCPU([e,n]))return this.cpuBackend.maximum(e,n);var a=B().getBool("WEBGL_PACK_BINARY_OPERATIONS")?new dt(`
  vec4 result = vec4(max(a, b));
  vec4 isNaN = min(vec4(isnan(a)) + vec4(isnan(b)), vec4(1.0));
  
  result.r = isNaN.r > 0. ? NAN : result.r;
  result.g = isNaN.g > 0. ? NAN : result.g;
  result.b = isNaN.b > 0. ? NAN : result.b;
  result.a = isNaN.a > 0. ? NAN : result.a;

  return result;
`,e.shape,n.shape):new Ee(`
  if (isnan(a)) return a;
  if (isnan(b)) return b;

  return max(a, b);
`,e.shape,n.shape);return this.compileAndRun(a,[e,n])},t.prototype.all=function(e,n){We("all",n,e.rank);var a=_e(e.shape,n),o=a[0],i=$(a[1]),s=e.as2D(-1,i);return this.reduce(s,"all",s.dtype).reshape(o)},t.prototype.any=function(e,n){We("any",n,e.rank);var a=_e(e.shape,n),o=a[0],i=$(a[1]),s=e.as2D(-1,i);return this.reduce(s,"any",s.dtype).reshape(o)},t.prototype.floorDiv=function(e,n){if(B().getBool("WEBGL_PACK_BINARY_OPERATIONS"))return this.packedBinaryOp(e,n,`
  ivec4 ia = round(a);
  ivec4 ib = round(b);
  bvec4 cond = notEqual(ib, ivec4(0));
  ivec4 result = ivec4(0);
  vec4 s = sign(a) * sign(b);

  // Windows (D3D) wants guaranteed non-zero int division at compile-time.
  if (cond[0]) {
    result[0] = idiv(ia[0], ib[0], s[0]);
  }
  if (cond[1]) {
    result[1] = idiv(ia[1], ib[1], s[1]);
  }
  if (cond[2]) {
    result[2] = idiv(ia[2], ib[2], s[2]);
  }
  if (cond[3]) {
    result[3] = idiv(ia[3], ib[3], s[3]);
  }
  return vec4(result);
`,"int32");var a=new Ee(`
  float s = sign(a) * sign(b);
  int ia = round(a);
  int ib = round(b);
  if (ib != 0) {
    // Windows (D3D) wants guaranteed non-zero int division at compile-time.
    return float(idiv(ia, ib, s));
  } else {
    return NAN;
  }
`,e.shape,n.shape);return this.compileAndRun(a,[e,n],"int32")},t.prototype.add=function(e,n){if(e.dtype==="complex64"&&n.dtype==="complex64")return this.complexSeparableBinaryOp(e,n,Wa);if(this.shouldExecuteOnCPU([e,n]))return this.cpuBackend.add(e,n);var a=Oe(e.dtype,n.dtype);if(B().getBool("WEBGL_PACK_BINARY_OPERATIONS"))return this.packedBinaryOp(e,n,Wa,a);var o=new Ee(Wa,e.shape,n.shape);return this.compileAndRun(o,[e,n],a)},t.prototype.packedUnaryOp=function(e,n,a){var o=new Wn(e.shape,n);return this.compileAndRun(o,[e],a)},t.prototype.packedBinaryOp=function(e,n,a,o,i){i===void 0&&(i=!1);var s=new dt(a,e.shape,n.shape,i);return this.compileAndRun(s,[e,n],o)},t.prototype.complexSeparableBinaryOp=function(e,n,a){var o=this,i=this.texData.get(e.dataId),s=this.texData.get(n.dataId),u=[[i.complexTensors.real,s.complexTensors.real],[i.complexTensors.imag,s.complexTensors.imag]].map((function(d){var h=d[0],f=d[1],m=o.makeComplexComponentTensorInfo(e,h),v=o.makeComplexComponentTensorInfo(n,f),g=new Ee(a,e.shape,n.shape);return o.compileAndRun(g,[m,v],Oe(h.dtype,f.dtype))})),c=u[0],l=u[1],p=this.complex(c,l);return c.dispose(),l.dispose(),p},t.prototype.makeComplexComponentTensorInfo=function(e,n){return{dataId:n.dataId,dtype:n.dtype,shape:e.shape}},t.prototype.addN=function(e){if(e.length===1)return e[0];if(e.length>B().get("WEBGL_MAX_TEXTURES_IN_SHADER")){var n=Math.floor(e.length/2),a=this.addN(e.slice(0,n)),o=this.addN(e.slice(n));return this.addN([a,o])}var i=e.map((function(c){return c.dtype})).reduce((function(c,l){return Oe(c,l)})),s=e.map((function(c){return c.shape})),u=B().getBool("WEBGL_PACK")?new Qp(e[0].shape,s):new Yp(e[0].shape,s);return this.compileAndRun(u,e,i)},t.prototype.subtract=function(e,n){if(e.dtype==="complex64"&&n.dtype==="complex64")return this.complexSeparableBinaryOp(e,n,za);if(this.shouldExecuteOnCPU([e,n]))return this.cpuBackend.subtract(e,n);var a=Oe(e.dtype,n.dtype);if(B().getBool("WEBGL_PACK_BINARY_OPERATIONS"))return this.packedBinaryOp(e,n,za,e.dtype);var o=new Ee(za,e.shape,n.shape);return this.compileAndRun(o,[e,n],a)},t.prototype.pow=function(e,n){var a=B().getBool("WEBGL_PACK_BINARY_OPERATIONS")?new dt(`
  // isModRound1 has 1 for components with round(mod(b, 2.0)) == 1, 0 otherwise.
  vec4 isModRound1 = vec4(equal(round(mod(b, 2.0)), ivec4(1)));
  vec4 multiplier = sign(a) * isModRound1 + (vec4(1.0) - isModRound1);
  vec4 result = multiplier * pow(abs(a), b);

  // Ensure that a^0 = 1, including 0^0 = 1 as this correspond to TF and JS
  bvec4 isExpZero = equal(b, vec4(0.0));
  result.r = isExpZero.r ? 1.0 : result.r;
  result.g = isExpZero.g ? 1.0 : result.g;
  result.b = isExpZero.b ? 1.0 : result.b;
  result.a = isExpZero.a ? 1.0 : result.a;

  vec4 isNaN = vec4(lessThan(a, vec4(0.0))) * vec4(lessThan(floor(b), b));
  
  result.r = isNaN.r > 0. ? NAN : result.r;
  result.g = isNaN.g > 0. ? NAN : result.g;
  result.b = isNaN.b > 0. ? NAN : result.b;
  result.a = isNaN.a > 0. ? NAN : result.a;

  return result;
`,e.shape,n.shape):new Ee(`
if(a < 0.0 && floor(b) < b){
  return NAN;
}
if (b == 0.0) {
  return 1.0;
}
return (round(mod(b, 2.0)) != 1) ?
    pow(abs(a), b) : sign(a) * pow(abs(a), b);
`,e.shape,n.shape),o=Oe(e.dtype,n.dtype);return this.compileAndRun(a,[e,n],o)},t.prototype.ceil=function(e){if(this.shouldExecuteOnCPU([e]))return this.cpuBackend.ceil(e);if(B().getBool("WEBGL_PACK_UNARY_OPERATIONS"))return this.packedUnaryOp(e,$s,e.dtype);var n=new ne(e.shape,$s);return this.compileAndRun(n,[e])},t.prototype.floor=function(e){if(this.shouldExecuteOnCPU([e]))return this.cpuBackend.floor(e);if(B().getBool("WEBGL_PACK_UNARY_OPERATIONS"))return this.packedUnaryOp(e,Ys,e.dtype);var n=new ne(e.shape,Ys);return this.compileAndRun(n,[e])},t.prototype.sign=function(e){var n=new ne(e.shape,`
  if (isnan(x)) { return 0.0; }
  return sign(x);
`);return this.compileAndRun(n,[e])},t.prototype.isNaN=function(e){var n=new ne(e.shape,"return float(isnan(x));");return this.compileAndRun(n,[e],"bool")},t.prototype.isInf=function(e){var n=new ne(e.shape,"return float(isinf(x));");return this.compileAndRun(n,[e],"bool")},t.prototype.isFinite=function(e){var n=new ne(e.shape,"return float(!isnan(x) && !isinf(x));");return this.compileAndRun(n,[e],"bool")},t.prototype.round=function(e){var n=new ne(e.shape,`
  // OpenGL ES does not support round function.
  // The algorithm is based on banker's rounding.
  float base = floor(x);
  if ((x - base) < 0.5) {
    return floor(x);
  } else if ((x - base) > 0.5) {
    return ceil(x);
  } else {
    if (mod(base, 2.0) == 0.0) {
      return base;
    } else {
      return base + 1.0;
    }
  }
`);return this.compileAndRun(n,[e])},t.prototype.exp=function(e){if(this.shouldExecuteOnCPU([e]))return this.cpuBackend.exp(e);if(B().getBool("WEBGL_PACK_UNARY_OPERATIONS"))return this.packedUnaryOp(e,Qs,e.dtype);var n=new ne(e.shape,Qs);return this.compileAndRun(n,[e])},t.prototype.expm1=function(e){if(this.shouldExecuteOnCPU([e]))return this.cpuBackend.expm1(e);if(B().getBool("WEBGL_PACK_UNARY_OPERATIONS"))return this.packedUnaryOp(e,Js,e.dtype);var n=new ne(e.shape,Js);return this.compileAndRun(n,[e])},t.prototype.softmax=function(e,n){var a=Te([n],e.shape),o=this.max(e,a),i=Le(o.shape,a),s=this.subtract(e,o.reshape(i)),u=this.exp(s),c=this.sum(u,a).reshape(i);return bt(u,c)},t.prototype.log=function(e){if(this.shouldExecuteOnCPU([e]))return this.cpuBackend.log(e);if(B().getBool("WEBGL_PACK_UNARY_OPERATIONS"))return this.packedUnaryOp(e,`
  vec4 result = log(x);
  vec4 isNaN = vec4(lessThan(x, vec4(0.0)));
  result.r = isNaN.r == 1.0 ? NAN : result.r;
  result.g = isNaN.g == 1.0 ? NAN : result.g;
  result.b = isNaN.b == 1.0 ? NAN : result.b;
  result.a = isNaN.a == 1.0 ? NAN : result.a;

  return result;
`,e.dtype);var n=new ne(e.shape,`if (x < 0.0) return NAN;
  return log(x);`);return this.compileAndRun(n,[e])},t.prototype.log1p=function(e){var n=new ne(e.shape,"return log(1.0 + x);");return this.compileAndRun(n,[e])},t.prototype.sqrt=function(e){var n=new ne(e.shape,"return sqrt(x);");return this.compileAndRun(n,[e])},t.prototype.rsqrt=function(e){if(this.shouldExecuteOnCPU([e]))return this.cpuBackend.rsqrt(e);var n=new ne(e.shape,"return inversesqrt(x);");return this.compileAndRun(n,[e])},t.prototype.reciprocal=function(e){var n=new ne(e.shape,"return 1.0 / x;");return this.compileAndRun(n,[e])},t.prototype.relu=function(e){var n;return n=B().getBool("WEBGL_PACK")?new Wn(e.shape,Yc):new ne(e.shape,Kc),this.compileAndRun(n,[e])},t.prototype.relu6=function(e){var n;return n=B().getBool("WEBGL_PACK")?new Wn(e.shape,Qc):new ne(e.shape,Xc),this.compileAndRun(n,[e])},t.prototype.prelu=function(e,n){var a=B().getBool("WEBGL_PACK_BINARY_OPERATIONS")?new dt(Tc,e.shape,n.shape):new Ee(Rc,e.shape,n.shape);return this.compileAndRun(a,[e,n])},t.prototype.elu=function(e){if(B().getBool("WEBGL_PACK_UNARY_OPERATIONS"))return this.packedUnaryOp(e,Jc,e.dtype);var n=new ne(e.shape,$c);return this.compileAndRun(n,[e])},t.prototype.eluDer=function(e,n){var a=B().getBool("WEBGL_PACK_BINARY_OPERATIONS")?new dt(`
  vec4 bGTEZero = vec4(greaterThanEqual(b, vec4(0.)));
  return (bGTEZero * a) + ((vec4(1.0) - bGTEZero) * (a * (b + vec4(1.0))));
`,e.shape,n.shape):new Ee("return (b >= 1.0) ? a : a * (b + 1.0);",e.shape,n.shape);return this.compileAndRun(a,[e,n])},t.prototype.selu=function(e){var n=new ne(e.shape,mh);return this.compileAndRun(n,[e])},t.prototype.int=function(e){var n=new ne(e.shape,"return float(int(x));");return this.compileAndRun(n,[e],"int32")},t.prototype.clip=function(e,n,a){var o,i=(o=B().getBool("WEBGL_PACK_CLIP")?new fd(e.shape):new hd(e.shape)).getCustomSetupFunc(n,a);return this.compileAndRun(o,[e],null,i)},t.prototype.abs=function(e){if(this.shouldExecuteOnCPU([e]))return this.cpuBackend.abs(e);if(B().getBool("WEBGL_PACK_UNARY_OPERATIONS"))return this.packedUnaryOp(e,Ks,e.dtype);var n=new ne(e.shape,Ks);return this.compileAndRun(n,[e])},t.prototype.complexAbs=function(e){var n=this.texData.get(e.dataId),a=new md(e.shape),o=[this.makeComplexComponentTensorInfo(e,n.complexTensors.real),this.makeComplexComponentTensorInfo(e,n.complexTensors.imag)];return this.compileAndRun(a,o)},t.prototype.sigmoid=function(e){var n=new ne(e.shape,"return 1.0 / (1.0 + exp(-1.0 * x));");return this.compileAndRun(n,[e])},t.prototype.softplus=function(e){var n=new ne(e.shape,`
  float epsilon = 1.1920928955078125e-7;
  float threshold = log(epsilon) + 2.0;

  bool too_large = x > -threshold;
  bool too_small = x < threshold;

  float result;
  float exp_x = exp(x);

  if (too_large){
    result = x;
  }
  else if (too_small){
    result = exp_x;
  }
  else{
    result = log(exp_x + 1.0);
  }
  return result;
`);return this.compileAndRun(n,[e])},t.prototype.sin=function(e){var n=new ne(e.shape,vh);return this.compileAndRun(n,[e])},t.prototype.cos=function(e){var n=new ne(e.shape,gh);return this.compileAndRun(n,[e])},t.prototype.tan=function(e){var n=new ne(e.shape,"return tan(x);");return this.compileAndRun(n,[e])},t.prototype.asin=function(e){var n=new ne(e.shape,yh);return this.compileAndRun(n,[e])},t.prototype.acos=function(e){var n=new ne(e.shape,xh);return this.compileAndRun(n,[e])},t.prototype.atan=function(e){var n=new ne(e.shape,bh);return this.compileAndRun(n,[e])},t.prototype.atan2=function(e,n){var a=B().getBool("WEBGL_PACK_BINARY_OPERATIONS")?new dt(`
  vec4 result = atan(a, b);
  vec4 isNaN = min(vec4(isnan(a)) + vec4(isnan(b)), vec4(1.0));
  
  result.r = isNaN.r > 0. ? NAN : result.r;
  result.g = isNaN.g > 0. ? NAN : result.g;
  result.b = isNaN.b > 0. ? NAN : result.b;
  result.a = isNaN.a > 0. ? NAN : result.a;

  return result;
`,e.shape,n.shape):new Ee(`
  if (isnan(a)) return a;
  if (isnan(b)) return b;

  return atan(a, b);
`,e.shape,n.shape);return this.compileAndRun(a,[e,n])},t.prototype.sinh=function(e){var n=new ne(e.shape,`
  float e2x = exp(x);
  return (e2x - 1.0 / e2x) / 2.0;
`);return this.compileAndRun(n,[e])},t.prototype.cosh=function(e){var n=new ne(e.shape,`
  float e2x = exp(-x);
  return (e2x + 1.0 / e2x) / 2.0;
`);return this.compileAndRun(n,[e])},t.prototype.tanh=function(e){var n=new ne(e.shape,`
  float e2x = exp(-2.0 * abs(x));
  return sign(x) * (1.0 - e2x) / (1.0 + e2x);
`);return this.compileAndRun(n,[e])},t.prototype.asinh=function(e){var n=new ne(e.shape,wh);return this.compileAndRun(n,[e])},t.prototype.acosh=function(e){var n=new ne(e.shape,Ch);return this.compileAndRun(n,[e])},t.prototype.atanh=function(e){var n=new ne(e.shape,Nh);return this.compileAndRun(n,[e])},t.prototype.erf=function(e){var n=new ne(e.shape,`
  // Error function is calculated approximately with elementary function.
  // See "Handbook of Mathematical Functions with Formulas,
  // Graphs, and Mathematical Tables", Abramowitz and Stegun.
  float p = 0.3275911;
  float a1 = 0.254829592;
  float a2 = -0.284496736;
  float a3 = 1.421413741;
  float a4 = -1.453152027;
  float a5 = 1.061405429;

  float sign = sign(x);
  x = abs(x);
  float t = 1.0 / (1.0 + p * x);
  return sign * (1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*exp(-x*x));
`);return this.compileAndRun(n,[e])},t.prototype.step=function(e,n){var a=new ne(e.shape,(function(o){return o===void 0&&(o=0),st+`
    return x > 0.0 ? 1.0 : float(`+o+`);
  `})(n));return this.compileAndRun(a,[e])},t.prototype.conv2dByMatMul=function(e,n,a,o,i,s){var u=e.shape,c=this.texData.get(e.dataId),l=a.inChannels,p=u[0]*u[1]*u[2],d=a.outChannels,h=a.dataFormat==="channelsLast",f=(p===1||d===1)&&l>1e3,m=u[2]%2!=0&&!!c.isPacked;if(f||!B().getBool("WEBGL_LAZILY_UNPACK")||!B().getBool("WEBGL_PACK_BINARY_OPERATIONS")||!m){var v=h?u[0]*u[1]*u[2]:u[0]*u[2]*u[3],g=this.reshape(e,[1,v,a.inChannels]),y=this.reshape(n,[1,a.inChannels,a.outChannels]);return this.reshape(this.fusedBatchMatMul({a:g,b:y,transposeA:!1,transposeB:!1,bias:o,activation:i,preluActivationWeights:s}),a.outShape)}var x=h?u[0]*u[1]*(u[2]+1):u[0]*u[2]*(u[3]+1),b={dataId:e.dataId,shape:[1,x,a.inChannels],dtype:e.dtype},C=c.shape;c.shape=c.shape.slice(),c.shape[c.shape.length-2]++,S(Gn(c.shape,b.shape),(function(){return"packed reshape "+c.shape+" to "+b.shape+" isn't free"}));var E=this.reshape(n,[1,a.inChannels,a.outChannels]),R=this.fusedBatchMatMul({a:b,b:E,transposeA:!1,transposeB:!1,bias:o,activation:i,preluActivationWeights:s}),I=this.texData.get(R.dataId);return S(I.isPacked,(function(){return"batchMatMul result is expected to be packed"})),c.shape=C,I.shape=a.outShape,D.makeTensorFromDataId(R.dataId,a.outShape,R.dtype)},t.prototype.conv2dWithIm2Row=function(e,n,a,o,i,s){var u=a.filterWidth,c=a.filterHeight,l=a.inChannels,p=a.outWidth,d=a.outHeight,h=a.dataFormat==="channelsLast",f=u*c*l,m=d*p,v=[f,m],g=e.squeeze([0]),y=n.reshape([1,f,-1]),x=new zd(v,g.shape,a),b=this.compileAndRun(x,[g]).reshape([1,v[0],v[1]]),C=o!=null,E=s!=null,R=i?wr(i,!0):null,I=new Ua(b.shape,[1,m,a.outChannels],!0,!1,C,R,E),k=[b,y];o&&k.push(o),E&&k.push(s);var T=this.compileAndRun(I,k);return h?T.reshape([1,d,p,a.outChannels]):T.reshape([1,a.outChannels,d,p])},t.prototype.fusedConv2d=function(e){var n=e.input,a=e.filter,o=e.convInfo,i=e.bias,s=e.activation,u=e.preluActivationWeights;if(o.filterHeight===1&&o.filterWidth===1&&o.dilationHeight===1&&o.dilationWidth===1&&o.strideHeight===1&&o.strideWidth===1&&(o.padInfo.type==="SAME"||o.padInfo.type==="VALID"))return this.conv2dByMatMul(n,a,o,i,s,u);if(B().getBool("WEBGL_CONV_IM2COL")&&n.shape[0]===1)return this.conv2dWithIm2Row(n,a,o,i,s,u);var c=i!=null,l=u!=null,p=s?wr(s,!1):null,d=new Ls(o,c,p,l),h=[n,a];return i&&h.push(i),u&&h.push(u),this.compileAndRun(d,h)},t.prototype.conv2d=function(e,n,a){if(a.filterHeight===1&&a.filterWidth===1&&a.dilationHeight===1&&a.dilationWidth===1&&a.strideHeight===1&&a.strideWidth===1&&(a.padInfo.type==="SAME"||a.padInfo.type==="VALID"))return this.conv2dByMatMul(e,n,a);if(B().getBool("WEBGL_CONV_IM2COL")&&e.shape[0]===1)return this.conv2dWithIm2Row(e,n,a);var o=new Ls(a);return this.compileAndRun(o,[e,n])},t.prototype.conv2dDerInput=function(e,n,a){var o=new xd(a);return this.compileAndRun(o,[e,n])},t.prototype.conv2dDerFilter=function(e,n,a){var o=new yd(a);return this.compileAndRun(o,[e,n])},t.prototype.fusedDepthwiseConv2D=function(e){var n,a=e.input,o=e.filter,i=e.convInfo,s=e.bias,u=e.activation,c=e.preluActivationWeights,l=B().getBool("WEBGL_PACK_DEPTHWISECONV")&&i.strideWidth<=2&&i.outChannels/i.inChannels==1,p=u?wr(u,l):null,d=[a,o],h=s!=null,f=c!=null;return h&&d.push(s),f&&d.push(c),l?(n=new Ws(i,h,p,f),this.compileAndRun(n,d)):(n=new Vs(i,h,p,f),this.compileAndRun(n,d))},t.prototype.depthwiseConv2D=function(e,n,a){var o;return B().getBool("WEBGL_PACK_DEPTHWISECONV")&&a.strideWidth<=2&&a.outChannels/a.inChannels==1?(o=new Ws(a),this.compileAndRun(o,[e,n])):(o=new Vs(a),this.compileAndRun(o,[e,n]))},t.prototype.depthwiseConv2DDerInput=function(e,n,a){var o=new Nd(a);return this.compileAndRun(o,[e,n])},t.prototype.depthwiseConv2DDerFilter=function(e,n,a){var o=new Cd(a);return this.compileAndRun(o,[e,n])},t.prototype.conv3d=function(e,n,a){var o=new Ed(a);return this.compileAndRun(o,[e,n])},t.prototype.conv3dDerInput=function(e,n,a){var o=new wd(a);return this.compileAndRun(o,[e,n])},t.prototype.conv3dDerFilter=function(e,n,a){var o=new bd(a);return this.compileAndRun(o,[e,n])},t.prototype.maxPool=function(e,n){var a=new jn(n,"max",!1);return this.compileAndRun(a,[e])},t.prototype.avgPool=function(e,n){var a=new jn(n,"avg",!1);return this.compileAndRun(a,[e],"float32")},t.prototype.maxPoolBackprop=function(e,n,a,o){var i=new jn(o,"max",!0),s=this.compileAndRun(i,[n]),u=new qd(o),c=this.compileAndRun(u,[e,s],n.dtype);return s.dispose(),c},t.prototype.avgPoolBackprop=function(e,n,a){var o=new od(a);return this.compileAndRun(o,[e],n.dtype)},t.prototype.cast=function(e,n){return gi(e,n,this)},t.prototype.unstack=function(e,n){for(var a=e.shape[n],o=new Array(e.rank-1),i=0,s=0;s<e.rank;s++)s!==n&&(o[i++]=e.shape[s]);var u=new Array(e.rank).fill(0),c=e.shape.slice();c[n]=1;var l=new Array(a);for(s=0;s<l.length;s++)u[n]=s,l[s]=this.slice(e,u,c).reshape(o);return l},t.prototype.avgPool3d=function(e,n){var a=new Ga(n,"avg",!1);return this.compileAndRun(a,[e],"float32")},t.prototype.avgPool3dBackprop=function(e,n,a){var o=new id(a);return this.compileAndRun(o,[e],n.dtype)},t.prototype.maxPool3d=function(e,n){var a=new Ga(n,"max",!1);return this.compileAndRun(a,[e],"float32")},t.prototype.maxPool3dBackprop=function(e,n,a,o){var i=new Ga(o,"max",!0),s=this.compileAndRun(i,[n]),u=new jd(o),c=this.compileAndRun(u,[e,s],n.dtype);return s.dispose(),c},t.prototype.reshape=function(e,n){var a=this.texData.get(e.dataId);if(a.isPacked&&!Gn(e.shape,n)&&(a.texture===null||!Gn(a.shape,n))){var o=this.packedReshape(e,n);return D.makeTensorFromDataId(o.dataId,o.shape,o.dtype)}return jr(e,n)},t.prototype.resizeBilinear=function(e,n,a,o){var i=B().getBool("WEBGL_PACK_IMAGE_OPERATIONS")?new nh(e.shape,n,a,o):new th(e.shape,n,a,o);return this.compileAndRun(i,[e],"float32")},t.prototype.resizeBilinearBackprop=function(e,n,a){var o=new eh(e,n,a);return this.compileAndRun(o,[e])},t.prototype.resizeNearestNeighbor=function(e,n,a,o){var i=new ah(e.shape,n,a,o);return this.compileAndRun(i,[e])},t.prototype.resizeNearestNeighborBackprop=function(e,n,a){var o=new rh(e,n,a);return this.compileAndRun(o,[e])},t.prototype.multinomial=function(e,n,a,o){var i=n?e:sr(e),s=i.shape[0],u=i.shape[1],c=new Kd(s,u,a),l=c.getCustomSetupFunc(o);return this.compileAndRun(c,[i],"int32",l)},t.prototype.oneHot=function(e,n,a,o){var i=new Xd(e.size,n,a,o);return this.compileAndRun(i,[e])},t.prototype.diag=function(e){var n=new Ad(e.size);return this.compileAndRun(n,[e])},t.prototype.nonMaxSuppression=function(e,n,a,o,i){return Wr("tf.nonMaxSuppression() in webgl locks the UI thread. Call tf.nonMaxSuppressionAsync() instead"),xi(e.dataSync(),n.dataSync(),a,o,i)},t.prototype.cropAndResize=function(e,n,a,o,i,s){var u=new Sd(e.shape,n.shape,o,i,s);return this.compileAndRun(u,[e,n,a],"float32")},t.prototype.depthToSpace=function(e,n,a){S(n>1,(function(){return"blockSize should be > 1 for depthToSpace, but was: "+n}));var o=e.shape[0],i=a==="NHWC"?e.shape[1]:e.shape[2],s=a==="NHWC"?e.shape[2]:e.shape[3],u=a==="NHWC"?e.shape[3]:e.shape[1],c=i*n,l=s*n,p=u/(n*n),d=new Td(a==="NHWC"?[o,c,l,p]:[o,p,c,l],n,a);return this.compileAndRun(d,[e])},t.prototype.split=function(e,n,a){return Cc(e,n,a)},t.prototype.scatterND=function(e,n,a){var o=Zn(0,e,a),i=o.sliceRank,s=o.numUpdates,u=o.sliceSize,c=o.strides,l=o.outputSize,p=[l/u,u],d=e.reshape([s,i]),h=n.reshape([s,u]);if(l===0)return jr(De([]),a);var f=K(0),m=new Hs(s,i,d.rank,h.rank,c,p);return this.compileAndRun(m,[h,d,f]).reshape(a)},t.prototype.sparseToDense=function(e,n,a,o){var i=Zn(0,e,a),s=i.sliceRank,u=i.numUpdates,c=i.strides,l=i.outputSize,p=new Hs(u,s,e.rank,n.rank,c,[l,1],!1);return this.compileAndRun(p,[n,e,o]).reshape(a)},t.prototype.fft=function(e){return this.fftImpl(e,!1)},t.prototype.ifft=function(e){return this.fftImpl(e,!0)},t.prototype.fftImpl=function(e,n){var a=this.texData.get(e.dataId),o=new Us(Md,e.shape,n),i=new Us(Bd,e.shape,n),s=[this.makeComplexComponentTensorInfo(e,a.complexTensors.real),this.makeComplexComponentTensorInfo(e,a.complexTensors.imag)],u=this.compileAndRun(o,s),c=this.compileAndRun(i,s),l=this.complex(u,c).as2D(e.shape[0],e.shape[1]);return u.dispose(),c.dispose(),l},t.prototype.gatherND=function(e,n){var a=n.shape,o=a[a.length-1],i=pi(e,n),s=i[0],u=i[1],c=i[2],l=i[3],p=n.reshape([u,o]),d=e.reshape([e.size/c,c]),h=new Vd(o,l,[u,c]);return this.compileAndRun(h,[d,p]).reshape(s)},t.prototype.fill=function(e,n,a){if((a=a||Dn(n))==="string"){var o=Kn(a,$(e));return o.fill(n),D.makeTensor(o,e,a,this)}var i=new Pd(e,n),s=i.getCustomSetupFunc(n);return this.compileAndRun(i,[],a,s)},t.prototype.onesLike=function(e){if(e.dtype==="string")throw new Error("onesLike is not supported under string dtype");return this.fill(e.shape,1,e.dtype)},t.prototype.zerosLike=function(e){return this.fill(e.shape,e.dtype==="string"?"":0,e.dtype)},t.prototype.linspace=function(e,n,a){return yi(e,n,a)},t.prototype.makeTensorInfo=function(e,n){var a=this.write(null,e,n);return this.texData.get(a).usage=null,{dataId:a,shape:e,dtype:n}},t.prototype.makeOutput=function(e,n){var a=this.makeTensorInfo(e,n).dataId;return D.makeTensorFromDataId(a,e,n,this)},t.prototype.unpackTensor=function(e){var n=new Sh(e.shape);return this.runWebGLProgram(n,[e],e.dtype)},t.prototype.packTensor=function(e){var n=new $d(e.shape);return this.runWebGLProgram(n,[e],e.dtype,null,!0)},t.prototype.packedReshape=function(e,n){var a=[Qn(e.shape)].concat(Jn(e.shape)),o={dtype:e.dtype,shape:a,dataId:e.dataId},i=[Qn(n)].concat(Jn(n)),s=new Zd(i,a),u=this.runWebGLProgram(s,[o],e.dtype,null,!0);return{dataId:u.dataId,shape:n,dtype:u.dtype}},t.prototype.decode=function(e){var n,a=this.texData.get(e),o=a.isPacked,i=a.shape,s=a.dtype,u=Ar(i);return n=o?new Rd(u):new kd(u),{dtype:s,shape:i,dataId:this.runWebGLProgram(n,[{shape:u,dtype:s,dataId:e}],s,null,!0).dataId}},t.prototype.runWebGLProgram=function(e,n,a,o,i){var s=this;i===void 0&&(i=!1);var u=this.makeTensorInfo(e.outputShape,a),c=this.texData.get(u.dataId);if(e.packedOutput&&(c.isPacked=!0),e.outPackingScheme===Yn.DENSE){var l=Hn(e.outputShape);c.texShape=l.map((function(x){return 2*x}))}if(e.outTexUsage!=null&&(c.usage=e.outTexUsage),$(u.shape)===0)return c.values=nn(u.dtype,0),u;var p=[],d=n.map((function(x){if(x.dtype==="complex64")throw new Error("GPGPUProgram does not support complex64 input. For complex64 dtypes, please separate the program into real and imaginary parts.");var b=s.texData.get(x.dataId);if(b.texture==null){if(!e.packedInputs&&$(x.shape)<=B().getNumber("WEBGL_SIZE_UPLOAD_UNIFORM"))return{shape:x.shape,texData:null,isUniform:!0,uniformValues:b.values};e.packedInputs&&(b.isPacked=!0,b.shape=x.shape)}else if(!!b.isPacked!=!!e.packedInputs)x=b.isPacked?s.unpackTensor(x):s.packTensor(x),p.push(x),b=s.texData.get(x.dataId);else if(b.isPacked&&!Gn(b.shape,x.shape)){var C=x,E=x.shape;x.shape=b.shape,x=s.packedReshape(x,E),p.push(x),b=s.texData.get(x.dataId),C.shape=E}return s.uploadToGPU(x.dataId),{shape:x.shape,texData:b,isUniform:!1}}));this.uploadToGPU(u.dataId);var h,f={shape:u.shape,texData:c,isUniform:!1},m=(function(x,b,C){var E="";b.concat(C).forEach((function(k){var T=k.texData!=null&&k.texData.slice!=null&&k.texData.slice.flatOffset>0,O=k.isUniform?"uniform":k.texData.texShape;E+=k.shape+"_"+O+"_"+T}));var R=x.userCode,I=x.constructor.name;return I+="_"+E+"_"+R})(e,d,f),v=this.getAndSaveBinary(m,(function(){return(function(x,b,C,E){var R=b.userCode,I=C.map((function(V,H){var q={logicalShape:V.shape,texShape:V.isUniform?null:V.texData.texShape,isUniform:V.isUniform,isPacked:!V.isUniform&&V.texData.isPacked,flatOffset:null};return V.texData!=null&&V.texData.slice!=null&&V.texData.slice.flatOffset>0&&(q.flatOffset=V.texData.slice.flatOffset),{name:b.variableNames[H],shapeInfo:q}})),k=I.map((function(V){return V.shapeInfo})),T={logicalShape:E.shape,texShape:E.texData.texShape,isUniform:!1,isPacked:E.texData.isPacked,flatOffset:null},O=Zp(I,T,R,b.packedInputs),_=x.createProgram(O),W=null,L=x.getUniformLocation(_,"NAN",!1);B().getNumber("WEBGL_VERSION")===1&&(W=x.getUniformLocation(_,"INFINITY",!1));for(var P={},U=0;U<b.variableNames.length;U++){var G=b.variableNames[U];P[G]=x.getUniformLocation(_,G,!1),P["offset"+G]=x.getUniformLocation(_,"offset"+G,!1)}return{program:b,source:O,webGLProgram:_,uniformLocations:P,inShapeInfos:k,outShapeInfo:T,infLoc:W,nanLoc:L}})(s.gpgpu,e,d,f)})),g=this.activeTimers!=null;if(g&&(h=this.startTimer()),(function(x,b,C,E,R){Gs(b.inShapeInfos,C),Gs([b.outShapeInfo],[E]);var I=E.texData.texture,k=E.texData.texShape;E.texData.isPacked?x.setOutputPackedMatrixTexture(I,k[0],k[1]):x.setOutputMatrixTexture(I,k[0],k[1]),x.setProgram(b.webGLProgram),B().getNumber("WEBGL_VERSION")===1&&b.infLoc!==null&&x.gl.uniform1f(b.infLoc,1/0),b.nanLoc!==null&&x.gl.uniform1f(b.nanLoc,NaN),C.forEach((function(T,O){var _=b.program.variableNames[O],W=b.uniformLocations[_],L=b.uniformLocations["offset"+_];if(W!=null)if(T.isUniform)if($(T.shape)<2)x.gl.uniform1f(W,T.uniformValues[0]);else{var P=T.uniformValues;P instanceof Float32Array||(P=new Float32Array(P)),x.gl.uniform1fv(W,P)}else T.texData.slice!=null&&L!=null&&x.gl.uniform1i(L,T.texData.slice.flatOffset),x.setInputMatrixTexture(T.texData.texture,W,O)})),R?.(x,b.webGLProgram),x.executeProgram()})(this.gpgpu,v,d,f,o),p.forEach((function(x){return s.disposeData(x.dataId)})),g&&(h=this.endTimer(h),this.activeTimers.push({name:e.constructor.name,query:this.getQueryTime(h)})),!B().getBool("WEBGL_LAZILY_UNPACK")&&c.isPacked&&i===!1){var y=this.unpackTensor(u);return this.disposeData(u.dataId),y}return u},t.prototype.compileAndRun=function(e,n,a,o,i){i===void 0&&(i=!1),a=a||n[0].dtype;var s=this.runWebGLProgram(e,n,a,o,i);return D.makeTensorFromDataId(s.dataId,s.shape,s.dtype)},t.prototype.getAndSaveBinary=function(e,n){return e in this.binaryCache||(this.binaryCache[e]=n()),this.binaryCache[e]},t.prototype.getTextureManager=function(){return this.textureManager},t.prototype.dispose=function(){var e=this;this.disposed||(B().getBool("IS_TEST")||Object.keys(this.binaryCache).forEach((function(n){e.gpgpu.deleteProgram(e.binaryCache[n].webGLProgram),delete e.binaryCache[n]})),this.textureManager.dispose(),this.canvas!=null&&typeof HTMLCanvasElement<"u"&&this.canvas instanceof HTMLCanvasElement?this.canvas.remove():this.canvas=null,this.gpgpuCreatedLocally&&(this.gpgpu.program=null,this.gpgpu.dispose()),this.disposed=!0)},t.prototype.floatPrecision=function(){var e=this;return this.floatPrecisionValue==null&&(this.floatPrecisionValue=oe((function(){if(!B().get("WEBGL_RENDER_FLOAT32_ENABLED")){var n=B().getBool("DEBUG");B().set("DEBUG",!1);var a=e.abs(K(1e-8)).dataSync()[0];if(B().set("DEBUG",n),a>0)return 32}return 16}))),this.floatPrecisionValue},t.prototype.epsilon=function(){return this.floatPrecision()===32?1e-7:1e-4},t.prototype.uploadToGPU=function(e){var n,a=this.texData.get(e),o=a.shape,i=a.dtype,s=a.values,u=a.texture,c=a.usage,l=a.isPacked;if(u==null){var p,d=this.activeTimers!=null;d&&(p=et());var h=a.texShape;if(h==null&&(h=Xu(o,l),a.texShape=h),s!=null){var f=Ar(o),m=void 0,v=h[1],g=h[0],y=s instanceof Uint8Array;l?(v=(n=nr(h[0],h[1]))[0],g=n[1],m=new Fd(f,[g,v],y)):m=new _d(f,[g,v],y);var x=this.makeTensorInfo([g,v],i);this.texData.get(x.dataId).usage=y?Xe.PIXELS:Xe.UPLOAD,this.gpgpu.uploadDenseMatrixToTexture(this.getTexture(x.dataId),v,g,s);var b=this.runWebGLProgram(m,[x],i,null,!0),C=this.texData.get(b.dataId);a.texture=C.texture,a.texShape=C.texShape,a.isPacked=C.isPacked,a.usage=C.usage,this.disposeData(x.dataId),this.texData.delete(b.dataId),a.values=null,d&&(this.uploadWaitMs+=et()-p)}else{var E=this.acquireTexture(h,c,i,l);a.texture=E}}},t.prototype.convertAndCacheOnCPU=function(e,n){var a=this.texData.get(e),o=a.dtype;return this.releaseGPUData(e),n!=null&&(a.values=(function(i,s){if(s==="float32"||s==="complex64")return i;if(s==="int32"||s==="bool"){for(var u=s==="int32"?new Int32Array(i.length):new Uint8Array(i.length),c=0;c<u.length;++c)u[c]=Math.round(i[c]);return u}throw new Error("Unknown dtype "+s)})(n,o)),a.values},t.prototype.acquireTexture=function(e,n,a,o){if(this.numBytesInGPU+=this.computeBytes(e,a),!this.warnedAboutMemory&&this.numBytesInGPU>1024*this.numMBBeforeWarning*1024){var i=(this.numBytesInGPU/1024/1024).toFixed(2);this.warnedAboutMemory=!0,console.warn("High memory usage in GPU: "+i+" MB, most likely due to a memory leak")}return this.textureManager.acquireTexture(e,n,o)},t.prototype.computeBytes=function(e,n){return e[0]*e[1]*Eo(n)},t})(bc);Tu()&&D.registerBackend("webgl",(function(){return new Zc}),2);function sn(r,t){return r(t={exports:{}},t.exports),t.exports}var kh=sn((function(r){(function(t,e,n){function a(s){var u,c=this,l=(u=4022871197,function(p){p=p.toString();for(var d=0;d<p.length;d++){var h=.02519603282416938*(u+=p.charCodeAt(d));h-=u=h>>>0,u=(h*=u)>>>0,u+=4294967296*(h-=u)}return 23283064365386963e-26*(u>>>0)});c.next=function(){var p=2091639*c.s0+23283064365386963e-26*c.c;return c.s0=c.s1,c.s1=c.s2,c.s2=p-(c.c=0|p)},c.c=1,c.s0=l(" "),c.s1=l(" "),c.s2=l(" "),c.s0-=l(s),c.s0<0&&(c.s0+=1),c.s1-=l(s),c.s1<0&&(c.s1+=1),c.s2-=l(s),c.s2<0&&(c.s2+=1),l=null}function o(s,u){return u.c=s.c,u.s0=s.s0,u.s1=s.s1,u.s2=s.s2,u}function i(s,u){var c=new a(s),l=u&&u.state,p=c.next;return p.int32=function(){return 4294967296*c.next()|0},p.double=function(){return p()+11102230246251565e-32*(2097152*p()|0)},p.quick=p,l&&(typeof l=="object"&&o(l,c),p.state=function(){return o(c,{})}),p}e&&e.exports?e.exports=i:n&&n.amd?n((function(){return i})):this.alea=i})(0,r,!1)})),Rh=sn((function(r){(function(t,e,n){function a(s){var u=this,c="";u.x=0,u.y=0,u.z=0,u.w=0,u.next=function(){var p=u.x^u.x<<11;return u.x=u.y,u.y=u.z,u.z=u.w,u.w^=u.w>>>19^p^p>>>8},s===(0|s)?u.x=s:c+=s;for(var l=0;l<c.length+64;l++)u.x^=0|c.charCodeAt(l),u.next()}function o(s,u){return u.x=s.x,u.y=s.y,u.z=s.z,u.w=s.w,u}function i(s,u){var c=new a(s),l=u&&u.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=((c.next()>>>11)+(c.next()>>>0)/4294967296)/2097152;while(d===0);return d},p.int32=c.next,p.quick=p,l&&(typeof l=="object"&&o(l,c),p.state=function(){return o(c,{})}),p}e&&e.exports?e.exports=i:n&&n.amd?n((function(){return i})):this.xor128=i})(0,r,!1)})),Th=sn((function(r){(function(t,e,n){function a(s){var u=this,c="";u.next=function(){var p=u.x^u.x>>>2;return u.x=u.y,u.y=u.z,u.z=u.w,u.w=u.v,(u.d=u.d+362437|0)+(u.v=u.v^u.v<<4^p^p<<1)|0},u.x=0,u.y=0,u.z=0,u.w=0,u.v=0,s===(0|s)?u.x=s:c+=s;for(var l=0;l<c.length+64;l++)u.x^=0|c.charCodeAt(l),l==c.length&&(u.d=u.x<<10^u.x>>>4),u.next()}function o(s,u){return u.x=s.x,u.y=s.y,u.z=s.z,u.w=s.w,u.v=s.v,u.d=s.d,u}function i(s,u){var c=new a(s),l=u&&u.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=((c.next()>>>11)+(c.next()>>>0)/4294967296)/2097152;while(d===0);return d},p.int32=c.next,p.quick=p,l&&(typeof l=="object"&&o(l,c),p.state=function(){return o(c,{})}),p}e&&e.exports?e.exports=i:n&&n.amd?n((function(){return i})):this.xorwow=i})(0,r,!1)})),Ah=sn((function(r){(function(t,e,n){function a(s){var u=this;u.next=function(){var c,l,p=u.x,d=u.i;return c=p[d],l=(c^=c>>>7)^c<<24,l^=(c=p[d+1&7])^c>>>10,l^=(c=p[d+3&7])^c>>>3,l^=(c=p[d+4&7])^c<<7,c=p[d+7&7],l^=(c^=c<<13)^c<<9,p[d]=l,u.i=d+1&7,l},(function(c,l){var p,d=[];if(l===(0|l))d[0]=l;else for(l=""+l,p=0;p<l.length;++p)d[7&p]=d[7&p]<<15^l.charCodeAt(p)+d[p+1&7]<<13;for(;d.length<8;)d.push(0);for(p=0;p<8&&d[p]===0;++p);for(p==8?d[7]=-1:d[p],c.x=d,c.i=0,p=256;p>0;--p)c.next()})(u,s)}function o(s,u){return u.x=s.x.slice(),u.i=s.i,u}function i(s,u){s==null&&(s=+new Date);var c=new a(s),l=u&&u.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=((c.next()>>>11)+(c.next()>>>0)/4294967296)/2097152;while(d===0);return d},p.int32=c.next,p.quick=p,l&&(l.x&&o(l,c),p.state=function(){return o(c,{})}),p}e&&e.exports?e.exports=i:n&&n.amd?n((function(){return i})):this.xorshift7=i})(0,r,!1)})),Dh=sn((function(r){(function(t,e,n){function a(s){var u=this;u.next=function(){var c,l,p=u.w,d=u.X,h=u.i;return u.w=p=p+1640531527|0,l=d[h+34&127],c=d[h=h+1&127],l^=l<<13,c^=c<<17,l^=l>>>15,c^=c>>>12,l=d[h]=l^c,u.i=h,l+(p^p>>>16)|0},(function(c,l){var p,d,h,f,m,v=[],g=128;for(l===(0|l)?(d=l,l=null):(l+="\0",d=0,g=Math.max(g,l.length)),h=0,f=-32;f<g;++f)l&&(d^=l.charCodeAt((f+32)%l.length)),f===0&&(m=d),d^=d<<10,d^=d>>>15,d^=d<<4,d^=d>>>13,f>=0&&(m=m+1640531527|0,h=(p=v[127&f]^=d+m)==0?h+1:0);for(h>=128&&(v[127&(l&&l.length||0)]=-1),h=127,f=512;f>0;--f)d=v[h+34&127],p=v[h=h+1&127],d^=d<<13,p^=p<<17,d^=d>>>15,p^=p>>>12,v[h]=d^p;c.w=m,c.X=v,c.i=h})(u,s)}function o(s,u){return u.i=s.i,u.w=s.w,u.X=s.X.slice(),u}function i(s,u){s==null&&(s=+new Date);var c=new a(s),l=u&&u.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=((c.next()>>>11)+(c.next()>>>0)/4294967296)/2097152;while(d===0);return d},p.int32=c.next,p.quick=p,l&&(l.X&&o(l,c),p.state=function(){return o(c,{})}),p}e&&e.exports?e.exports=i:n&&n.amd?n((function(){return i})):this.xor4096=i})(0,r,!1)})),Oh=sn((function(r){(function(t,e,n){function a(s){var u=this,c="";u.next=function(){var p=u.b,d=u.c,h=u.d,f=u.a;return p=p<<25^p>>>7^d,d=d-h|0,h=h<<24^h>>>8^f,f=f-p|0,u.b=p=p<<20^p>>>12^d,u.c=d=d-h|0,u.d=h<<16^d>>>16^f,u.a=f-p|0},u.a=0,u.b=0,u.c=-1640531527,u.d=1367130551,s===Math.floor(s)?(u.a=s/4294967296|0,u.b=0|s):c+=s;for(var l=0;l<c.length+20;l++)u.b^=0|c.charCodeAt(l),u.next()}function o(s,u){return u.a=s.a,u.b=s.b,u.c=s.c,u.d=s.d,u}function i(s,u){var c=new a(s),l=u&&u.state,p=function(){return(c.next()>>>0)/4294967296};return p.double=function(){do var d=((c.next()>>>11)+(c.next()>>>0)/4294967296)/2097152;while(d===0);return d},p.int32=c.next,p.quick=p,l&&(typeof l=="object"&&o(l,c),p.state=function(){return o(c,{})}),p}e&&e.exports?e.exports=i:n&&n.amd?n((function(){return i})):this.tychei=i})(0,r,!1)})),Jt=sn((function(r){(function(t,e){var n,a=this,o=256,i=6,s="random",u=e.pow(o,i),c=e.pow(2,52),l=2*c,p=o-1;function d(g,y,x){var b=[],C=m((function I(k,T){var O,_=[],W=typeof k;if(T&&W=="object")for(O in k)try{_.push(I(k[O],T-1))}catch{}return _.length?_:W=="string"?k:k+"\0"})((y=y==1?{entropy:!0}:y||{}).entropy?[g,v(t)]:g??(function(){try{var I;return n&&(I=n.randomBytes)?I=I(o):(I=new Uint8Array(o),(a.crypto||a.msCrypto).getRandomValues(I)),v(I)}catch{var k=a.navigator,T=k&&k.plugins;return[+new Date,a,T,a.screen,v(t)]}})(),3),b),E=new h(b),R=function(){for(var I=E.g(i),k=u,T=0;I<c;)I=(I+T)*o,k*=o,T=E.g(1);for(;I>=l;)I/=2,k/=2,T>>>=1;return(I+T)/k};return R.int32=function(){return 0|E.g(4)},R.quick=function(){return E.g(4)/4294967296},R.double=R,m(v(E.S),t),(y.pass||x||function(I,k,T,O){return O&&(O.S&&f(O,E),I.state=function(){return f(E,{})}),T?(e[s]=I,k):I})(R,C,"global"in y?y.global:this==e,y.state)}function h(g){var y,x=g.length,b=this,C=0,E=b.i=b.j=0,R=b.S=[];for(x||(g=[x++]);C<o;)R[C]=C++;for(C=0;C<o;C++)R[C]=R[E=p&E+g[C%x]+(y=R[C])],R[E]=y;(b.g=function(I){for(var k,T=0,O=b.i,_=b.j,W=b.S;I--;)k=W[O=p&O+1],T=T*o+W[p&(W[O]=W[_=p&_+k])+(W[_]=k)];return b.i=O,b.j=_,T})(o)}function f(g,y){return y.i=g.i,y.j=g.j,y.S=g.S.slice(),y}function m(g,y){for(var x,b=g+"",C=0;C<b.length;)y[p&C]=p&(x^=19*y[p&C])+b.charCodeAt(C++);return v(y)}function v(g){return String.fromCharCode.apply(0,g)}if(e["seed"+s]=d,m(e.random(),t),r.exports){r.exports=d;try{n=Es()}catch{}}})([],Math)}));Jt.alea=kh,Jt.xor128=Rh,Jt.xorwow=Th,Jt.xorshift7=Ah,Jt.xor4096=Dh,Jt.tychei=Oh;var ua=Jt.alea,Si=A({addN_:function(r){S(Array.isArray(r),(function(){return"The argument passed to tf.addN() must be a list of tensors"})),S(r.length>=1,(function(){return"Must pass at least one tensor to tf.addN(), but got "+r.length}));var t=r.map((function(a,o){return N(a,"tensors"+o,"addN")})),e=t[0];t.forEach((function(a){if(a.dtype!==e.dtype)throw new Error("All tensors passed to tf.addN() must have the same dtype")})),t.forEach((function(a){if(!Re(a.shape,e.shape))throw new Error("All tensors passed to tf.addN() must have the same shape")}));var n=t;return D.runKernelFunc((function(a,o){return a.addN(t)}),n,null,"AddN")}});function ca(){tc("tf.batchNormalization() is going away. Use tf.batchNorm() instead, and note the positional argument change of scale, offset, and varianceEpsilon")}function el(r){return r.rank===0||r.rank===1?r.as4D(1,1,1,r.size):r.rank===2?r.as4D(1,1,r.shape[0],r.shape[1]):r.rank===3?r.as4D(1,r.shape[0],r.shape[1],r.shape[2]):r}function tl(r,t,e,n,a,o){o==null&&(o=.001);var i,s,u=N(r,"x","batchNorm"),c=N(t,"mean","batchNorm"),l=N(e,"variance","batchNorm");a!=null&&(i=N(a,"scale","batchNorm")),n!=null&&(s=N(n,"offset","batchNorm")),S(c.rank===l.rank,(function(){return"Batch normalization gradient requires mean and variance to have equal ranks."})),S(s==null||c.rank===s.rank,(function(){return"Batch normalization gradient requires mean and offset to have equal ranks."})),S(i==null||c.rank===i.rank,(function(){return"Batch normalization gradient requires mean and scale to have equal ranks."}));var p={x:u,scale:i,offset:s,mean:c,variance:l},d={varianceEpsilon:o};return D.runKernelFunc((function(h,f){var m=el(u),v=h.batchNormalization(m,Cr(c),Cr(l),o,Cr(i),Cr(s));return f([u,c,l,i]),v}),p,null,"FusedBatchNorm",d).reshape(u.shape)}function Cr(r){return r==null?null:r.rank===0?r.as1D():r.rank===1?r:r.rank===2?r.as4D(1,1,r.shape[0],r.shape[1]):r.rank===3?r.as4D(1,r.shape[0],r.shape[1],r.shape[2]):r}var _h=A({batchNormalization_:function(r,t,e,n,a,o){return n===void 0&&(n=.001),ca(),tl(r,t,e,o,a,n)}}),un=A({batchNorm_:tl});function nl(r,t,e,n,a,o){var i,s,u=N(r,"x","batchNorm"),c=N(t,"mean","batchNorm"),l=N(e,"variance","batchNorm");return a!=null&&(i=N(a,"scale","batchNorm")),n!=null&&(s=N(n,"offset","batchNorm")),S(u.rank===2,(function(){return"Error in batchNorm3D: x must be rank 3 but got rank "+u.rank+"."})),S(c.rank===2||c.rank===1,(function(){return"Error in batchNorm2D: mean must be rank 2 or rank 1 but got rank "+c.rank+"."})),S(l.rank===2||l.rank===1,(function(){return"Error in batchNorm2D: variance must be rank 2 or rank 1 but got rank "+l.rank+"."})),i!=null&&S(i.rank===2||i.rank===1,(function(){return"Error in batchNorm2D: scale must be rank 2 or rank 1 but got rank "+i.rank+"."})),s!=null&&S(s.rank===2||s.rank===1,(function(){return"Error in batchNorm2D: offset must be rank 2 or rank 1 but got rank "+s.rank+"."})),un(u,c,l,s,i,o)}var Fh=A({batchNormalization2d_:function(r,t,e,n,a,o){return n===void 0&&(n=.001),ca(),nl(r,t,e,o,a,n)}}),Mh=A({batchNorm2d_:nl});function rl(r,t,e,n,a,o){var i,s,u=N(r,"x","batchNorm"),c=N(t,"mean","batchNorm"),l=N(e,"variance","batchNorm");return a!=null&&(i=N(a,"scale","batchNorm")),n!=null&&(s=N(n,"offset","batchNorm")),S(u.rank===3,(function(){return"Error in batchNorm3D: x must be rank 3 but got rank "+u.rank+"."})),S(c.rank===3||c.rank===1,(function(){return"Error in batchNorm3D: mean must be rank 3 or rank 1 but got rank "+c.rank+"."})),S(l.rank===3||l.rank===1,(function(){return"Error in batchNorm3D: variance must be rank 3 or rank 1 but got rank "+l.rank+"."})),i!=null&&S(i.rank===3||i.rank===1,(function(){return"Error in batchNorm3D: scale must be rank 3 or rank 1 but got rank "+i.rank+"."})),s!=null&&S(s.rank===3||s.rank===1,(function(){return"Error in batchNorm3D: offset must be rank 3 or rank 1 but got rank "+s.rank+"."})),un(u,c,l,s,i,o)}var Bh=A({batchNormalization3d_:function(r,t,e,n,a,o){return n===void 0&&(n=.001),ca(),rl(r,t,e,o,a,n)}}),Ph=A({batchNorm3d_:rl});function al(r,t,e,n,a,o){var i,s,u=N(r,"x","batchNorm"),c=N(t,"mean","batchNorm"),l=N(e,"variance","batchNorm");return a!=null&&(i=N(a,"scale","batchNorm")),n!=null&&(s=N(n,"offset","batchNorm")),S(u.rank===4,(function(){return"Error in batchNorm4D: x must be rank 4 but got rank "+u.rank+"."})),S(c.rank===4||c.rank===1,(function(){return"Error in batchNorm4D: mean must be rank 4 or rank 1 but got rank "+c.rank+"."})),S(l.rank===4||l.rank===1,(function(){return"Error in batchNorm4D: variance must be rank 4 or rank 1 but got rank "+l.rank+"."})),i!=null&&S(i.rank===4||i.rank===1,(function(){return"Error in batchNorm4D: scale must be rank 4 or rank 1 but got rank "+i.rank+"."})),s!=null&&S(s.rank===4||s.rank===1,(function(){return"Error in batchNorm4D: offset must be rank 4 or rank 1 but got rank "+s.rank+"."})),un(u,c,l,s,i,o)}var Lh=A({batchNormalization4d_:function(r,t,e,n,a,o){return n===void 0&&(n=.001),ca(),al(r,t,e,o,a,n)}}),Vh=A({batchNorm4d_:al}),ol=A({broadcastTo_:function(r,t){var e=N(r,"broadcastTo","x"),n=e.shape;if(t.some((function(p){return!(p>0)||p%1!=0})))throw new Error("broadcastTo(): Invalid broadcast shape ["+t+"].");if(t.length<e.rank)throw new Error("broadcastTo(): shape.length="+t.length+" < input.rank="+e.rank+".");if(t.length>e.rank){for(var a=e.shape.slice();a.length<t.length;)a.unshift(1);e=e.reshape(a)}for(var o=e.shape,i=Array.from(t),s=t.length-1;s>=0;s--)if(o[s]===t[s])i[s]=1;else if(e.shape[s]!==1)throw new Error("broadcastTo(): ["+n+"] cannot be broadcast to ["+t+"].");var u=i.map((function(p,d){return p>1?d:-1})).filter((function(p){return p>=0}));if(u.length===0)return e.clone();var c={x:e},l={shape:t,inputShape:o};return D.runKernelFunc((function(p){return p.tile(e,i)}),c,(function(p){return{x:function(){return p.sum(u,!0)}}}),cc,l)}}),Wh=A({clone_:function(r){var t=N(r,"x","clone",null);return D.runKernelFunc((function(){return D.makeTensorFromDataId(t.dataId,t.shape,t.dtype)}),{x:t},null,pc)}}),Fn=A({logicalAnd_:function(r,t){var e=N(r,"a","logicalAnd","bool"),n=N(t,"b","logicalAnd","bool");return ie(e.shape,n.shape),D.runKernelFunc((function(a){return a.logicalAnd(e,n)}),{a:e,b:n},null,"LogicalAnd")}}),Ii=A({logicalNot_:function(r){var t=N(r,"x","logicalNot","bool");return D.runKernelFunc((function(e){return e.logicalNot(t)}),{$x:t})}}),la=A({logicalOr_:function(r,t){var e=N(r,"a","logicalOr","bool"),n=N(t,"b","logicalOr","bool");return ie(e.shape,n.shape),D.runKernelFunc((function(a){return a.logicalOr(e,n)}),{$a:e,$b:n})}}),zh=A({logicalXor_:function(r,t){var e=N(r,"a","logicalXor","bool"),n=N(t,"b","logicalXor","bool");return ie(e.shape,n.shape),la(r,t).logicalAnd(Fn(r,t).logicalNot())}}),At=A({where_:function(r,t,e){var n=N(t,"a","where"),a=N(e,"b","where"),o=N(r,"condition","where","bool");return fe(n.shape,a.shape,"Error in where: "),o.rank===1?S(o.shape[0]===n.shape[0],(function(){return"The first dimension of `a` must match the size of `condition`."})):fe(o.shape,a.shape,"Error in where: "),D.runKernelFunc((function(i,s){var u=i.select(o,n,a);return s([o]),u}),{$condition:o,$a:n,$b:a},(function(i,s){var u=s[0];return{$condition:function(){return ue(u).toFloat()},$a:function(){return i.mul(u.cast(i.dtype))},$b:function(){return i.mul(u.logicalNot().cast(i.dtype))}}}))}}),pa=function(r){return Y(this,void 0,void 0,(function(){var t,e,n;return Q(this,(function(a){switch(a.label){case 0:return[4,(t=N(r,"condition","whereAsync","bool")).data()];case 1:return e=a.sent(),n=wi(t.shape,e),r!==t&&t.dispose(),[2,n]}}))}))},da=A({divNoNan_:function(r,t){var e,n=N(r,"a","div"),a=N(t,"b","div");n=(e=xe(n,a))[0],a=e[1];var o=bt(n,a),i=ue(o),s=a.equal(i);return At(s,i,o)}}),Vt=A({tile_:function(r,t){var e=N(r,"x","tile",null);S(e.rank===t.length,(function(){return"Error in transpose: rank of input "+e.rank+" must match length of reps "+t+"."}));var n=[e],a={x:e},o={reps:t};return D.runKernelFunc((function(i,s){var u=i.tile(e,t);return s([e]),u}),a,null,dc,o,n)}}),il=A({eye_:function(r,t,e,n){n===void 0&&(n="float32"),t==null&&(t=r);for(var a=te([r,t],n),o=r<=t?r:t,i=0;i<o;++i)a.set(1,i,i);var s=a.toTensor().as2D(r,t);if(e==null)return s;if(e.length===1)return Vt(ht(s,0),[e[0],1,1]);if(e.length===2)return Vt(ht(ht(s,0),0),[e[0],e[1],1,1]);if(e.length===3)return Vt(ht(ht(ht(s,0),0),0),[e[0],e[1],e[2],1,1]);throw new Error("eye() currently supports only 1D and 2D batchShapes, but received "+e.length+"D.")}}),ki=A({multinomial_:function(r,t,e,n){n===void 0&&(n=!1);var a=N(r,"logits","multinomial"),o=a.size,i=a.rank;if(o<2)throw new Error("Error in multinomial: you need at least 2 outcomes, but got "+o+".");if(i>2)throw new Error("Rank of probabilities must be 1 or 2, but is "+i);e=e||Math.random();var s=i===1?a.as2D(1,-1):a,u=D.runKernelFunc((function(c){return c.multinomial(s,n,t,e)}),{logits2D:s});return i===1?u.as1D():u}}),Tn=A({oneHot_:function(r,t,e,n){if(e===void 0&&(e=1),n===void 0&&(n=0),t<2)throw new Error("Error in oneHot: depth must be >=2, but it is "+t);var a=N(r,"indices","oneHot","int32"),o=a.shape.concat([t]),i={indices:a=a.flatten()},s={depth:t,onValue:e,offValue:n};return D.runKernelFunc((function(u,c){return c([a]),u.oneHot(a,t,e,n)}),i,null,lc,s).reshape(o)}}),Ot=A({pad_:function(r,t,e){e===void 0&&(e=0);var n=N(r,"x","pad");if(n.rank===0)throw new Error("pad(scalar) is not defined. Pass non-scalar to pad");var a={paddings:t,constantValue:e},o={x:n};return D.runKernelFunc((function(i,s){return s([n]),i.pad(n,t,e)}),o,null,hc,a)}}),Uh=A({pad1d_:function(r,t,e){return e===void 0&&(e=0),S(t.length===2,(function(){return"Invalid number of paddings. Must be length of 2."})),Ot(r,[t],e)}}),Gh=A({pad2d_:function(r,t,e){return e===void 0&&(e=0),S(t.length===2&&t[0].length===2&&t[1].length===2,(function(){return"Invalid number of paddings. Must be length of 2 each."})),Ot(r,t,e)}}),Hh=A({pad3d_:function(r,t,e){return e===void 0&&(e=0),S(t.length===3&&t[0].length===2&&t[1].length===2&&t[2].length===2,(function(){return"Invalid number of paddings. Must be length of 2 each."})),Ot(r,t,e)}}),qh=A({pad4d_:function(r,t,e){return e===void 0&&(e=0),S(t.length===4&&t[0].length===2&&t[1].length===2&&t[2].length===2&&t[3].length===2,(function(){return"Invalid number of paddings. Must be length of 2 each."})),Ot(r,t,e)}}),jh=A({rand_:function(r,t,e){var n=$(r),a=null;if(e==null||e==="float32")a=new Float32Array(n);else if(e==="int32")a=new Int32Array(n);else{if(e!=="bool")throw new Error("Unknown data type "+e);a=new Uint8Array(n)}for(var o=0;o<n;o++)a[o]=t();return D.makeTensor(a,r,e)}}),Kh=.001,sl=.1;function qa(){return D.backend.floatPrecision()===32?Kh:sl}function ja(r,t,e){var n=!0;if((Fe(r)||Fe(t))&&(n=!1),Fe(r)&&Fe(t)&&(n=!0),n){var a=r.constructor.name,o=t.constructor.name;if(a!==o)throw new Error("Arrays are of different type. Actual: "+a+". Expected: "+o)}if(Array.isArray(r)&&Array.isArray(t)){var i=gt(r),s=gt(t);if(!Re(i,s))throw new Error("Arrays have different shapes. Actual: ["+i+"]. Expected: ["+s+"]")}var u=Fe(r)?r:Tt(r),c=Fe(t)?t:Tt(t);if(u.length!==c.length)throw new Error("Arrays have different lengths actual: "+u.length+" vs expected: "+c.length+`.
Actual:   `+u+`.
Expected: `+c+".");for(var l=0;l<c.length;++l){var p=u[l],d=c[l];if(!e(p,d))throw new Error("Arrays differ: actual["+l+"] = "+p+", expected["+l+"] = "+d+`.
Actual:   `+u+`.
Expected: `+c+".")}}function Ka(r,t,e){return!isFinite(r)&&!isFinite(t)||!(isNaN(r)||isNaN(t)||Math.abs(r-t)>e)}var cg=Object.freeze({TEST_EPSILON_FLOAT16:sl,expectArraysClose:function(r,t,e){return e==null&&(e=qa()),ja(r,t,(function(n,a){return Ka(n,a,e)}))},testEpsilon:qa,expectPromiseToFail:function(r,t){r().then((function(){return t.fail()}),(function(){return t()}))},expectArraysEqual:function(r,t){var e=typeof t=="string"||typeof t=="number"||typeof t=="boolean"?[t]:t;return Bt(r)||Bt(r[0])||Bt(t)||Bt(t[0])?ja(r,e,(function(n,a){return n==a})):ja(r,t,(function(n,a){return Ka(n,a,0)}))},expectNumbersClose:function(r,t,e){if(e==null&&(e=qa()),!Ka(r,t,e))throw new Error("Numbers differ: actual === "+r+", expected === "+t)},expectValuesInRange:function(r,t,e){for(var n=0;n<r.length;n++)if(r[n]<t||r[n]>e)throw new Error("Value out of range:"+r[n]+" low: "+t+", high: "+e)},expectArrayBuffersEqual:function(r,t){expect(new Float32Array(r)).toEqual(new Float32Array(t))}}),Ri=(function(){function r(t,e,n,a,o){this.mean=t,this.stdDev=e,this.dtype=n,this.nextVal=NaN,this.truncated=a,this.truncated&&(this.upper=this.mean+2*this.stdDev,this.lower=this.mean-2*this.stdDev);var i=o||Math.random();this.random=ua(i.toString())}return r.prototype.nextValue=function(){if(!isNaN(this.nextVal)){var t=this.nextVal;return this.nextVal=NaN,t}for(var e,n,a=!1;!a;){var o=void 0,i=void 0,s=void 0;do s=(o=2*this.random()-1)*o+(i=2*this.random()-1)*i;while(s>=1||s===0);var u=Math.sqrt(-2*Math.log(s)/s);e=this.mean+this.stdDev*o*u,n=this.mean+this.stdDev*i*u,this.truncated&&!this.isValidTruncated(e)||(a=!0)}return this.truncated&&!this.isValidTruncated(n)||(this.nextVal=this.convertValue(n)),this.convertValue(e)},r.prototype.convertValue=function(t){return this.dtype==null||this.dtype==="float32"?t:Math.round(t)},r.prototype.isValidTruncated=function(t){return t<=this.upper&&t>=this.lower},r})(),Xh=(function(){function r(t,e,n,a){this.alpha=t,this.beta=1/e,this.dtype=n;var o=a||Math.random();this.randu=ua(o.toString()),this.randn=new Ri(0,1,n,!1,this.randu()),this.d=t<1?t+2/3:t-1/3,this.c=1/Math.sqrt(9*this.d)}return r.prototype.nextValue=function(){for(var t,e,n,a,o,i;;){do a=this.randn.nextValue(),i=1+this.c*a;while(i<=0);if(i*=i*i,e=1-.331*(t=a*a)*t,n=.5*t+this.d*(1-i+Math.log(i)),(o=this.randu())<e||Math.log(o)<n)break}return i=1/this.beta*this.d*i,this.alpha<1&&(i*=Math.pow(this.randu(),1/this.alpha)),this.convertValue(i)},r.prototype.convertValue=function(t){return this.dtype==="float32"?t:Math.round(t)},r})(),$h=(function(){function r(t,e,n,a){var o=this;if(t===void 0&&(t=0),e===void 0&&(e=1),this.canReturnFloat=function(){return o.dtype==null||o.dtype==="float32"},this.min=t,this.range=e-t,this.dtype=n,a==null&&(a=Math.random()),typeof a=="number"&&(a=a.toString()),!this.canReturnFloat()&&this.range<=1)throw new Error("The difference between "+t+" - "+e+" <= 1 and dtype is not float");this.random=ua(a)}return r.prototype.convertValue=function(t){return this.canReturnFloat()?t:Math.round(t)},r.prototype.nextValue=function(){return this.convertValue(this.min+this.range*this.random())},r})(),Yh=A({randomGamma_:function(r,t,e,n,a){if(e===void 0&&(e=1),n===void 0&&(n="float32"),e==null&&(e=1),n==null&&(n="float32"),n!=="float32"&&n!=="int32")throw new Error("Unsupported data type "+n);for(var o=new Xh(t,e,n,a),i=te(r,n),s=0;s<i.values.length;s++)i.values[s]=o.nextValue();return i.toTensor()}}),Qh=A({randomNormal_:function(r,t,e,n,a){if(t===void 0&&(t=0),e===void 0&&(e=1),n!=null&&n==="bool")throw new Error("Unsupported data type "+n);for(var o=new Ri(t,e,n,!1,a),i=te(r,n),s=0;s<i.values.length;s++)i.values[s]=o.nextValue();return i.toTensor()}}),ha=A({randomUniform_:function(r,t,e,n,a){t===void 0&&(t=0),e===void 0&&(e=1),n===void 0&&(n="float32");for(var o=te(r,n),i=new $h(t,e,null,a),s=0;s<o.values.length;s++)o.values[s]=i.nextValue();return o.toTensor()}}),fa=A({square_:function(r){var t=N(r,"x","square"),e=[t];return D.runKernelFunc((function(n,a){return a([t]),n.square(t)}),{x:t},null,"Square",{},e,[])}}),ma=A({squaredDifference_:function(r,t){var e,n=N(r,"a","squaredDifference"),a=N(t,"b","squaredDifference");e=xe(n,a),n=e[0],a=e[1],ie(n.shape,a.shape);var o={a:n,b:a},i=[n,a];return D.runKernelFunc((function(s,u){var c=s.squaredDifference(n,a);return u([n,a]),c}),o,(function(s,u){var c=u[0],l=u[1],p=K(2);return{a:function(){return s.mul(c.sub(l).mul(p))},b:function(){return s.mul(l.sub(c).mul(p))}}}),ta,{},i,[])}}),Ti=A({truncatedNormal_:function(r,t,e,n,a){if(t===void 0&&(t=0),e===void 0&&(e=1),n!=null&&n==="bool")throw new Error("Unsupported data type $ { dtype }");for(var o=new Ri(t,e,n,!0,a),i=te(r,n),s=0;s<i.values.length;s++)i.values[s]=o.nextValue();return i.toTensor()}}),va=A({equal_:function(r,t){var e,n=N(r,"a","equal"),a=N(t,"b","equal");return e=xe(n,a),n=e[0],a=e[1],ie(n.shape,a.shape),D.runKernelFunc((function(o){return o.equal(n,a)}),{$a:n,$b:a})}}),Jh=A({equalStrict_:function(r,t){var e=N(r,"a","equalStrict"),n=N(t,"b","equalStrict");return fe(e.shape,n.shape,"Error in equalStrict: "),e.equal(n)}}),Ai=A({greater_:function(r,t){var e,n=N(r,"a","greater"),a=N(t,"b","greater");return e=xe(n,a),n=e[0],a=e[1],ie(n.shape,a.shape),D.runKernelFunc((function(o){return o.greater(n,a)}),{a:n,b:a},null,"Greater")}}),ga=A({greaterEqual_:function(r,t){var e,n=N(r,"a","greaterEqual"),a=N(t,"b","greaterEqual");return e=xe(n,a),n=e[0],a=e[1],ie(n.shape,a.shape),D.runKernelFunc((function(o,i){var s=o.greaterEqual(n,a);return i([n,a]),s}),{a:n,b:a},(function(o,i){var s=i[0],u=i[1];return{a:function(){return ue(s)},b:function(){return ue(u)}}}),"GreaterEqual")}}),Zh=A({greaterEqualStrict_:function(r,t){var e=N(r,"a","greaterEqualStrict"),n=N(t,"b","greaterEqualStrict");return fe(e.shape,n.shape,"Error in greaterEqualStrict: "),e.greaterEqual(n)}}),ef=A({greaterStrict_:function(r,t){var e=N(r,"a","greaterStrict"),n=N(t,"b","greaterStrict");return fe(e.shape,n.shape,"Error in greaterStrict: "),e.greater(n)}}),Di=A({less_:function(r,t){var e,n=N(r,"a","less"),a=N(t,"b","less");return e=xe(n,a),n=e[0],a=e[1],ie(n.shape,a.shape),D.runKernelFunc((function(o){return o.less(n,a)}),{a:n,b:a},null,"Less")}}),Oi=A({lessEqual_:function(r,t){var e,n=N(r,"a","lessEqual"),a=N(t,"b","lessEqual");return e=xe(n,a),n=e[0],a=e[1],ie(n.shape,a.shape),D.runKernelFunc((function(o,i){var s=o.lessEqual(n,a);return i([n,a]),s}),{a:n,b:a},null,"LessEqual")}}),tf=A({lessEqualStrict_:function(r,t){var e=N(r,"a","lessEqualStrict"),n=N(t,"b","lessEqualStrict");return fe(e.shape,n.shape,"Error in lessEqualStrict: "),e.lessEqual(n)}}),nf=A({lessStrict_:function(r,t){var e=N(r,"a","lessStrict"),n=N(t,"b","lessStrict");return fe(e.shape,n.shape,"Error in lessStrict: "),e.less(n)}}),_i=A({notEqual_:function(r,t){var e,n=N(r,"a","notEqual"),a=N(t,"b","notEqual");return e=xe(n,a),n=e[0],a=e[1],ie(n.shape,a.shape),D.runKernelFunc((function(o){return o.notEqual(n,a)}),{a:n,b:a},null,"NotEqual")}}),rf=A({notEqualStrict_:function(r,t){var e=N(r,"a","notEqualStrict"),n=N(t,"b","notEqualStrict");return fe(e.shape,n.shape,"Error in notEqualStrict: "),e.notEqual(n)}});function Zs(r,t){for(var e=[],n=r;n<t;++n)e.push(n);return e}function eu(r){for(var t=[],e=0;e<r.length;++e)for(var n=0;n<r[e].length;++n)t.push(r[e][n]);return t}var cr=A({gather_:function(r,t,e){e===void 0&&(e=0);var n=N(r,"x","gather"),a=N(t,"indices","gather","int32");e=Te(e,n.shape)[0];var o=(function(i,s,u){for(var c=i.shape[u],l=[],p=1,d=1,h=0;h<u;h++)l.push(i.shape[h]),p*=i.shape[h];for(h=0;h<s.rank;h++)l.push(s.shape[h]);for(h=u+1;h<i.rank;h++)l.push(i.shape[h]),d*=i.shape[h];return{batchSize:p,sliceSize:d,dimSize:c,outputShape:l}})(n,a,e);return D.runKernelFunc((function(i,s){var u=i.gather(n,a.flatten(),e);return s([a]),u}),{x:n,indices:a},(function(i,s){var u=s[0];return{x:function(){var c=n.shape,l=u.size,p=c.slice(0,e),d=p.length,h=c.slice(e,c.length).slice(1),f=h.length,m=Zs(0,d),v=Zs(d+1,d+1+f),g=eu([p,[l],h]),y=i.reshape(g),x=u.reshape([l]),b=eu([[d],m,v]),C=y.transpose(b),E=ul(C,x,n.shape[e]),R=$r(b);return E=E.transpose(R)},indices:function(){return u}}}),"Gather",{axis:e}).reshape(o.outputShape)}}),ul=A({unsortedSegmentSum_:function(r,t,e){var n=N(r,"x","unsortedSegmentSum"),a=N(t,"segmentIds","unsortedSegmentSum","int32");return S(Ce(e),(function(){return"numSegments must be of dtype int"})),D.runKernelFunc((function(o,i){var s=o.unsortedSegmentSum(n,a,e);return i([a]),s}),{$x:n},(function(o,i){var s=i[0];return{$x:function(){return(function(u,c){for(var l=ir(c,ue(c)),p=cr(u,l),d=ga(c,K(0,"int32")),h=p.rank-d.rank,f=0;f<h;++f)d=ht(d,f+1);d=Fn(d,Gt(p.shape,"bool"));var m=ue(p);return At(d,p,m)})(o,s)}}}))}}),af=function(r,t,e){return Y(this,void 0,void 0,(function(){var n,a,o,i,s,u,c,l,p,d,h,f,m;return Q(this,(function(v){switch(v.label){case 0:for(n=N(r,"tensor","boolMask"),a=N(t,"mask","boolMask","bool"),o=e??0,i=a.rank,s=n.shape,S(i>0,(function(){return"mask cannot be scalar"})),fe(s.slice(o,o+i),a.shape,"mask's shape must match the first K dimensions of tensor's shape,"),u=1,c=o;c<o+i;c++)u*=s[c];return l=s.slice(0,o).concat([u],s.slice(o+i)),p=n.reshape(l),d=a.reshape([-1]),[4,pa(d)];case 1:return h=v.sent(),f=h.squeeze([1]),m=cr(p,f,o),r!==n&&n.dispose(),t!==a&&a.dispose(),f.dispose(),p.dispose(),d.dispose(),h.dispose(),[2,m]}}))}))};function cl(r,t,e,n,a,o,i){o===void 0&&(o="NHWC"),S(r.length===t.rank,(function(){return"Length of inShape ("+r.length+") and rank of dy ("+t.rank+") must match"}));var s=r,u=t,c=!1;t.rank===3&&(c=!0,u=t.as4D(1,t.shape[0],t.shape[1],t.shape[2]),s=[1,r[0],r[1],r[2]]),S(s.length===4,(function(){return"Error in conv2dDerInput: inShape must be length 4, but got length "+s.length+"."})),S(u.rank===4,(function(){return"Error in conv2dDerInput: dy must be rank 4, but got rank "+u.rank})),S(e.rank===4,(function(){return"Error in conv2dDerInput: filter must be rank 4, but got rank "+e.rank}));var l=o==="NHWC"?s[3]:s[1],p=o==="NHWC"?u.shape[3]:u.shape[1];S(l===e.shape[2],(function(){return"Error in conv2dDerInput: depth of input ("+l+") must match input depth for filter "+e.shape[2]+"."})),S(p===e.shape[3],(function(){return"Error in conv2dDerInput: depth of output ("+p+") must match output depth for filter "+e.shape[3]+"."})),i!=null&&S(Ce(a),(function(){return"Error in conv2dDerInput: pad must be an integer when using, dimRoundingMode "+i+" but got pad "+a+"."}));var d=sa(o),h=Ht(s,e.shape,n,1,a,i,!1,d),f=D.runKernelFunc((function(m,v){var g=m.conv2dDerInput(u,e,h);return v([e,u]),g}),{dy4D:u,filter:e},(function(m,v){var g=v[0],y=v[1];return{dy4D:function(){return cn(m,g,n,a,o,1,i)},filter:function(){return Bi(m,y,g.shape,n,a,o,i)}}}));return c?f.as3D(f.shape[1],f.shape[2],f.shape[3]):f}function Xa(r){var t=(function(o){return typeof o=="number"?[o,o,o]:o.length===2?[o[0],o[1],1]:o})(r),e=t[0],n=t[1],a=t[2];return e===1&&n===1&&a===1}function ll(r,t,e,n,a){S(r.length===t.rank,(function(){return"Length of inShape ("+r.length+") and rank of dy ("+t.rank+") must match"}));var o=r,i=t,s=!1;t.rank===4&&(s=!0,i=t.as5D(1,t.shape[0],t.shape[1],t.shape[2],t.shape[3]),o=[1,r[0],r[1],r[2],r[3]]);var u=o[4],c=i.shape[4];S(o.length===5,(function(){return"Error in conv3dDerInput: inShape must be length 5, but got length "+o.length+"."})),S(i.rank===5,(function(){return"Error in conv3dDerInput: dy must be rank 5, but got rank "+i.rank})),S(e.rank===5,(function(){return"Error in conv3dDerInput: filter must be rank 5, but got rank "+e.rank})),S(u===e.shape[3],(function(){return"Error in conv3dDerInput: depth of input ("+u+") must match input depth for filter "+e.shape[3]+"."})),S(c===e.shape[4],(function(){return"Error in conv3dDerInput: depth of output ("+c+") must match output depth for filter "+e.shape[4]+"."}));var l=tr(o,e.shape,n,1,a),p=D.runKernelFunc((function(d){return d.conv3dDerInput(i,e,l)}),{dy5D:i});return s?p.as4D(p.shape[1],p.shape[2],p.shape[3],p.shape[4]):p}var Fi=A({conv1d_:function(r,t,e,n,a,o,i){a===void 0&&(a="NWC"),o===void 0&&(o=1);var s=N(r,"x","conv1d"),u=N(t,"filter","conv1d"),c=s,l=!1;s.rank===2&&(l=!0,c=s.as3D(1,s.shape[0],s.shape[1])),S(c.rank===3,(function(){return"Error in conv1d: input must be rank 3, but got rank "+c.rank+"."})),S(u.rank===3,(function(){return"Error in conv1d: filter must be rank 3, but got rank "+u.rank+"."})),i!=null&&S(Ce(n),(function(){return"Error in conv1d: pad must be an integer when using, dimRoundingMode "+i+" but got pad "+n+"."})),S(c.shape[2]===u.shape[1],(function(){return"Error in conv1d: depth of input ("+c.shape[2]+") must match input depth for filter "+u.shape[1]+"."})),S(Pe(e,o),(function(){return"Error in conv1D: Either stride or dilation must be 1. Got stride "+e+" and dilation '"+o+"'"})),S(a==="NWC",(function(){return"Error in conv1d: got dataFormat of "+a+" but only NWC is currently supported."}));var p=u.as4D(1,u.shape[0],u.shape[1],u.shape[2]),d=c.as4D(c.shape[0],1,c.shape[1],c.shape[2]),h=cn(d,p,[1,e],n,"NHWC",[1,o],i);return l?h.as2D(h.shape[2],h.shape[3]):h.as3D(h.shape[0],h.shape[2],h.shape[3])}}),cn=A({conv2d_:function(r,t,e,n,a,o,i){a===void 0&&(a="NHWC"),o===void 0&&(o=[1,1]);var s=N(r,"x","conv2d"),u=N(t,"filter","conv2d"),c=s,l=!1;s.rank===3&&(l=!0,c=s.as4D(1,s.shape[0],s.shape[1],s.shape[2])),S(c.rank===4,(function(){return"Error in conv2d: input must be rank 4, but got rank "+c.rank+"."})),S(u.rank===4,(function(){return"Error in conv2d: filter must be rank 4, but got rank "+u.rank+"."})),i!=null&&S(Ce(n),(function(){return"Error in conv2d: pad must be an integer when using, dimRoundingMode "+i+" but got pad "+n+"."}));var p=a==="NHWC"?c.shape[3]:c.shape[1];S(p===u.shape[2],(function(){return"Error in conv2d: depth of input ("+p+") must match input depth for filter "+u.shape[2]+"."})),S(Pe(e,o),(function(){return"Error in conv2D: Either strides or dilations must be 1. Got strides "+e+" and dilations '"+o+"'"}));var d=sa(a),h=Ht(c.shape,u.shape,e,o,n,i,!1,d),f=[u,c],m=D.runKernelFunc((function(v,g){var y=v.conv2d(c,u,h);return g([u,c]),y}),{x:c,filter:u},(function(v,g){var y=g,x=y[0],b=y[1];return S(an(o),(function(){return"Error in gradient of conv2D: dilation rates greater than 1 are not yet supported in gradients. Got dilations '"+o+"'"})),{x:function(){return pl(b.shape,v,x,e,n,a)},filter:function(){return Bi(b,v,x.shape,e,n,a)}}}),"Conv2D",h,f);return l?m.as3D(m.shape[1],m.shape[2],m.shape[3]):m}}),Mi=A({conv3d_:function(r,t,e,n,a,o){a===void 0&&(a="NDHWC"),o===void 0&&(o=[1,1,1]);var i=N(r,"x","conv3d"),s=N(t,"filter","conv3d"),u=i,c=!1;i.rank===4&&(c=!0,u=i.as5D(1,i.shape[0],i.shape[1],i.shape[2],i.shape[3])),S(u.rank===5,(function(){return"Error in conv3d: input must be rank 5, but got rank "+u.rank+"."})),S(s.rank===5,(function(){return"Error in conv3d: filter must be rank 5, but got rank "+s.rank+"."})),S(u.shape[4]===s.shape[3],(function(){return"Error in conv3d: depth of input ("+u.shape[4]+") must match input depth for filter "+s.shape[3]+"."})),S((function(d,h){return Xa(d)||Xa(h)})(e,o),(function(){return"Error in conv3D: Either strides or dilations must be 1. Got strides "+e+" and dilations '"+o+"'"})),S(a==="NDHWC",(function(){return"Error in conv3d: got dataFormat of "+a+" but only NDHWC is currently supported."}));var l=tr(u.shape,s.shape,e,o,n),p=D.runKernelFunc((function(d,h){var f=d.conv3d(u,s,l);return h([u,s]),f}),{x:u,$filter:s},(function(d,h){S(Xa(o),(function(){return"Error in gradient of conv3D: dilation rates greater than 1 are not yet supported in gradients. Got dilations '"+o+"'"}));var f=h[0],m=h[1];return{x:function(){return ll(f.shape,d,m,e,n)},$filter:function(){return(function(v,g,y,x,b){var C=v;v.rank===4&&(C=v.as5D(1,v.shape[0],v.shape[1],v.shape[2],v.shape[3]));var E=g;E.rank===4&&(E=g.as5D(1,g.shape[0],g.shape[1],g.shape[2],g.shape[3])),S(C.rank===5,(function(){return"Error in conv3dDerFilter: input must be rank 5, but got shape "+C.shape+"."})),S(E.rank===5,(function(){return"Error in conv3dDerFilter: dy must be rank 5, but got shape "+E.shape+"."})),S(y.length===5,(function(){return"Error in conv3dDerFilter: filterShape must be length 5, but got "+y+"."})),S(C.shape[4]===y[3],(function(){return"Error in conv3dDerFilter: depth of input "+C.shape[4]+") must match input depth in filter ("+y[3]+"."})),S(E.shape[4]===y[4],(function(){return"Error in conv3dDerFilter: depth of dy ("+E.shape[4]+") must match output depth for filter ("+y[4]+")."}));var R=tr(C.shape,y,x,1,b);return D.runKernelFunc((function(I){return I.conv3dDerFilter(C,E,R)}),{x5D:C,dy5D:E})})(f,d,m.shape,e,n)}}}));return c?p.as4D(p.shape[1],p.shape[2],p.shape[3],p.shape[4]):p}}),Bi=A({conv2dDerFilter_:function(r,t,e,n,a,o,i){o===void 0&&(o="NHWC");var s=r;r.rank===3&&(s=r.as4D(1,r.shape[0],r.shape[1],r.shape[2]));var u=t;u.rank===3&&(u=t.as4D(1,t.shape[0],t.shape[1],t.shape[2])),S(s.rank===4,(function(){return"Error in conv2dDerFilter: input must be rank 4, but got shape "+s.shape+"."})),S(u.rank===4,(function(){return"Error in conv2dDerFilter: dy must be rank 4, but got shape "+u.shape+"."})),S(e.length===4,(function(){return"Error in conv2dDerFilter: filterShape must be length 4, but got "+e+"."}));var c=o==="NHWC"?s.shape[3]:s.shape[1],l=o==="NHWC"?u.shape[3]:u.shape[1];S(c===e[2],(function(){return"Error in conv2dDerFilter: depth of input "+c+") must match input depth in filter ("+e[2]+"."})),S(l===e[3],(function(){return"Error in conv2dDerFilter: depth of dy ("+l+") must match output depth for filter ("+e[3]+")."})),i!=null&&S(Ce(a),(function(){return"Error in conv2dDerFilter: pad must be an integer when using, dimRoundingMode "+i+" but got pad "+a+"."}));var p=sa(o),d=Ht(s.shape,e,n,1,a,i,!1,p);return D.runKernelFunc((function(h){return h.conv2dDerFilter(s,u,d)}),{x4D:s,dy4D:u})}}),pl=A({conv2dDerInput_:cl}),lr=A({depthwiseConv2d_:function(r,t,e,n,a,o,i){a===void 0&&(a="NHWC"),o===void 0&&(o=[1,1]);var s=N(r,"x","depthwiseConv2d"),u=N(t,"filter","depthwiseConv2d"),c=s,l=!1;s.rank===3&&(l=!0,c=s.as4D(1,s.shape[0],s.shape[1],s.shape[2])),S(c.rank===4,(function(){return"Error in depthwiseConv2d: input must be rank 4, but got rank "+c.rank+"."})),S(u.rank===4,(function(){return"Error in depthwiseConv2d: filter must be rank 4, but got rank "+u.rank+"."})),S(c.shape[3]===u.shape[2],(function(){return"Error in depthwiseConv2d: number of input channels ("+c.shape[3]+") must match the inChannels dimension in filter "+u.shape[2]+"."})),o==null&&(o=[1,1]),S(Pe(e,o),(function(){return"Error in depthwiseConv2d: Either strides or dilations must be 1. Got strides "+e+" and dilations '"+o+"'"})),i!=null&&S(Ce(n),(function(){return"Error in depthwiseConv2d: pad must be an integer when using, dimRoundingMode "+i+" but got pad "+n+"."}));var p=Ht(c.shape,u.shape,e,o,n,i,!0),d=[c,u],h=D.runKernelFunc((function(f,m){var v=f.depthwiseConv2D(c,u,p);return m([c,u]),v}),{x:c,filter:u},(function(f,m){S(an(o),(function(){return"Error in gradient of depthwiseConv2d: dilation rates greater than 1 are not yet supported. Got dilations '"+o+"'"}));var v=m[0],g=m[1];return{x:function(){return dl(v.shape,f,g,p)},filter:function(){return hl(v,f,g.shape,p)}}}),"DepthwiseConv2dNative",p,d);return l?h.as3D(h.shape[1],h.shape[2],h.shape[3]):h}}),dl=A({depthwiseConv2dDerInput_:function(r,t,e,n){var a=t,o=!1;t.rank===3&&(o=!0,a=t.as4D(1,t.shape[0],t.shape[1],t.shape[2]));var i=D.runKernelFunc((function(s){return s.depthwiseConv2DDerInput(a,e,n)}),{dy4D:a});return o?i.as3D(i.shape[1],i.shape[2],i.shape[3]):i}}),hl=A({depthwiseConv2dDerFilter_:function(r,t,e,n){var a=r;r.rank===3&&(a=r.as4D(1,r.shape[0],r.shape[1],r.shape[2]));var o=t;return o.rank===3&&(o=t.as4D(1,t.shape[0],t.shape[1],t.shape[2])),D.runKernelFunc((function(i){return i.depthwiseConv2DDerFilter(a,o,n)}),{x4D:a,dy4D:o})}}),of=A({separableConv2d_:function(r,t,e,n,a,o,i){o===void 0&&(o=[1,1]),i===void 0&&(i="NHWC");var s=N(r,"x","separableConv2d"),u=N(t,"depthwiseFilter","separableConv2d"),c=N(e,"pointwiseFilter","separableConv2d"),l=s,p=!1;if(s.rank===3&&(p=!0,l=s.as4D(1,s.shape[0],s.shape[1],s.shape[2])),i==="NCHW")throw new Error("separableConv2d currently does not support dataFormat NCHW; only NHWC is supported");S(l.rank===4,(function(){return"Error in separableConv2d: input must be rank 4, but got rank "+l.rank+"."})),S(u.rank===4,(function(){return"Error in separableConv2d: depthwise filter must be rank 4, but got rank "+u.rank+"."})),S(c.rank===4,(function(){return"Error in separableConv2d: pointwise filter must be rank 4, but got rank "+u.rank+"."})),S(c.shape[0]===1,(function(){return"Error in separableConv2d: the first dimension of pointwise filter  must be 1, but got "+c.shape[0]+"."})),S(c.shape[1]===1,(function(){return"Error in separableConv2d: the second dimension of pointwise filter must be 1, but got "+c.shape[1]+"."}));var d=u.shape[2],h=u.shape[3];S(c.shape[2]===d*h,(function(){return"Error in separableConv2d: the third dimension of pointwise filter must be "+d*h+", but got "+c.shape[2]+"."}));var f=lr(l,u,n,a,i,o),m=cn(f,c,1,"valid",i);return p?m.as3D(m.shape[1],m.shape[2],m.shape[3]):m}}),Pi=A({conv2dTranspose_:function(r,t,e,n,a,o){return cl(e,N(r,"x","conv2dTranspose"),N(t,"filter","conv2dTranspose"),n,a,"NHWC",o)}}),sf=A({conv3dTranspose_:function(r,t,e,n,a){return ll(e,N(r,"x","conv3dTranspose"),N(t,"filter","conv3dTranspose"),n,a)}}),ya=A({matMul_:function(r,t,e,n){var a;e===void 0&&(e=!1),n===void 0&&(n=!1);var o=N(r,"a","matMul"),i=N(t,"b","matMul");a=xe(o,i),o=a[0],i=a[1];var s=e?o.shape[o.rank-2]:o.shape[o.rank-1],u=n?i.shape[i.rank-1]:i.shape[i.rank-2],c=e?o.shape[o.rank-1]:o.shape[o.rank-2],l=n?i.shape[i.rank-2]:i.shape[i.rank-1],p=o.shape.slice(0,-2),d=i.shape.slice(0,-2),h=$(p),f=$(d);S(o.rank>=2&&i.rank>=2&&o.rank===i.rank,(function(){return"Error in matMul: inputs must have the same rank of at least 2, got ranks "+o.rank+" and "+i.rank+"."})),S(Re(p,d),(function(){return"Error in matMul: outer dimensions ("+p+") and ("+d+") of Tensors with shapes "+o.shape+" and "+i.shape+" must match."})),S(s===u,(function(){return"Error in matMul: inner shapes ("+s+") and ("+u+") of Tensors with shapes "+o.shape+" and "+i.shape+" and transposeA="+e+" and transposeB="+n+" must match."}));var m=o.shape.slice(0,-2).concat([c,l]),v=e?o.as3D(h,s,c):o.as3D(h,c,s),g=n?i.as3D(f,l,u):i.as3D(f,u,l),y={transposeA:e,transposeB:n};return D.runKernelFunc((function(x,b){var C=x.batchMatMul(v,g,e,n);return b([v,g]),C}),{a:v,b:g},(function(x,b){var C=b,E=C[0],R=C[1];return e||n?!e&&n?{a:function(){return x.matMul(R,!1,!1)},b:function(){return x.matMul(E,!0,!1)}}:e&&!n?{a:function(){return R.matMul(x,!1,!0)},b:function(){return E.matMul(x,!1,!1)}}:{a:function(){return R.matMul(x,!0,!0)},b:function(){return x.matMul(E,!0,!0)}}:{a:function(){return x.matMul(R,!1,!0)},b:function(){return E.matMul(x,!0,!1)}}}),"BatchMatMul",y).reshape(m)}}),uf=A({dot_:function(r,t){var e=N(r,"t1","dot"),n=N(t,"t2","dot");S(!(e.rank!==1&&e.rank!==2||n.rank!==1&&n.rank!==2),(function(){return"Error in dot: inputs must all be rank 1 or 2, but got ranks "+e.rank+" and "+n.rank+"."}));var a=e.rank===1?e.size:e.shape[1],o=n.rank===1?n.size:n.shape[0];return S(a===o,(function(){return"Error in dot: inner dimensions of inputs must match, but got "+a+" and "+o+"."})),e.rank===1&&n.rank===1?e.as2D(1,-1).matMul(n.as2D(-1,1)).asScalar():e.rank===1&&n.rank===2?e.as2D(1,-1).matMul(n.as2D(n.shape[0],n.shape[1])).as1D():e.rank===2&&n.rank===1?e.matMul(n.as2D(-1,1)).as1D():e.matMul(n.as2D(n.shape[0],n.shape[1]))}}),cf=A({outerProduct_:function(r,t){var e=N(r,"v1","outerProduct"),n=N(t,"v2","outerProduct");return S(e.rank===1&&n.rank===1,(function(){return"Error in outerProduct: inputs must be rank 1, but got ranks "+e.rank+" and "+n.rank+"."})),e.as2D(-1,1).matMul(n.as2D(1,-1))}}),ln=A({reverse_:function(r,t){var e=N(r,"x","reverse");if(e.rank===0)return e.clone();var n=Te(t,e.shape);return D.runKernelFunc((function(a){return a.reverse(e,n)}),{$x:e},(function(a){return{$x:function(){return a.reverse(n)}}})).reshapeAs(e)}}),lf=A({reverse1d_:function(r){var t=N(r,"x","reverse");return S(t.rank===1,(function(){return"Error in reverse1D: x must be rank 1 but got rank "+t.rank+"."})),ln(t,0)}}),pf=A({reverse2d_:function(r,t){var e=N(r,"x","reverse");return S(e.rank===2,(function(){return"Error in reverse2D: x must be rank 2 but got rank "+e.rank+"."})),ln(e,t)}}),df=A({reverse3d_:function(r,t){var e=N(r,"x","reverse");return S(e.rank===3,(function(){return"Error in reverse3D: x must be rank 3 but got rank "+e.rank+"."})),ln(e,t)}}),hf=A({reverse4d_:function(r,t){var e=N(r,"x","reverse");return S(e.rank===4,(function(){return"Error in reverse4D: x must be rank 4 but got rank "+e.rank+"."})),ln(e,t)}});function fl(r,t,e,n,a,o){var i=N(r,"x","maxPool"),s=i,u=!1;i.rank===3&&(u=!0,s=i.as4D(1,i.shape[0],i.shape[1],i.shape[2])),n==null&&(n=[1,1]),S(s.rank===4,(function(){return"Error in maxPool: input must be rank 4 but got rank "+s.rank+"."})),S(Pe(e,n),(function(){return"Error in maxPool: Either strides or dilations must be 1. Got strides "+e+" and dilations '"+n+"'"})),o!=null&&S(Ce(a),(function(){return"Error in maxPool: pad must be an integer when using, dimRoundingMode "+o+" but got pad "+a+"."}));var c=zt(s.shape,t,e,n,a,o);if(c.filterWidth===1&&c.filterHeight===1&&Re(c.inShape,c.outShape))return i.clone();var l=[s],p=D.runKernelFunc((function(d,h){var f=d.maxPool(s,c);return h([s,f]),f}),{x:s},(function(d,h){var f=h[0],m=h[1];return{x:function(){return(function(v,g,y,x,b,C,E,R){var I=N(v,"dy","maxPoolBackprop"),k=N(g,"input","maxPoolBackprop"),T=N(y,"output","maxPoolBackprop");S(k.rank===I.rank,(function(){return"Rank of input ("+k.rank+") does not match rank of dy ("+I.rank+")"})),C==null&&(C=[1,1]),S(Pe(b,C),(function(){return"Error in maxPoolBackProp: Either strides or dilations must be 1. Got strides "+b+" and dilations '"+C+"'"})),S(I.rank===4,(function(){return"Error in maxPoolBackprop: dy must be rank 4 but got rank "+I.rank+"."})),S(k.rank===4,(function(){return"Error in maxPoolBackprop: input must be rank 4 but got rank "+k.rank+"."})),R!=null&&S(Ce(E),(function(){return"Error in maxPoolBackprop: pad must be an integer when using, dimRoundingMode "+R+" but got pad "+E+"."}));var O=zt(k.shape,x,b,C,E,R);return D.runKernelFunc((function(_){return _.maxPoolBackprop(I,k,T,O)}),{$dy:I,$input:k})})(d,f,m,t,e,n,a)}}}),"MaxPool",c,l);return u?p.as3D(p.shape[1],p.shape[2],p.shape[3]):p}function ml(r,t,e,n,a,o){var i=N(r,"x","avgPool","float32");n==null&&(n=[1,1]),S(Pe(e,n),(function(){return"Error in avgPool: Either strides or dilations must be 1. Got strides "+e+" and dilations '"+n+"'"}));var s=i,u=!1;i.rank===3&&(u=!0,s=i.as4D(1,i.shape[0],i.shape[1],i.shape[2])),S(s.rank===4,(function(){return"Error in avgPool: x must be rank 4 but got rank "+s.rank+"."})),o!=null&&S(Ce(a),(function(){return"Error in avgPool: pad must be an integer when using, dimRoundingMode "+o+" but got pad "+a+"."}));var c=zt(s.shape,t,e,n,a,o);if(c.filterWidth===1&&c.filterHeight===1&&Re(c.inShape,c.outShape))return i.clone();var l=D.runKernelFunc((function(p){return p.avgPool(s,c)}),{x:s},(function(p){return{x:function(){return(function(d,h,f,m,v,g){var y=N(d,"dy","avgPoolBackprop"),x=N(h,"input","avgPoolBackprop");S(x.rank===y.rank,(function(){return"Rank of input ("+x.rank+") does not match rank of dy ("+y.rank+")"})),v==null&&(v=[1,1]),S(Pe(m,v),(function(){return"Error in avgPoolBackprop: Either strides or dilations must be 1. Got strides "+m+" and dilations '"+v+"'"}));var b=x,C=y,E=!1;x.rank===3&&(E=!0,b=x.as4D(1,x.shape[0],x.shape[1],x.shape[2]),C=y.as4D(1,y.shape[0],y.shape[1],y.shape[2])),S(C.rank===4,(function(){return"Error in avgPoolBackprop: dy must be rank 4 but got rank "+C.rank+"."})),S(b.rank===4,(function(){return"Error in avgPoolBackprop: input must be rank 4 but got rank "+b.rank+"."}));var R=zt(b.shape,f,m,v,g),I=D.runKernelFunc((function(k){return k.avgPoolBackprop(C,b,R)}),{dy4D:C,input4D:b});return E?I.as3D(I.shape[1],I.shape[2],I.shape[3]):I})(p,s,t,e,n,a)}}}),"AvgPool",c);return l=l.cast(i.dtype),u?l.as3D(l.shape[1],l.shape[2],l.shape[3]):l}var Li=A({maxPool_:function(r,t,e,n,a){return fl(r,t,e,1,n,a)}}),Vi=A({avgPool_:function(r,t,e,n,a){return ml(r,t,e,1,n,a)}}),ff=A({pool_:function(r,t,e,n,a,o){a==null&&(a=[1,1]),o==null&&(o=1),n===0&&(n="valid");var i=N(r,"x","maxPool"),s=i,u=!1;i.rank===3&&(u=!0,s=i.as4D(1,i.shape[0],i.shape[1],i.shape[2])),S(Pe(o,a),(function(){return"Error in pool: Either strides or dilations must be 1. Got strides "+o+" and dilations '"+a+"'"}));var c,l=zt(s.shape,t,o,a,n),p=[l.dilationHeight,l.dilationWidth];c=n==="same"?(function(b,C){var E=b.map((function(k,T){return k+(k-1)*(C[T]-1)})).map((function(k){return k-1})),R=E.map((function(k){return Math.floor(k/2)})),I=E.map((function(k,T){return k-R[T]}));return E.map((function(k,T){return[R[T],I[T]]}))})([l.filterHeight,l.filterWidth],p):[[0,0],[0,0]];var d=p[0]===1&&p[1]===1,h=(function(b,C,E){var R=E.map((function(L){return L[0]})),I=E.map((function(L){return L[1]})),k=b.concat(R,I),T=C.map((function(L,P){return(L-k[P]%L)%L})),O=I.map((function(L,P){return L+T[P]})),_=C.map((function(L,P){return[R[P],O[P]]})),W=C.map((function(L,P){return[0,T[P]]}));return[_,W]})([l.inHeight,l.inWidth],p,c),f=h[0],m=h[1],v=d?n:"valid",g=d?s:Jr(s,p,f),y=(e==="avg"?function(){return ml(g,t,o,1,v)}:function(){return fl(g,t,o,1,v)})(),x=d?y:Qr(y,p,m);return u?x.as3D(x.shape[1],x.shape[2],x.shape[3]):x}}),Wi=A({maxPool3d_:function(r,t,e,n,a,o,i){o===void 0&&(o="NDHWC");var s=N(r,"x","maxPool3d"),u=s,c=!1;s.rank===4&&(c=!0,u=s.as5D(1,s.shape[0],s.shape[1],s.shape[2],s.shape[3])),i==null&&(i=[1,1,1]),S(u.rank===5,(function(){return"Error in maxPool3d: x must be rank 5 but got rank "+u.rank+"."})),S(o==="NDHWC",(function(){return"Error in maxPool3d: Only NDHWC is currently supported, but got dataFormat of "+o})),S(Pe(e,i),(function(){return"Error in maxPool3d: Either strides or dilations must be 1. Got strides "+e+" and dilations '"+i+"'"})),a!=null&&S(Ce(n),(function(){return"Error in maxPool3d: pad must be an integer when using, dimRoundingMode "+a+" but got pad "+n+"."}));var l=er(u.shape,t,e,i,n,a,o),p=D.runKernelFunc((function(d,h){var f=d.maxPool3d(u,l);return h([u,f]),f}),{x:u},(function(d,h){var f=h[0],m=h[1];return{x:function(){return(function(v,g,y,x,b,C,E,R){var I=N(v,"dy","maxPool3dBackprop"),k=N(g,"input","maxPool3dBackprop"),T=N(y,"output","maxPool3dBackprop"),O=I,_=k,W=T,L=!1;k.rank===4&&(L=!0,O=I.as5D(1,I.shape[0],I.shape[1],I.shape[2],I.shape[3]),_=k.as5D(1,k.shape[0],k.shape[1],k.shape[2],k.shape[3]),W=T.as5D(1,T.shape[0],T.shape[1],T.shape[2],T.shape[3])),S(O.rank===5,(function(){return"Error in maxPool3dBackprop: dy must be rank 5 but got rank "+O.rank+"."})),S(_.rank===5,(function(){return"Error in maxPool3dBackprop: input must be rank 5 but got rank "+_.rank+"."})),S(W.rank===5,(function(){return"Error in maxPool3dBackprop: output must be rank 5 but got rank "+W.rank+"."})),C==null&&(C=[1,1,1]),S(Pe(b,C),(function(){return"Error in maxPool3dBackprop: Either strides or dilations must be 1. Got strides "+b+" and dilations '"+C+"'"})),R!=null&&S(Ce(E),(function(){return"Error in maxPool3dBackprop: pad must be an integer when using, dimRoundingMode "+R+" but got pad "+E+"."}));var P=er(_.shape,x,b,C,E,R),U=D.runKernelFunc((function(G){return G.maxPool3dBackprop(O,_,W,P)}),{dy5D:O,input5D:_});return L?U.as4D(U.shape[1],U.shape[2],U.shape[3],U.shape[4]):U})(d,f,m,t,e,i,n,a)}}}));return c?p.as4D(p.shape[1],p.shape[2],p.shape[3],p.shape[4]):p}}),zi=A({avgPool3d_:function(r,t,e,n,a,o,i){o===void 0&&(o="NDHWC");var s=N(r,"x","avgPool3d","float32"),u=s,c=!1;s.rank===4&&(c=!0,u=s.as5D(1,s.shape[0],s.shape[1],s.shape[2],s.shape[3])),i==null&&(i=[1,1,1]),S(u.rank===5,(function(){return"Error in avgPool3d: x must be rank 5 but got rank "+u.rank+"."})),S(o==="NDHWC",(function(){return"Error in avgPool3d: Only NDHWC is currently supported, but got dataFormat of "+o})),S(Pe(e,i),(function(){return"Error in avgPool3d: Either strides or dilations must be 1. Got strides "+e+" and dilations '"+i+"'"})),a!=null&&S(Ce(n),(function(){return"Error in avgPool3d: pad must be an integer when using, dimRoundingMode "+a+" but got pad "+n+"."}));var l=er(u.shape,t,e,i,n,a,o),p=D.runKernelFunc((function(d){return d.avgPool3d(u,l)}),{x:u},(function(d){return{x:function(){return(function(h,f,m,v,g,y,x){var b=N(h,"dy","avgPool3dBackprop"),C=N(f,"input","avgPool3dBackprop"),E=b,R=C,I=!1;C.rank===4&&(I=!0,E=b.as5D(1,b.shape[0],b.shape[1],b.shape[2],b.shape[3]),R=C.as5D(1,C.shape[0],C.shape[1],C.shape[2],C.shape[3])),S(E.rank===5,(function(){return"Error in avgPool3dBackprop: dy must be rank 5 but got rank "+E.rank+"."})),S(R.rank===5,(function(){return"Error in avgPool3dBackprop: input must be rank 5 but got rank "+R.rank+"."})),g==null&&(g=[1,1,1]),S(Pe(v,g),(function(){return"Error in avgPool3dBackprop: Either strides or dilations must be 1. Got strides "+v+" and dilations '"+g+"'"})),x!=null&&S(Ce(y),(function(){return"Error in maxPool3dBackprop: pad must be an integer when using, dimRoundingMode "+x+" but got pad "+y+"."}));var k=er(R.shape,m,v,g,y,x),T=D.runKernelFunc((function(O){return O.avgPool3dBackprop(E,R,k)}),{dy5D:E,input5D:R});return I?T.as4D(T.shape[1],T.shape[2],T.shape[3],T.shape[4]):T})(d,u,t,e,i,n,a)}}}));return p=p.cast(u.dtype),c?p.as4D(p.shape[1],p.shape[2],p.shape[3],p.shape[4]):p}}),Ui=A({maxPoolWithArgmax_:function(r,t,e,n,a){a===void 0&&(a=!1);var o=N(r,"x","maxPoolWithArgmax"),i={filterSize:t,strides:e,pad:n,includeBatchInIndex:a},s=D.runKernel("MaxPoolWithArgmax",{x:o},i);return{result:s[0],indexes:s[1]}}}),rt=A({slice_:function(r,t,e){var n,a,o=N(r,"x","slice");if(o.rank===0)throw new Error("Slicing scalar is not possible");(n=typeof t=="number"?[t].concat(new Array(o.rank-1).fill(0)):t.length<o.rank?t.concat(new Array(o.rank-t.length).fill(0)):t.slice()).forEach((function(u){S(u!==-1,(function(){return"slice() does not support negative begin indexing."}))})),a=(a=e==null?new Array(o.rank).fill(-1):typeof e=="number"?[e].concat(new Array(o.rank-1).fill(-1)):e.length<o.rank?e.concat(new Array(o.rank-e.length).fill(-1)):e).map((function(u,c){return u>=0?u:(S(u===-1,(function(){return"Negative size values should be exactly -1 but got "+u+" for the slice() size at index "+c+"."})),o.shape[c]-n[c])})),vc(o,n,a);var i=o.shape,s={begin:n,size:a};return D.runKernelFunc((function(u){return u.slice(o,n,a)}),{x:o},(function(u){for(var c=[],l=0;l<u.rank;l++)c.push([n[l],i[l]-n[l]-a[l]]);return{x:function(){return Ot(u,c)}}}),"Slice",s)}}),mf=A({slice1d_:function(r,t,e){var n=N(r,"x","slice1d");return S(n.rank===1,(function(){return"slice1d expects a rank-1 tensor, but got a rank-"+n.rank+" tensor"})),rt(n,[t],[e])}}),vf=A({slice2d_:function(r,t,e){var n=N(r,"x","slice2d");return S(n.rank===2,(function(){return"slice2d expects a rank-2 tensor, but got a rank-"+n.rank+" tensor"})),rt(n,t,e)}}),gf=A({slice3d_:function(r,t,e){var n=N(r,"x","slice3d");return S(n.rank===3,(function(){return"slice3d expects a rank-3 tensor, but got a rank-"+n.rank+" tensor"})),rt(n,t,e)}}),yf=A({slice4d_:function(r,t,e){var n=N(r,"x","slice4d");return S(n.rank===4,(function(){return"slice4d expects a rank-4 tensor, but got a rank-"+n.rank+" tensor"})),rt(n,t,e)}});function vl(r,t,e,n,a){return t.rank<e.rank&&(t=t.reshape(Le(t.shape,n))),r.rank<e.rank&&(r=r.reshape(Le(r.shape,n))),{x:function(){var o=r.mul(e.equal(t).cast(r.dtype));return a==null?o:o.transpose(a)}}}var Gi=A({all_:function(r,t,e){t===void 0&&(t=null),e===void 0&&(e=!1);var n=N(r,"x","all","bool"),a=Te(t,n.shape),o=a,i=ot(o,n.rank);i!=null&&(n=n.transpose(i),o=it(o.length,n.rank));var s=D.runKernelFunc((function(c){return c.all(n,o)}),{$x:n});if(e){var u=Le(s.shape,a);return s.reshape(u)}return s}}),Hi=A({any_:function(r,t,e){t===void 0&&(t=null),e===void 0&&(e=!1);var n=N(r,"x","any","bool"),a=Te(t,n.shape),o=a,i=ot(o,n.rank);i!=null&&(n=n.transpose(i),o=it(o.length,n.rank));var s=D.runKernelFunc((function(c){return c.any(n,o)}),{$x:n});if(e){var u=Le(s.shape,a);return s.reshape(u)}return s}}),qi=A({argMax_:function(r,t){t===void 0&&(t=0);var e=N(r,"x","argMax");t==null&&(t=0);var n=Te(t,e.shape),a=ot(n,e.rank);a!=null&&(e=e.transpose(a),n=it(n.length,e.rank));var o={axis:n[0]},i=[e];return D.runKernelFunc((function(s,u){var c=s.argMax(e,n[0]);return u([e]),c}),{x:e},(function(s,u){var c=u[0];return{x:function(){return ue(c)}}}),"ArgMax",o,i)}}),ji=A({argMin_:function(r,t){t===void 0&&(t=0);var e=N(r,"x","argMin");t==null&&(t=0);var n=Te(t,e.shape),a=ot(n,e.rank);return a!=null&&(e=e.transpose(a),n=it(n.length,e.rank)),D.runKernelFunc((function(o,i){var s=o.argMin(e,n[0]);return i([e]),s}),{$x:e},(function(o,i){var s=i[0];return{$x:function(){return ue(s)}}}))}}),xf=A({logSumExp_:function(r,t,e){t===void 0&&(t=null),e===void 0&&(e=!1);var n=N(r,"x","logSumExp"),a=Te(t,n.shape),o=n.max(a,!0),i=n.sub(o).exp().sum(a).log(),s=o.reshape(i.shape).add(i);if(e){var u=Le(s.shape,a);return s.reshape(u)}return s}}),Ki=A({max_:function(r,t,e){t===void 0&&(t=null),e===void 0&&(e=!1);var n=N(r,"x","max"),a=n,o=Te(t,n.shape),i=o,s=ot(i,n.rank);s!=null&&(n=n.transpose(s),i=it(i.length,n.rank));var u=[n],c=D.runKernelFunc((function(p,d){var h=p.max(n,i);return d([a,h]),h}),{x:n},(function(p,d){return vl(p,d[1],d[0],o,s)}),"Max",{axes:i},u,[!0]);if(e){var l=Le(c.shape,o);c=c.reshape(l)}return c}}),Xi=A({mean_:function(r,t,e){t===void 0&&(t=null),e===void 0&&(e=!1);var n=N(r,"x","mean"),a=Te(t,n.shape),o=$(_e(n.shape,a)[1]);return ia((function(i){var s=K(o);return{value:(s.dtype===i.dtype?i:i.cast(s.dtype)).div(s).sum(t,e),gradFunc:function(u){var c=i.shape.slice();return a.forEach((function(l){c[l]=1})),u.reshape(c).mul(Gt(i.shape,"float32")).div(o)}}}))(n)}}),$i=A({min_:function(r,t,e){t===void 0&&(t=null),e===void 0&&(e=!1);var n=N(r,"x","min"),a=n,o=Te(t,n.shape),i=o,s=ot(i,n.rank);s!=null&&(n=n.transpose(s),i=it(i.length,n.rank));var u=[n],c=D.runKernelFunc((function(p,d){var h=p.min(n,i);return d([a,h]),h}),{x:n},(function(p,d){return vl(p,d[1],d[0],o,s)}),"Min",{axes:i},u,[!0]);if(e){var l=Le(c.shape,o);c=c.reshape(l)}return c}}),bf=A({moments_:function(r,t,e){t===void 0&&(t=null),e===void 0&&(e=!1);var n=Te(t,(r=N(r,"x","moments")).shape),a=r.mean(n,e),o=a.shape;e||(o=Le(a.shape,n));var i=r.toFloat().sub(a.reshape(o)).square();return{mean:a,variance:i.mean(n,e)}}}),ft=A({sum_:function(r,t,e){t===void 0&&(t=null),e===void 0&&(e=!1);var n=N(r,"x","sum");n.dtype==="bool"&&(n=n.toInt());var a=Te(t,n.shape);return ia((function(o){var i=ot(a,o.rank),s=a,u=o;i!=null&&(u=o.transpose(i),s=it(s.length,o.rank));var c=function(h){var f=o.shape.slice();return a.forEach((function(m){f[m]=1})),h.reshape(f).mul(Gt(o.shape,"float32"))},l={axes:s},p=D.runKernelFunc((function(h){return h.sum(u,s)}),{x:u},(function(h){return{x:function(){return c(h)}}}),"Sum",l);if(e){var d=Le(p.shape,a);p=p.reshape(d)}return{value:p,gradFunc:c}}))(n)}}),xa=A({prod_:function(r,t,e){t===void 0&&(t=null),e===void 0&&(e=!1);var n=N(r,"x","prod");n.dtype==="bool"&&(n=n.toInt());var a=Te(t,n.shape),o=ot(a,n.rank),i=a,s=n;o!=null&&(s=n.transpose(o),i=it(i.length,n.rank));var u=D.runKernelFunc((function(l){return l.prod(s,i)}),{permutedX:s});if(e){var c=Le(u.shape,a);u=u.reshape(c)}return u}}),ba=A({elu_:function(r){var t=N(r,"x","elu");return D.runKernelFunc((function(e,n){var a=e.elu(t);return n([a]),a}),{$x:t},(function(e,n){var a=n[0];return{$x:function(){return D.runKernelFunc((function(o){return o.eluDer(e,a)}),{dy:e,y:a})}}}))}}),Yi=A({leakyRelu_:function(r,t){t===void 0&&(t=.2);var e=N(r,"x","leakyRelu");return ir(K(t).mul(e),e)}}),wa=A({prelu_:function(r,t){var e=N(r,"x","prelu"),n=N(t,"alpha","prelu");return D.runKernelFunc((function(a,o){var i=a.prelu(e,n);return o([e,n]),i}),{x:e,alpha:n},(function(a,o){var i=o[0],s=o[1],u=i.greater(0);return{x:function(){return At(u,a,a.mul(s))},alpha:function(){var c=At(u,ue(a),a.mul(i)),l=ke(s.shape,a.shape);return l.length>0&&(c=c.sum(l)),c.reshape(s.shape)}}}),"Prelu")}}),Ca=A({relu_:function(r){var t=N(r,"x","relu");return t.dtype==="bool"?t.toInt():D.runKernelFunc((function(e,n){var a=e.relu(t);return n([t]),a}),{x:t},(function(e,n){var a=n[0];return{x:function(){return e.mulStrict(a.step().toFloat())}}}),"Relu")}}),gl=A({relu6_:function(r){var t=N(r,"x","relu6");return t.dtype==="bool"?t.toInt():D.runKernelFunc((function(e,n){var a=e.relu6(t);return n([t]),a}),{x:t},(function(e,n){var a=n[0],o=a.lessEqual(6).mul(a.step());return{x:function(){return e.mulStrict(o.toFloat())}}}),"Relu6")}}),Qi=A({selu_:function(r){var t=N(r,"x","selu");return D.runKernelFunc((function(e,n){var a=e.selu(t);return n([t]),a}),{$x:t},(function(e,n){var a=n[0];return{$x:function(){var o=a.greater(K(0)),i=K(Ni),s=K(Ei),u=e.mul(s),c=e.mul(i).mul(a.toFloat().exp());return At(o,u,c)}}}))}}),Ji=A({localResponseNormalization_:function(r,t,e,n,a){t===void 0&&(t=5),e===void 0&&(e=1),n===void 0&&(n=1),a===void 0&&(a=.5);var o=N(r,"x","localResponseNormalization");S(o.rank===4||o.rank===3,(function(){return`Error in localResponseNormalization: x must be rank 3 or 4 but got
               rank `+o.rank+"."})),S(Ce(t),(function(){return"Error in localResponseNormalization: depthRadius must be an integer but got depthRadius "+t+"."}));var i=o,s=!1;o.rank===3&&(s=!0,i=o.as4D(1,o.shape[0],o.shape[1],o.shape[2]));var u=D.runKernelFunc((function(c,l){var p=c.localResponseNormalization4D(i,t,e,n,a);return l([i,p]),p}),{x4D:i},(function(c,l){var p=l[0],d=l[1];return{x4D:function(){return D.runKernelFunc((function(h){return h.LRNGrad(c,p,d,t,e,n,a)}),{})}}}));return s?u.as3D(u.shape[1],u.shape[2],u.shape[3]):u}}),yl=A({norm_:function(r,t,e,n){t===void 0&&(t="euclidean"),e===void 0&&(e=null),n===void 0&&(n=!1);var a=(function s(u,c,l){if(l===void 0&&(l=null),u.rank===0)return u.abs();if(u.rank!==1&&l===null)return s(u.reshape([-1]),c,l);if(u.rank===1||typeof l=="number"||Array.isArray(l)&&l.length===1){if(c===1)return u.abs().sum(l);if(c===1/0)return u.abs().max(l);if(c===-1/0)return u.abs().min(l);if(c==="euclidean"||c===2)return u.abs().pow(K(2,"int32")).sum(l).sqrt();throw new Error("Error in norm: invalid ord value: "+c)}if(Array.isArray(l)&&l.length===2){if(c===1)return u.abs().sum(l[0]).max(l[1]-1);if(c===1/0)return u.abs().sum(l[1]).max(l[0]);if(c===-1/0)return u.abs().sum(l[1]).min(l[0]);if(c==="fro"||c==="euclidean")return u.square().sum(l).sqrt();throw new Error("Error in norm: invalid ord value: "+c)}throw new Error("Error in norm: invalid axis: "+l)})(r=N(r,"x","norm"),t,e),o=a.shape;if(n){var i=Te(e,r.shape);o=Le(a.shape,i)}return a.reshape(o)}}),wf=A({basicLSTMCell_:function(r,t,e,n,a,o){var i=N(r,"forgetBias","basicLSTMCell"),s=N(t,"lstmKernel","basicLSTMCell"),u=N(e,"lstmBias","basicLSTMCell"),c=N(n,"data","basicLSTMCell"),l=N(a,"c","basicLSTMCell"),p=N(o,"h","basicLSTMCell"),d=c.concat(p,1).matMul(s).add(u),h=d.shape[0],f=d.shape[1]/4,m=[h,f],v=d.slice([0,0],m),g=d.slice([0,f],m),y=d.slice([0,2*f],m),x=d.slice([0,3*f],m),b=v.sigmoid().mulStrict(g.tanh()).addStrict(l.mulStrict(i.add(y).sigmoid())),C=b.tanh().mulStrict(x.sigmoid());return[b,C]}}),Cf=A({multiRNNCell_:function(r,t,e,n){for(var a=N(t,"data","multiRNNCell"),o=zr(e,"c","multiRNNCell"),i=zr(n,"h","multiRNNCell"),s=a,u=[],c=0;c<r.length;c++){var l=r[c](s,o[c],i[c]);u.push(l[0]),u.push(l[1]),s=l[1]}var p=[],d=[];for(c=0;c<u.length;c+=2)p.push(u[c]),d.push(u[c+1]);return[p,d]}}),Nf=A({movingAverage_:function(r,t,e,n,a){a===void 0&&(a=!0);var o=N(r,"v","movingAverage"),i=N(t,"x","movingAverage"),s=N(e,"decay","movingAverage");Ru(o,i),S(Re(o.shape,i.shape),(function(){return"Shape mismatch in v and x"}));var u=K(1),c=u.sub(s),l=i.sub(o).mul(c);if(a){S(n!=null,(function(){return"When using zeroDebias: true, step is required."}));var p=N(n,"step","movingAverage");l=l.div(u.sub(Rn(s,p)))}return o.add(l)}}),Zi=A({stridedSlice_:function(r,t,e,n,a,o,i,s,u){if(a===void 0&&(a=0),o===void 0&&(o=0),i===void 0&&(i=0),s===void 0&&(s=0),u===void 0&&(u=0),n==null&&(n=new Array(t.length)),i!==0)throw new Error("ellipsis mask is not yet supported");var c=N(r,"x","stridedSlice"),l=fo(s),p=c.shape.slice();l.forEach((function(v){t[v]=0,e[v]=1,p.splice(v,0,1)})),c=c.reshape(p);for(var d=0;d<c.rank;d++)t[d]=gc(a,t,n,c.shape,d),e[d]=yc(o,e,n,c.shape,d),n[d]=n[d]||1;var h=fo(u);h.forEach((function(v){e[v]=t[v]+1,n[v]=1}));var f=oa(t,e,n),m=f.filter((function(v,g){return h.indexOf(g)===-1}));return n.every((function(v){return v===1}))?rt(c,t,f).reshape(m):D.runKernelFunc((function(v){return v.stridedSlice(c,t,e,n)}),{$x:c}).reshape(m)}}),es=A({topk_:function(r,t,e){t===void 0&&(t=1),e===void 0&&(e=!0);var n=N(r,"x","topk");if(n.rank===0)throw new Error("topk() expects the input to be of rank 1 or higher");var a=n.shape[n.shape.length-1];if(t>a)throw new Error("'k' passed to topk() must be <= the last dimension ("+a+") but got "+t);var o=D.runKernelFunc((function(i){return i.topk(n,t,e)}),{$x:n});return{values:o[0],indices:o[1]}}}),ts=A({scatterND_:function(r,t,e){var n=N(r,"indices","scatterND","int32"),a=N(t,"updates","scatterND");return mc(a,n,e),D.runKernelFunc((function(o){return o.scatterND(n,a,e)}),{indices:n,updates:a},null,"ScatterNd",{shape:e})}}),pr=A({fft_:function(r){S(r.dtype==="complex64",(function(){return"The dtype for tf.spectral.fft() must be complex64 but got "+r.dtype+"."}));var t=r.shape[r.shape.length-1],e=r.size/t,n=r.as2D(e,t);return D.runKernelFunc((function(a){return a.fft(n)}),{input:r}).reshape(r.shape)}}),An=A({ifft_:function(r){S(r.dtype==="complex64",(function(){return"The dtype for tf.spectral.ifft() must be complex64 but got "+r.dtype+"."}));var t=r.shape[r.shape.length-1],e=r.size/t,n=r.as2D(e,t);return D.runKernelFunc((function(a){return a.ifft(n)}),{input:r}).reshape(r.shape)}}),dr=A({rfft_:function(r,t){S(r.dtype==="float32",(function(){return"The dtype for rfft() must be real value but got "+r.dtype}));var e,n=r.shape[r.shape.length-1],a=r.size/n;if(t!=null&&t<n){var o=r.shape.map((function(g){return 0})),i=r.shape.map((function(g){return g}));i[r.shape.length-1]=t,e=r.slice(o,i),n=t}else if(t!=null&&t>n){var s=r.shape.map((function(g){return g}));s[r.shape.length-1]=t-n,e=r.concat(ye(s),r.shape.length-1),n=t}else e=r;var u=e.zerosLike(),c=Ae(e,u).as2D(a,n),l=pr(c),p=Math.floor(n/2)+1,d=ze(l),h=Ze(l),f=d.split([p,n-p],d.shape.length-1),m=h.split([p,n-p],h.shape.length-1),v=e.shape.slice();return v[e.shape.length-1]=p,Ae(f[0],m[0]).reshape(v)}}),Na=A({irfft_:function(r){var t=r.shape[r.shape.length-1],e=r.size/t;if(t<=2){var n=r.as2D(e,t),a=An(n);return ze(a)}var o=[e,2*(t-1)],i=ze(r).as2D(e,t),s=Ze(r).as2D(e,t),u=i.slice([0,1],[e,t-2]).reverse(1),c=s.slice([0,1],[e,t-2]).reverse(1).mul(K(-1)),l=i.concat(u,1),p=s.concat(c,1);return n=Ae(l,p).as2D(o[0],o[1]),a=An(n),ze(a)}}),Ef=Object.freeze({fft:pr,ifft:An,rfft:dr,irfft:Na}),Ea=A({sparseToDense_:function(r,t,e,n){n===void 0&&(n=0);var a=N(r,"sparseIndices","sparseToDense","int32"),o=N(t,"sparseValues","sparseToDense"),i=N(n,"defaultValue","sparseToDense",o.dtype);return(function(s,u,c,l){if(s.dtype!=="int32")throw new Error("tf.sparseToDense() expects the indices to be int32 type, but the dtype was "+s.dtype+".");if(s.rank>2)throw new Error("sparseIndices should be a scalar, vector, or matrix, but got shape "+s.shape+".");var p=s.rank>0?s.shape[0]:1,d=s.rank>1?s.shape[1]:1;if(c.length!==d)throw new Error("outputShape has incorrect number of elements:, "+c.length+", should be: "+d+".");var h=u.size;if(u.rank!==0&&(u.rank!==1||h!==p))throw new Error("sparseValues has incorrect shape "+u.shape+", should be [] or ["+p+"]");if(u.dtype!==l.dtype)throw new Error("sparseValues.dtype must match defaultValues.dtype")})(a,o,e,i),D.runKernelFunc((function(s){return s.sparseToDense(a,o,e,i)}),{$sparseIndices:a,$sparseValues:o,$defaultValue:i})}}),ns=A({gatherND_:function(r,t){var e=N(t,"indices","gatherND","int32"),n=N(r,"x","gatherND");return D.runKernelFunc((function(a){return a.gatherND(n,e)}),{x:n,indices:e},null,"GatherNd")}}),Sf=A({diag_:function(r){var t=N(r,"x","diag").flatten(),e=r.shape.concat(r.shape);return D.runKernelFunc((function(n){return n.diag(t)}),{$x:t}).reshape(e)}}),If=A({dropout_:function(r,t,e,n){var a=N(r,"x","dropout");if(S(a.dtype==="float32",(function(){return"x has to be a floating point tensor since it's going to be scaled, but got a "+a.dtype+" tensor instead."})),S(t>=0&&t<1,(function(){return"rate must be a float in the range [0, 1), but got "+t+"."})),t===0)return r instanceof ge?a.clone():a;var o=(function(u,c){if(c==null)return u.shape.slice();if(Re(u.shape,c))return c;if(u.shape.length===c.length){for(var l=[],p=0;p<u.shape.length;p++)c[p]==null&&u.shape[p]!=null?l.push(u.shape[p]):l.push(c[p]);return l}return c})(a,e),i=1-t,s=ha(o,0,1,"float32",n).add(i).floor().div(i);return a.mul(s)}});function xl(r,t,e){for(var n=1-r%2,a=new Float32Array(r),o=0;o<r;++o){var i=2*Math.PI*o/(r+n-1);a[o]=t-e*Math.cos(i)}return nt(a,"float32")}var rs=A({hannWindow_:function(r){return xl(r,.5,.5)}}),bl=A({hammingWindow_:function(r){return xl(r,.54,.46)}}),as=A({frame_:function(r,t,e,n,a){n===void 0&&(n=!1),a===void 0&&(a=0);for(var o=0,i=[];o+t<=r.size;)i.push(rt(r,o,t)),o+=e;if(n)for(;o<r.size;){var s=o+t-r.size,u=Qe([rt(r,o,t-s),rr([s],a)]);i.push(u),o+=e}return i.length===0?Lt([],[0,t]):Qe(i).as2D(i.length,t)}}),wl=A({stft_:function(r,t,e,n,a){var o;a===void 0&&(a=rs),n==null&&(o=t,n=Math.floor(Math.pow(2,Math.ceil(Math.log(o)/Math.log(2)))));for(var i=as(r,t,e),s=Se(i,a(t)),u=[],c=0;c<i.shape[0];c++)u.push(dr(s.slice([c,0],[1,t]),n));return Qe(u)}}),kf=Object.freeze({hannWindow:rs,hammingWindow:bl,frame:as,stft:wl}),Be,Rf=function(r,t,e){return e===void 0&&(e=1),Y(this,void 0,void 0,(function(){var n,a,o,i,s,u,c,l,p,d,h,f,m,v;return Q(this,(function(g){switch(g.label){case 0:return n=N(r,"predictions","inTopK"),a=N(t,"targets","inTopK"),S(n.rank>1,(function(){return"inTopK() expects the predictions to be of rank 2 or higher, but got "+n.rank})),S(n.rank-1===a.rank,(function(){return"predictions rank should be 1 larger than targets rank, but got predictions rank "+n.rank+" and targets rank "+a.rank})),fe(n.shape.slice(0,n.shape.length-1),a.shape,"predictions's shape should be align with the targets' shape, except the last dimension."),o=n.shape[n.shape.length-1],S(e>0&&e<=o,(function(){return"'k' passed to inTopK() must be > 0 && <= the predictions last dimension ("+o+"), but got "+e})),[4,n.data()];case 1:return i=g.sent(),[4,a.data()];case 2:for(s=g.sent(),u=[i.length/o,o],l=u[1],p=nn("bool",c=u[0]),d=0;d<c;d++){for(h=d*l,f=i.subarray(h,h+l),m=[],v=0;v<f.length;v++)m.push({value:f[v],index:v});for(m.sort((function(y,x){return x.value-y.value})),p[d]=0,v=0;v<e;v++)if(m[v].index===s[d]){p[d]=1;break}}return r!==n&&n.dispose(),t!==a&&a.dispose(),[2,De(p,a.shape,"bool")]}}))}))};(function(r){r[r.NONE=0]="NONE",r[r.MEAN=1]="MEAN",r[r.SUM=2]="SUM",r[r.SUM_BY_NONZERO_WEIGHTS=3]="SUM_BY_NONZERO_WEIGHTS"})(Be||(Be={}));var Tf=A({absoluteDifference_:function(r,t,e,n){n===void 0&&(n=Be.SUM_BY_NONZERO_WEIGHTS);var a=N(r,"labels","absoluteDifference"),o=N(t,"predictions","absoluteDifference"),i=null;e!=null&&(i=N(e,"weights","absoluteDifference")),fe(a.shape,o.shape,"Error in absoluteDifference: ");var s=a.sub(o).abs();return _t(s,i,n)}}),_t=A({computeWeightedLoss_:function(r,t,e){e===void 0&&(e=Be.SUM_BY_NONZERO_WEIGHTS);var n=N(r,"losses","computeWeightedLoss"),a=null;t!=null&&(a=N(t,"weights","computeWeightedLoss"));var o=a==null?n:n.mul(a);if(e===Be.NONE)return o;if(e===Be.SUM)return o.sum();if(e===Be.MEAN){if(a==null)return o.mean();var i=n.size/a.size,s=o.sum().div(a.sum());return i>1?s.div(K(i)):s}if(e===Be.SUM_BY_NONZERO_WEIGHTS){if(a==null)return o.sum().div(K(n.size));var u=a.mul(Gt(n.shape)).notEqual(K(0)).sum().toFloat();return o.sum().div(u)}throw Error("Unknown reduction: "+e)}}),Af=A({cosineDistance_:function(r,t,e,n,a){a===void 0&&(a=Be.SUM_BY_NONZERO_WEIGHTS);var o=N(r,"labels","cosineDistance"),i=N(t,"predictions","cosineDistance"),s=null;n!=null&&(s=N(n,"weights","cosineDistance")),fe(o.shape,i.shape,"Error in cosineDistance: ");var u=K(1).sub(o.mul(i).sum(e,!0));return _t(u,s,a)}}),Df=A({hingeLoss_:function(r,t,e,n){n===void 0&&(n=Be.SUM_BY_NONZERO_WEIGHTS);var a=N(r,"labels","hingeLoss"),o=N(t,"predictions","hingeLoss"),i=null;e!=null&&(i=N(e,"weights","hingeLoss")),fe(a.shape,o.shape,"Error in hingeLoss: ");var s=K(1);a=K(2).mul(a).sub(s);var u=s.sub(a.mul(o)).relu();return _t(u,i,n)}}),Of=A({huberLoss_:function(r,t,e,n,a){n===void 0&&(n=1),a===void 0&&(a=Be.SUM_BY_NONZERO_WEIGHTS);var o=N(r,"labels","huberLoss"),i=N(t,"predictions","huberLoss"),s=null;e!=null&&(s=N(e,"weights","huberLoss")),fe(o.shape,i.shape,"Error in huberLoss: ");var u=K(n),c=i.sub(o).abs(),l=aa(c,u),p=c.sub(l),d=K(.5).mul(l.square()).add(u.mul(p));return _t(d,s,a)}}),_f=A({logLoss_:function(r,t,e,n,a){n===void 0&&(n=1e-7),a===void 0&&(a=Be.SUM_BY_NONZERO_WEIGHTS);var o=N(r,"labels","logLoss"),i=N(t,"predictions","logLoss"),s=null;e!=null&&(s=N(e,"weights","logLoss")),fe(o.shape,i.shape,"Error in logLoss: ");var u=K(1),c=K(n),l=o.mul(i.add(c).log()).neg().sub(u.sub(o).mul(u.sub(i).add(c).log()));return _t(l,s,a)}}),Ff=A({meanSquaredError_:function(r,t,e,n){n===void 0&&(n=Be.SUM_BY_NONZERO_WEIGHTS);var a=N(r,"labels","meanSquaredError"),o=N(t,"predictions","meanSquaredError"),i=null;e!=null&&(i=N(e,"weights","meanSquaredError")),fe(a.shape,o.shape,"Error in meanSquaredError: ");var s=a.squaredDifference(o);return _t(s,i,n)}}),Mf=A({sigmoidCrossEntropy_:function(r,t,e,n,a){n===void 0&&(n=0),a===void 0&&(a=Be.SUM_BY_NONZERO_WEIGHTS);var o=N(r,"multiClassLabels","sigmoidCrossEntropy"),i=N(t,"logits","sigmoidCrossEntropy"),s=null;if(e!=null&&(s=N(e,"weights","sigmoidCrossEntropy")),fe(o.shape,i.shape,"Error in sigmoidCrossEntropy: "),n>0){var u=K(n),c=K(1),l=K(.5);o=o.mul(c.sub(u)).add(l.mul(u))}var p=(function(d,h){var f=N(d,"labels","sigmoidCrossEntropyWithLogits"),m=N(h,"logits","sigmoidCrossEntropyWithLogits");fe(f.shape,m.shape,"Error in sigmoidCrossEntropyWithLogits: ");var v=m.relu(),g=m.mul(f),y=m.abs().neg().exp().log1p();return v.sub(g).add(y)})(o,i);return _t(p,s,a)}}),Bf=A({softmaxCrossEntropy_:function(r,t,e,n,a){n===void 0&&(n=0),a===void 0&&(a=Be.SUM_BY_NONZERO_WEIGHTS);var o=N(r,"onehotLabels","softmaxCrossEntropy"),i=N(t,"logits","softmaxCrossEntropy"),s=null;if(e!=null&&(s=N(e,"weights","softmaxCrossEntropy")),fe(o.shape,i.shape,"Error in softmaxCrossEntropy: "),n>0){var u=K(n),c=K(1),l=K(o.shape[1]);o=o.mul(c.sub(u)).add(u.div(l))}var p=(function(d,h,f){if(f===void 0&&(f=-1),f===-1&&(f=h.rank-1),f!==h.rank-1)throw Error("Softmax cross entropy along a non-last dimension is not yet supported. Labels / logits was rank "+h.rank+" and dim was "+f);return ia((function(m,v,g){var y=v.logSumExp([f],!0),x=v.toFloat().sub(y);return g([m,x]),{value:x.mul(m).neg().sum([f]),gradFunc:function(b,C){var E=C[0],R=C[1],I=Le(b.shape,[f]);return[b.reshape(I).mul(E.toFloat().sub(R.exp())),b.reshape(I).mul(R.exp().sub(E.toFloat()))]}}}))(d,h)})(o,i);return _t(p,s,a)}}),Pf=Object.freeze({get Reduction(){return Be},absoluteDifference:Tf,computeWeightedLoss:_t,cosineDistance:Af,hingeLoss:Df,huberLoss:Of,logLoss:_f,meanSquaredError:Ff,sigmoidCrossEntropy:Mf,softmaxCrossEntropy:Bf});function tu(r,t){return t===void 0&&(t=!1),D.tidy((function(){if(r.shape.length!==2)throw new Error("qr2d() requires a 2D Tensor, but got a "+r.shape.length+"D Tensor.");for(var e=r.shape[0],n=r.shape[1],a=il(e),o=r.clone(),i=Lt([[1]],[1,1]),s=i.clone(),u=e>=n?n:e,c=function(p){var d,h=o,f=s,m=a;d=D.tidy((function(){var v=o.slice([p,p],[e-p,1]),g=v.norm(),y=o.slice([p,p],[1,1]),x=Lt([[-1]]).where(y.greater(0),Lt([[1]])),b=y.sub(x.mul(g)),C=v.div(b);s=C.shape[0]===1?i.clone():i.concat(C.slice([1,0],[C.shape[0]-1,C.shape[1]]),0);var E=x.matMul(b).div(g).neg(),R=o.slice([p,0],[e-p,n]),I=E.mul(s),k=s.transpose();if(p===0)o=R.sub(I.matMul(k.matMul(R)));else{var T=R.sub(I.matMul(k.matMul(R)));o=o.slice([0,0],[p,n]).concat(T,0)}var O=I.transpose(),_=a.slice([0,p],[e,a.shape[1]-p]);if(p===0)a=_.sub(_.matMul(s).matMul(O));else{var W=_.sub(_.matMul(s).matMul(O));a=a.slice([0,0],[e,p]).concat(W,1)}return[s,o,a]})),s=d[0],o=d[1],a=d[2],He([h,f,m])},l=0;l<u;++l)c(l);return!t&&e>n&&(a=a.slice([0,0],[e,n]),o=o.slice([0,0],[n,n])),[a,o]}))}var Lf=A({bandPart_:function(r,t,e){if(t%1!=0)throw new Error("bandPart(): numLower must be an integer, got "+t+".");if(e%1!=0)throw new Error("bandPart(): numUpper must be an integer, got "+e+".");var n=N(r,"a","bandPart");if(n.rank<2)throw new Error("bandPart(): Rank must be at least 2, got "+n.rank+".");var a=n.shape,o=n.shape.slice(-2),i=o[0],s=o[1];if(!(t<=i))throw new Error("bandPart(): numLower ("+t+") must not be greater than the number of rows ("+i+").");if(!(e<=s))throw new Error("bandPart(): numUpper ("+e+") must not be greater than the number of columns ("+s+").");t<0&&(t=i),e<0&&(e=s);var u=kn(0,i,1,"int32").reshape([-1,1]),c=kn(0,s,1,"int32"),l=vt(u,c),p=Fn(l.lessEqual(K(+t,"int32")),l.greaterEqual(K(-e,"int32"))),d=ye([i,s],n.dtype);return yt(_n(n.reshape([-1,i,s])).map((function(h){return At(p,h,d)}))).reshape(a)}}),Vf=A({gramSchmidt_:function(r){var t;if(Array.isArray(r)){t=!1,S(r!=null&&r.length>0,(function(){return"Gram-Schmidt process: input must not be null, undefined, or empty"}));for(var e=r[0].shape[0],n=function(u){S(r[u].shape[0]===e,(function(){return"Gram-Schmidt: Non-unique lengths found in the input vectors: ("+r[u].shape[0]+" vs. "+e+")"}))},a=1;a<r.length;++a)n(a)}else t=!0,r=ar(r,r.shape[0],0).map((function(u){return Zr(u,[0])}));S(r.length<=r[0].shape[0],(function(){return"Gram-Schmidt: Number of vectors ("+r.length+") exceeds number of dimensions ("+r[0].shape[0]+")."}));var o=[],i=r,s=function(u){o.push(D.tidy((function(){var c=i[u];if(u>0)for(var l=0;l<u;++l){var p=ft(o[l].mulStrict(c)).mul(o[l]);c=c.sub(p)}return c.div(yl(c,"euclidean"))})))};for(a=0;a<r.length;++a)s(a);return t?yt(o,0):o}}),Wf=A({qr_:function(r,t){if(t===void 0&&(t=!1),r.rank<2)throw new Error("qr() requires input tensor to have a rank >= 2, but got rank "+r.rank);if(r.rank===2)return tu(r,t);var e=r.shape.slice(0,r.shape.length-2).reduce((function(i,s){return i*s})),n=_n(r.reshape([e,r.shape[r.shape.length-2],r.shape[r.shape.length-1]]),0),a=[],o=[];return n.forEach((function(i){var s=tu(i,t),u=s[0],c=s[1];a.push(u),o.push(c)})),[yt(a,0).reshape(r.shape),yt(o,0).reshape(r.shape)]}}),zf=Object.freeze({bandPart:Lf,gramSchmidt:Vf,qr:Wf});function Sa(r,t,e,n,a,o){n==null&&(n=.5),a==null&&(a=Number.NEGATIVE_INFINITY),o==null&&(o=0);var i=r.shape[0];return e=Math.min(e,i),S(0<=n&&n<=1,(function(){return"iouThreshold must be in [0, 1], but was '"+n+"'"})),S(r.rank===2,(function(){return"boxes must be a 2D tensor, but was of rank '"+r.rank+"'"})),S(r.shape[1]===4,(function(){return"boxes must have 4 columns, but 2nd dimension was "+r.shape[1]})),S(t.rank===1,(function(){return"scores must be a 1D tensor"})),S(t.shape[0]===i,(function(){return"scores has incompatible shape with boxes. Expected "+i+", but was "+t.shape[0]})),S(0<=o&&o<=1,(function(){return"softNmsSigma must be in [0, 1], but was '"+o+"'"})),{maxOutputSize:e,iouThreshold:n,scoreThreshold:a,softNmsSigma:o}}var Uf=A({resizeBilinear_:function(r,t,e){e===void 0&&(e=!1);var n=N(r,"images","resizeBilinear");S(n.rank===3||n.rank===4,(function(){return"Error in resizeBilinear: x must be rank 3 or 4, but got rank "+n.rank+"."})),S(t.length===2,(function(){return"Error in resizeBilinear: new shape must 2D, but got shape "+t+"."}));var a=n,o=!1;n.rank===3&&(o=!0,a=n.as4D(1,n.shape[0],n.shape[1],n.shape[2]));var i=t[0],s=t[1],u=D.runKernelFunc((function(c,l){return l([a]),c.resizeBilinear(a,i,s,e)}),{x:a},(function(c,l){return{x:function(){return D.runKernelFunc((function(p){return p.resizeBilinearBackprop(c,l[0],e)}),{})}}}),"ResizeBilinear",{alignCorners:e,newHeight:i,newWidth:s});return o?u.as3D(u.shape[1],u.shape[2],u.shape[3]):u}}),Gf=A({resizeNearestNeighbor_:function(r,t,e){e===void 0&&(e=!1);var n=N(r,"images","resizeNearestNeighbor");S(n.rank===3||n.rank===4,(function(){return"Error in resizeNearestNeighbor: x must be rank 3 or 4, but got rank "+n.rank+"."})),S(t.length===2,(function(){return"Error in resizeNearestNeighbor: new shape must 2D, but got shape "+t+"."})),S(n.dtype==="float32"||n.dtype==="int32",(function(){return"`images` must have `int32` or `float32` as dtype"}));var a=n,o=!1;n.rank===3&&(o=!0,a=n.as4D(1,n.shape[0],n.shape[1],n.shape[2]));var i=t[0],s=t[1],u=D.runKernelFunc((function(c,l){return l([a]),c.resizeNearestNeighbor(a,i,s,e)}),{batchImages:a},(function(c,l){return{batchImages:function(){return D.runKernelFunc((function(p){return p.resizeNearestNeighborBackprop(c,l[0],e)}),{})}}}));return o?u.as3D(u.shape[1],u.shape[2],u.shape[3]):u}}),Hf=A({nonMaxSuppression_:function(r,t,e,n,a){n===void 0&&(n=.5),a===void 0&&(a=Number.NEGATIVE_INFINITY);var o=N(r,"boxes","nonMaxSuppression"),i=N(t,"scores","nonMaxSuppression"),s=Sa(o,i,e,n,a);e=s.maxOutputSize,n=s.iouThreshold,a=s.scoreThreshold;var u={maxOutputSize:e,iouThreshold:n,scoreThreshold:a};return D.runKernelFunc((function(c){return c.nonMaxSuppression(o,i,e,n,a)}),{boxes:o,scores:i},null,"NonMaxSuppressionV3",u)}}),qf=function(r,t,e,n,a){return n===void 0&&(n=.5),a===void 0&&(a=Number.NEGATIVE_INFINITY),Y(this,void 0,void 0,(function(){var o,i,s,u,c,l,p;return Q(this,(function(d){switch(d.label){case 0:return o=N(r,"boxes","nonMaxSuppressionAsync"),i=N(t,"scores","nonMaxSuppressionAsync"),s=Sa(o,i,e,n,a),e=s.maxOutputSize,n=s.iouThreshold,a=s.scoreThreshold,[4,Promise.all([o.data(),i.data()])];case 1:return u=d.sent(),c=u[0],l=u[1],p=xi(c,l,e,n,a),o!==r&&o.dispose(),i!==t&&i.dispose(),[2,p]}}))}))},jf=A({nonMaxSuppressionWithScore_:function(r,t,e,n,a,o){n===void 0&&(n=.5),a===void 0&&(a=Number.NEGATIVE_INFINITY),o===void 0&&(o=0);var i=N(r,"boxes","nonMaxSuppression"),s=N(t,"scores","nonMaxSuppression"),u=Sa(i,s,e,n,a,o),c={maxOutputSize:e=u.maxOutputSize,iouThreshold:n=u.iouThreshold,scoreThreshold:a=u.scoreThreshold,softNmsSigma:o=u.softNmsSigma},l=D.runKernel("NonMaxSuppressionV5",{boxes:i,scores:s},c);return{selectedIndices:l[0],selectedScores:l[1]}}}),Kf=function(r,t,e,n,a,o){return n===void 0&&(n=.5),a===void 0&&(a=Number.NEGATIVE_INFINITY),o===void 0&&(o=0),Y(this,void 0,void 0,(function(){var i,s,u,c,l,p,d;return Q(this,(function(h){switch(h.label){case 0:return i=N(r,"boxes","nonMaxSuppressionAsync"),s=N(t,"scores","nonMaxSuppressionAsync"),u=Sa(i,s,e,n,a,o),e=u.maxOutputSize,n=u.iouThreshold,a=u.scoreThreshold,o=u.softNmsSigma,[4,Promise.all([i.data(),s.data()])];case 1:return c=h.sent(),l=c[0],p=c[1],d=bi(l,p,e,n,a,o),i!==r&&i.dispose(),s!==t&&s.dispose(),[2,d]}}))}))},Xf=A({cropAndResize_:function(r,t,e,n,a,o){var i=N(r,"image","cropAndResize"),s=N(t,"boxes","cropAndResize","float32"),u=N(e,"boxInd","cropAndResize","int32");a=a||"bilinear",o=o||0;var c=s.shape[0];return S(i.rank===4,(function(){return"Error in cropAndResize: image must be rank 4,but got rank "+i.rank+"."})),S(s.rank===2&&s.shape[1]===4,(function(){return"Error in cropAndResize: boxes must be have size ["+c+",4] but had shape "+s.shape+"."})),S(u.rank===1&&u.shape[0]===c,(function(){return"Error in cropAndResize: boxInd must be have size ["+c+"] but had shape "+s.shape+"."})),S(n.length===2,(function(){return"Error in cropAndResize: cropSize must be of length 2, but got length "+n.length+"."})),S(n[0]>=1&&n[1]>=1,(function(){return"cropSize must be atleast [1,1], but was "+n})),S(a==="bilinear"||a==="nearest",(function(){return"method must be bilinear or nearest, but was "+a})),D.runKernelFunc((function(l,p){return l.cropAndResize(i,s,u,n,a,o)}),{images:i,boxes:s,boxInd:u},null,"CropAndResize",{method:a,extrapolationValue:o,cropSize:n})}}),pn=Object.freeze({resizeBilinear:Uf,resizeNearestNeighbor:Gf,nonMaxSuppression:Hf,nonMaxSuppressionAsync:qf,nonMaxSuppressionWithScore:jf,nonMaxSuppressionWithScoreAsync:Kf,cropAndResize:Xf}),os=function(r,t){return!(r>0)||t==="linear"},is=function(r,t,e){if(e==null||e==="linear")return r;if(e==="relu")return r.mul(t.step());throw new Error("Gradient for activation "+e+" has not been implemented yet.")},ss=function(r,t){var e=t,n=ke(r.shape,t.shape);return n.length>0&&(e=e.sum(n)),e.reshape(r.shape)},us=function(r,t,e){if(t==="linear")return r;if(t==="relu")return Ca(r);if(t==="elu")return ba(r);if(t==="relu6")return gl(r);if(t==="prelu")return wa(r,e);throw new Error("Unknown fused activation "+t+".")},$f=A({fusedMatMul_:function(r){var t,e=r.a,n=r.b,a=r.transposeA,o=a!==void 0&&a,i=r.transposeB,s=i!==void 0&&i,u=r.bias,c=r.activation,l=c===void 0?"linear":c,p=r.preluActivationWeights;if(os(D.state.gradientDepth,l)===!1){var d=ya(e,n,o,s);return u!=null&&(d=xt(d,u)),us(d,l,p)}var h=N(e,"a","fused matMul"),f=N(n,"b","fused matMul");t=xe(h,f),h=t[0],f=t[1];var m=o?h.shape[h.rank-2]:h.shape[h.rank-1],v=s?f.shape[f.rank-1]:f.shape[f.rank-2],g=o?h.shape[h.rank-1]:h.shape[h.rank-2],y=s?f.shape[f.rank-2]:f.shape[f.rank-1],x=h.shape.slice(0,-2),b=f.shape.slice(0,-2),C=$(x),E=$(b);S(h.rank>=2&&f.rank>=2&&h.rank===f.rank,(function(){return"Error in fused matMul: inputs must have the same rank of at least 2, got ranks "+h.rank+" and "+f.rank+"."})),S(Re(x,b),(function(){return"Error in fused matMul: outer dimensions ("+x+") and ("+b+") of Tensors with shapes "+h.shape+" and "+f.shape+" must match."})),S(m===v,(function(){return"Error in fused matMul: inner shapes ("+m+") and ("+v+") of Tensors with shapes "+h.shape+" and "+f.shape+" and transposeA="+o+" and transposeB="+s+" must match."}));var R,I,k=h.shape.slice(0,-2).concat([g,y]),T=o?h.as3D(C,m,g):h.as3D(C,g,m),O=s?f.as3D(E,y,v):f.as3D(E,v,y);u!=null&&ie(k,(R=xe(R=N(u,"bias","fused matMul"),h)[0]).shape),p!=null&&(I=N(p,"prelu weights","fused matMul"));var _={a:T,b:O};u!=null&&(_.bias=R),p!=null&&(_.preluActivationWeights=I);var W=[T,O];return D.runKernelFunc((function(L,P){var U=L.fusedBatchMatMul({a:T,b:O,transposeA:o,transposeB:s,bias:R,activation:l,preluActivationWeights:I});return P([T,O,U]),U}),_,(function(L,P){var U=P[0],G=P[1],V=P[2],H=is(L,V,l),q={};return u!=null&&(q={bias:function(){return ss(R,H)}}),Object.assign(o||s?!o&&s?{a:function(){return H.matMul(G,!1,!1)},b:function(){return H.matMul(U,!0,!1)}}:o&&!s?{a:function(){return G.matMul(H,!1,!0)},b:function(){return U.matMul(H,!1,!1)}}:{a:function(){return G.matMul(H,!0,!0)},b:function(){return H.matMul(U,!0,!0)}}:{a:function(){return H.matMul(G,!1,!0)},b:function(){return U.matMul(H,!0,!1)}},q)}),"_FusedMatMul",{transposeA:o,transposeB:s,activation:l},W,[!0]).reshape(k)}}),Yf=A({fusedConv2d_:function(r){var t=r.x,e=r.filter,n=r.strides,a=r.pad,o=r.dataFormat,i=o===void 0?"NHWC":o,s=r.dilations,u=s===void 0?[1,1]:s,c=r.dimRoundingMode,l=r.bias,p=r.activation,d=p===void 0?"linear":p,h=r.preluActivationWeights;if(d=d||"linear",os(D.state.gradientDepth,d)===!1){var f=cn(t,e,n,a,i,u,c);return l!=null&&(f=xt(f,l)),us(f,d,h)}var m=N(t,"x","conv2d"),v=N(e,"filter","conv2d"),g=m,y=!1;m.rank===3&&(y=!0,g=m.as4D(1,m.shape[0],m.shape[1],m.shape[2])),S(g.rank===4,(function(){return"Error in fused conv2d: input must be rank 4, but got rank "+g.rank+"."})),S(v.rank===4,(function(){return"Error in fused conv2d: filter must be rank 4, but got rank "+v.rank+"."})),c!=null&&S(Ce(a),(function(){return"Error in fused conv2d: pad must be an integer when using, dimRoundingMode "+c+" but got pad "+a+"."})),S(g.shape[3]===v.shape[2],(function(){return"Error in conv2d: depth of input ("+g.shape[3]+") must match input depth for filter "+v.shape[2]+"."})),S(Pe(n,u),(function(){return"Error in conv2D: Either strides or dilations must be 1. Got strides "+n+" and dilations '"+u+"'"})),S(i==="NHWC",(function(){return"Error in conv2d: got dataFormat of "+i+" but only NHWC is currently supported."}));var x,b,C=Ht(g.shape,v.shape,n,u,a,c);l!=null&&(x=xe(x=N(l,"bias","fused conv2d"),m)[0],ie(C.outShape,x.shape)),h!=null&&(b=N(h,"prelu weights","fused conv2d"));var E={x:g,filter:v};l!=null&&(E.bias=x),h!=null&&(E.preluActivationWeights=b);var R=[v,g],I=D.runKernelFunc((function(k,T){var O=k.fusedConv2d({input:g,filter:v,convInfo:C,bias:x,activation:d,preluActivationWeights:b});return T([v,g,O]),O}),E,(function(k,T){var O=T,_=O[0],W=O[1],L=O[2],P=is(k,L,d);S(an(u),(function(){return"Error in gradient of fused conv2D: dilation rates greater than 1 are not yet supported in gradients. Got dilations '"+u+"'"}));var U={};return l!=null&&(U={bias:function(){return ss(x,P)}}),Object.assign({x:function(){return pl(W.shape,P,_,n,a)},filter:function(){return Bi(W,P,_.shape,n,a)}},U)}),"FusedConv2D",{convInfo:C,activation:d},R,[!0]);return y?I.as3D(I.shape[1],I.shape[2],I.shape[3]):I}}),Qf=A({fusedDepthwiseConv2d_:function(r){var t=r.x,e=r.filter,n=r.strides,a=r.pad,o=r.dataFormat,i=o===void 0?"NHWC":o,s=r.dilations,u=s===void 0?[1,1]:s,c=r.dimRoundingMode,l=r.bias,p=r.activation,d=p===void 0?"linear":p,h=r.preluActivationWeights;if(os(D.state.gradientDepth,d)===!1){var f=lr(t,e,n,a,i,u,c);return l!=null&&(f=xt(f,l)),us(f,d,h)}var m=N(t,"x","depthwiseConv2d"),v=N(e,"filter","depthwiseConv2d"),g=m,y=!1;m.rank===3&&(y=!0,g=m.as4D(1,m.shape[0],m.shape[1],m.shape[2])),S(g.rank===4,(function(){return"Error in fused depthwiseConv2d: input must be rank 4, but got rank "+g.rank+"."})),S(v.rank===4,(function(){return"Error in fused depthwiseConv2d: filter must be rank 4, but got rank "+v.rank+"."})),S(g.shape[3]===v.shape[2],(function(){return"Error in fused depthwiseConv2d: number of input channels ("+g.shape[3]+") must match the inChannels dimension in filter "+v.shape[2]+"."})),u==null&&(u=[1,1]),S(Pe(n,u),(function(){return"Error in fused depthwiseConv2d: Either strides or dilations must be 1. Got strides "+n+" and dilations '"+u+"'"})),c!=null&&S(Ce(a),(function(){return"Error in fused depthwiseConv2d: pad must be an integer when using dimRoundingMode "+c+" but got pad "+a+"."}));var x,b,C=Ht(g.shape,v.shape,n,u,a,c,!0);l!=null&&(x=xe(x=N(l,"bias","fused conv2d"),m)[0],ie(C.outShape,x.shape)),h!=null&&(b=N(h,"prelu weights","fused depthwiseConv2d"));var E={x:g,filter:v};l!=null&&(E.bias=x),h!=null&&(E.preluActivationWeights=b);var R=[v,g],I=D.runKernelFunc((function(k,T){var O=k.fusedDepthwiseConv2D({input:g,filter:v,convInfo:C,bias:x,activation:d,preluActivationWeights:b});return T([v,g,O]),O}),E,(function(k,T){S(an(u),(function(){return"Error in gradient of fused depthwiseConv2d: dilation rates greater than 1 are not yet supported. Got dilations '"+u+"'"}));var O=T[0],_=T[1],W=T[2],L=is(k,W,d),P={};return l!=null&&(P={bias:function(){return ss(x,L)}}),Object.assign({x:function(){return dl(_.shape,L,O,C)},filter:function(){return hl(_,L,O.shape,C)}},P)}),"FusedDepthwiseConv2D",{convInfo:C,activation:d},R,[!0]);return y?I.as3D(I.shape[1],I.shape[2],I.shape[3]):I}}),hr=Object.freeze({matMul:$f,conv2d:Yf,depthwiseConv2d:Qf}),Jf=Object.freeze({image:pn,linalg:zf,losses:Pf,spectral:Ef,fused:hr,signal:kf,add:xt,addN:Si,batchNorm:un,batchNormalization:_h,batchNorm2d:Mh,batchNormalization2d:Fh,batchNorm3d:Ph,batchNormalization3d:Bh,batchNorm4d:Vh,batchNormalization4d:Lh,broadcastTo:ol,clone:Wh,div:bt,divNoNan:da,eye:il,multinomial:ki,oneHot:Tn,pad:Ot,pad1d:Uh,pad2d:Gh,pad3d:Hh,pad4d:qh,rand:jh,randomGamma:Yh,randomNormal:Qh,randomUniform:ha,square:fa,squaredDifference:ma,tile:Vt,truncatedNormal:Ti,conv1d:Fi,conv2d:cn,conv3d:Mi,depthwiseConv2d:lr,separableConv2d:of,conv2dTranspose:Pi,conv3dTranspose:sf,op:A,booleanMaskAsync:af,complex:Ae,real:ze,imag:Ze,concat:Qe,concat1d:Np,concat2d:Ep,concat3d:Sp,concat4d:Ip,split:ar,matMul:ya,dot:uf,outerProduct:cf,reverse:ln,reverse1d:lf,reverse2d:pf,reverse3d:df,reverse4d:hf,maxPool:Li,avgPool:Vi,pool:ff,maxPool3d:Wi,avgPool3d:zi,maxPoolWithArgmax:Ui,slice:rt,slice1d:mf,slice2d:vf,slice3d:gf,slice4d:yf,abs:Bo,acos:Po,acosh:Lo,asin:Vo,asinh:Wo,atan:zo,atanh:Uo,ceil:Go,clipByValue:Ho,cos:qo,cosh:jo,erf:Ko,exp:Xo,expm1:$o,floor:Yo,log:Qo,log1p:Jo,logSigmoid:Tp,neg:or,reciprocal:Zo,round:ei,rsqrt:na,sigmoid:ti,sign:ni,isNaN:Ap,isInf:Dp,isFinite:Op,sin:ri,sinh:ai,softplus:oi,sqrt:ii,step:_p,tan:si,tanh:ui,all:Gi,any:Hi,argMax:qi,argMin:ji,logSumExp:xf,max:Ki,mean:Xi,min:$i,moments:bf,sum:ft,prod:xa,equal:va,equalStrict:Jh,greater:Ai,greaterEqual:ga,greaterEqualStrict:Zh,greaterStrict:ef,less:Di,lessEqual:Oi,lessEqualStrict:tf,lessStrict:nf,notEqual:_i,notEqualStrict:rf,addStrict:Fp,atan2:ci,divStrict:Mp,floorDiv:ra,maximum:ir,maximumStrict:Bp,minimum:aa,minimumStrict:Pp,mod:li,modStrict:Lp,mul:Se,mulStrict:Vp,pow:Rn,powStrict:Wp,squaredDifferenceStrict:zp,sub:vt,subStrict:Up,elu:ba,leakyRelu:Yi,prelu:wa,relu:Ca,relu6:gl,selu:Qi,logicalAnd:Fn,logicalNot:Ii,logicalOr:la,logicalXor:zh,where:At,whereAsync:pa,buffer:te,print:kp,batchToSpaceND:Qr,cast:_o,cumsum:Rp,depthToSpace:Fo,expandDims:ht,reshape:tt,spaceToBatchND:Jr,squeeze:Zr,stack:yt,unstack:_n,setdiff1dAsync:Mo,fill:rr,linspace:Oo,ones:Gt,range:kn,scalar:K,tensor:De,tensor1d:nt,tensor2d:Lt,tensor3d:oc,tensor4d:Qt,tensor5d:bp,tensor6d:wp,variable:Cp,zeros:ye,onesLike:Yr,zerosLike:ue,transpose:Ke,softmax:sr,logSoftmax:mi,localResponseNormalization:Ji,norm:yl,gather:cr,unsortedSegmentSum:ul,basicLSTMCell:wf,multiRNNCell:Cf,movingAverage:Nf,stridedSlice:Zi,topk:es,scatterND:ts,fft:pr,ifft:An,rfft:dr,irfft:Na,sparseToDense:Ea,gatherND:ns,diag:Sf,dropout:If,hannWindow:rs,hammingWindow:bl,frame:as,stft:wl,inTopKAsync:Rf});function z(r,t){Array.isArray(r)||(r=[r]),r.forEach((function(e){e!=null&&S(e.dtype!=="complex64",(function(){return t+" does not support complex64 tensors."}))}))}function go(r,t,e,n,a,o){for(var i=a.strideHeight,s=a.strideWidth,u=a.dilationHeight,c=a.dilationWidth,l=a.effectiveFilterHeight,p=a.effectiveFilterWidth,d=a.padInfo.top,h=a.padInfo.left,f=o==="max"?Number.NEGATIVE_INFINITY:Number.POSITIVE_INFINITY,m=te(a.outShape,e),v=m.values,g=a.outShape[1]*a.outShape[2]*a.outShape[3],y=a.outShape[2]*a.outShape[3],x=a.outShape[3],b=0;b<a.batchSize;++b)for(var C=b*g,E=b*n[0],R=0;R<a.inChannels;++R)for(var I=0;I<a.outHeight;++I)for(var k=I*i-d,T=Math.max(0,k),O=Math.min(a.inHeight,l+k),_=C+I*y,W=0;W<a.outWidth;++W){for(var L=W*s-h,P=Math.max(0,L),U=Math.min(a.inWidth,p+L),G=f,V=0,H=0,q=T;q<O;q+=u){for(var j=E+q*n[1],J=P;J<U;J+=c){var Z=r[j+J*n[2]+R];o==="max"&&Z>G?G=Z:o==="avg"&&(V+=Z,H++)}if(isNaN(G))break}v[_+W*x+R]=o==="avg"?V/H:G}return m}function Cl(r,t,e,n,a,o){a===void 0&&(a=!1),o===void 0&&(o=!1);for(var i=te(n.outShape,"int32"),s=n.strideHeight,u=n.strideWidth,c=n.dilationHeight,l=n.dilationWidth,p=n.effectiveFilterHeight,d=n.effectiveFilterWidth,h=n.padInfo.top,f=n.padInfo.left,m=te(t,e,r),v=0;v<n.batchSize;++v)for(var g=0;g<n.inChannels;++g)for(var y=0;y<n.outHeight;++y){for(var x=y*s-h,b=x;b<0;)b+=c;for(var C=Math.min(n.inHeight,p+x),E=0;E<n.outWidth;++E){for(var R=E*u-f,I=R;I<0;)I+=l;for(var k=Math.min(n.inWidth,d+R),T=Number.NEGATIVE_INFINITY,O=-1,_=b;_<C;_+=c)for(var W=_-x,L=I;L<k;L+=l){var P=L-R,U=m.get(v,_,L,g);U>T&&(T=U,O=a?o?((v*n.inHeight+_)*n.inWidth+L)*n.inChannels+g:(_*n.inWidth+L)*n.inChannels+g:W*d+P)}i.set(O,v,y,E,g)}}return i}function $a(r,t,e,n){if(e==="linear")return r.linear(t);if(e==="relu")return r.relu(t);if(e==="elu")return r.elu(t);if(e==="relu6")return r.relu6(t);if(e==="prelu")return r.prelu(t,n);throw new Error("Activation "+e+" has not been implemented for the CPU backend.")}var Zf=(function(r){function t(){var e=r.call(this)||this;return e.blockSize=48,e.firstUse=!0,e.data=new xc(e,D),e}return at(t,r),t.prototype.write=function(e,n,a){this.firstUse&&(this.firstUse=!1,B().get("IS_NODE")&&Wr(`
============================
Hi there \u{1F44B}. Looks like you are running TensorFlow.js in Node.js. To speed things up dramatically, install our node backend, which binds to TensorFlow C++, by running npm i @tensorflow/tfjs-node, or npm i @tensorflow/tfjs-node-gpu if you have CUDA. Then call require('@tensorflow/tfjs-node'); (-gpu suffix for CUDA) at the start of your program. Visit https://github.com/tensorflow/tfjs-node for more details.
============================`));var o={};return this.data.set(o,{values:e,dtype:a}),o},t.prototype.move=function(e,n,a,o){this.data.set(e,{values:n,dtype:o})},t.prototype.numDataIds=function(){return this.data.numDataIds()},t.prototype.read=function(e){return Y(this,void 0,void 0,(function(){return Q(this,(function(n){return[2,this.readSync(e)]}))}))},t.prototype.readSync=function(e){var n=this.data.get(e),a=n.dtype,o=n.complexTensors;return a==="complex64"?vo(this.readSync(o.real.dataId),this.readSync(o.imag.dataId)):this.data.get(e).values},t.prototype.bufferSync=function(e){var n=this.readSync(e.dataId),a=n;if(e.dtype==="string")try{a=n.map((function(o){return Xn(o)}))}catch{throw new Error("Failed to decode encoded string bytes into utf-8")}return te(e.shape,e.dtype,a)},t.prototype.makeOutput=function(e,n,a){var o=this.write(e,n,a);return D.makeTensorFromDataId(o,n,a,this)},t.prototype.disposeData=function(e){if(this.data.has(e)){var n=this.data.get(e).complexTensors;n!=null&&(n.real.dispose(),n.imag.dispose()),this.data.delete(e)}},t.prototype.time=function(e){return Y(this,void 0,void 0,(function(){var n;return Q(this,(function(a){return n=et(),e(),[2,{kernelMs:et()-n}]}))}))},t.prototype.memory=function(){return{unreliable:!0,reasons:["The reported memory is an upper bound. Due to automatic garbage collection, the true allocated memory may be less."]}},t.prototype.complex=function(e,n){var a=this.makeOutput(null,e.shape,"complex64");return this.data.get(a.dataId).complexTensors={real:D.keep(e.clone()),imag:D.keep(n.clone())},a},t.prototype.real=function(e){return this.data.get(e.dataId).complexTensors.real.clone()},t.prototype.imag=function(e){return this.data.get(e.dataId).complexTensors.imag.clone()},t.prototype.slice=function(e,n,a){if(z(e,"slice"),hi(e.shape,n,a)){var o=fi(n,e.strides),i=$(a);return De(this.readSync(e.dataId).subarray(o,o+i),a,e.dtype)}for(var s=te(a,e.dtype),u=this.bufferSync(e),c=0;c<s.size;++c){var l=s.indexToLoc(c).map((function(p,d){return p+n[d]}));s.values[c]=u.get.apply(u,l)}return s.toTensor()},t.prototype.stridedSlice=function(e,n,a,o){z(e,"stridedSlice");var i=oa(n,a,o);if(i.some((function(h){return h===0})))return De([],i);for(var s=te(i,e.dtype),u=this.bufferSync(e),c=0;c<s.size;c++){for(var l=s.indexToLoc(c),p=new Array(l.length),d=0;d<p.length;d++)p[d]=l[d]*o[d]+n[d];s.set.apply(s,[u.get.apply(u,p)].concat(l))}return s.toTensor()},t.prototype.diag=function(e){for(var n=this.readSync(e.dataId),a=te([e.size,e.size],e.dtype),o=a.values,i=0;i<n.length;i++)o[i*e.size+i]=n[i];return a.toTensor()},t.prototype.unstack=function(e,n){for(var a=e.shape[n],o=new Array(e.rank-1),i=0,s=0;s<e.rank;s++)s!==n&&(o[i++]=e.shape[s]);var u=new Array(e.rank).fill(0),c=e.shape.slice();c[n]=1;var l=new Array(a);for(s=0;s<l.length;s++)u[n]=s,l[s]=this.slice(e,u,c).reshape(o);return l},t.prototype.reverse=function(e,n){z(e,"reverse");for(var a=te(e.shape,e.dtype),o=this.bufferSync(e),i=function(u){var c=a.indexToLoc(u),l=c.slice();n.forEach((function(p){return l[p]=e.shape[p]-1-l[p]})),a.set.apply(a,[o.get.apply(o,l)].concat(c))},s=0;s<a.size;s++)i(s);return a.toTensor()},t.prototype.concat=function(e,n){var a=this;if(e[0].dtype==="complex64"){var o=e.map((function(h){return ze(h)})),i=e.map((function(h){return Ze(h)}));return Ae(this.concat(o,n),this.concat(i,n))}var s=e.map((function(h){var f=$(h.shape.slice(n));return h.as2D(-1,f)})),u=rn(s.map((function(h){return h.shape})),1),c=te(u,e[0].dtype).values;if(s[0].shape[0]===1){var l=0;s.forEach((function(h){c.set(a.readSync(h.dataId),l),l+=h.size}))}else{var p=0;s.forEach((function(h){for(var f=a.readSync(h.dataId),m=0,v=0;v<h.shape[0];++v)for(var g=v*u[1]+p,y=0;y<h.shape[1];++y)c[g+y]=f[m++];p+=h.shape[1]}))}var d=rn(e.map((function(h){return h.shape})),n);return De(c,d,e[0].dtype)},t.prototype.neg=function(e){return z(e,"neg"),this.multiply(K(-1),e)},t.prototype.add=function(e,n){return e.dtype==="complex64"||n.dtype==="complex64"?this.broadcastedBinaryComplexOp(e.cast("complex64"),n.cast("complex64"),(function(a,o,i,s){return{real:a+i,imag:o+s}})):this.broadcastedBinaryOp(e,n,Oe(e.dtype,n.dtype),(function(a,o){return a+o}))},t.prototype.addN=function(e){var n=this;z(e,"addN");for(var a=e.map((function(l){return n.readSync(l.dataId)})),o=te(e[0].shape,e[0].dtype),i=o.values,s=0;s<e.length;s++)for(var u=a[s],c=0;c<i.length;c++)i[c]+=u[c];return o.toTensor()},t.prototype.softmax=function(e,n){var a=Te([n],e.shape),o=this.max(e,a),i=Le(o.shape,a),s=this.subtract(e,o.reshape(i)),u=this.exp(s),c=this.sum(u,a).reshape(i);return bt(u,c)},t.prototype.subtract=function(e,n){return e.dtype==="complex64"||n.dtype==="complex64"?this.broadcastedBinaryComplexOp(e.cast("complex64"),n.cast("complex64"),(function(a,o,i,s){return{real:a-i,imag:o-s}})):this.broadcastedBinaryOp(e,n,Oe(e.dtype,n.dtype),(function(a,o){return a-o}))},t.prototype.pow=function(e,n){return z([e,n],"pow"),this.broadcastedBinaryOp(e,n,e.dtype,(function(a,o){return Math.pow(a,o)}))},t.prototype.batchMatMul=function(e,n,a,o){z([e,n],"matMul");for(var i=a?e.shape[1]:e.shape[2],s=a?e.shape[2]:e.shape[1],u=o?n.shape[1]:n.shape[2],c=e.shape[0],l=this.readSync(e.dataId),p=this.readSync(n.dataId),d=a?[e.strides[0],1,e.strides[1]]:[e.strides[0],e.strides[1],1],h=d[0],f=d[1],m=d[2],v=o?[1,n.strides[1],n.strides[0]]:[n.strides[1],1,n.strides[0]],g=v[0],y=v[1],x=v[2],b=s*u,C=te([c,s,u],e.dtype),E=C.values,R=this.blockSize,I=0;I<c;I++)for(var k=0;k<s;k+=R)for(var T=0;T<u;T+=R)for(var O=0;O<i;O+=R)for(var _=Math.min(k+R,s),W=Math.min(T+R,u),L=Math.min(O+R,i),P=k;P<_;P++)for(var U=T;U<W;U++){for(var G=0,V=O;V<L;V++)G+=l[I*h+P*f+V*m]*p[V*g+U*y+I*x];E[I*b+(P*u+U)]+=G}return C.toTensor()},t.prototype.fusedBatchMatMul=function(e){var n=e.a,a=e.b,o=e.transposeA,i=e.transposeB,s=e.bias,u=e.activation,c=e.preluActivationWeights,l=this.batchMatMul(n,a,o,i);return s&&(l=this.add(l,s)),u&&(l=$a(this,l,u,c)),l},t.prototype.multiply=function(e,n){return e.dtype==="complex64"||n.dtype==="complex64"?this.broadcastedBinaryComplexOp(e.cast("complex64"),n.cast("complex64"),(function(a,o,i,s){return{real:a*i-o*s,imag:a*s+o*i}})):this.broadcastedBinaryOp(e,n,Oe(e.dtype,n.dtype),(function(a,o){return a*o}))},t.prototype.floorDiv=function(e,n){return z([e,n],"floorDiv"),this.broadcastedBinaryOp(e,n,"int32",(function(a,o){return Math.floor(a/o)}))},t.prototype.sum=function(e,n){z(e,"sum"),We("sum",n,e.rank);for(var a=_e(e.shape,n),o=a[0],i=a[1],s=ye(o,Oe(e.dtype,"int32")),u=$(i),c=this.readSync(s.dataId),l=this.readSync(e.dataId),p=0;p<c.length;++p){for(var d=p*u,h=0,f=0;f<u;++f)h+=l[d+f];c[p]=h}return s},t.prototype.prod=function(e,n){z(e,"sum");for(var a=_e(e.shape,n),o=a[0],i=a[1],s=ye(o,Oe(e.dtype,"int32")),u=$(i),c=this.readSync(s.dataId),l=this.readSync(e.dataId),p=0;p<c.length;++p){for(var d=p*u,h=1,f=0;f<u;++f)h*=l[d+f];c[p]=h}return s},t.prototype.unsortedSegmentSum=function(e,n,a){z(e,"unsortedSegmentSum");for(var o=[],i=e.rank-n.rank,s=0;s<i;++s)n=n.expandDims(s+1);for(s=0;s<a;++s){var u=K(s,"int32"),c=va(u,n).asType("float32").mul(e).sum(0);o.push(c)}return yt(o)},t.prototype.argMin=function(e,n){z(e,"argMin");var a=[n];We("argMin",a,e.rank);for(var o=_e(e.shape,a),i=o[0],s=o[1],u=ye(i,"int32"),c=$(s),l=this.readSync(u.dataId),p=this.readSync(e.dataId),d=0;d<l.length;++d){for(var h=d*c,f=p[h],m=0,v=0;v<c;++v){var g=p[h+v];g<f&&(f=g,m=v)}l[d]=m}return u},t.prototype.argMax=function(e,n){z(e,"argMax");var a=[n];We("argMax",a,e.rank);for(var o=_e(e.shape,a),i=o[0],s=o[1],u=ye(i,"int32"),c=$(s),l=this.readSync(u.dataId),p=this.readSync(e.dataId),d=0;d<l.length;++d){for(var h=d*c,f=p[h],m=0,v=0;v<c;++v){var g=p[h+v];g>f&&(f=g,m=v)}l[d]=m}return u},t.prototype.cumsum=function(e,n,a,o){if(z(e,"cumsum"),n!==e.rank-1)throw new Error("backend.cumsum in CPU expects an inner-most axis="+(e.rank-1)+" but got axis="+n);for(var i=Oe(e.dtype,"int32"),s=ye(e.shape,i),u=this.readSync(s.dataId),c=this.readSync(e.dataId),l=e.shape[e.rank-1],p=o?function(v,g){return v+l-g-1}:function(v,g){return v+g},d=0;d<c.length;d+=l)for(var h=0;h<l;h++){var f=p(d,h);if(h===0)u[f]=a?0:c[f];else{var m=p(d,h-1);u[f]=a?c[m]+u[m]:c[f]+u[m]}}return s},t.prototype.equal=function(e,n){return z([e,n],"equal"),this.broadcastedBinaryOp(e,n,"bool",(function(a,o){return a===o?1:0}))},t.prototype.notEqual=function(e,n){return z([e,n],"notEqual"),this.broadcastedBinaryOp(e,n,"bool",(function(a,o){return a!==o?1:0}))},t.prototype.less=function(e,n){return z([e,n],"less"),this.broadcastedBinaryOp(e,n,"bool",(function(a,o){return a<o?1:0}))},t.prototype.lessEqual=function(e,n){return z([e,n],"lessEqual"),this.broadcastedBinaryOp(e,n,"bool",(function(a,o){return a<=o?1:0}))},t.prototype.greater=function(e,n){return z([e,n],"greater"),this.broadcastedBinaryOp(e,n,"bool",(function(a,o){return a>o?1:0}))},t.prototype.greaterEqual=function(e,n){return z([e,n],"greaterEqual"),this.broadcastedBinaryOp(e,n,"bool",(function(a,o){return a>=o?1:0}))},t.prototype.logicalNot=function(e){z(e,"logicalNot");for(var n=this.readSync(e.dataId),a=new Uint8Array(n.length),o=0;o<n.length;++o)a[o]=n[o]?0:1;return this.makeOutput(a,e.shape,"bool")},t.prototype.logicalAnd=function(e,n){return z([e,n],"logicalAnd"),this.broadcastedBinaryOp(e,n,"bool",(function(a,o){return a&&o}))},t.prototype.logicalOr=function(e,n){return z([e,n],"logicalOr"),this.broadcastedBinaryOp(e,n,"bool",(function(a,o){return a||o}))},t.prototype.select=function(e,n,a){z([e,n,a],"select");for(var o=this.readSync(e.dataId),i=this.readSync(n.dataId),s=this.readSync(a.dataId),u=ye(n.shape,Oe(n.dtype,a.dtype)),c=this.readSync(u.dataId),l=0,p=e.rank===0||e.rank>1||n.rank===1?1:$(n.shape.slice(1)),d=0;d<o.length;d++)for(var h=0;h<p;h++)o[d]===1?c[l++]=i[d]:c[l++]=s[d];return u},t.prototype.where=function(e){z([e],"where");var n=this.readSync(e.dataId);return wi(e.shape,n)},t.prototype.topk=function(e,n,a){return z(e,"topk"),Ec(this.readSync(e.dataId),e.shape,e.dtype,n)},t.prototype.min=function(e,n){z(e,"min"),We("min",n,e.rank);for(var a=_e(e.shape,n),o=a[0],i=a[1],s=ye(o,e.dtype),u=$(i),c=this.readSync(s.dataId),l=this.readSync(e.dataId),p=0;p<c.length;++p){for(var d=p*u,h=l[d],f=0;f<u;++f){var m=l[d+f];m<h&&(h=m)}c[p]=h}return s},t.prototype.minimum=function(e,n){return z([e,n],"minimum"),this.broadcastedBinaryOp(e,n,e.dtype,(function(a,o){return Math.min(a,o)}))},t.prototype.mod=function(e,n){return z([e,n],"mod"),this.broadcastedBinaryOp(e,n,e.dtype,(function(a,o){var i=a%o;return a<0&&o<0||a>=0&&o>=0?i:(i+o)%o}))},t.prototype.max=function(e,n){z(e,"max"),We("max",n,e.rank);for(var a=_e(e.shape,n),o=a[0],i=a[1],s=ye(o,e.dtype),u=$(i),c=this.readSync(s.dataId),l=this.readSync(e.dataId),p=0;p<c.length;++p){for(var d=p*u,h=l[d],f=0;f<u;++f){var m=l[d+f];m>h&&(h=m)}c[p]=h}return s},t.prototype.maximum=function(e,n){return z([e,n],"maximum"),this.broadcastedBinaryOp(e,n,e.dtype,(function(a,o){return Math.max(a,o)}))},t.prototype.all=function(e,n){z(e,"all"),We("all",n,e.rank);for(var a=_e(e.shape,n),o=a[0],i=a[1],s=ye(o,e.dtype),u=$(i),c=this.readSync(s.dataId),l=this.readSync(e.dataId),p=0;p<c.length;++p){for(var d=p*u,h=l[d],f=0;f<u;++f){var m=l[d+f];h=h&&m}c[p]=h}return s},t.prototype.any=function(e,n){z(e,"any"),We("any",n,e.rank);for(var a=_e(e.shape,n),o=a[0],i=a[1],s=ye(o,e.dtype),u=$(i),c=this.readSync(s.dataId),l=this.readSync(e.dataId),p=0;p<c.length;++p){for(var d=p*u,h=l[d],f=0;f<u;++f){var m=l[d+f];h=h||m}c[p]=h}return s},t.prototype.squaredDifference=function(e,n){return z([e,n],"squaredDifference"),this.broadcastedBinaryOp(e,n,e.dtype,(function(a,o){var i=a-o;return i*i}))},t.prototype.ceil=function(e){z(e,"ceil");for(var n=this.readSync(e.dataId),a=new Float32Array(n.length),o=0;o<n.length;++o)a[o]=Math.ceil(n[o]);return this.makeOutput(a,e.shape,"float32")},t.prototype.floor=function(e){z(e,"floor");for(var n=this.readSync(e.dataId),a=new Float32Array(n.length),o=0;o<n.length;++o)a[o]=Math.floor(n[o]);return this.makeOutput(a,e.shape,"float32")},t.prototype.sign=function(e){z(e,"x");for(var n=this.readSync(e.dataId),a=new Float32Array(n.length),o=0;o<n.length;++o)n[o]<0?a[o]=-1:n[o]>0?a[o]=1:a[o]=0;return this.makeOutput(a,e.shape,"float32")},t.prototype.isNaN=function(e){z(e,"x");for(var n=this.readSync(e.dataId),a=new Uint8Array(n.length),o=0;o<n.length;++o)Number.isNaN(n[o])&&(a[o]=1);return this.makeOutput(a,e.shape,"bool")},t.prototype.isInf=function(e){z(e,"x");for(var n=this.readSync(e.dataId),a=new Uint8Array(n.length),o=0;o<n.length;++o)Math.abs(n[o])===1/0&&(a[o]=1);return this.makeOutput(a,e.shape,"bool")},t.prototype.isFinite=function(e){z(e,"x");for(var n=this.readSync(e.dataId),a=new Uint8Array(n.length),o=0;o<n.length;++o)Number.isFinite(n[o])&&(a[o]=1);return this.makeOutput(a,e.shape,"bool")},t.prototype.round=function(e){z(e,"round");for(var n=this.readSync(e.dataId),a=new Float32Array(n.length),o=0;o<n.length;++o){var i=Math.floor(n[o]);n[o]-i<.5?a[o]=Math.floor(n[o]):n[o]-i>.5?a[o]=Math.ceil(n[o]):a[o]=i%2==0?i:i+1}return this.makeOutput(a,e.shape,"float32")},t.prototype.exp=function(e){z(e,"exp");for(var n=this.readSync(e.dataId),a=new Float32Array(n.length),o=0;o<n.length;++o)a[o]=Math.exp(n[o]);return this.makeOutput(a,e.shape,"float32")},t.prototype.expm1=function(e){z(e,"expm1");for(var n=this.readSync(e.dataId),a=new Float32Array(n.length),o=0;o<n.length;++o)a[o]=Math.expm1(n[o]);return this.makeOutput(a,e.shape,"float32")},t.prototype.log=function(e){z(e,"log");for(var n=this.readSync(e.dataId),a=new Float32Array(n.length),o=0;o<n.length;++o){var i=n[o];a[o]=Math.log(i)}return this.makeOutput(a,e.shape,"float32")},t.prototype.log1p=function(e){z(e,"log1p");for(var n=this.readSync(e.dataId),a=new Float32Array(n.length),o=0;o<n.length;++o){var i=n[o];a[o]=Math.log1p(i)}return this.makeOutput(a,e.shape,"float32")},t.prototype.sqrt=function(e){z(e,"sqrt");for(var n=this.readSync(e.dataId),a=new Float32Array(n.length),o=0;o<n.length;++o){var i=n[o];a[o]=Math.sqrt(i)}return this.makeOutput(a,e.shape,"float32")},t.prototype.rsqrt=function(e){z(e,"rsqrt");for(var n=this.readSync(e.dataId),a=new Float32Array(n.length),o=0;o<n.length;++o){var i=n[o];a[o]=1/Math.sqrt(i)}return this.makeOutput(a,e.shape,"float32")},t.prototype.reciprocal=function(e){z(e,"reciprocal");for(var n=this.readSync(e.dataId),a=new Float32Array(n.length),o=0;o<n.length;++o)a[o]=1/n[o];return this.makeOutput(a,e.shape,"float32")},t.prototype.linear=function(e){return e},t.prototype.relu=function(e){z(e,"relu");for(var n=ye(e.shape,e.dtype),a=this.readSync(n.dataId),o=this.readSync(e.dataId),i=0;i<o.length;++i)a[i]=Math.max(0,o[i]);return n},t.prototype.relu6=function(e){z(e,"relu");for(var n=ye(e.shape,e.dtype),a=this.readSync(n.dataId),o=this.readSync(e.dataId),i=0;i<o.length;++i)a[i]=Math.min(Math.max(0,o[i]),6);return n},t.prototype.prelu=function(e,n){return z([e,n],"prelu"),this.broadcastedBinaryOp(e,n,e.dtype,(function(a,o){return a<0?o*a:a}))},t.prototype.elu=function(e){z(e,"elu");for(var n=new Float32Array(e.size),a=this.readSync(e.dataId),o=0;o<a.length;++o){var i=a[o];n[o]=i>=0?i:Math.exp(i)-1}return this.makeOutput(n,e.shape,"float32")},t.prototype.eluDer=function(e,n){z([e,n],"eluDer");for(var a=new Float32Array(n.size),o=this.readSync(n.dataId),i=this.readSync(e.dataId),s=0;s<o.length;++s){var u=o[s];a[s]=u>=1?i[s]:i[s]*(u+1)}return this.makeOutput(a,n.shape,"float32")},t.prototype.selu=function(e){z(e,"selu");for(var n=Ni,a=Ei,o=new Float32Array(e.size),i=this.readSync(e.dataId),s=0;s<i.length;++s){var u=i[s];o[s]=u>=0?a*u:n*(Math.exp(u)-1)}return this.makeOutput(o,e.shape,"float32")},t.prototype.clip=function(e,n,a){z(e,"clip");for(var o=new Float32Array(e.size),i=this.readSync(e.dataId),s=0;s<i.length;++s){var u=i[s];o[s]=u>a?a:u<n?n:u}return this.makeOutput(o,e.shape,"float32")},t.prototype.abs=function(e){for(var n=new Float32Array(e.size),a=this.readSync(e.dataId),o=0;o<a.length;++o)n[o]=Math.abs(a[o]);return this.makeOutput(n,e.shape,"float32")},t.prototype.complexAbs=function(e){for(var n=new Float32Array(e.size),a=this.readSync(e.dataId),o=0;o<e.size;++o){var i=a[2*o],s=a[2*o+1];n[o]=Math.hypot(i,s)}return this.makeOutput(n,e.shape,"float32")},t.prototype.int=function(e){z(e,"int");for(var n=new Int32Array(e.size),a=this.readSync(e.dataId),o=0;o<a.length;++o)n[o]=a[o];return this.makeOutput(n,e.shape,"int32")},t.prototype.sigmoid=function(e){z(e,"sigmoid");for(var n=new Float32Array(e.size),a=this.readSync(e.dataId),o=0;o<a.length;++o)n[o]=1/(1+Math.exp(-a[o]));return this.makeOutput(n,e.shape,"float32")},t.prototype.softplus=function(e){z(e,"softplus");for(var n=Math.log(11920928955078125e-23)+2,a=new Float32Array(e.size),o=this.readSync(e.dataId),i=0;i<o.length;++i){var s=o[i]>-n,u=o[i]<n,c=Math.exp(o[i]),l=void 0;l=u?c:s?o[i]:Math.log(1+c),a[i]=l}return this.makeOutput(a,e.shape,"float32")},t.prototype.sin=function(e){z(e,"sin");for(var n=new Float32Array(e.size),a=this.readSync(e.dataId),o=0;o<a.length;++o)n[o]=Math.sin(a[o]);return this.makeOutput(n,e.shape,"float32")},t.prototype.cos=function(e){z(e,"cos");for(var n=new Float32Array(e.size),a=this.readSync(e.dataId),o=0;o<a.length;++o)n[o]=Math.cos(a[o]);return this.makeOutput(n,e.shape,"float32")},t.prototype.tan=function(e){z(e,"tan");for(var n=new Float32Array(e.size),a=this.readSync(e.dataId),o=0;o<a.length;++o)n[o]=Math.tan(a[o]);return this.makeOutput(n,e.shape,"float32")},t.prototype.asin=function(e){z(e,"asin");for(var n=new Float32Array(e.size),a=this.readSync(e.dataId),o=0;o<a.length;++o)n[o]=Math.asin(a[o]);return this.makeOutput(n,e.shape,"float32")},t.prototype.acos=function(e){z(e,"acos");for(var n=new Float32Array(e.size),a=this.readSync(e.dataId),o=0;o<a.length;++o)n[o]=Math.acos(a[o]);return this.makeOutput(n,e.shape,"float32")},t.prototype.atan=function(e){z(e,"atan");for(var n=new Float32Array(e.size),a=this.readSync(e.dataId),o=0;o<a.length;++o)n[o]=Math.atan(a[o]);return this.makeOutput(n,e.shape,"float32")},t.prototype.atan2=function(e,n){return z([e,n],"atan2"),this.broadcastedBinaryOp(e,n,e.dtype,(function(a,o){return Math.atan2(a,o)}))},t.prototype.sinh=function(e){z(e,"sinh");for(var n=new Float32Array(e.size),a=this.readSync(e.dataId),o=0;o<a.length;++o)n[o]=Math.sinh(a[o]);return this.makeOutput(n,e.shape,"float32")},t.prototype.cosh=function(e){z(e,"cosh");for(var n=new Float32Array(e.size),a=this.readSync(e.dataId),o=0;o<a.length;++o)n[o]=Math.cosh(a[o]);return this.makeOutput(n,e.shape,"float32")},t.prototype.tanh=function(e){z(e,"tanh");for(var n=new Float32Array(e.size),a=this.readSync(e.dataId),o=0;o<a.length;++o)n[o]=gu(a[o]);return this.makeOutput(n,e.shape,"float32")},t.prototype.asinh=function(e){z(e,"asinh");for(var n=new Float32Array(e.size),a=this.readSync(e.dataId),o=0;o<a.length;++o)n[o]=Math.asinh(a[o]);return this.makeOutput(n,e.shape,"float32")},t.prototype.acosh=function(e){z(e,"acosh");for(var n=new Float32Array(e.size),a=this.readSync(e.dataId),o=0;o<a.length;++o)n[o]=Math.acosh(a[o]);return this.makeOutput(n,e.shape,"float32")},t.prototype.atanh=function(e){z(e,"atanh");for(var n=new Float32Array(e.size),a=this.readSync(e.dataId),o=0;o<a.length;++o)n[o]=Math.atanh(a[o]);return this.makeOutput(n,e.shape,"float32")},t.prototype.erf=function(e){z(e,"erf");for(var n=new Float32Array(e.size),a=this.readSync(e.dataId),o=0;o<a.length;++o){var i=Math.sign(a[o]),s=Math.abs(a[o]),u=1/(1+.3275911*s);n[o]=i*(1-((((1.061405429*u-1.453152027)*u+1.421413741)*u-.284496736)*u+.254829592)*u*Math.exp(-s*s))}return this.makeOutput(n,e.shape,"float32")},t.prototype.step=function(e,n){n===void 0&&(n=0),z(e,"step");for(var a=new Float32Array(e.size),o=this.readSync(e.dataId),i=0;i<o.length;++i){var s=o[i];isNaN(s)?a[i]=NaN:a[i]=s>0?1:n}return this.makeOutput(a,e.shape,"float32")},t.prototype.fusedConv2d=function(e){var n=e.input,a=e.filter,o=e.convInfo,i=e.bias,s=e.activation,u=e.preluActivationWeights,c=this.conv2d(n,a,o);return i&&(c=this.add(c,i)),s&&(c=$a(this,c,s,u)),c},t.prototype.conv2d=function(e,n,a){z([e,n],"conv2d");for(var o=a.filterHeight,i=a.filterWidth,s=a.dilationHeight,u=a.dilationWidth,c=a.padInfo.left,l=a.padInfo.top,p=a.dataFormat==="channelsLast",d=te(a.outShape,e.dtype),h=e.strides[0],f=p?e.strides[1]:e.strides[2],m=p?e.strides[2]:1,v=p?1:e.strides[1],g=d.strides[0],y=p?d.strides[1]:d.strides[2],x=p?d.strides[2]:1,b=p?1:d.strides[1],C=this.readSync(e.dataId),E=this.readSync(n.dataId),R=d.values,I=0;I<a.batchSize;++I)for(var k=I*h,T=I*g,O=0;O<a.outHeight;++O)for(var _=T+O*y,W=O*a.strideHeight-l,L=0;L<o;L++){var P=W+L*s;if(!(P<0||P>=a.inHeight))for(var U=L*n.strides[0],G=k+P*f,V=0;V<a.outWidth;++V)for(var H=_+V*x,q=V*a.strideWidth-c,j=0;j<i;j++){var J=q+j*u;if(!(J<0||J>=a.inWidth))for(var Z=G+J*m,re=U+j*n.strides[1],ae=0;ae<a.inChannels;++ae){for(var se=C[Z+ae*v],pe=0;pe<a.outChannels;++pe)R[H+pe*b]+=se*E[re+pe];re+=a.outChannels}}}return d.toTensor()},t.prototype.conv3d=function(e,n,a){for(var o=a.filterDepth,i=a.filterHeight,s=a.filterWidth,u=a.dilationDepth,c=a.dilationHeight,l=a.dilationWidth,p=a.padInfo.front,d=a.padInfo.left,h=a.padInfo.top,f=te(a.outShape,e.dtype),m=this.readSync(e.dataId),v=this.readSync(n.dataId),g=f.values,y=0;y<a.batchSize;++y)for(var x=y*e.strides[0],b=y*f.strides[0],C=0;C<a.outDepth;++C)for(var E=b+C*f.strides[1],R=C*a.strideDepth-p,I=0;I<o;I++){var k=R+I*u;if(!(k<0||k>=a.inDepth))for(var T=I*n.strides[0],O=x+k*e.strides[1],_=0;_<a.outHeight;++_)for(var W=E+_*f.strides[2],L=_*a.strideHeight-h,P=0;P<i;P++){var U=L+P*c;if(!(U<0||U>=a.inHeight))for(var G=T+P*n.strides[1],V=O+U*e.strides[2],H=0;H<a.outWidth;++H)for(var q=W+H*a.outChannels,j=H*a.strideWidth-d,J=0;J<s;J++){var Z=j+J*l;if(!(Z<0||Z>=a.inWidth))for(var re=G+J*n.strides[2],ae=V+Z*a.inChannels,se=re,pe=0;pe<a.inChannels;++pe){for(var ce=m[ae+pe],de=0;de<a.outChannels;++de)g[q+de]+=ce*v[se+de];se+=a.outChannels}}}}return f.toTensor()},t.prototype.conv2dDerInput=function(e,n,a){z([e,n],"conv2dDerInput");for(var o=te(a.inShape,"float32"),i=o.values,s=this.readSync(e.dataId),u=this.readSync(n.dataId),c=n.strides,l=c[0],p=c[1],d=c[2],h=a.batchSize,f=a.filterHeight,m=a.filterWidth,v=a.inChannels,g=a.inHeight,y=a.inWidth,x=a.outChannels,b=a.outHeight,C=a.outWidth,E=a.strideHeight,R=a.strideWidth,I=a.dataFormat,k=f-1-a.padInfo.top,T=m-1-a.padInfo.left,O=I==="channelsLast",_=o.strides[0],W=O?o.strides[1]:o.strides[2],L=O?o.strides[2]:1,P=O?1:o.strides[1],U=e.strides[0],G=O?e.strides[1]:e.strides[2],V=O?e.strides[2]:1,H=O?1:e.strides[1],q=0;q<h;++q)for(var j=0;j<v;++j)for(var J=0;J<g;++J)for(var Z=J-k,re=Math.max(0,Math.ceil(Z/E)),ae=Math.min(b,(f+Z)/E),se=0;se<y;++se){for(var pe=se-T,ce=Math.max(0,Math.ceil(pe/R)),de=Math.min(C,(m+pe)/R),Ie=0,le=re;le<ae;++le)for(var me=le*E-Z,he=ce;he<de;++he)for(var Ne=U*q+G*le+V*he,be=l*(f-1-me)+p*(m-1-(he*R-pe))+d*j,we=0;we<x;++we)Ie+=s[Ne+H*we]*u[be+we];i[_*q+W*J+L*se+P*j]=Ie}return o.toTensor()},t.prototype.conv3dDerInput=function(e,n,a){for(var o=te(a.inShape,"float32"),i=o.values,s=o.strides,u=s[0],c=s[1],l=s[2],p=s[3],d=this.readSync(e.dataId),h=e.strides,f=h[0],m=h[1],v=h[2],g=h[3],y=this.readSync(n.dataId),x=n.strides,b=x[0],C=x[1],E=x[2],R=x[3],I=a.batchSize,k=a.filterDepth,T=a.filterHeight,O=a.filterWidth,_=a.inChannels,W=a.inDepth,L=a.inHeight,P=a.inWidth,U=a.outChannels,G=a.outDepth,V=a.outHeight,H=a.outWidth,q=a.strideDepth,j=a.strideHeight,J=a.strideWidth,Z=k-1-a.padInfo.front,re=T-1-a.padInfo.top,ae=O-1-a.padInfo.left,se=0;se<I;++se)for(var pe=0;pe<_;++pe)for(var ce=0;ce<W;++ce)for(var de=ce-Z,Ie=Math.max(0,Math.ceil(de/q)),le=Math.min(G,(k+de)/q),me=0;me<L;++me)for(var he=me-re,Ne=Math.max(0,Math.ceil(he/j)),be=Math.min(V,(T+he)/j),we=0;we<P;++we){for(var ct=we-ae,lt=Math.max(0,Math.ceil(ct/J)),qe=Math.min(H,(O+ct)/J),hn=0,Nt=Ie;Nt<le;++Nt)for(var Ft=Nt*q-de,Et=Ne;Et<be;++Et)for(var fn=Et*j-he,St=lt;St<qe;++St)for(var Aa=f*se+m*Nt+v*Et+g*St,mn=b*(k-1-Ft)+C*(T-1-fn)+E*(O-1-(St*J-ct))+R*pe,pt=0;pt<U;++pt)hn+=d[Aa+pt]*y[mn+pt];i[u*se+c*ce+l*me+p*we+pe]=hn}return o.toTensor()},t.prototype.conv2dDerFilter=function(e,n,a){z([e,n],"conv2dDerFilter");for(var o=a.strideHeight,i=a.strideWidth,s=a.filterHeight,u=a.filterWidth,c=a.dataFormat==="channelsLast",l=te(a.filterShape,"float32"),p=a.padInfo.left,d=a.padInfo.top,h=this.bufferSync(e),f=this.bufferSync(n),m=0;m<s;++m)for(var v=Math.max(0,Math.ceil((d-m)/o)),g=Math.min(a.outHeight,(a.inHeight+d-m)/o),y=0;y<u;++y)for(var x=Math.max(0,Math.ceil((p-y)/i)),b=Math.min(a.outWidth,(a.inWidth+p-y)/i),C=0;C<a.inChannels;++C)for(var E=0;E<a.outChannels;++E){for(var R=0,I=0;I<a.batchSize;++I)for(var k=v;k<g;++k)for(var T=m+k*o-d,O=x;O<b;++O){var _=y+O*i-p;R+=c?h.get(I,T,_,C)*f.get(I,k,O,E):h.get(I,C,T,_)*f.get(I,E,k,O)}l.set(R,m,y,C,E)}return l.toTensor()},t.prototype.conv3dDerFilter=function(e,n,a){for(var o=a.strideDepth,i=a.strideHeight,s=a.strideWidth,u=a.filterDepth,c=a.filterHeight,l=a.filterWidth,p=te(a.filterShape,"float32"),d=p.values,h=p.strides,f=h[0],m=h[1],v=h[2],g=h[3],y=this.readSync(n.dataId),x=n.strides,b=x[0],C=x[1],E=x[2],R=x[3],I=this.readSync(e.dataId),k=e.strides,T=k[0],O=k[1],_=k[2],W=k[3],L=a.padInfo.front,P=a.padInfo.left,U=a.padInfo.top,G=0;G<u;++G)for(var V=Math.max(0,Math.ceil((L-G)/o)),H=Math.min(a.outDepth,(a.inDepth+L-G)/o),q=G*f,j=0;j<c;++j)for(var J=Math.max(0,Math.ceil((U-j)/i)),Z=Math.min(a.outHeight,(a.inHeight+U-j)/i),re=j*m+q,ae=0;ae<l;++ae)for(var se=Math.max(0,Math.ceil((P-ae)/s)),pe=Math.min(a.outWidth,(a.inWidth+P-ae)/s),ce=ae*v+re,de=0;de<a.inChannels;++de)for(var Ie=de*g+ce,le=0;le<a.outChannels;++le){for(var me=0,he=0;he<a.batchSize;++he)for(var Ne=he*T,be=he*b,we=V;we<H;++we)for(var ct=(G+we*o-L)*O+Ne,lt=we*C+be,qe=J;qe<Z;++qe)for(var hn=(j+qe*i-U)*_+ct,Nt=qe*E+lt,Ft=se;Ft<pe;++Ft){var Et=Ft*R+Nt;me+=I[(ae+Ft*s-P)*W+hn+de]*y[Et+le]}d[Ie+le]=me}return p.toTensor()},t.prototype.fusedDepthwiseConv2D=function(e){var n=e.input,a=e.filter,o=e.convInfo,i=e.bias,s=e.activation,u=e.preluActivationWeights,c=this.depthwiseConv2D(n,a,o);return i&&(c=this.add(c,i)),s&&(c=$a(this,c,s,u)),c},t.prototype.depthwiseConv2D=function(e,n,a){z([e,n],"depthwiseConv2D");for(var o=a.filterHeight,i=a.filterWidth,s=a.dilationHeight,u=a.dilationWidth,c=a.padInfo.left,l=a.padInfo.top,p=a.outChannels/a.inChannels,d=te(a.outShape,e.dtype),h=this.readSync(e.dataId),f=this.readSync(n.dataId),m=d.values,v=0;v<a.batchSize;++v)for(var g=v*e.strides[0],y=v*d.strides[0],x=0;x<a.outHeight;++x)for(var b=y+x*d.strides[1],C=x*a.strideHeight-c,E=0;E<o;++E){var R=C+E*s;if(!(R<0||R>=a.inHeight))for(var I=E*n.strides[0],k=g+R*e.strides[1],T=0;T<a.outWidth;++T)for(var O=b+T*d.strides[2],_=T*a.strideWidth-l,W=0;W<i;++W){var L=_+W*u;if(!(L<0||L>=a.inWidth))for(var P=I+W*n.strides[1],U=k+L*a.inChannels,G=O,V=P,H=0;H<a.inChannels;++H){for(var q=h[U+H],j=0;j<p;++j)m[G+j]+=q*f[V+j];G+=p,V+=p}}}return d.toTensor()},t.prototype.depthwiseConv2DDerInput=function(e,n,a){z([e,n],"depthwiseConv2DDerInput");for(var o=te(a.inShape,"float32"),i=o.values,s=o.strides,u=s[0],c=s[1],l=s[2],p=this.readSync(e.dataId),d=e.strides,h=d[0],f=d[1],m=d[2],v=this.readSync(n.dataId),g=n.strides,y=g[0],x=g[1],b=g[2],C=a.batchSize,E=a.filterHeight,R=a.filterWidth,I=a.inChannels,k=a.inHeight,T=a.inWidth,O=a.outChannels,_=a.outHeight,W=a.outWidth,L=a.strideHeight,P=a.strideWidth,U=E-1-a.padInfo.top,G=R-1-a.padInfo.left,V=O/I,H=0;H<C;++H)for(var q=0;q<I;++q)for(var j=0;j<k;++j)for(var J=j-U,Z=Math.max(0,Math.ceil(J/L)),re=Math.min(_,(E+J)/L),ae=0;ae<T;++ae){for(var se=ae-G,pe=Math.max(0,Math.ceil(se/P)),ce=Math.min(W,(R+se)/P),de=0,Ie=Z;Ie<re;++Ie)for(var le=Ie*L-J,me=pe;me<ce;++me)for(var he=h*H+f*Ie+m*me,Ne=y*(E-1-le)+x*(R-1-(me*P-se))+b*q,be=0;be<V;++be)de+=p[he+(q*V+be)]*v[Ne+be];i[u*H+c*j+l*ae+q]=de}return o.toTensor()},t.prototype.depthwiseConv2DDerFilter=function(e,n,a){z([e,n],"depthwiseConv2DDerFilter");for(var o=a.strideHeight,i=a.strideWidth,s=a.filterHeight,u=a.filterWidth,c=te(a.filterShape,"float32"),l=a.padInfo.left,p=a.padInfo.top,d=a.outChannels/a.inChannels,h=this.bufferSync(e),f=this.bufferSync(n),m=0;m<s;++m)for(var v=Math.max(0,Math.ceil((p-m)/o)),g=Math.min(a.outHeight,(a.inHeight+p-m)/o),y=0;y<u;++y)for(var x=Math.max(0,Math.ceil((l-y)/i)),b=Math.min(a.outWidth,(a.inWidth+l-y)/i),C=0;C<a.outChannels;++C){for(var E=Math.trunc(C/d),R=C%d,I=0,k=0;k<a.batchSize;++k)for(var T=v;T<g;++T)for(var O=m+T*o-p,_=x;_<b;++_){var W=y+_*i-l;I+=h.get(k,O,W,E)*f.get(k,T,_,C)}c.set(I,m,y,E,R)}return c.toTensor()},t.prototype.tile=function(e,n){return z(e,"tile"),Nc(this.bufferSync(e),n)},t.prototype.pad=function(e,n,a){z(e,"pad");var o=n.map((function(d,h){return d[0]+e.shape[h]+d[1]})),i=n.map((function(d){return d[0]})),s=this.bufferSync(e),u=te(o,e.dtype);a!==0&&u.values.fill(a);for(var c=0;c<e.size;c++){var l=s.indexToLoc(c),p=l.map((function(d,h){return d+i[h]}));u.set.apply(u,[s.get.apply(s,l)].concat(p))}return u.toTensor()},t.prototype.gather=function(e,n,a){z([e,n],"gather");var o=e.shape.slice(),i=this.readSync(n.dataId);o[a]=i.length;for(var s=te(o,e.dtype),u=this.bufferSync(e),c=0;c<s.size;++c){var l=s.indexToLoc(c),p=l.slice();p[a]=i[l[a]];var d=u.locToIndex(p);s.values[c]=u.values[d]}return s.toTensor()},t.prototype.batchToSpaceND=function(e,n,a){z([e],"batchToSpaceND");var o=n.reduce((function(p,d){return p*d})),i=Ur(e.shape,n,o),s=Gr(i.length,n.length),u=Hr(e.shape,n,o),c=ic(a,n.length),l=sc(u,a,n.length);return Ke(e.reshape(i),s).reshape(u).slice(c,l)},t.prototype.spaceToBatchND=function(e,n,a){z([e],"spaceToBatchND");var o=n.reduce((function(d,h){return d*h})),i=[[0,0]];i.push.apply(i,a);for(var s=1+n.length;s<e.shape.length;++s)i.push([0,0]);var u=e.pad(i),c=Ur(u.shape,n,o,!1),l=Gr(c.length,n.length,!1),p=Hr(u.shape,n,o,!1);return Ke(u.reshape(c),l).reshape(p)},t.prototype.maxPool=function(e,n){return z(e,"maxPool"),go(this.readSync(e.dataId),e.shape,e.dtype,e.strides,n,"max").toTensor()},t.prototype.maxPoolBackprop=function(e,n,a,o){z([n,a],"maxPoolBackprop");for(var i=this.readSync(n.dataId),s=te(o.outShape,n.dtype,Cl(i,n.shape,n.dtype,o).values),u=o.strideHeight,c=o.strideWidth,l=o.dilationHeight,p=o.dilationWidth,d=o.effectiveFilterHeight,h=o.effectiveFilterWidth,f=h-1-o.padInfo.left,m=d-1-o.padInfo.top,v=te(n.shape,"float32"),g=this.bufferSync(e),y=0;y<o.batchSize;++y)for(var x=0;x<o.inChannels;++x)for(var b=0;b<o.inHeight;++b)for(var C=0;C<o.inWidth;++C){for(var E=b-m,R=C-f,I=0,k=0;k<d;k+=l){var T=(E+k)/u;if(!(T<0||T>=o.outHeight||Math.floor(T)!==T))for(var O=0;O<h;O+=p){var _=(R+O)/c;if(!(_<0||_>=o.outWidth||Math.floor(_)!==_)){var W=d*h-1-s.get(y,T,_,x)===k*h+O?1:0;W!==0&&(I+=g.get(y,T,_,x)*W)}}}v.set(I,y,b,C,x)}return v.toTensor()},t.prototype.avgPoolBackprop=function(e,n,a){z([e,n],"avgPoolBackprop");for(var o=a.strideHeight,i=a.strideWidth,s=a.filterHeight,u=a.filterWidth,c=a.dilationHeight,l=a.dilationWidth,p=a.effectiveFilterHeight,d=a.effectiveFilterWidth,h=d-1-a.padInfo.left,f=p-1-a.padInfo.top,m=te(n.shape,"float32"),v=1/(s*u),g=this.bufferSync(e),y=0;y<a.batchSize;++y)for(var x=0;x<a.inChannels;++x)for(var b=0;b<a.inHeight;++b)for(var C=0;C<a.inWidth;++C){for(var E=b-f,R=C-h,I=0,k=0;k<p;k+=c){var T=(E+k)/o;if(!(T<0||T>=a.outHeight||Math.floor(T)!==T))for(var O=0;O<d;O+=l){var _=(R+O)/i;_<0||_>=a.outWidth||Math.floor(_)!==_||(I+=g.get(y,T,_,x))}}m.set(I*v,y,b,C,x)}return m.toTensor()},t.prototype.pool3d=function(e,n,a){z(e,"pool3d");for(var o=n.strideDepth,i=n.strideHeight,s=n.strideWidth,u=n.dilationDepth,c=n.dilationHeight,l=n.dilationWidth,p=n.effectiveFilterDepth,d=n.effectiveFilterHeight,h=n.effectiveFilterWidth,f=n.padInfo.front,m=n.padInfo.top,v=n.padInfo.left,g=a==="max"?Number.NEGATIVE_INFINITY:Number.POSITIVE_INFINITY,y=this.readSync(e.dataId),x=te(n.outShape,e.dtype),b=x.values,C=n.outShape[1]*n.outShape[2]*n.outShape[3]*n.outShape[4],E=n.outShape[2]*n.outShape[3]*n.outShape[4],R=n.outShape[3]*n.outShape[4],I=n.outShape[4],k=0;k<n.batchSize;++k)for(var T=k*C,O=k*e.strides[0],_=0;_<n.inChannels;++_)for(var W=0;W<n.outDepth;++W){for(var L=W*o-f,P=L;P<0;)P+=u;for(var U=Math.min(n.inDepth,p+L),G=T+W*E,V=0;V<n.outHeight;++V){for(var H=V*i-m,q=H;q<0;)q+=c;for(var j=Math.min(n.inHeight,d+H),J=G+V*R,Z=0;Z<n.outWidth;++Z){for(var re=Z*s-v,ae=re;ae<0;)ae+=l;for(var se=Math.min(n.inWidth,h+re),pe=J+Z*I,ce=g,de=0,Ie=0,le=P;le<U;le+=u){for(var me=O+le*e.strides[1],he=q;he<j;he+=c){for(var Ne=me+he*e.strides[2],be=ae;be<se;be+=l){var we=y[Ne+be*e.strides[3]+_];if(a==="max"&&we>ce?ce=we:a==="avg"&&(de+=we,Ie++),isNaN(ce))break}if(isNaN(ce))break}if(isNaN(ce))break}b[pe+_]=a==="avg"?de/Ie:ce}}}return x.toTensor()},t.prototype.avgPool3d=function(e,n){return z(e,"avgPool3d"),this.pool3d(e,n,"avg").toFloat()},t.prototype.avgPool3dBackprop=function(e,n,a){z([e,n],"avgPool3dBackprop");for(var o=a.strideDepth,i=a.strideHeight,s=a.strideWidth,u=a.filterDepth,c=a.filterHeight,l=a.filterWidth,p=a.dilationDepth,d=a.dilationHeight,h=a.dilationWidth,f=a.effectiveFilterDepth,m=a.effectiveFilterHeight,v=a.effectiveFilterWidth,g=f-1-a.padInfo.front,y=v-1-a.padInfo.left,x=m-1-a.padInfo.top,b=te(n.shape,"float32"),C=1/(u*c*l),E=this.bufferSync(e),R=0;R<a.batchSize;++R)for(var I=0;I<a.inChannels;++I)for(var k=0;k<a.inDepth;++k)for(var T=0;T<a.inHeight;++T)for(var O=0;O<a.inWidth;++O){for(var _=k-g,W=T-x,L=O-y,P=0,U=0;U<f;U+=p){var G=(_+U)/o;if(!(G<0||G>=a.outDepth||Math.floor(G)!==G))for(var V=0;V<m;V+=d){var H=(W+V)/i;if(!(H<0||H>=a.outHeight||Math.floor(H)!==H))for(var q=0;q<v;q+=h){var j=(L+q)/s;j<0||j>=a.outWidth||Math.floor(j)!==j||(P+=E.get(R,G,H,j,I))}}}b.set(P*C,R,k,T,O,I)}return b.toTensor()},t.prototype.maxPool3d=function(e,n){return z(e,"maxPool3d"),this.pool3d(e,n,"max").toFloat()},t.prototype.maxPool3dPositions=function(e,n){for(var a=te(n.outShape,"int32"),o=n.strideDepth,i=n.strideHeight,s=n.strideWidth,u=n.dilationDepth,c=n.dilationHeight,l=n.dilationWidth,p=n.effectiveFilterDepth,d=n.effectiveFilterHeight,h=n.effectiveFilterWidth,f=n.padInfo.front,m=n.padInfo.top,v=n.padInfo.left,g=this.bufferSync(e),y=0;y<n.batchSize;++y)for(var x=0;x<n.inChannels;++x)for(var b=0;b<n.outDepth;++b){for(var C=b*o-f,E=C;E<0;)E+=u;for(var R=Math.min(n.inDepth,p+C),I=0;I<n.outHeight;++I){for(var k=I*i-m,T=k;T<0;)T+=c;for(var O=Math.min(n.inHeight,d+k),_=0;_<n.outWidth;++_){for(var W=_*s-v,L=W;L<0;)L+=l;for(var P=Math.min(n.inWidth,h+W),U=Number.NEGATIVE_INFINITY,G=-1,V=E;V<R;V+=u)for(var H=V-C,q=T;q<O;q+=c)for(var j=q-k,J=L;J<P;J+=l){var Z=J-W,re=g.get(y,V,q,J,x);re>=U&&(U=re,G=H*d*h+j*d+Z)}a.set(G,y,b,I,_,x)}}}return a.toTensor()},t.prototype.maxPool3dBackprop=function(e,n,a,o){z([n,a],"maxPool3dBackprop");for(var i=this.maxPool3dPositions(n,o),s=o.strideDepth,u=o.strideHeight,c=o.strideWidth,l=o.dilationDepth,p=o.dilationHeight,d=o.dilationWidth,h=o.effectiveFilterDepth,f=o.effectiveFilterHeight,m=o.effectiveFilterWidth,v=h-1-o.padInfo.front,g=m-1-o.padInfo.left,y=f-1-o.padInfo.top,x=te(n.shape,"float32"),b=this.bufferSync(i),C=this.bufferSync(e),E=0;E<o.batchSize;++E)for(var R=0;R<o.inChannels;++R)for(var I=0;I<o.inDepth;++I)for(var k=0;k<o.inHeight;++k)for(var T=0;T<o.inWidth;++T){for(var O=I-v,_=k-y,W=T-g,L=0,P=0;P<h;P+=l){var U=(O+P)/s;if(!(U<0||U>=o.outDepth||Math.floor(U)!==U))for(var G=0;G<f;G+=p){var V=(_+G)/u;if(!(V<0||V>=o.outHeight||Math.floor(V)!==V))for(var H=0;H<m;H+=d){var q=(W+H)/c;if(!(q<0||q>=o.outWidth||Math.floor(q)!==q)){var j=h*f*m-1-b.get(E,U,V,q,R)===P*f*m+G*m+H?1:0;j!==0&&(L+=C.get(E,U,V,q,R)*j)}}}}x.set(L,E,I,k,T,R)}return x.toTensor()},t.prototype.cast=function(e,n){return gi(e,n,this)},t.prototype.reshape=function(e,n){return jr(e,n)},t.prototype.avgPool=function(e,n){return z(e,"avgPool"),z(e,"maxPool"),go(this.readSync(e.dataId),e.shape,e.dtype,e.strides,n,"avg").toTensor().toFloat()},t.prototype.resizeBilinear=function(e,n,a,o){z(e,"resizeBilinear");for(var i=e.shape,s=i[0],u=i[1],c=i[2],l=i[3],p=this.readSync(e.dataId),d=new Float32Array($([s,n,a,l])),h=[o&&n>1?u-1:u,o&&a>1?c-1:c],f=[o&&n>1?n-1:n,o&&a>1?a-1:a],m=0,v=h[0]/f[0],g=h[1]/f[1],y=0;y<s;y++)for(var x=0;x<n;x++)for(var b=v*x,C=Math.floor(b),E=b-C,R=Math.min(u-1,Math.ceil(b)),I=y*e.strides[0]+C*e.strides[1],k=y*e.strides[0]+R*e.strides[1],T=0;T<a;T++)for(var O=g*T,_=Math.floor(O),W=O-_,L=Math.min(c-1,Math.ceil(O)),P=I+_*e.strides[2],U=k+_*e.strides[2],G=I+L*e.strides[2],V=k+L*e.strides[2],H=0;H<l;H++){var q=p[P+H],j=p[U+H],J=q+(p[G+H]-q)*W,Z=J+(j+(p[V+H]-j)*W-J)*E;d[m++]=Z}return De(d,[s,n,a,l])},t.prototype.resizeBilinearBackprop=function(e,n,a){z([e,n],"resizeBilinearBackprop");for(var o=n.shape,i=o[0],s=o[1],u=o[2],c=o[3],l=e.shape,p=l[1],d=l[2],h=new Float32Array(i*s*u*c),f=[a&&p>1?s-1:s,a&&d>1?u-1:u],m=[a&&p>1?p-1:p,a&&d>1?d-1:d],v=f[0]/m[0],g=f[1]/m[1],y=this.readSync(e.dataId),x=0,b=0;b<i;b++)for(var C=b*n.strides[0],E=0;E<p;E++)for(var R=E*v,I=Math.floor(R),k=Math.min(Math.ceil(R),s-1),T=C+I*n.strides[1],O=C+k*n.strides[1],_=R-I,W=1-_,L=0;L<d;L++)for(var P=L*g,U=Math.floor(P),G=Math.min(Math.ceil(P),u-1),V=P-U,H=1-V,q=T+U*n.strides[2],j=T+G*n.strides[2],J=O+U*n.strides[2],Z=O+G*n.strides[2],re=W*H,ae=W*V,se=_*H,pe=_*V,ce=0;ce<c;ce++){var de=y[x++];h[q+ce]+=de*re,h[j+ce]+=de*ae,h[J+ce]+=de*se,h[Z+ce]+=de*pe}return Qt(h,[i,u,s,c],n.dtype)},t.prototype.resizeNearestNeighbor=function(e,n,a,o){z(e,"resizeNearestNeighbor");for(var i=e.shape,s=i[0],u=i[1],c=i[2],l=i[3],p=this.readSync(e.dataId),d=new Float32Array(s*n*a*l),h=[o&&n>1?u-1:u,o&&a>1?c-1:c],f=[o&&n>1?n-1:n,o&&a>1?a-1:a],m=h[0]/f[0],v=h[1]/f[1],g=0,y=0;y<s;y++)for(var x=y*e.strides[0],b=0;b<n;b++)for(var C=m*b,E=x+Math.min(u-1,o?Math.round(C):Math.floor(C))*e.strides[1],R=0;R<a;R++)for(var I=v*R,k=E+Math.min(c-1,o?Math.round(I):Math.floor(I))*e.strides[2],T=0;T<l;T++){var O=p[k+T];d[g++]=O}return De(d,[s,n,a,l],e.dtype)},t.prototype.resizeNearestNeighborBackprop=function(e,n,a){z([e,n],"resizeNearestNeighborBackprop");for(var o=n.shape,i=o[0],s=o[1],u=o[2],c=o[3],l=e.shape,p=l[1],d=l[2],h=new Float32Array(i*s*u*c),f=this.readSync(e.dataId),m=[a&&p>1?s-1:s,a&&d>1?u-1:u],v=[a&&p>1?p-1:p,a&&d>1?d-1:d],g=m[0]/v[0],y=m[1]/v[1],x=1/g,b=1/y,C=2*Math.ceil(x)+2,E=2*Math.ceil(b)+2,R=0;R<i;R++)for(var I=R*n.strides[0],k=0;k<s;k++)for(var T=I+k*n.strides[1],O=Math.floor(k*x),_=Math.floor(O-C/2),W=0;W<u;W++)for(var L=T+W*n.strides[2],P=Math.floor(W*b),U=Math.floor(P-E/2),G=0;G<c;G++){for(var V=0,H=0;H<C;H++){var q=H+_;if(!(q<0||q>=p)){var j=I+q*e.strides[1],J=q*g;if(k===Math.min(s-1,a?Math.round(J):Math.floor(J)))for(var Z=0;Z<E;Z++){var re=Z+U;if(!(re<0||re>=d)){var ae=j+re*e.strides[2],se=re*y;W===Math.min(u-1,a?Math.round(se):Math.floor(se))&&(V+=f[ae+G])}}}}h[L+G]=V}return Qt(h,n.shape,n.dtype)},t.prototype.batchNormalization=function(e,n,a,o,i,s){z([e,n,a,i,s],"batchNorm");for(var u=this.readSync(e.dataId),c=this.readSync(n.dataId),l=this.readSync(a.dataId),p=i?this.readSync(i.dataId):new Float32Array([1]),d=s?this.readSync(s.dataId):new Float32Array([0]),h=new Float32Array(u.length),f=d.length,m=p.length,v=l.length,g=c.length,y=0,x=0,b=0,C=0,E=0;E<u.length;++E)h[E]=d[y++]+(u[E]-c[x++])*p[b++]/Math.sqrt(l[C++]+o),y>=f&&(y=0),x>=g&&(x=0),b>=m&&(b=0),C>=v&&(C=0);return Qt(h,e.shape)},t.prototype.localResponseNormalization4D=function(e,n,a,o,i){z(e,"localResponseNormalization4D");var s=e.shape[3],u=s-1,c=this.readSync(e.dataId),l=e.size,p=new Float32Array(l);function d(v){for(var g=v%s,y=v-g+Math.max(0,g-n),x=v-g+Math.min(g+n,u),b=0;y<=x;y++){var C=c[y];b+=C*C}return b}for(var h=0;h<l;h++){var f=d(h),m=c[h]*Math.pow(a+o*f,-i);p[h]=m}return Qt(p,e.shape)},t.prototype.LRNGrad=function(e,n,a,o,i,s,u){z(e,"LRNGrad");for(var c=e.shape[3],l=this.readSync(e.dataId),p=this.readSync(n.dataId),d=this.readSync(a.dataId),h=new Float32Array(e.size),f=e.size,m=0;m<f;m++){for(var v=m%c,g=m-v+Math.max(0,v-o),y=m-v+Math.min(c,v+o+1),x=0,b=g;b<y;b++)x+=Math.pow(p[b],2);for(x=s*x+i,b=g;b<y;b++){var C=-2*s*u*p[b]*d[m]/x;m===b&&(C+=Math.pow(x,-u)),C*=l[m],h[b]+=C}}return Qt(h,e.shape)},t.prototype.multinomial=function(e,n,a,o){z(e,"multinomial");for(var i=n?e:sr(e),s=i.shape[0],u=i.shape[1],c=ye([s,a],"int32"),l=this.readSync(c.dataId),p=this.readSync(i.dataId),d=0;d<s;++d){var h=d*u,f=new Float32Array(u-1);f[0]=p[h];for(var m=1;m<f.length;++m)f[m]=f[m-1]+p[h+m];for(var v=ua(o.toString()),g=d*a,y=0;y<a;++y){var x=v();l[g+y]=f.length;for(var b=0;b<f.length;b++)if(x<f[b]){l[g+y]=b;break}}}return c},t.prototype.oneHot=function(e,n,a,o){z(e,"oneHot");var i=new Float32Array(e.size*n);i.fill(o);for(var s=this.readSync(e.dataId),u=0;u<e.size;++u)s[u]>=0&&s[u]<n&&(i[u*n+s[u]]=a);return Lt(i,[e.size,n],"int32")},t.prototype.nonMaxSuppression=function(e,n,a,o,i){return z(e,"nonMaxSuppression"),xi(this.readSync(e.dataId),this.readSync(n.dataId),a,o,i)},t.prototype.fft=function(e){return this.fftBatch(e,!1)},t.prototype.ifft=function(e){return this.fftBatch(e,!0)},t.prototype.fftBatch=function(e,n){for(var a=e.shape[0],o=e.shape[1],i=te(e.shape,"float32"),s=te(e.shape,"float32"),u=ze(e).as2D(a,o),c=Ze(e).as2D(a,o),l=0;l<a;l++)for(var p=u.slice([l,0],[1,o]),d=c.slice([l,0],[1,o]),h=Ae(p,d),f=this.readSync(this.fftImpl(h,n).dataId),m=0;m<o;m++){var v=Fs(f,m);i.values[l*o+m]=v.real,s.values[l*o+m]=v.imag}return Ae(i.toTensor(),s.toTensor()).as2D(a,o)},t.prototype.fftImpl=function(e,n){var a=e.as1D(),o=a.size;if(this.isExponentOf2(o)){var i=this.fftRadix2(a,o,n).as2D(e.shape[0],e.shape[1]);return n&&(i=Ae(ze(i).div(K(o)),Ze(i).div(K(o)))),i}var s=this.readSync(e.dataId),u=(function(c){for(var l=new Float32Array(c.length/2),p=new Float32Array(c.length/2),d=0;d<c.length;d+=2)l[d/2]=c[d],p[d/2]=c[d+1];return{real:l,imag:p}})(this.fourierTransformByMatmul(s,o,n));return Ae(u.real,u.imag).as2D(e.shape[0],e.shape[1])},t.prototype.isExponentOf2=function(e){return(e&e-1)==0},t.prototype.fftRadix2=function(e,n,a){if(n===1)return e;var o=this.readSync(e.dataId),i=n/2,s=(function(g){for(var y=Math.ceil(g.length/4),x=new Float32Array(y),b=new Float32Array(y),C=0;C<g.length;C+=4)x[Math.floor(C/4)]=g[C],b[Math.floor(C/4)]=g[C+1];return{real:x,imag:b}})(o),u=Ae(s.real,s.imag).as1D(),c=(function(g){for(var y=Math.floor(g.length/4),x=new Float32Array(y),b=new Float32Array(y),C=2;C<g.length;C+=4)x[Math.floor(C/4)]=g[C],b[Math.floor(C/4)]=g[C+1];return{real:x,imag:b}})(o),l=Ae(c.real,c.imag).as1D();u=this.fftRadix2(u,i,a),l=this.fftRadix2(l,i,a);var p=(function(g,y){for(var x=new Float32Array(g/2),b=new Float32Array(g/2),C=0;C<Math.ceil(g/2);C++){var E=(y?2:-2)*Math.PI*(C/g);x[C]=Math.cos(E),b[C]=Math.sin(E)}return{real:x,imag:b}})(n,a),d=Ae(p.real,p.imag).mul(l),h=u.add(d),f=u.sub(d),m=ze(h).concat(ze(f)),v=Ze(h).concat(Ze(f));return Ae(m,v).as1D()},t.prototype.fourierTransformByMatmul=function(e,n,a){for(var o=new Float32Array(2*n),i=0;i<n;i++){for(var s=0,u=0,c=0;c<n;c++){var l=qp(i*c,n,a),p=Fs(e,c);s+=p.real*l.real-p.imag*l.imag,u+=p.real*l.imag+p.imag*l.real}a&&(s/=n,u/=n),Hp(o,s,u,i)}return o},t.prototype.depthToSpace=function(e,n,a){S(a==="NHWC",(function(){return"Only NHWC dataFormat supported on CPU for depthToSpace. Got "+a})),S(n>1,(function(){return"blockSize should be > 1 for depthToSpace, but was: "+n}));for(var o=e.shape[0],i=e.shape[1],s=e.shape[2],u=e.shape[3],c=i*n,l=s*n,p=u/(n*n),d=this.readSync(e.dataId),h=new Float32Array(o*c*l*p),f=0,m=0;m<o;++m)for(var v=0;v<c;++v)for(var g=Math.floor(v/n),y=v%n,x=0;x<l;++x)for(var b=Math.floor(x/n),C=(y*n+x%n)*p,E=0;E<p;++E){var R=E+C+u*(b+s*(g+i*m));h[f++]=d[R]}return Qt(h,[o,c,l,p])},t.prototype.broadcastedBinaryOp=function(e,n,a,o){var i=ie(e.shape,n.shape),s=te(i,a),u=this.readSync(e.dataId),c=this.readSync(n.dataId),l=Rt(e.shape,i),p=Rt(n.shape,i),d=s.values;if(l.length+p.length===0)for(var h=0;h<d.length;++h)d[h]=o(u[h%u.length],c[h%c.length]);else{var f=this.bufferSync(e),m=this.bufferSync(n),v=function(g){var y=s.indexToLoc(g),x=y.slice(-e.rank);l.forEach((function(R){return x[R]=0}));var b=f.locToIndex(x),C=y.slice(-n.rank);p.forEach((function(R){return C[R]=0}));var E=m.locToIndex(C);d[g]=o(u[b],c[E])};for(h=0;h<d.length;++h)v(h)}return s.toTensor()},t.prototype.broadcastedBinaryComplexOp=function(e,n,a){var o=ie(e.shape,n.shape),i=te(o,"float32"),s=te(o,"float32"),u=this.readSync(e.dataId),c=this.readSync(n.dataId),l=Rt(e.shape,o),p=Rt(n.shape,o),d=i.values,h=s.values;if(l.length+p.length===0)for(var f=0;f<d.length;f++){var m=f%u.length,v=f%c.length,g=a(u[2*m],u[2*m+1],c[2*v],c[2*v+1]);d[f]=g.real,h[f]=g.imag}else{var y=this.bufferSync(this.data.get(e.dataId).complexTensors.real),x=this.bufferSync(this.data.get(n.dataId).complexTensors.real),b=function(C){var E=i.indexToLoc(C),R=E.slice(-e.rank);l.forEach((function(_){return R[_]=0}));var I=y.locToIndex(R),k=E.slice(-n.rank);p.forEach((function(_){return k[_]=0}));var T=x.locToIndex(k),O=a(u[2*I],u[2*I+1],c[2*T],c[2*T+1]);d[C]=O.real,h[C]=O.imag};for(f=0;f<d.length;f++)b(f)}return this.complex(i.toTensor(),s.toTensor())},t.prototype.split=function(e,n,a){return Cc(e,n,a)},t.prototype.dispose=function(){},t.prototype.floatPrecision=function(){return 32},t.prototype.epsilon=function(){return 1e-7},t.prototype.cropAndResize=function(e,n,a,o,i,s){for(var u=e.shape,c=u[0],l=u[1],p=u[2],d=u[3],h=n.shape[0],f=o[0],m=o[1],v=te([h,f,m,d],"float32"),g=this.readSync(n.dataId),y=this.readSync(a.dataId),x=this.readSync(e.dataId),b=e.strides,C=v.strides,E=0;E<h;E++){var R=4*E,I=g[R],k=g[R+1],T=g[R+2],O=g[R+3],_=y[E];if(!(_>=c))for(var W=f>1?(T-I)*(l-1)/(f-1):0,L=m>1?(O-k)*(p-1)/(m-1):0,P=0;P<f;P++){var U=f>1?I*(l-1)+P*W:.5*(I+T)*(l-1);if(U<0||U>l-1)for(var G=0;G<m;G++)for(var V=0;V<d;V++){var H=V+G*C[2]+P*C[1]+E*C[0];v.values[H]=s}else if(i==="bilinear"){var q=Math.floor(U),j=Math.ceil(U),J=U-q;for(G=0;G<m;G++)if((le=m>1?k*(p-1)+G*L:.5*(k+O)*(p-1))<0||le>p-1)for(V=0;V<d;V++)H=V+G*C[2]+P*C[1]+E*C[0],v.values[H]=s;else{var Z=Math.floor(le),re=Math.ceil(le),ae=le-Z;for(V=0;V<d;V++){var se=x[H=V+Z*b[2]+q*b[1]+_*b[0]],pe=x[H=V+re*b[2]+q*b[1]+_*b[0]],ce=x[H=V+Z*b[2]+j*b[1]+_*b[0]],de=se+(pe-se)*ae,Ie=ce+(x[H=V+re*b[2]+j*b[1]+_*b[0]]-ce)*ae;H=V+G*C[2]+P*C[1]+E*C[0],v.values[H]=de+(Ie-de)*J}}}else for(G=0;G<m;++G){var le;if((le=m>1?k*(p-1)+G*L:.5*(k+O)*(p-1))<0||le>p-1)for(V=0;V<d;V++)H=V+G*C[2]+P*C[1]+E*C[0],v.values[H]=s;else{var me=Math.round(le),he=Math.round(U);for(V=0;V<d;V++){var Ne=V+me*b[2]+he*b[1]+_*b[0],be=V+G*C[2]+P*C[1]+E*C[0];v.values[be]=x[Ne]}}}}}return v.toTensor()},t.prototype.sparseToDense=function(e,n,a,o){var i=Zn(0,e,a),s=i.sliceRank,u=i.numUpdates,c=i.sliceSize,l=i.strides,p=i.outputSize;return this.scatter(e,n,a,p,c,u,s,l,o,!1)},t.prototype.gatherND=function(e,n){var a=n.shape,o=a[a.length-1],i=pi(e,n),s=i[0],u=i[1],c=i[2],l=i[3];if(u===0)return De([],s,e.dtype);for(var p=new $n([u,c],e.dtype),d=this.readSync(n.dataId),h=this.readSync(e.dataId),f=0;f<u;f++){for(var m=[],v=0,g=0;g<o;g++){var y=d[f*o+g];v+=y*l[g],m.push(y)}if(v<0||v>=e.size/c)throw new Error("Invalid indices: "+m+" does not index into "+e.shape);for(var x=0;x<c;x++)p.values[f*c+x]=h[v*c+x]}return p.toTensor().reshape(s)},t.prototype.scatterND=function(e,n,a){var o=Zn(0,e,a),i=o.sliceRank,s=o.numUpdates,u=o.sliceSize,c=o.strides,l=o.outputSize,p=K(0);return this.scatter(e,n,a,l,u,s,i,c,p,!0)},t.prototype.fill=function(e,n,a){var o=Kn(a=a||Dn(n),$(e));return o.fill(n),D.makeTensor(o,e,a,this)},t.prototype.onesLike=function(e){if(e.dtype==="string")throw new Error("onesLike is not supported for string tensors");return this.fill(e.shape,1,e.dtype)},t.prototype.zerosLike=function(e){var n=Kn(e.dtype,$(e.shape));return this.makeOutput(n,e.shape,e.dtype)},t.prototype.linspace=function(e,n,a){return yi(e,n,a)},t.prototype.scatter=function(e,n,a,o,i,s,u,c,l,p){var d=[o/i,i],h=this.readSync(e.dataId),f=this.readSync(n.dataId);if(o===0)return De([],a,n.dtype);var m=new $n(d,n.dtype);m.values.fill(this.readSync(l.dataId)[0]);for(var v=0;v<s;v++){for(var g=[],y=0,x=0;x<u;x++){var b=h[v*u+x];g.push(b),y+=b*c[x]}if(y<0||y>=o/i)throw new Error("Invalid indices: "+g+" does not index into "+a);for(var C=0;C<i;C++)p?m.values[y*i+C]+=f[v*i+C]:m.values[y*i+C]=n.rank===0?f[0]:f[v*i+C]}return m.toTensor().reshape(a)},t})(bc);function Nl(r,t){return{kernelName:r,backendName:"cpu",kernelFunc:function(e){var n=e.inputs,a=e.backend,o=n,i=o.a,s=o.b,u=a;z([i,s],r);var c=u.data.get(i.dataId).values,l=u.data.get(s.dataId).values,p=t(i.shape,s.shape,c,l,i.dtype),d=p[0],h=p[1];return{dataId:u.write(d,h,i.dtype),shape:h,dtype:i.dtype}}}}function El(r){return function(t,e,n,a,o){var i=ie(t,e),s=i.length,u=Ge(i),c=nn(o,$(i)),l=t.length,p=e.length,d=Ge(t),h=Ge(e),f=Rt(t,i),m=Rt(e,i);if(f.length+m.length===0)for(var v=0;v<c.length;++v)c[v]=r(n[v%n.length],a[v%a.length]);else{var g=function(y){var x=Ro(y,s,u),b=x.slice(-l);f.forEach((function(I){return b[I]=0}));var C=Lr(b,l,d),E=x.slice(-p);m.forEach((function(I){return E[I]=0}));var R=Lr(E,p,h);c[y]=r(n[C],a[R])};for(v=0;v<c.length;++v)g(v)}return[c,i]}}D.registerBackend("cpu",(function(){return new Zf}),1);var em=El((function(r,t){return r/t})),tm=Nl(ea,em),nm={kernelName:"MaxPoolWithArgmax",backendName:"cpu",kernelFunc:function(r){var t=r.inputs,e=r.attrs,n=r.backend,a=t.x,o=e,i=o.filterSize,s=o.strides,u=o.pad,c=o.includeBatchInIndex,l=n;z(a,"MaxPoolWithArgmax");var p=l.data.get(a.dataId).values,d=zt(a.shape,i,s,[1,1],u),h=(function(y,x,b,C,E){var R=go(y,0,b,Ge(x),E,"max"),I=Cl(y,x,b,E,!0,C);return[R.values,I.values]})(p,a.shape,a.dtype,c,d),f=h[0],m=h[1],v=l.write(f,d.outShape,a.dtype),g=l.write(m,d.outShape,a.dtype);return[{dataId:v,shape:d.outShape,dtype:a.dtype},{dataId:g,shape:d.outShape,dtype:"int32"}]}},rm={kernelName:"NonMaxSuppressionV5",backendName:"cpu",kernelFunc:function(r){var t=r.inputs,e=r.backend,n=r.attrs,a=t,o=a.boxes,i=a.scores,s=n,u=s.maxOutputSize,c=s.iouThreshold,l=s.scoreThreshold,p=s.softNmsSigma,d=e;z(o,"NonMaxSuppressionWithScore");var h=bi(d.data.get(o.dataId).values,d.data.get(i.dataId).values,u,c,l,p);return[h.selectedIndices,h.selectedScores]}},am={kernelName:"Square",backendName:"cpu",kernelFunc:function(r){var t=r.inputs,e=r.backend,n=t.x,a=e;z(n,"square");for(var o=a.data.get(n.dataId).values,i=new Float32Array(o.length),s=0;s<o.length;++s){var u=o[s];i[s]=u*u}return{dataId:a.write(i,n.shape,n.dtype),shape:n.shape,dtype:n.dtype}}},om=El((function(r,t){var e=r-t;return e*e}));function Sl(r,t,e,n,a){for(var o=$(t),i=t.length,s=Ge(t),u=Ge(a),c=nn(e,$(a)),l=0;l<o;++l){for(var p=Ro(l,i,s),d=new Array(p.length),h=0;h<d.length;h++)d[h]=p[n[h]];c[Lr(d,i,u)]=r[l]}return c}for(Nr=0,Ya=[rm,am,Nl(ta,om),tm,{kernelName:"Transpose",backendName:"cpu",kernelFunc:function(r){var t=r.inputs,e=r.attrs,n=r.backend,a=t.x,o=e.perm,i=n;z(a,"transpose");for(var s=a.shape.length,u=new Array(s),c=0;c<u.length;c++)u[c]=a.shape[o[c]];var l=Sl(i.data.get(a.dataId).values,a.shape,a.dtype,o,u);return{dataId:i.write(l,u,a.dtype),shape:u,dtype:a.dtype}}},nm];Nr<Ya.length;Nr++)fu(Ya[Nr]);var Nr,Ya,gn,im=function(r){this.variableNames=["A"];var t=Me(),e=r[0],n=r[1];this.outputShape=r,this.userCode=`
      void main() {
        ivec3 coords = getOutputCoords();
        int texR = coords[0];
        int texC = coords[1];
        int depth = coords[2];
        vec2 uv = (vec2(texC, texR) + halfCR) / vec2(`+n+".0, "+e+`.0);

        vec4 values = `+t.texture2D+`(A, uv);
        float value;
        if (depth == 0) {
          value = values.r;
        } else if (depth == 1) {
          value = values.g;
        } else if (depth == 2) {
          value = values.b;
        } else if (depth == 3) {
          value = values.a;
        }

        setOutput(floor(value * 255.0 + 0.5));
      }
    `},sm=function(r){this.variableNames=["A"],this.packedInputs=!1,this.packedOutput=!0;var t=Me(),e=r[0],n=r[1];this.outputShape=r,this.userCode=`
      void main() {
        ivec3 coords = getOutputCoords();
        int texR = coords[0];
        int texC = coords[1];
        int depth = coords[2];

        vec4 result = vec4(0.);

        for(int row=0; row<=1; row++) {
          for(int col=0; col<=1; col++) {
            texC = coords[1] + row;
            depth = coords[2] + col;

            vec2 uv = (vec2(texC, texR) + halfCR) /
                       vec2(`+n+".0, "+e+`.0);
            vec4 values = `+t.texture2D+`(A, uv);
            float value;
            if (depth == 0) {
              value = values.r;
            } else if (depth == 1) {
              value = values.g;
            } else if (depth == 2) {
              value = values.b;
            } else if (depth == 3) {
              value = values.a;
            }

            result[row * 2 + col] = floor(value * 255.0 + 0.5);
          }
        }

        `+t.output+` = result;
      }
    `},um=function(r,t){this.variableNames=["A"];for(var e=new Array(r.length),n=0;n<e.length;n++)e[n]=r[t[n]];this.outputShape=e,this.rank=e.length;var a=ve(this.rank),o=(function(i){var s=i.length;if(s>6)throw Error("Transpose for rank "+s+" is not yet supported");for(var u=["resRC.x","resRC.y","resRC.z","resRC.w","resRC.u","resRC.v"],c=new Array(s),l=0;l<i.length;l++)c[i[l]]=u[l];return c.join()})(t);this.userCode=`
    void main() {
      `+a+` resRC = getOutputCoords();
      setOutput(getA(`+o+`));
    }
    `},cm=function(r,t){this.variableNames=["A"],this.packedInputs=!0,this.packedOutput=!0;for(var e=new Array(r.length),n=0;n<e.length;n++)e[n]=r[t[n]];if(this.outputShape=e,this.rank=e.length,this.rank>6)throw Error("Packed transpose for rank "+this.rank+" is not yet supported.");var a=ve(this.rank),o=Sc("rc",this.rank),i=new Array(this.rank);for(n=0;n<t.length;n++)i[t[n]]=o[n];var s="vec2("+i.slice(-2).join()+")",u="++"+o[this.rank-1]+" < "+e[this.rank-1],c="getChannel(getA("+i.join()+"), "+s+")";this.userCode=`
    void main() {
      `+a+` rc = getOutputCoords();
      vec4 result = vec4(0.);
      result[0] = `+c+`;
      if(`+u+`) {
        result[1] = `+c+`;
      }
      --`+o[this.rank-1]+`;
      if(++`+o[this.rank-2]+" < "+e[this.rank-2]+`) {
        result[2] = `+c+`;
        if(`+u+`) {
          result[3] = `+c+`;
        }
      }
      setOutput(result);
    }
    `};for(Er=0,Qa=[{kernelName:"FromPixels",backendName:"webgl",kernelFunc:function(r){var t=r.inputs,e=r.backend,n=r.attrs,a=t.pixels,o=n.numChannels,i=typeof HTMLVideoElement<"u"&&a instanceof HTMLVideoElement,s=typeof HTMLImageElement<"u"&&a instanceof HTMLImageElement,u=i?[a.videoWidth,a.videoHeight]:[a.width,a.height],c=u[0],l=u[1],p=[l,c],d=[l,c,o];(s||i)&&(gn==null&&(gn=document.createElement("canvas").getContext("2d")),gn.canvas.width=c,gn.canvas.height=l,gn.drawImage(a,0,0,c,l),a=gn.canvas);var h=e.makeTensorInfo(p,"int32");e.texData.get(h.dataId).usage=Xe.PIXELS,e.gpgpu.uploadPixelDataToTexture(e.getTexture(h.dataId),a);var f=B().getBool("WEBGL_PACK")?new sm(d):new im(d),m=e.runWebGLProgram(f,[h],"int32");return e.disposeData(h.dataId),m}},{kernelName:ea,backendName:"webgl",kernelFunc:function(r){var t=r.inputs,e=r.backend,n=t;return(function(a,o,i){var s=new Ee(pd,a.shape,o.shape);return B().getBool("WEBGL_PACK_BINARY_OPERATIONS")&&(s=new dt(dd,a.shape,o.shape,!0)),i.runWebGLProgram(s,[a,o],"float32")})(n.a,n.b,e)}},{kernelName:"NonMaxSuppressionV5",backendName:"webgl",kernelFunc:function(r){var t=r.inputs,e=r.backend,n=r.attrs;Wr("tf.nonMaxSuppression() in webgl locks the UI thread. Call tf.nonMaxSuppressionAsync() instead");var a=t,o=a.boxes,i=a.scores,s=n,u=s.maxOutputSize,c=s.iouThreshold,l=s.scoreThreshold,p=s.softNmsSigma,d=e,h=bi(d.readSync(o.dataId),d.readSync(i.dataId),u,c,l,p);return[h.selectedIndices,h.selectedScores]}},{kernelName:"Square",backendName:"webgl",kernelFunc:function(r){var t=r.inputs,e=r.backend,n=t.x,a=e,o=new ne(n.shape,"return x * x;");return a.runWebGLProgram(o,[n],n.dtype)}},{kernelName:ta,backendName:"webgl",kernelFunc:function(r){var t=r.inputs,e=r.backend,n=t,a=n.a,o=n.b,i=e,s=B().getBool("WEBGL_PACK_BINARY_OPERATIONS")?new dt("return (a - b) * (a - b);",a.shape,o.shape):new Ee("return (a - b) * (a - b);",a.shape,o.shape);return i.compileAndRun(s,[a,o])}},{kernelName:"Transpose",backendName:"webgl",kernelFunc:function(r){for(var t,e=r.inputs,n=r.attrs,a=r.backend,o=e.x,i=n.perm,s=a,u=o.shape.length,c=new Array(u),l=0;l<c.length;l++)c[l]=o.shape[i[l]];if(s.shouldExecuteOnCPU([o])){var p=Sl(s.texData.get(o.dataId).values,o.shape,o.dtype,i,c);t=s.makeTensorInfo(c,o.dtype),s.texData.get(t.dataId).values=p}else t=(function(d,h,f){var m=B().getBool("WEBGL_PACK_ARRAY_OPERATIONS")?new cm(d.shape,h):new um(d.shape,h);return f.runWebGLProgram(m,[d],d.dtype)})(o,i,s);return t}},{kernelName:"MaxPoolWithArgmax",backendName:"webgl",kernelFunc:function(r){var t=r.inputs,e=r.attrs,n=r.backend,a=t.x,o=e,i=o.filterSize,s=o.strides,u=o.pad,c=o.includeBatchInIndex,l=n;S(a.shape.length===4,(function(){return"Error in maxPool: input must be rank 4 but got rank "+a.shape.length+"."}));var p=[1,1];S(Pe(s,p),(function(){return"Error in maxPool: Either strides or dilations must be 1. Got strides "+s+" and dilations '"+p+"'"}));var d=zt(a.shape,i,s,p,u),h=(function(f,m,v,g){var y=new jn(v,"max",!1),x=g.runWebGLProgram(y,[f],"float32");return y=new jn(v,"max",!0,!0,m),[x,g.runWebGLProgram(y,[f],"float32")]})(a,c,d,l);return[h[0],h[1]]}}];Er<Qa.length;Er++)fu(Qa[Er]);var Er,Qa;for(Sr=0,Ja=[{kernelName:uc,inputsToSave:["a","b"],gradFunc:function(r,t){var e=t[0],n=t[1],a=ie(e.shape,n.shape);return{a:function(){var o=r,i=ke(e.shape,a);return i.length>0&&(o=o.sum(i)),o.reshape(e.shape)},b:function(){var o=r,i=ke(n.shape,a);return i.length>0&&(o=o.sum(i)),o.reshape(n.shape)}}}},{kernelName:"AddN",saveAllInputs:!0,gradFunc:function(r,t){var e={};return t.forEach((function(n,a){e[a]=function(){return r.clone()}})),e}},{kernelName:cc,gradFunc:function(r,t,e){for(var n=e,a=n.inputShape,o=n.shape,i=Array.from(o),s=a.length-1;s>=0;s--)if(a[s]===o[s])i[s]=1;else if(a[s]!==1)throw new Error("broadcastTo(): ["+a+"] cannot be broadcast to ["+o+"].");var u=[];for(s=0;s<i.length;s++)i[s]>1&&u.push(s);return{x:function(){return r.sum(u,!0)}}}},{kernelName:ea,inputsToSave:["a","b"],gradFunc:function(r,t){var e=t[0],n=t[1],a=ie(e.shape,n.shape);return{a:function(){var o=bt(r,n.toFloat()),i=ke(e.shape,a);return i.length>0?ft(o,i).reshape(e.shape):o},b:function(){var o=r.mul(e.toFloat()),i=ke(n.shape,a);i.length>0&&(o=ft(o,i).reshape(n.shape));var s=fa(n);return or(bt(o,s.toFloat()))}}}},{kernelName:"FusedBatchNorm",inputsToSave:["x","mean","variance","scale"],gradFunc:function(r,t,e){var n=e.varianceEpsilon,a=t[0],o=t[1],i=t[2],s=t[3],u=el(a),c=s??K(1),l=ke(o.shape,u.shape),p=[];if(o.rank===1){for(var d=0;d<u.shape.length-1;++d)p.push(u.shape[d]);p.push(1)}var h=vt(a,o),f=Se(r,c),m=na(xt(i,K(n))),v=Se(Se(Se(m,m),m),K(-.5));return{x:function(){return o.rank===1?tt(Se(Se(r,Vt(m.as4D(1,1,1,o.shape[0]),p)),c),a.shape):tt(Se(Se(r,m),c),a.shape)},mean:function(){var g=Se(Se(m,K(-1)),f);return o.rank===1&&(g=ft(g,l)),tt(g,o.shape)},variance:function(){var g=Se(Se(v,h),f);return o.rank===1&&(g=ft(g,l)),tt(g,o.shape)},scale:function(){var g=Se(h,m),y=Se(r,g);return o.rank===1&&(y=ft(y,l)),tt(y,o.shape)},offset:function(){var g=r;return o.rank===1&&(g=ft(g,l)),tt(g,o.shape)}}}},{kernelName:pc,gradFunc:function(r){return{x:function(){return r.toFloat()}}}},{kernelName:lc,inputsToSave:["indices"],gradFunc:function(r,t){var e=t[0];return{indices:function(){return ye(e.shape,"float32")}}}},{kernelName:hc,inputsToSave:["x"],gradFunc:function(r,t,e){var n=t[0],a=e.paddings.map((function(o){return o[0]}));return{x:function(){return r.slice(a,n.shape)}}}},{kernelName:"Square",inputsToSave:["x"],gradFunc:function(r,t){var e=t[0];return{x:function(){return r.mul(e.toFloat().mul(2))}}}},{kernelName:ta,inputsToSave:["a","b"],gradFunc:function(r,t){var e=t[0],n=t[1],a=K(2);return{a:function(){return Se(r,Se(a,vt(e,n)))},b:function(){return Se(r,Se(a,vt(n,e)))}}}},{kernelName:dc,inputsToSave:["x"],gradFunc:function(r,t,e){var n=t[0],a=e.reps;return{x:function(){var o=ue(n);if(n.rank===1)for(var i=0;i<a[0];++i)o=o.add(r.slice([i*n.shape[0]],[n.shape[0]]));else if(n.rank===2)for(i=0;i<a[0];++i)for(var s=0;s<a[1];++s)o=o.add(r.slice([i*n.shape[0],s*n.shape[1]],[n.shape[0],n.shape[1]]));else if(n.rank===3)for(i=0;i<a[0];++i)for(s=0;s<a[1];++s)for(var u=0;u<a[2];++u)o=o.add(r.slice([i*n.shape[0],s*n.shape[1],u*n.shape[2]],[n.shape[0],n.shape[1],n.shape[2]]));else{if(n.rank!==4)throw new Error("Gradient for tile operation is not implemented for rank-"+n.rank+" tensors yet.");for(i=0;i<a[0];++i)for(s=0;s<a[1];++s)for(u=0;u<a[2];++u)for(var c=0;c<a[3];++c)o=o.add(r.slice([i*n.shape[0],s*n.shape[1],u*n.shape[2],c*n.shape[3]],[n.shape[0],n.shape[1],n.shape[2],n.shape[3]]))}return o}}}},{kernelName:"Transpose",gradFunc:function(r,t,e){var n=$r(e.perm);return{x:function(){return Ke(r,n)}}}}];Sr<Ja.length;Sr++)cp(Ja[Sr]);var Sr,Ja,lm=(function(){function r(){}return r.prototype.fetch=function(t,e){return fetch(t,e)},r.prototype.now=function(){return performance.now()},r.prototype.encode=function(t,e){if(e!=="utf-8"&&e!=="utf8")throw new Error("Browser's encoder only supports utf-8, but got "+e);return this.textEncoder==null&&(this.textEncoder=new TextEncoder),this.textEncoder.encode(t)},r.prototype.decode=function(t,e){return new TextDecoder(e).decode(t)},r})();B().get("IS_BROWSER")&&B().setPlatform("browser",new lm);var Za,pm=function(){return Ss()},dm=(function(){function r(){this.util=Is(),this.textEncoder=new this.util.TextEncoder}return r.prototype.fetch=function(t,e){return B().global.fetch!=null?B().global.fetch(t,e):(Za==null&&(Za=pm()),Za(t,e))},r.prototype.now=function(){var t=process.hrtime();return 1e3*t[0]+t[1]/1e6},r.prototype.encode=function(t,e){if(e!=="utf-8"&&e!=="utf8")throw new Error("Node built-in encoder only supports utf-8, but got "+e);return this.textEncoder.encode(t)},r.prototype.decode=function(t,e){return t.length===0?"":new this.util.TextDecoder(e).decode(t)},r})();B().get("IS_NODE")&&B().setPlatform("node",new dm);var yo={float32:4,int32:4,uint16:2,uint8:1,bool:1},Kr=4;function Il(r,t){for(var e={},n=0,a=function(s){var u=s.name,c=s.dtype,l=s.shape,p=$(l),d=void 0;if("quantization"in s){var h=s.quantization;if(h.dtype!=="uint8"&&h.dtype!=="uint16")throw new Error("Weight "+s.name+" has unknown quantization dtype "+h.dtype+". Supported quantization dtypes are: 'uint8' and 'uint16'.");var f=yo[h.dtype],m=r.slice(n,n+p*f),v=h.dtype==="uint8"?new Uint8Array(m):new Uint16Array(m);if(c==="float32")d=Float32Array.from(v,(function(E){return E*h.scale+h.min}));else{if(c!=="int32")throw new Error("Unsupported dtype in weight '"+u+"': "+c);d=Int32Array.from(v,(function(E){return Math.round(E*h.scale+h.min)}))}n+=p*f}else if(c==="string"){var g=$(s.shape);d=[];for(var y=0;y<g;y++){var x=new Uint32Array(r.slice(n,n+Kr))[0];n+=Kr;var b=new Uint8Array(r.slice(n,n+x));d.push(b),n+=x}}else{var C=yo[c];if(m=r.slice(n,n+p*C),c==="float32")d=new Float32Array(m);else if(c==="int32")d=new Int32Array(m);else{if(c!=="bool")throw new Error("Unsupported dtype in weight '"+u+"': "+c);d=new Uint8Array(m)}n+=p*C}e[u]=De(d,l,c)},o=0,i=t;o<i.length;o++)a(i[o]);return e}function hm(r){if(r===null)throw new Error("Invalid input value: "+JSON.stringify(r));var t=0,e=[];r.forEach((function(o){if(t+=o.byteLength,e.push(o.byteLength===o.buffer.byteLength?o:new o.constructor(o)),!(o instanceof Float32Array||o instanceof Int32Array||o instanceof Uint8Array))throw new Error("Unsupported TypedArray subtype: "+o.constructor.name)}));var n=new Uint8Array(t),a=0;return e.forEach((function(o){n.set(new Uint8Array(o.buffer),a),a+=o.byteLength})),n.buffer}var xo=typeof Buffer<"u"&&(typeof Blob>"u"||typeof atob>"u"||typeof btoa>"u");function nu(r){return xo?Buffer.byteLength(r):new Blob([r]).size}function cs(r){var t=0;r.forEach((function(a){t+=a.byteLength}));var e=new Uint8Array(t),n=0;return r.forEach((function(a){e.set(new Uint8Array(a),n),n+=a.byteLength})),e.buffer}function ru(r){for(r=r.trim();r.endsWith("/");)r=r.slice(0,r.length-1);var t=r.split("/");return t[t.length-1]}function fr(r){if(r.modelTopology instanceof ArrayBuffer)throw new Error("Expected JSON model topology, received ArrayBuffer.");return{dateSaved:new Date,modelTopologyType:"JSON",modelTopologyBytes:r.modelTopology==null?0:nu(JSON.stringify(r.modelTopology)),weightSpecsBytes:r.weightSpecs==null?0:nu(JSON.stringify(r.weightSpecs)),weightDataBytes:r.weightData==null?0:r.weightData.byteLength}}var Ye=(function(){function r(){this.saveRouters=[],this.loadRouters=[]}return r.getInstance=function(){return r.instance==null&&(r.instance=new r),r.instance},r.registerSaveRouter=function(t){r.getInstance().saveRouters.push(t)},r.registerLoadRouter=function(t){r.getInstance().loadRouters.push(t)},r.getSaveHandlers=function(t){return r.getHandlers(t,"save")},r.getLoadHandlers=function(t,e){return r.getHandlers(t,"load",e)},r.getHandlers=function(t,e,n){var a=[];return(e==="load"?r.getInstance().loadRouters:r.getInstance().saveRouters).forEach((function(o){var i=o(t,n);i!==null&&a.push(i)})),a},r})(),En="://",Wt=(function(){function r(){this.managers={}}return r.getInstance=function(){return r.instance==null&&(r.instance=new r),r.instance},r.registerManager=function(t,e){S(t!=null,(function(){return"scheme must not be undefined or null."})),t.endsWith(En)&&(t=t.slice(0,t.indexOf(En))),S(t.length>0,(function(){return"scheme must not be an empty string."}));var n=r.getInstance();S(n.managers[t]==null,(function(){return"A model store manager is already registered for scheme '"+t+"'."})),n.managers[t]=e},r.getManager=function(t){var e=this.getInstance().managers[t];if(e==null)throw new Error("Cannot find model manager for scheme '"+t+"'");return e},r.getSchemes=function(){return Object.keys(this.getInstance().managers)},r})();function Or(r){if(r.indexOf(En)===-1)throw new Error("The url string provided does not contain a scheme. Supported schemes are: "+Wt.getSchemes().join(","));return{scheme:r.split(En)[0],path:r.split(En)[1]}}function au(r,t,e){return e===void 0&&(e=!1),Y(this,void 0,void 0,(function(){var n,a,o,i,s,u,c,l,p;return Q(this,(function(d){switch(d.label){case 0:return S(r!==t,(function(){return"Old path and new path are the same: '"+r+"'"})),S((n=Ye.getLoadHandlers(r)).length>0,(function(){return"Copying failed because no load handler is found for source URL "+r+"."})),S(n.length<2,(function(){return"Copying failed because more than one ("+n.length+") load handlers for source URL "+r+"."})),a=n[0],S((o=Ye.getSaveHandlers(t)).length>0,(function(){return"Copying failed because no save handler is found for destination URL "+t+"."})),S(o.length<2,(function(){return"Copying failed because more than one ("+n.length+") save handlers for destination URL "+t+"."})),i=o[0],s=Or(r).scheme,u=Or(r).path,c=s===Or(r).scheme,[4,a.load()];case 1:return l=d.sent(),e&&c?[4,Wt.getManager(s).removeModel(u)]:[3,3];case 2:d.sent(),d.label=3;case 3:return[4,i.save(l)];case 4:return p=d.sent(),!e||c?[3,6]:[4,Wt.getManager(s).removeModel(u)];case 5:d.sent(),d.label=6;case 6:return[2,p.modelArtifactsInfo]}}))}))}var en="models_store",Pt="model_info_store";function kl(){if(!B().getBool("IS_BROWSER"))throw new Error("Failed to obtain IndexedDB factory because the current environmentis not a web browser.");var r=window||self,t=r.indexedDB||r.mozIndexedDB||r.webkitIndexedDB||r.msIndexedDB||r.shimIndexedDB;if(t==null)throw new Error("The current browser does not appear to support IndexedDB.");return t}function bo(r){var t=r.result;t.createObjectStore(en,{keyPath:"modelPath"}),t.createObjectStore(Pt,{keyPath:"modelPath"})}var Sn=(function(){function r(t){if(this.indexedDB=kl(),t==null||!t)throw new Error("For IndexedDB, modelPath must not be null, undefined or empty.");this.modelPath=t}return r.prototype.save=function(t){return Y(this,void 0,void 0,(function(){return Q(this,(function(e){if(t.modelTopology instanceof ArrayBuffer)throw new Error("BrowserLocalStorage.save() does not support saving model topology in binary formats yet.");return[2,this.databaseAction(this.modelPath,t)]}))}))},r.prototype.load=function(){return Y(this,void 0,void 0,(function(){return Q(this,(function(t){return[2,this.databaseAction(this.modelPath)]}))}))},r.prototype.databaseAction=function(t,e){var n=this;return new Promise((function(a,o){var i=n.indexedDB.open("tensorflowjs",1);i.onupgradeneeded=function(){return bo(i)},i.onsuccess=function(){var s=i.result;if(e==null){var u=s.transaction(en,"readonly"),c=u.objectStore(en).get(n.modelPath);c.onsuccess=function(){if(c.result==null)return s.close(),o(new Error("Cannot find model with path '"+n.modelPath+"' in IndexedDB."));a(c.result.modelArtifacts)},c.onerror=function(m){return s.close(),o(c.error)},u.oncomplete=function(){return s.close()}}else{var l,p=fr(e),d=s.transaction(Pt,"readwrite"),h=d.objectStore(Pt),f=h.put({modelPath:n.modelPath,modelArtifactsInfo:p});f.onsuccess=function(){var m=(l=s.transaction(en,"readwrite")).objectStore(en).put({modelPath:n.modelPath,modelArtifacts:e,modelArtifactsInfo:p});m.onsuccess=function(){return a({modelArtifactsInfo:p})},m.onerror=function(v){var g=(h=d.objectStore(Pt)).delete(n.modelPath);g.onsuccess=function(){return s.close(),o(m.error)},g.onerror=function(y){return s.close(),o(m.error)}}},f.onerror=function(m){return s.close(),o(f.error)},d.oncomplete=function(){l==null?s.close():l.oncomplete=function(){return s.close()}}}},i.onerror=function(s){return o(i.error)}}))},r.URL_SCHEME="indexeddb://",r})(),ou=function(r){return B().getBool("IS_BROWSER")&&!Array.isArray(r)&&r.startsWith(Sn.URL_SCHEME)?(t=r.slice(Sn.URL_SCHEME.length),new Sn(t)):null;var t};Ye.registerSaveRouter(ou),Ye.registerLoadRouter(ou);var fm=(function(){function r(){this.indexedDB=kl()}return r.prototype.listModels=function(){return Y(this,void 0,void 0,(function(){var t=this;return Q(this,(function(e){return[2,new Promise((function(n,a){var o=t.indexedDB.open("tensorflowjs",1);o.onupgradeneeded=function(){return bo(o)},o.onsuccess=function(){var i=o.result,s=i.transaction(Pt,"readonly"),u=s.objectStore(Pt).getAll();u.onsuccess=function(){for(var c={},l=0,p=u.result;l<p.length;l++){var d=p[l];c[d.modelPath]=d.modelArtifactsInfo}n(c)},u.onerror=function(c){return i.close(),a(u.error)},s.oncomplete=function(){return i.close()}},o.onerror=function(i){return a(o.error)}}))]}))}))},r.prototype.removeModel=function(t){return Y(this,void 0,void 0,(function(){var e=this;return Q(this,(function(n){var a;return t=(a=t).startsWith(Sn.URL_SCHEME)?a.slice(Sn.URL_SCHEME.length):a,[2,new Promise((function(o,i){var s=e.indexedDB.open("tensorflowjs",1);s.onupgradeneeded=function(){return bo(s)},s.onsuccess=function(){var u,c=s.result,l=c.transaction(Pt,"readwrite"),p=l.objectStore(Pt),d=p.get(t);d.onsuccess=function(){if(d.result==null)return c.close(),i(new Error("Cannot find model with path '"+t+"' in IndexedDB."));var h=p.delete(t),f=function(){var m=(u=c.transaction(en,"readwrite")).objectStore(en).delete(t);m.onsuccess=function(){return o(d.result.modelArtifactsInfo)},m.onerror=function(v){return i(d.error)}};h.onsuccess=f,h.onerror=function(m){return f(),c.close(),i(d.error)}},d.onerror=function(h){return c.close(),i(d.error)},l.oncomplete=function(){u==null?c.close():u.oncomplete=function(){return c.close()}}},s.onerror=function(u){return i(s.error)}}))]}))}))},r})();if(B().getBool("IS_BROWSER"))try{Wt.registerManager(Sn.URL_SCHEME,new fm)}catch{}var kt="/",Cn="tensorflowjs_models",Rl="info",mm="model_topology",vm="weight_specs",gm="weight_data",ym="model_metadata";function Tl(r){return{info:[Cn,r,Rl].join(kt),topology:[Cn,r,mm].join(kt),weightSpecs:[Cn,r,vm].join(kt),weightData:[Cn,r,gm].join(kt),modelMetadata:[Cn,r,ym].join(kt)}}function xm(r){var t=r.split(kt);if(t.length<3)throw new Error("Invalid key format: "+r);return t.slice(1,t.length-1).join(kt)}var In=(function(){function r(t){if(!B().getBool("IS_BROWSER")||typeof window>"u"||window.localStorage===void 0)throw new Error("The current environment does not support local storage.");if(this.LS=window.localStorage,t==null||!t)throw new Error("For local storage, modelPath must not be null, undefined or empty.");this.modelPath=t,this.keys=Tl(this.modelPath)}return r.prototype.save=function(t){return Y(this,void 0,void 0,(function(){var e,n,a;return Q(this,(function(o){if(t.modelTopology instanceof ArrayBuffer)throw new Error("BrowserLocalStorage.save() does not support saving model topology in binary formats yet.");e=JSON.stringify(t.modelTopology),n=JSON.stringify(t.weightSpecs),a=fr(t);try{return this.LS.setItem(this.keys.info,JSON.stringify(a)),this.LS.setItem(this.keys.topology,e),this.LS.setItem(this.keys.weightSpecs,n),this.LS.setItem(this.keys.weightData,(function(i){if(xo)return Buffer.from(i).toString("base64");for(var s=new Uint8Array(i),u="",c=0,l=s.length;c<l;c++)u+=String.fromCharCode(s[c]);return btoa(u)})(t.weightData)),this.LS.setItem(this.keys.modelMetadata,JSON.stringify({format:t.format,generatedBy:t.generatedBy,convertedBy:t.convertedBy,userDefinedMetadata:t.userDefinedMetadata})),[2,{modelArtifactsInfo:a}]}catch{throw this.LS.removeItem(this.keys.info),this.LS.removeItem(this.keys.topology),this.LS.removeItem(this.keys.weightSpecs),this.LS.removeItem(this.keys.weightData),this.LS.removeItem(this.keys.modelMetadata),new Error("Failed to save model '"+this.modelPath+"' to local storage: size quota being exceeded is a possible cause of this failure: modelTopologyBytes="+a.modelTopologyBytes+", weightSpecsBytes="+a.weightSpecsBytes+", weightDataBytes="+a.weightDataBytes+".")}return[2]}))}))},r.prototype.load=function(){return Y(this,void 0,void 0,(function(){var t,e,n,a,o,i,s;return Q(this,(function(u){if((t=JSON.parse(this.LS.getItem(this.keys.info)))==null)throw new Error("In local storage, there is no model with name '"+this.modelPath+"'");if(t.modelTopologyType!=="JSON")throw new Error("BrowserLocalStorage does not support loading non-JSON model topology yet.");if(e={},(n=JSON.parse(this.LS.getItem(this.keys.topology)))==null)throw new Error("In local storage, the topology of model '"+this.modelPath+"' is missing.");if(e.modelTopology=n,(a=JSON.parse(this.LS.getItem(this.keys.weightSpecs)))==null)throw new Error("In local storage, the weight specs of model '"+this.modelPath+"' are missing.");if(e.weightSpecs=a,(o=this.LS.getItem(this.keys.modelMetadata))!=null&&(i=JSON.parse(o),e.format=i.format,e.generatedBy=i.generatedBy,e.convertedBy=i.convertedBy,e.userDefinedMetadata=i.userDefinedMetadata),(s=this.LS.getItem(this.keys.weightData))==null)throw new Error("In local storage, the binary weight values of model '"+this.modelPath+"' are missing.");return e.weightData=(function(c){if(xo){var l=Buffer.from(c,"base64");return l.buffer.slice(l.byteOffset,l.byteOffset+l.byteLength)}for(var p=atob(c),d=new Uint8Array(p.length),h=0;h<p.length;++h)d.set([p.charCodeAt(h)],h);return d.buffer})(s),[2,e]}))}))},r.URL_SCHEME="localstorage://",r})(),iu=function(r){return B().getBool("IS_BROWSER")&&!Array.isArray(r)&&r.startsWith(In.URL_SCHEME)?(t=r.slice(In.URL_SCHEME.length),new In(t)):null;var t};Ye.registerSaveRouter(iu),Ye.registerLoadRouter(iu);var bm=(function(){function r(){S(B().getBool("IS_BROWSER"),(function(){return"Current environment is not a web browser"})),S(typeof window>"u"||window.localStorage!==void 0,(function(){return"Current browser does not appear to support localStorage"})),this.LS=window.localStorage}return r.prototype.listModels=function(){return Y(this,void 0,void 0,(function(){var t,e,n,a,o,i;return Q(this,(function(s){for(t={},e=Cn+kt,n=kt+Rl,a=0;a<this.LS.length;++a)(o=this.LS.key(a)).startsWith(e)&&o.endsWith(n)&&(i=xm(o),t[i]=JSON.parse(this.LS.getItem(o)));return[2,t]}))}))},r.prototype.removeModel=function(t){return Y(this,void 0,void 0,(function(){var e,n;return Q(this,(function(a){var o;if(t=(o=t).startsWith(In.URL_SCHEME)?o.slice(In.URL_SCHEME.length):o,e=Tl(t),this.LS.getItem(e.info)==null)throw new Error("Cannot find model at path '"+t+"'");return n=JSON.parse(this.LS.getItem(e.info)),this.LS.removeItem(e.info),this.LS.removeItem(e.topology),this.LS.removeItem(e.weightSpecs),this.LS.removeItem(e.weightData),[2,n]}))}))},r})();if(B().getBool("IS_BROWSER"))try{Wt.registerManager(In.URL_SCHEME,new bm)}catch{}var wm="model",Cm=".json",Nm=".weights.bin";function su(r){return new Promise((function(t){return setTimeout(t)})).then(r)}var eo=(function(){function r(t){if(!B().getBool("IS_BROWSER"))throw new Error("browserDownloads() cannot proceed because the current environment is not a browser.");t.startsWith(r.URL_SCHEME)&&(t=t.slice(r.URL_SCHEME.length)),t!=null&&t.length!==0||(t=wm),this.modelTopologyFileName=t+Cm,this.weightDataFileName=t+Nm}return r.prototype.save=function(t){return Y(this,void 0,void 0,(function(){var e,n,a,o,i,s;return Q(this,(function(u){switch(u.label){case 0:if(typeof document>"u")throw new Error("Browser downloads are not supported in this environment since `document` is not present");if(e=window.URL.createObjectURL(new Blob([t.weightData],{type:"application/octet-stream"})),!(t.modelTopology instanceof ArrayBuffer))return[3,1];throw new Error("BrowserDownloads.save() does not support saving model topology in binary formats yet.");case 1:return n=[{paths:["./"+this.weightDataFileName],weights:t.weightSpecs}],a={modelTopology:t.modelTopology,format:t.format,generatedBy:t.generatedBy,convertedBy:t.convertedBy,weightsManifest:n},o=window.URL.createObjectURL(new Blob([JSON.stringify(a)],{type:"application/json"})),(i=this.jsonAnchor==null?document.createElement("a"):this.jsonAnchor).download=this.modelTopologyFileName,i.href=o,[4,su((function(){return i.dispatchEvent(new MouseEvent("click"))}))];case 2:return u.sent(),t.weightData==null?[3,4]:((s=this.weightDataAnchor==null?document.createElement("a"):this.weightDataAnchor).download=this.weightDataFileName,s.href=e,[4,su((function(){return s.dispatchEvent(new MouseEvent("click"))}))]);case 3:u.sent(),u.label=4;case 4:return[2,{modelArtifactsInfo:fr(t)}]}}))}))},r.URL_SCHEME="downloads://",r})(),Em=(function(){function r(t){if(t==null||t.length<1)throw new Error("When calling browserFiles, at least 1 file is required, but received "+t);this.files=t}return r.prototype.load=function(){return Y(this,void 0,void 0,(function(){var t,e,n=this;return Q(this,(function(a){return t=this.files[0],e=this.files.slice(1),[2,new Promise((function(o,i){var s=new FileReader;s.onload=function(u){var c=JSON.parse(u.target.result),l=c.modelTopology;if(l!=null){e.length===0&&o({modelTopology:l});var p=c.weightsManifest;if(p!=null){var d;try{d=n.checkManifestAndWeightFiles(p,e)}catch(v){return void i(v)}var h=[],f=[],m=[];p.forEach((function(v){v.paths.forEach((function(g){f.push(g),m.push(null)})),h.push.apply(h,v.weights)})),p.forEach((function(v){v.paths.forEach((function(g){var y=new FileReader;y.onload=function(x){var b=x.target.result,C=f.indexOf(g);m[C]=b,m.indexOf(null)===-1&&o({modelTopology:l,weightSpecs:h,weightData:cs(m),format:c.format,generatedBy:c.generatedBy,convertedBy:c.convertedBy,userDefinedMetadata:c.userDefinedMetadata})},y.onerror=function(x){return i("Failed to weights data from file of path '"+g+"'.")},y.readAsArrayBuffer(d[g])}))}))}else i(new Error("weightManifest field is missing from file "+t.name))}else i(new Error("modelTopology field is missing from file "+t.name))},s.onerror=function(u){return i("Failed to read model topology and weights manifest JSON from file '"+t.name+"'. BrowserFiles supports loading Keras-style tf.Model artifacts only.")},s.readAsText(t)}))]}))}))},r.prototype.checkManifestAndWeightFiles=function(t,e){for(var n=[],a=e.map((function(u){return ru(u.name)})),o={},i=0,s=t;i<s.length;i++)s[i].paths.forEach((function(u){var c=ru(u);if(n.indexOf(c)!==-1)throw new Error("Duplicate file basename found in weights manifest: '"+c+"'");if(n.push(c),a.indexOf(c)===-1)throw new Error("Weight file with basename '"+c+"' is not provided.");o[u]=e[a.indexOf(c)]}));if(n.length!==e.length)throw new Error("Mismatch in the number of files in weights manifest ("+n.length+") and the number of weight files provided ("+e.length+").");return o},r})();function uu(r,t,e,n){(function(o){S(o!=null&&Array.isArray(o)&&o.length>0,(function(){return"promises must be a none empty array"}))})(r),(function(o,i){S(o>=0&&o<=1,(function(){return"Progress fraction must be in range [0, 1], but got startFraction "+o})),S(i>=0&&i<=1,(function(){return"Progress fraction must be in range [0, 1], but got endFraction "+i})),S(i>=o,(function(){return"startFraction must be no more than endFraction, but got startFraction "+o+" and endFraction "+i}))})(e=e??0,n=n??1);var a=0;return Promise.all(r.map((function(o){return o.then((function(i){var s=e+ ++a/r.length*(n-e);return t(s),i})),o})))}function Al(r,t){return Y(this,void 0,void 0,(function(){var e,n,a,o,i,s,u,c,l;return Q(this,(function(p){switch(p.label){case 0:return t==null&&(t={}),e=t.fetchFunc==null?B().platform.fetch:t.fetchFunc,n=r.map((function(d){return e(d,t.requestInit,{isBinary:!0})})),a=0,o=.5,t.onProgress!=null?[3,2]:[4,Promise.all(n)];case 1:return i=p.sent(),[3,4];case 2:return[4,uu(n,t.onProgress,a,o)];case 3:i=p.sent(),p.label=4;case 4:return s=i.map((function(d){return d.arrayBuffer()})),u=.5,c=1,t.onProgress!=null?[3,6]:[4,Promise.all(s)];case 5:return l=p.sent(),[3,8];case 6:return[4,uu(s,t.onProgress,u,c)];case 7:l=p.sent(),p.label=8;case 8:return[2,l]}}))}))}function cu(r){var t=this;return function(e,n,a){return n===void 0&&(n=""),Y(t,void 0,void 0,(function(){var o,i,s,u,c,l,p,d,h,f;return Q(this,(function(m){switch(m.label){case 0:if(o=e.map((function(){return!1})),i={},s=a!=null?a.map((function(){return!1})):[],u=[],e.forEach((function(v,g){var y=0;v.weights.forEach((function(x){var b="quantization"in x?x.quantization.dtype:x.dtype,C=yo[b]*$(x.shape),E=function(){o[g]=!0,i[g]==null&&(i[g]=[]),i[g].push({manifestEntry:x,groupOffset:y,sizeBytes:C})};a!=null?a.forEach((function(R,I){R===x.name&&(E(),s[I]=!0)})):E(),u.push(x.name),y+=C}))})),!s.every((function(v){return v})))throw c=a.filter((function(v,g){return!s[g]})),new Error("Could not find weights in manifest with names: "+c.join(", ")+`. 
Manifest JSON has weights with names: `+u.join(", ")+".");return l=o.reduce((function(v,g,y){return g&&v.push(y),v}),[]),p=[],l.forEach((function(v){e[v].paths.forEach((function(g){var y=n+(n.endsWith("/")?"":"/")+g;p.push(y)}))})),[4,r(p)];case 1:return d=m.sent(),h={},f=0,l.forEach((function(v){for(var g=e[v].paths.length,y=0,x=0;x<g;x++)y+=d[f+x].byteLength;for(var b=new ArrayBuffer(y),C=new Uint8Array(b),E=0,R=0;R<g;R++){var I=new Uint8Array(d[f+R]);C.set(I,E),E+=I.byteLength}i[v].forEach((function(k){var T=Il(b.slice(k.groupOffset,k.groupOffset+k.sizeBytes),[k.manifestEntry]);for(var O in T)h[O]=T[O]})),f+=g})),[2,h]}}))}))}}Ye.registerSaveRouter((function(r){return B().getBool("IS_BROWSER")&&!Array.isArray(r)&&r.startsWith(eo.URL_SCHEME)?(function(t){return t===void 0&&(t="model"),new eo(t)})(r.slice(eo.URL_SCHEME.length)):null}));var Dl=(function(){function r(t,e){if(this.DEFAULT_METHOD="POST",e==null&&(e={}),this.weightPathPrefix=e.weightPathPrefix,this.onProgress=e.onProgress,e.fetchFunc!=null?(S(typeof e.fetchFunc=="function",(function(){return"Must pass a function that matches the signature of `fetch` (see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)"})),this.fetch=e.fetchFunc):this.fetch=B().platform.fetch,S(t!=null&&t.length>0,(function(){return"URL path for http must not be null, undefined or empty."})),Array.isArray(t)&&S(t.length===2,(function(){return"URL paths for http must have a length of 2, (actual length is "+t.length+")."})),this.path=t,e.requestInit!=null&&e.requestInit.body!=null)throw new Error("requestInit is expected to have no pre-existing body, but has one.");this.requestInit=e.requestInit||{}}return r.prototype.save=function(t){return Y(this,void 0,void 0,(function(){var e,n,a,o;return Q(this,(function(i){switch(i.label){case 0:if(t.modelTopology instanceof ArrayBuffer)throw new Error("BrowserHTTPRequest.save() does not support saving model topology in binary formats yet.");return(e=Object.assign({method:this.DEFAULT_METHOD},this.requestInit)).body=new FormData,n=[{paths:["./model.weights.bin"],weights:t.weightSpecs}],a={modelTopology:t.modelTopology,format:t.format,generatedBy:t.generatedBy,convertedBy:t.convertedBy,userDefinedMetadata:t.userDefinedMetadata,weightsManifest:n},e.body.append("model.json",new Blob([JSON.stringify(a)],{type:"application/json"}),"model.json"),t.weightData!=null&&e.body.append("model.weights.bin",new Blob([t.weightData],{type:"application/octet-stream"}),"model.weights.bin"),[4,this.fetch(this.path,e)];case 1:if((o=i.sent()).ok)return[2,{modelArtifactsInfo:fr(t),responses:[o]}];throw new Error("BrowserHTTPRequest.save() failed due to HTTP response status "+o.status+".")}}))}))},r.prototype.load=function(){return Y(this,void 0,void 0,(function(){var t,e,n,a,o,i,s,u,c,l,p,d;return Q(this,(function(h){switch(h.label){case 0:return[4,this.fetch(this.path,this.requestInit)];case 1:if(!(t=h.sent()).ok)throw new Error("Request to "+this.path+" failed with status code "+t.status+". Please verify this URL points to the model JSON of the model to load.");h.label=2;case 2:return h.trys.push([2,4,,5]),[4,t.json()];case 3:return e=h.sent(),[3,5];case 4:throw h.sent(),n="Failed to parse model JSON of response from "+this.path+".",this.path.endsWith(".pb")?n+=" Your path contains a .pb file extension. Support for .pb models have been removed in TensorFlow.js 1.0 in favor of .json models. You can re-convert your Python TensorFlow model using the TensorFlow.js 1.0 conversion scripts or you can convert your.pb models with the 'pb2json'NPM script in the tensorflow/tfjs-converter repository.":n+=" Please make sure the server is serving valid JSON for this request.",new Error(n);case 5:if(a=e.modelTopology,o=e.weightsManifest,i=e.generatedBy,s=e.convertedBy,u=e.format,c=e.userDefinedMetadata,a==null&&o==null)throw new Error("The JSON from HTTP path "+this.path+" contains neither model topology or manifest for weights.");return o==null?[3,7]:[4,this.loadWeights(o)];case 6:d=h.sent(),l=d[0],p=d[1],h.label=7;case 7:return[2,{modelTopology:a,weightSpecs:l,weightData:p,userDefinedMetadata:c,generatedBy:i,convertedBy:s,format:u}]}}))}))},r.prototype.loadWeights=function(t){return Y(this,void 0,void 0,(function(){var e,n,a,o,i,s,u,c,l,p,d;return Q(this,(function(h){switch(h.label){case 0:for(e=Array.isArray(this.path)?this.path[1]:this.path,n=(function(f){var m=f.lastIndexOf("/"),v=f.lastIndexOf("?"),g=f.substring(0,m),y=v>m?f.substring(v):"";return[g+"/",y]})(e),a=n[0],o=n[1],i=this.weightPathPrefix||a,s=[],u=0,c=t;u<c.length;u++)l=c[u],s.push.apply(s,l.weights);return p=[],t.forEach((function(f){f.paths.forEach((function(m){p.push(i+m+o)}))})),[4,Al(p,{requestInit:this.requestInit,fetchFunc:this.fetch,onProgress:this.onProgress})];case 1:return d=h.sent(),[2,[s,cs(d)]]}}))}))},r.URL_SCHEME_REGEX=/^https?:\/\//,r})();function wo(r){return r.match(Dl.URL_SCHEME_REGEX)!=null}var lu=function(r,t){return typeof fetch>"u"?null:(Array.isArray(r)?r.every((function(e){return wo(e)})):wo(r))?Co(r,{onProgress:t}):null};function Co(r,t){return new Dl(r,t)}Ye.registerSaveRouter(lu),Ye.registerLoadRouter(lu);var to=(function(){function r(t){this.modelArtifacts=t}return r.prototype.load=function(){return Y(this,void 0,void 0,(function(){return Q(this,(function(t){return[2,this.modelArtifacts]}))}))},r})(),Sm=(function(){function r(t){this.saveHandler=t}return r.prototype.save=function(t){return Y(this,void 0,void 0,(function(){return Q(this,(function(e){return[2,this.saveHandler(t)]}))}))},r})(),Mn=Object.freeze({browserFiles:function(r){return new Em(r)},browserHTTPRequest:function(r,t){return Co(r,t)},concatenateArrayBuffers:cs,decodeWeights:Il,encodeWeights:function(r,t){return Y(this,void 0,void 0,(function(){var e,n,a,o,i,s=this;return Q(this,(function(u){switch(u.label){case 0:for(e=[],n=[],a=Array.isArray(r)?r.map((function(c){return c.name})):Object.keys(r),o=function(c){var l=a[c],p=Array.isArray(r)?r[c].tensor:r[l];if(p.dtype!=="float32"&&p.dtype!=="int32"&&p.dtype!=="bool"&&p.dtype!=="string")throw new Error("Unsupported dtype in weight '"+l+"': "+p.dtype);var d={name:l,shape:p.shape,dtype:p.dtype};if(p.dtype==="string"){var h=new Promise((function(f){return Y(s,void 0,void 0,(function(){var m,v,g,y,x,b,C;return Q(this,(function(E){switch(E.label){case 0:return[4,p.bytes()];case 1:for(m=E.sent(),v=m.reduce((function(R,I){return R+I.length}),0)+Kr*m.length,g=new Uint8Array(v),y=0,x=0;x<m.length;x++)b=m[x],C=new Uint8Array(new Uint32Array([b.length]).buffer),g.set(C,y),y+=Kr,g.set(b,y),y+=b.length;return f(g),[2]}}))}))}));n.push(h)}else n.push(p.data());t!=null&&(d.group=t),e.push(d)},i=0;i<a.length;++i)o(i);return[4,Promise.all(n)];case 1:return[2,{data:hm(u.sent()),specs:e}]}}))}))},fromMemory:function(r,t,e,n){return arguments.length===1?r.modelTopology!=null||r.weightSpecs!=null?new to(r):(console.warn("Please call tf.io.fromMemory() with only one argument. The argument should be of type ModelArtifacts. The multi-argument signature of tf.io.fromMemory() has been deprecated and will be removed in a future release."),new to({modelTopology:r})):(console.warn("Please call tf.io.fromMemory() with only one argument. The argument should be of type ModelArtifacts. The multi-argument signature of tf.io.fromMemory() has been deprecated and will be removed in a future release."),new to({modelTopology:r,weightSpecs:t,weightData:e,trainingConfig:n}))},getLoadHandlers:function(r,t){return Ye.getLoadHandlers(r,t)},getModelArtifactsInfoForJSON:fr,getSaveHandlers:function(r){return Ye.getSaveHandlers(r)},http:Co,isHTTPScheme:wo,loadWeights:function(r,t,e,n){return t===void 0&&(t=""),Y(this,void 0,void 0,(function(){return Q(this,(function(a){return[2,cu((function(o){return Al(o,{requestInit:n})}))(r,t,e)]}))}))},registerLoadRouter:function(r){return Ye.registerLoadRouter(r)},registerSaveRouter:function(r){return Ye.registerSaveRouter(r)},weightsLoaderFactory:cu,withSaveHandler:function(r){return new Sm(r)},copyModel:function(r,t){return Y(this,void 0,void 0,(function(){return Q(this,(function(e){return[2,au(r,t,!1)]}))}))},listModels:function(){return Y(this,void 0,void 0,(function(){var r,t,e,n,a,o,i;return Q(this,(function(s){switch(s.label){case 0:r=Wt.getSchemes(),t={},e=0,n=r,s.label=1;case 1:return e<n.length?(a=n[e],[4,Wt.getManager(a).listModels()]):[3,4];case 2:for(i in o=s.sent())t[a+En+i]=o[i];s.label=3;case 3:return e++,[3,1];case 4:return[2,t]}}))}))},moveModel:function(r,t){return Y(this,void 0,void 0,(function(){return Q(this,(function(e){return[2,au(r,t,!0)]}))}))},removeModel:function(r){return Y(this,void 0,void 0,(function(){var t;return Q(this,(function(e){return t=Or(r),[2,Wt.getManager(t.scheme).removeModel(t.path)]}))}))}}),yn,Im=A({confusionMatrix_:function(r,t,e){var n=N(r,"labels","confusionMatrix"),a=N(t,"predictions","confusionMatrix");S(e==null||e>0&&Number.isInteger(e),(function(){return"If provided, numClasses must be a positive integer, but got "+e})),S(n.rank===1,(function(){return"Expected the rank of labels to be 1, but got "+n.rank})),S(a.rank===1,(function(){return"Expected the rank of predictions to be 1, but got "+a.rank})),S(n.shape[0]===a.shape[0],(function(){return"Mismatch in the number of examples: "+n.shape[0]+" vs. "+a.shape[0]+". Labels and predictions should have the same number of elements."})),S(e>0&&Number.isInteger(e),(function(){return"numClasses is required to be a positive integer, but got "+e}));var o=Tn(n.asType("int32"),e),i=Tn(a.asType("int32"),e);return o.transpose().matMul(i).asType("int32")}}),lg=Object.freeze({confusionMatrix:Im}),km=A({fromPixels_:function(r,t){if(t===void 0&&(t=3),t>4)throw new Error("Cannot construct Tensor with more than 4 channels from pixels.");if(r==null)throw new Error("pixels passed to tf.browser.fromPixels() can not be null");var e=!1,n=!1,a=!1,o=!1,i=!1;if(r.data instanceof Uint8Array)e=!0;else if(typeof ImageData<"u"&&r instanceof ImageData)n=!0;else if(typeof HTMLVideoElement<"u"&&r instanceof HTMLVideoElement)a=!0;else if(typeof HTMLImageElement<"u"&&r instanceof HTMLImageElement)o=!0;else{if(r.getContext==null)throw new Error("pixels passed to tf.browser.fromPixels() must be either an HTMLVideoElement, HTMLImageElement, HTMLCanvasElement, ImageData in browser, or OffscreenCanvas, ImageData in webworker or {data: Uint32Array, width: number, height: number}, but was "+r.constructor.name);i=!0}if(a&&a&&r.readyState<2)throw new Error("The video element has not loaded data yet. Please wait for `loadeddata` event on the <video> element.");if(hu("FromPixels",D.backendName)!=null)return D.runKernel("FromPixels",{pixels:r},{numChannels:t});var s,u,c=a?[r.videoWidth,r.videoHeight]:[r.width,r.height],l=c[0],p=c[1];if(i?s=r.getContext("2d").getImageData(0,0,l,p).data:n||e?s=r.data:(o||a)&&(yn==null&&(yn=document.createElement("canvas").getContext("2d")),yn.canvas.width=l,yn.canvas.height=p,yn.drawImage(r,0,0,l,p),s=yn.getImageData(0,0,l,p).data),t===4)u=new Int32Array(s);else{var d=l*p;u=new Int32Array(d*t);for(var h=0;h<d;h++)for(var f=0;f<t;++f)u[h*t+f]=s[4*h+f]}return oc(u,[p,l,t],"int32")}}),pg=Object.freeze({toPixels:function(r,t){return Y(this,void 0,void 0,(function(){var e,n,a,o,i,s,u,c,l,p,d,h,f,m,v,g,y,x,b,C,E,R,I;return Q(this,(function(k){switch(k.label){case 0:if(e=N(r,"img","toPixels"),r instanceof ge||(e=e.toInt()),e.rank!==2&&e.rank!==3)throw new Error("toPixels only supports rank 2 or 3 tensors, got rank "+e.rank+".");if(n=e.shape.slice(0,2),a=n[0],o=n[1],(i=e.rank===2?1:e.shape[2])>4||i===2)throw new Error("toPixels only supports depth of size 1, 3 or 4 but got "+i);return[4,e.data()];case 1:return s=k.sent(),u=e.min(),c=e.max(),[4,Promise.all([u.data(),c.data()])];case 2:if(l=k.sent(),p=l[0],d=l[1],h=p[0],f=d[0],u.dispose(),c.dispose(),e.dtype==="float32"){if(h<0||f>1)throw new Error("Tensor values for a float32 Tensor must be in the range [0 - 1] but got range ["+h+" - "+f+"].")}else{if(e.dtype!=="int32")throw new Error("Unsupported type for toPixels: "+e.dtype+". Please use float32 or int32 tensors.");if(h<0||f>255)throw new Error("Tensor values for a int32 Tensor must be in the range [0 - 255] but got range ["+h+" - "+f+"].")}for(m=e.dtype==="float32"?255:1,v=new Uint8ClampedArray(o*a*4),g=0;g<a*o;++g)y=void 0,x=void 0,b=void 0,C=void 0,i===1?(y=s[g]*m,x=s[g]*m,b=s[g]*m,C=255):i===3?(y=s[3*g]*m,x=s[3*g+1]*m,b=s[3*g+2]*m,C=255):i===4&&(y=s[4*g]*m,x=s[4*g+1]*m,b=s[4*g+2]*m,C=s[4*g+3]*m),v[(E=4*g)+0]=Math.round(y),v[E+1]=Math.round(x),v[E+2]=Math.round(b),v[E+3]=Math.round(C);return t!=null&&(t.width=o,t.height=a,R=t.getContext("2d"),I=new ImageData(v,o,a),R.putImageData(I,0,0)),e!==r&&e.dispose(),[2,v]}}))}))},fromPixels:km}),Ol=(function(){function r(){}return r.prototype.getClassName=function(){return this.constructor.className},r.fromConfig=function(t,e){return new t(e)},r})(),_l=(function(){function r(){this.classNameMap={}}return r.getMap=function(){return r.instance==null&&(r.instance=new r),r.instance},r.register=function(t){r.getMap().classNameMap[t.className]=[t,t.fromConfig]},r})();function qt(r){S(r.className!=null,(function(){return"Class being registered does not have the static className property defined."})),S(typeof r.className=="string",(function(){return"className is required to be a string, but got type "+typeof r.className})),S(r.className.length>0,(function(){return"Class being registered has an empty-string as its className, which is disallowed."})),_l.register(r)}var dg=Object.freeze({Serializable:Ol,SerializationMap:_l,registerClass:qt});var hg=Object.freeze({gpgpu_util:Wd,webgl_util:yp,forceHalfFloat:function(){B().set("WEBGL_FORCE_F16_TEXTURES",!0)},MathBackendWebGL:Zc,setWebGLContext:Au,GPGPUContext:jc}),dn=(function(r){function t(){return r!==null&&r.apply(this,arguments)||this}return at(t,r),t.prototype.minimize=function(e,n,a){n===void 0&&(n=!1);var o=this.computeGradients(e,a),i=o.value,s=o.grads;if(a!=null){var u=a.map((function(c){return{name:c.name,tensor:s[c.name]}}));this.applyGradients(u)}else this.applyGradients(s);return He(s),n?i:(i.dispose(),null)},Object.defineProperty(t.prototype,"iterations",{get:function(){return this.iterations_==null&&(this.iterations_=0),this.iterations_},enumerable:!0,configurable:!0}),t.prototype.incrementIterations=function(){this.iterations_=this.iterations+1},t.prototype.computeGradients=function(e,n){return Gp(e,n)},t.prototype.dispose=function(){this.iterations_!=null&&He(this.iterations_)},t.prototype.saveIterations=function(){return Y(this,void 0,void 0,(function(){return Q(this,(function(e){return this.iterations_==null&&(this.iterations_=0),[2,{name:"iter",tensor:K(this.iterations_,"int32")}]}))}))},t.prototype.getWeights=function(){return Y(this,void 0,void 0,(function(){return Q(this,(function(e){throw new Error("getWeights() is not implemented for this optimizer yet.")}))}))},t.prototype.setWeights=function(e){return Y(this,void 0,void 0,(function(){return Q(this,(function(n){throw new Error("setWeights() is not implemented for this optimizer class "+this.getClassName())}))}))},t.prototype.extractIterations=function(e){return Y(this,void 0,void 0,(function(){var n;return Q(this,(function(a){switch(a.label){case 0:return n=this,[4,e[0].tensor.data()];case 1:return n.iterations_=a.sent()[0],[2,e.slice(1)]}}))}))},t})(Ol);Object.defineProperty(dn,Symbol.hasInstance,{value:function(r){return r.minimize!=null&&r.computeGradients!=null&&r.applyGradients!=null}});var Fl=(function(r){function t(e,n,a){a===void 0&&(a=null);var o=r.call(this)||this;return o.learningRate=e,o.rho=n,o.epsilon=a,o.accumulatedGrads=[],o.accumulatedUpdates=[],a==null&&(o.epsilon=D.backend.epsilon()),o}return at(t,r),t.prototype.applyGradients=function(e){var n=this;(Array.isArray(e)?e.map((function(a){return a.name})):Object.keys(e)).forEach((function(a,o){var i=D.registeredVariables[a];n.accumulatedGrads[o]==null&&(n.accumulatedGrads[o]={originalName:a+"/accum_grad",variable:oe((function(){return ue(i).variable(!1)}))}),n.accumulatedUpdates[o]==null&&(n.accumulatedUpdates[o]={originalName:a+"/accum_var",variable:oe((function(){return ue(i).variable(!1)}))});var s=Array.isArray(e)?e[o].tensor:e[a];if(s!=null){var u=n.accumulatedGrads[o].variable,c=n.accumulatedUpdates[o].variable;oe((function(){var l=u.mul(n.rho).add(s.square().mul(1-n.rho)),p=c.add(n.epsilon).sqrt().div(u.add(n.epsilon).sqrt()).mul(s),d=c.mul(n.rho).add(p.square().mul(1-n.rho));u.assign(l),c.assign(d);var h=p.mul(-n.learningRate).add(i);i.assign(h)}))}})),this.incrementIterations()},t.prototype.dispose=function(){this.accumulatedUpdates!=null&&(He(this.accumulatedGrads.map((function(e){return e.variable}))),He(this.accumulatedUpdates.map((function(e){return e.variable}))))},t.prototype.getWeights=function(){return Y(this,void 0,void 0,(function(){var e;return Q(this,(function(n){switch(n.label){case 0:return e=this.accumulatedGrads.concat(this.accumulatedUpdates),[4,this.saveIterations()];case 1:return[2,[n.sent()].concat(e.map((function(a){return{name:a.originalName,tensor:a.variable}})))]}}))}))},t.prototype.setWeights=function(e){return Y(this,void 0,void 0,(function(){var n;return Q(this,(function(a){switch(a.label){case 0:return[4,this.extractIterations(e)];case 1:return e=a.sent(),n=e.length/2,this.accumulatedGrads=e.slice(0,n).map((function(o){return{originalName:o.name,variable:o.tensor.variable(!1)}})),this.accumulatedUpdates=e.slice(n,2*n).map((function(o){return{originalName:o.name,variable:o.tensor.variable(!1)}})),[2]}}))}))},t.prototype.getConfig=function(){return{learningRate:this.learningRate,rho:this.rho,epsilon:this.epsilon}},t.fromConfig=function(e,n){return new e(n.learningRate,n.rho,n.epsilon)},t.className="Adadelta",t})(dn);qt(Fl);var Ml=(function(r){function t(e,n){n===void 0&&(n=.1);var a=r.call(this)||this;return a.learningRate=e,a.initialAccumulatorValue=n,a.accumulatedGrads=[],a}return at(t,r),t.prototype.applyGradients=function(e){var n=this;(Array.isArray(e)?e.map((function(a){return a.name})):Object.keys(e)).forEach((function(a,o){var i=D.registeredVariables[a];n.accumulatedGrads[o]==null&&(n.accumulatedGrads[o]={originalName:a+"/accumulator",variable:oe((function(){return rr(i.shape,n.initialAccumulatorValue).variable(!1)}))});var s=Array.isArray(e)?e[o].tensor:e[a];if(s!=null){var u=n.accumulatedGrads[o].variable;oe((function(){var c=u.add(s.square());u.assign(c);var l=s.div(c.add(D.backend.epsilon()).sqrt()).mul(-n.learningRate).add(i);i.assign(l)}))}})),this.incrementIterations()},t.prototype.dispose=function(){this.accumulatedGrads!=null&&He(this.accumulatedGrads.map((function(e){return e.variable})))},t.prototype.getWeights=function(){return Y(this,void 0,void 0,(function(){return Q(this,(function(e){switch(e.label){case 0:return[4,this.saveIterations()];case 1:return[2,[e.sent()].concat(this.accumulatedGrads.map((function(n){return{name:n.originalName,tensor:n.variable}})))]}}))}))},t.prototype.setWeights=function(e){return Y(this,void 0,void 0,(function(){return Q(this,(function(n){switch(n.label){case 0:return[4,this.extractIterations(e)];case 1:return e=n.sent(),this.accumulatedGrads=e.map((function(a){return{originalName:a.name,variable:a.tensor.variable(!1)}})),[2]}}))}))},t.prototype.getConfig=function(){return{learningRate:this.learningRate,initialAccumulatorValue:this.initialAccumulatorValue}},t.fromConfig=function(e,n){return new e(n.learningRate,n.initialAccumulatorValue)},t.className="Adagrad",t})(dn);qt(Ml);var Bl=(function(r){function t(e,n,a,o){o===void 0&&(o=null);var i=r.call(this)||this;return i.learningRate=e,i.beta1=n,i.beta2=a,i.epsilon=o,i.accumulatedFirstMoment=[],i.accumulatedSecondMoment=[],oe((function(){i.accBeta1=K(n).variable(),i.accBeta2=K(a).variable()})),o==null&&(i.epsilon=D.backend.epsilon()),i}return at(t,r),t.prototype.applyGradients=function(e){var n=this,a=Array.isArray(e)?e.map((function(o){return o.name})):Object.keys(e);oe((function(){var o=vt(1,n.accBeta1),i=vt(1,n.accBeta2);a.forEach((function(s,u){var c=D.registeredVariables[s];n.accumulatedFirstMoment[u]==null&&(n.accumulatedFirstMoment[u]={originalName:s+"/m",variable:oe((function(){return ue(c).variable(!1)}))}),n.accumulatedSecondMoment[u]==null&&(n.accumulatedSecondMoment[u]={originalName:s+"/v",variable:oe((function(){return ue(c).variable(!1)}))});var l=Array.isArray(e)?e[u].tensor:e[s];if(l!=null){var p=n.accumulatedFirstMoment[u].variable,d=n.accumulatedSecondMoment[u].variable,h=p.mul(n.beta1).add(l.mul(1-n.beta1)),f=d.mul(n.beta2).add(l.square().mul(1-n.beta2)),m=h.div(o),v=f.div(i);p.assign(h),d.assign(f);var g=m.div(v.sqrt().add(n.epsilon)).mul(-n.learningRate).add(c);c.assign(g)}})),n.accBeta1.assign(n.accBeta1.mul(n.beta1)),n.accBeta2.assign(n.accBeta2.mul(n.beta2))})),this.incrementIterations()},t.prototype.dispose=function(){this.accBeta1.dispose(),this.accBeta2.dispose(),this.accumulatedFirstMoment!=null&&He(this.accumulatedFirstMoment.map((function(e){return e.variable}))),this.accumulatedSecondMoment!=null&&He(this.accumulatedSecondMoment.map((function(e){return e.variable})))},t.prototype.getWeights=function(){return Y(this,void 0,void 0,(function(){var e;return Q(this,(function(n){switch(n.label){case 0:return e=this.accumulatedFirstMoment.concat(this.accumulatedSecondMoment),[4,this.saveIterations()];case 1:return[2,[n.sent()].concat(e.map((function(a){return{name:a.originalName,tensor:a.variable}})))]}}))}))},t.prototype.setWeights=function(e){return Y(this,void 0,void 0,(function(){var n,a=this;return Q(this,(function(o){switch(o.label){case 0:return[4,this.extractIterations(e)];case 1:return e=o.sent(),oe((function(){a.accBeta1.assign(Rn(a.beta1,a.iterations_+1)),a.accBeta2.assign(Rn(a.beta2,a.iterations_+1))})),n=e.length/2,this.accumulatedFirstMoment=e.slice(0,n).map((function(i){return{originalName:i.name,variable:i.tensor.variable(!1)}})),this.accumulatedSecondMoment=e.slice(n,2*n).map((function(i){return{originalName:i.name,variable:i.tensor.variable(!1)}})),[2]}}))}))},t.prototype.getConfig=function(){return{learningRate:this.learningRate,beta1:this.beta1,beta2:this.beta2,epsilon:this.epsilon}},t.fromConfig=function(e,n){return new e(n.learningRate,n.beta1,n.beta2,n.epsilon)},t.className="Adam",t})(dn);qt(Bl);var Pl=(function(r){function t(e,n,a,o,i){o===void 0&&(o=null),i===void 0&&(i=0);var s=r.call(this)||this;return s.learningRate=e,s.beta1=n,s.beta2=a,s.epsilon=o,s.decay=i,s.accumulatedFirstMoment=[],s.accumulatedWeightedInfNorm=[],oe((function(){s.iteration=K(0).variable(),s.accBeta1=K(n).variable()})),o==null&&(s.epsilon=D.backend.epsilon()),s}return at(t,r),t.prototype.applyGradients=function(e){var n=this,a=Array.isArray(e)?e.map((function(o){return o.name})):Object.keys(e);oe((function(){var o=vt(1,n.accBeta1),i=bt(-n.learningRate,n.iteration.mul(n.decay).add(1));a.forEach((function(s,u){var c=D.registeredVariables[s];n.accumulatedFirstMoment[u]==null&&(n.accumulatedFirstMoment[u]={originalName:s+"/m",variable:ue(c).variable(!1)}),n.accumulatedWeightedInfNorm[u]==null&&(n.accumulatedWeightedInfNorm[u]={originalName:s+"/v",variable:ue(c).variable(!1)});var l=Array.isArray(e)?e[u].tensor:e[s];if(l!=null){var p=n.accumulatedFirstMoment[u].variable,d=n.accumulatedWeightedInfNorm[u].variable,h=p.mul(n.beta1).add(l.mul(1-n.beta1)),f=d.mul(n.beta2),m=l.abs(),v=f.maximum(m);p.assign(h),d.assign(v);var g=i.div(o).mul(h.div(v.add(n.epsilon))).add(c);c.assign(g)}})),n.iteration.assign(n.iteration.add(1)),n.accBeta1.assign(n.accBeta1.mul(n.beta1))})),this.incrementIterations()},t.prototype.dispose=function(){this.accBeta1.dispose(),this.iteration.dispose(),this.accumulatedFirstMoment!=null&&He(this.accumulatedFirstMoment.map((function(e){return e.variable}))),this.accumulatedWeightedInfNorm!=null&&He(this.accumulatedWeightedInfNorm.map((function(e){return e.variable})))},t.prototype.getWeights=function(){return Y(this,void 0,void 0,(function(){return Q(this,(function(e){throw new Error("getWeights() is not implemented for Adamax yet.")}))}))},t.prototype.setWeights=function(e){return Y(this,void 0,void 0,(function(){return Q(this,(function(n){throw new Error("setWeights() is not implemented for Adamax yet.")}))}))},t.prototype.getConfig=function(){return{learningRate:this.learningRate,beta1:this.beta1,beta2:this.beta2,epsilon:this.epsilon,decay:this.decay}},t.fromConfig=function(e,n){return new e(n.learningRate,n.beta1,n.beta2,n.epsilon,n.decay)},t.className="Adamax",t})(dn);qt(Pl);var ls=(function(r){function t(e){var n=r.call(this)||this;return n.learningRate=e,n.setLearningRate(e),n}return at(t,r),t.prototype.applyGradients=function(e){var n=this;(Array.isArray(e)?e.map((function(a){return a.name})):Object.keys(e)).forEach((function(a,o){var i=Array.isArray(e)?e[o].tensor:e[a];if(i!=null){var s=D.registeredVariables[a];oe((function(){var u=n.c.mul(i).add(s);s.assign(u)}))}})),this.incrementIterations()},t.prototype.setLearningRate=function(e){this.learningRate=e,this.c!=null&&this.c.dispose(),this.c=xp(K(-e))},t.prototype.dispose=function(){this.c.dispose()},t.prototype.getWeights=function(){return Y(this,void 0,void 0,(function(){return Q(this,(function(e){switch(e.label){case 0:return[4,this.saveIterations()];case 1:return[2,[e.sent()]]}}))}))},t.prototype.setWeights=function(e){return Y(this,void 0,void 0,(function(){return Q(this,(function(n){switch(n.label){case 0:return[4,this.extractIterations(e)];case 1:if((e=n.sent()).length!==0)throw new Error("SGD optimizer does not have settable weights.");return[2]}}))}))},t.prototype.getConfig=function(){return{learningRate:this.learningRate}},t.fromConfig=function(e,n){return new e(n.learningRate)},t.className="SGD",t})(dn);qt(ls);var Ll=(function(r){function t(e,n,a){a===void 0&&(a=!1);var o=r.call(this,e)||this;return o.learningRate=e,o.momentum=n,o.useNesterov=a,o.accumulations=[],o.m=K(o.momentum),o}return at(t,r),t.prototype.applyGradients=function(e){var n=this;(Array.isArray(e)?e.map((function(a){return a.name})):Object.keys(e)).forEach((function(a,o){var i=D.registeredVariables[a];n.accumulations[o]==null&&(n.accumulations[o]={originalName:a+"/momentum",variable:oe((function(){return ue(i).variable(!1)}))});var s=n.accumulations[o].variable,u=Array.isArray(e)?e[o].tensor:e[a];u!=null&&oe((function(){var c,l=n.m.mul(s).add(u);c=n.useNesterov?n.c.mul(u.add(l.mul(n.m))).add(i):n.c.mul(l).add(i),s.assign(l),i.assign(c)}))})),this.incrementIterations()},t.prototype.dispose=function(){this.m.dispose(),this.accumulations!=null&&He(this.accumulations.map((function(e){return e.variable})))},t.prototype.setMomentum=function(e){this.momentum=e},t.prototype.getWeights=function(){return Y(this,void 0,void 0,(function(){return Q(this,(function(e){switch(e.label){case 0:return[4,this.saveIterations()];case 1:return[2,[e.sent()].concat(this.accumulations.map((function(n){return{name:n.originalName,tensor:n.variable}})))]}}))}))},t.prototype.setWeights=function(e){return Y(this,void 0,void 0,(function(){return Q(this,(function(n){switch(n.label){case 0:return[4,this.extractIterations(e)];case 1:return e=n.sent(),this.accumulations=e.map((function(a){return{originalName:a.name,variable:a.tensor.variable(!1)}})),[2]}}))}))},t.prototype.getConfig=function(){return{learningRate:this.learningRate,momentum:this.momentum,useNesterov:this.useNesterov}},t.fromConfig=function(e,n){return new e(n.learningRate,n.momentum,n.useNesterov)},t.className="Momentum",t})(ls);qt(Ll);var Vl=(function(r){function t(e,n,a,o,i){n===void 0&&(n=.9),a===void 0&&(a=0),o===void 0&&(o=null),i===void 0&&(i=!1);var s=r.call(this)||this;if(s.learningRate=e,s.decay=n,s.momentum=a,s.epsilon=o,s.accumulatedMeanSquares=[],s.accumulatedMoments=[],s.accumulatedMeanGrads=[],s.centered=i,o==null&&(s.epsilon=D.backend.epsilon()),e==null)throw new Error("learningRate for RMSPropOptimizer must be defined.");return s}return at(t,r),t.prototype.applyGradients=function(e){var n=this;(Array.isArray(e)?e.map((function(a){return a.name})):Object.keys(e)).forEach((function(a,o){var i=D.registeredVariables[a];n.accumulatedMeanSquares[o]==null&&(n.accumulatedMeanSquares[o]={originalName:a+"/rms",variable:oe((function(){return ue(i).variable(!1)}))}),n.accumulatedMoments[o]==null&&(n.accumulatedMoments[o]={originalName:a+"/momentum",variable:oe((function(){return ue(i).variable(!1)}))}),n.accumulatedMeanGrads[o]==null&&n.centered&&(n.accumulatedMeanGrads[o]={originalName:a+"/mg",variable:oe((function(){return ue(i).variable(!1)}))});var s=Array.isArray(e)?e[o].tensor:e[a];if(s!=null){var u=n.accumulatedMeanSquares[o].variable,c=n.accumulatedMoments[o].variable;oe((function(){var l=u.mul(n.decay).add(s.square().mul(1-n.decay));if(n.centered){var p=n.accumulatedMeanGrads[o].variable,d=p.mul(n.decay).add(s.mul(1-n.decay)),h=c.mul(n.momentum).add(s.mul(n.learningRate).div(l.sub(d.square().add(n.epsilon)).sqrt()));u.assign(l),p.assign(d),c.assign(h);var f=i.sub(h);i.assign(f)}else{var m=u.mul(n.decay).add(s.square().mul(1-n.decay));h=c.mul(n.momentum).add(s.mul(n.learningRate).div(m.add(n.epsilon).sqrt())),u.assign(m),c.assign(h),f=i.sub(h),i.assign(f)}}))}})),this.incrementIterations()},t.prototype.dispose=function(){this.accumulatedMeanSquares!=null&&He(this.accumulatedMeanSquares.map((function(e){return e.variable}))),this.accumulatedMeanGrads!=null&&this.centered&&He(this.accumulatedMeanGrads.map((function(e){return e.variable}))),this.accumulatedMoments!=null&&He(this.accumulatedMoments.map((function(e){return e.variable})))},t.prototype.getWeights=function(){return Y(this,void 0,void 0,(function(){var e;return Q(this,(function(n){switch(n.label){case 0:return e=this.accumulatedMeanSquares.concat(this.accumulatedMoments),this.centered&&e.push.apply(e,this.accumulatedMeanGrads),[4,this.saveIterations()];case 1:return[2,[n.sent()].concat(e.map((function(a){return{name:a.originalName,tensor:a.variable}})))]}}))}))},t.prototype.setWeights=function(e){return Y(this,void 0,void 0,(function(){var n;return Q(this,(function(a){switch(a.label){case 0:return[4,this.extractIterations(e)];case 1:return e=a.sent(),n=this.centered?e.length/3:e.length/2,this.accumulatedMeanSquares=e.slice(0,n).map((function(o){return{originalName:o.name,variable:o.tensor.variable(!1)}})),this.accumulatedMoments=e.slice(n,2*n).map((function(o){return{originalName:o.name,variable:o.tensor.variable(!1)}})),this.centered&&(this.accumulatedMeanGrads=e.slice(2*n,3*n).map((function(o){return{originalName:o.name,variable:o.tensor.variable(!1)}}))),[2]}}))}))},t.prototype.getConfig=function(){return{learningRate:this.learningRate,decay:this.decay,momentum:this.momentum,epsilon:this.epsilon,centered:this.centered}},t.fromConfig=function(e,n){return new e(n.learningRate,n.decay,n.momentum,n.epsilon,n.centered)},t.className="RMSProp",t})(dn);qt(Vl);var $t=(function(){function r(){}return r.sgd=function(t){return new ls(t)},r.momentum=function(t,e,n){return n===void 0&&(n=!1),new Ll(t,e,n)},r.rmsprop=function(t,e,n,a,o){return e===void 0&&(e=.9),n===void 0&&(n=0),a===void 0&&(a=null),o===void 0&&(o=!1),new Vl(t,e,n,a,o)},r.adam=function(t,e,n,a){return t===void 0&&(t=.001),e===void 0&&(e=.9),n===void 0&&(n=.999),a===void 0&&(a=null),new Bl(t,e,n,a)},r.adadelta=function(t,e,n){return t===void 0&&(t=.001),e===void 0&&(e=.95),n===void 0&&(n=null),new Fl(t,e,n)},r.adamax=function(t,e,n,a,o){return t===void 0&&(t=.002),e===void 0&&(e=.9),n===void 0&&(n=.999),a===void 0&&(a=null),o===void 0&&(o=0),new Pl(t,e,n,a,o)},r.adagrad=function(t,e){return e===void 0&&(e=.1),new Ml(t,e)},r})(),fg={sgd:$t.sgd,momentum:$t.momentum,adadelta:$t.adadelta,adagrad:$t.adagrad,rmsprop:$t.rmsprop,adamax:$t.adamax,adam:$t.adam};ge.prototype.add=function(r){return xt(this,r)},ge.prototype.broadcastTo=function(r){return ol(this,r)},ge.prototype.div=function(r){return bt(this,r)},ge.prototype.divNoNan=function(r){return da(this,r)},ge.prototype.squaredDifference=function(r){return ma(this,r)},ge.prototype.tile=function(r){return Vt(this,r)},ge.prototype.oneHot=function(r,t,e){return t===void 0&&(t=1),e===void 0&&(e=0),Tn(this,r,t,e)},ge.prototype.transpose=function(r){return Ke(this,r)},ge.prototype.pad=function(r,t){return Ot(this,r,t)},ge.prototype.batchNorm=function(r,t,e,n,a){return un(this,r,t,e,n,a)},M=Jf;var ut,Wl,ds=function(){return(ds=Object.assign||function(r){for(var t,e=1,n=arguments.length;e<n;e++)for(var a in t=arguments[e])Object.prototype.hasOwnProperty.call(t,a)&&(r[a]=t[a]);return r}).apply(this,arguments)};function jt(r,t,e,n){return new(e||(e=Promise))(function(a,o){function i(c){try{u(n.next(c))}catch(l){o(l)}}function s(c){try{u(n.throw(c))}catch(l){o(l)}}function u(c){c.done?a(c.value):new e(function(l){l(c.value)}).then(i,s)}u((n=n.apply(r,t||[])).next())})}function Kt(r,t){var e,n,a,o,i={label:0,sent:function(){if(1&a[0])throw a[1];return a[1]},trys:[],ops:[]};return o={next:s(0),throw:s(1),return:s(2)},typeof Symbol=="function"&&(o[Symbol.iterator]=function(){return this}),o;function s(u){return function(c){return(function(l){if(e)throw new TypeError("Generator is already executing.");for(;i;)try{if(e=1,n&&(a=2&l[0]?n.return:l[0]?n.throw||((a=n.return)&&a.call(n),0):n.next)&&!(a=a.call(n,l[1])).done)return a;switch(n=0,a&&(l=[2&l[0],a.value]),l[0]){case 0:case 1:a=l;break;case 4:return i.label++,{value:l[1],done:!1};case 5:i.label++,n=l[1],l=[0];continue;case 7:l=i.ops.pop(),i.trys.pop();continue;default:if(!(a=(a=i.trys).length>0&&a[a.length-1])&&(l[0]===6||l[0]===2)){i=0;continue}if(l[0]===3&&(!a||l[1]>a[0]&&l[1]<a[3])){i.label=l[1];break}if(l[0]===6&&i.label<a[1]){i.label=a[1],a=l;break}if(a&&i.label<a[2]){i.label=a[2],i.ops.push(l);break}a[2]&&i.ops.pop(),i.trys.pop();continue}l=t.call(r,i)}catch(p){l=[6,p],n=0}finally{e=a=0}if(5&l[0])throw l[1];return{value:l[0]?l[1]:void 0,done:!0}})([u,c])}}}(function(r){r[r.DT_INVALID=0]="DT_INVALID",r[r.DT_FLOAT=1]="DT_FLOAT",r[r.DT_DOUBLE=2]="DT_DOUBLE",r[r.DT_INT32=3]="DT_INT32",r[r.DT_UINT8=4]="DT_UINT8",r[r.DT_INT16=5]="DT_INT16",r[r.DT_INT8=6]="DT_INT8",r[r.DT_STRING=7]="DT_STRING",r[r.DT_COMPLEX64=8]="DT_COMPLEX64",r[r.DT_INT64=9]="DT_INT64",r[r.DT_BOOL=10]="DT_BOOL",r[r.DT_QINT8=11]="DT_QINT8",r[r.DT_QUINT8=12]="DT_QUINT8",r[r.DT_QINT32=13]="DT_QINT32",r[r.DT_BFLOAT16=14]="DT_BFLOAT16",r[r.DT_FLOAT_REF=101]="DT_FLOAT_REF",r[r.DT_DOUBLE_REF=102]="DT_DOUBLE_REF",r[r.DT_INT32_REF=103]="DT_INT32_REF",r[r.DT_UINT8_REF=104]="DT_UINT8_REF",r[r.DT_INT16_REF=105]="DT_INT16_REF",r[r.DT_INT8_REF=106]="DT_INT8_REF",r[r.DT_STRING_REF=107]="DT_STRING_REF",r[r.DT_COMPLEX64_REF=108]="DT_COMPLEX64_REF",r[r.DT_INT64_REF=109]="DT_INT64_REF",r[r.DT_BOOL_REF=110]="DT_BOOL_REF",r[r.DT_QINT8_REF=111]="DT_QINT8_REF",r[r.DT_QUINT8_REF=112]="DT_QUINT8_REF",r[r.DT_QINT32_REF=113]="DT_QINT32_REF",r[r.DT_BFLOAT16_REF=114]="DT_BFLOAT16_REF"})(ut||(ut={})),(function(r){(function(t){t[t.LEGACY=0]="LEGACY",t[t.V1=1]="V1",t[t.V2=2]="V2"})(r.CheckpointFormatVersion||(r.CheckpointFormatVersion={}))})(Wl||(Wl={}));var Tm={};function Hl(r){return Tm[r]}function w(r,t,e,n){var a=t.inputParams[r];if(a&&a.inputIndexStart!==void 0){var o=a.inputIndexStart,i=a.inputIndexEnd===0?void 0:a.inputIndexEnd===void 0?o+1:a.inputIndexEnd;if(a.type==="tensor")return Ve(t.inputNames[a.inputIndexStart],e,n);if(a.type==="tensors")return t.inputNames.slice(o,i).map(function(c){return Ve(c,e,n)});var s=Array.prototype.slice.call(Ve(t.inputNames.slice(o)[0],e,n).dataSync());return a.type==="number"?s[0]:s}var u=t.attrParams[r];return u&&u.value}function Ve(r,t,e){var n=Je(r),a=n[0],o=n[1],i=e.currentContextIds.find(function(s){return!!t[Ia(a,s)]});return i!==void 0?t[Ia(a,i)][o]:void 0}function Am(r,t,e){return t[Ia(r,e.currentContextId)]}function Bn(r,t){var e=Je(r),n=e[0],a=e[1];return[Ia(n,t&&t.currentContextId),a]}function Ia(r,t){return t?r+"-"+t:r}function Je(r){var t=r.lastIndexOf(":");return t===-1?[r,0]:[r.substring(0,t),Number(r.substring(t+1))]}function ps(r,t){for(var e=[],n=0;n<r.length;n+=t)e.push(r.slice(n,n+t));return e}var Dm=[{tfOpName:"Add",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"AddV2",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"AddN",category:"arithmetic",inputs:[{start:0,end:0,name:"tensors",type:"tensors"}]},{tfOpName:"BiasAdd",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Sub",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"RealDiv",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Div",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"DivNoNan",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"FloorDiv",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Mul",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Maximum",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}]},{tfOpName:"Minimum",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}]},{tfOpName:"Pow",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"SquaredDifference",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Mod",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"FloorMod",category:"arithmetic",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]}],Om=Object.freeze({json:Dm}),_m=[{tfOpName:"Abs",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Acos",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Asin",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Atan",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Atan2",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"y",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Ceil",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"ClipByValue",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"clip_value_min",name:"clipValueMin",type:"number"},{tfName:"clip_value_max",name:"clipValueMax",type:"number"}]},{tfOpName:"Complex",category:"basic_math",inputs:[{start:0,name:"real",type:"tensor"},{start:1,name:"imag",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"ComplexAbs",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Cos",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Cosh",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Elu",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Exp",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Floor",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Log",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Imag",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0},{tfName:"Tout",name:"outputType",type:"dtype",notSupported:!0}]},{tfOpName:"Neg",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Real",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0},{tfName:"Tout",name:"outputType",type:"dtype",notSupported:!0}]},{tfOpName:"Prelu",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"alpha",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Relu",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Relu6",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0},{tfName:"clipValueMin",name:"clipValueMin",type:"number",defaultValue:0},{tfName:"clipValueMax",name:"clipValueMax",type:"number",defaultValue:6}]},{tfOpName:"Selu",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Sigmoid",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Sin",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Sinh",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Sqrt",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Rsqrt",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Square",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Tan",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Tanh",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Sign",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Round",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Expm1",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Log1p",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Reciprocal",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Softplus",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Asinh",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Acosh",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Atanh",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Erf",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Prod",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axes",type:"number[]"}],attrs:[{tfName:"keep_dims",name:"keepDims",type:"bool",notSupported:!0},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"LeakyRelu",category:"basic_math",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"alpha",name:"alpha",type:"number",defaultValue:.2},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]}],Fm=Object.freeze({json:_m}),Mm=[{tfOpName:"LoopCond",category:"control",inputs:[{start:0,name:"pred",type:"tensor"}]},{tfOpName:"Switch",category:"control",inputs:[{start:0,name:"data",type:"tensor"},{start:1,name:"pred",type:"tensor"}]},{tfOpName:"Merge",category:"control",inputs:[{start:0,end:0,name:"tensors",type:"tensors"}]},{tfOpName:"Enter",category:"control",inputs:[{start:0,name:"tensor",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0},{tfName:"frame_name",name:"frameName",type:"string"},{tfName:"is_constant",name:"isConstant",type:"bool"}]},{tfOpName:"Exit",category:"control",inputs:[{start:0,name:"tensor",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"NextIteration",category:"control",inputs:[{start:0,name:"tensor",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"TensorArrayV3",category:"control",inputs:[{start:0,name:"size",type:"number"}],attrs:[{tfName:"dtype",name:"dtype",type:"dtype"},{tfName:"element_shape",name:"elementShape",type:"shape"},{tfName:"dynamic_size",name:"dynamicSize",type:"bool"},{tfName:"clear_after_read",name:"clearAfterRead",type:"bool"},{tfName:"identical_element_shapes",name:"identicalElementShapes",type:"bool"},{tfName:"tensor_array_name",name:"name",type:"string"}]},{tfOpName:"TensorArrayWriteV3",category:"control",inputs:[{start:0,name:"tensorArrayId",type:"number"},{start:1,name:"index",type:"number"},{start:2,name:"tensor",type:"tensor"},{start:3,name:"flowIn",type:"number"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"TensorArrayReadV3",category:"control",inputs:[{start:0,name:"tensorArrayId",type:"number"},{start:1,name:"index",type:"number"},{start:2,name:"flowIn",type:"number"}],attrs:[{tfName:"dtype",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"TensorArrayGatherV3",category:"control",inputs:[{start:0,name:"tensorArrayId",type:"number"},{start:1,name:"indices",type:"number[]"},{start:2,name:"flowIn",type:"number"}],attrs:[{tfName:"dtype",name:"dtype",type:"dtype"},{tfName:"element_shape",name:"elementShape",type:"shape"}]},{tfOpName:"TensorArrayScatterV3",category:"control",inputs:[{start:0,name:"tensorArrayId",type:"number"},{start:1,name:"indices",type:"number[]"},{start:2,name:"tensor",type:"tensor"},{start:3,name:"flowIn",type:"number"}],attrs:[{tfName:"T",name:"dtype",type:"dtype"}]},{tfOpName:"TensorArrayConcatV3",category:"control",inputs:[{start:0,name:"tensorArrayId",type:"number"},{start:1,name:"flowIn",type:"number"}],attrs:[{tfName:"dtype",name:"dtype",type:"dtype"},{tfName:"element_shape_except0",name:"elementShapeExcept0",type:"shape",notSupported:!0}]},{tfOpName:"TensorArraySplitV3",category:"control",inputs:[{start:0,name:"tensorArrayId",type:"number"},{start:1,name:"tensor",type:"tensor"},{start:2,name:"lengths",type:"number[]"},{start:3,name:"flowIn",type:"number"}],attrs:[{tfName:"T",name:"dtype",type:"dtype"}]},{tfOpName:"TensorArraySizeV3",category:"control",inputs:[{start:0,name:"tensorArrayId",type:"number"},{start:1,name:"flowIn",type:"number"}]},{tfOpName:"TensorArrayCloseV3",category:"control",inputs:[{start:0,name:"tensorArrayId",type:"number"}]}],Bm=Object.freeze({json:Mm}),Pm=[{tfOpName:"AvgPool",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",notSupported:!0},{tfName:"ksize",name:"kernelSize",type:"number[]"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"MaxPool",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",notSupported:!0},{tfName:"ksize",name:"kernelSize",type:"number[]"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"MaxPoolWithArgmax",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"ksize",name:"kernelSize",type:"number[]"},{tfName:"include_batch_in_index",name:"includeBatchInIndex",type:"bool"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"AvgPool3D",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",notSupported:!0},{tfName:"ksize",name:"kernelSize",type:"number[]"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"MaxPool3D",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",notSupported:!0},{tfName:"ksize",name:"kernelSize",type:"number[]"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Conv1D",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"filter",type:"tensor"}],attrs:[{tfName:"stride",name:"stride",type:"number"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",defaultValue:"NWC"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0},{tfName:"dilation",name:"dilation",type:"number",defaultValue:1}]},{tfOpName:"Conv2D",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"filter",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0},{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"useCudnnOnGpu",name:"useCudnnOnGpu",type:"bool"},{tfName:"data_format",name:"dataFormat",type:"string",defaultValue:"NHWC"},{tfName:"dilations",name:"dilations",type:"number[]"}]},{tfOpName:"_FusedConv2D",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"filter",type:"tensor"},{start:2,end:0,name:"args",type:"tensors"}],attrs:[{tfName:"num_args",name:"numArgs",type:"number"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0},{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"explicit_paddings",name:"explicitPaddings",type:"number[]",defaultValue:[]},{tfName:"use_cudnn_on_gpu",name:"useCudnnOnGpu",type:"bool",defaultValue:!0},{tfName:"data_format",name:"dataFormat",type:"string",defaultValue:"NHWC"},{tfName:"dilations",name:"dilations",type:"number[]",defaultValue:[1,1,1,1]},{tfName:"fused_ops",name:"fusedOps",type:"string[]",defaultValue:[]},{tfName:"epsilon",name:"epsilon",type:"number",defaultValue:1e-4}]},{tfOpName:"Conv2DBackpropInput",category:"convolution",inputs:[{start:2,name:"x",type:"tensor"},{start:1,name:"filter",type:"tensor"},{start:0,name:"outputShape",type:"number[]"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",notSupported:!0}]},{tfOpName:"DepthwiseConv2d",category:"convolution",inputs:[{start:0,name:"input",type:"tensor"},{start:1,name:"filter",type:"tensor"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",defaultValue:"NHWC"},{tfName:"dilations",name:"dilations",type:"number[]"}]},{tfOpName:"DepthwiseConv2dNative",category:"convolution",inputs:[{start:0,name:"input",type:"tensor"},{start:1,name:"filter",type:"tensor"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",defaultValue:"NHWC"},{tfName:"dilations",name:"dilations",type:"number[]"}]},{tfOpName:"FusedDepthwiseConv2dNative",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"filter",type:"tensor"},{start:2,end:0,name:"args",type:"tensors"}],attrs:[{tfName:"num_args",name:"numArgs",type:"number"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0},{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",defaultValue:"NHWC"},{tfName:"dilations",name:"dilations",type:"number[]",defaultValue:[1,1,1,1]},{tfName:"fused_ops",name:"fusedOps",type:"string[]",defaultValue:[]}]},{tfOpName:"Conv3D",category:"convolution",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"filter",type:"tensor"}],attrs:[{tfName:"strides",name:"strides",type:"number[]"},{tfName:"padding",name:"pad",type:"string"},{tfName:"data_format",name:"dataFormat",type:"string",defaultValue:"NHWC"},{tfName:"dilations",name:"dilations",type:"number[]"}]}],Lm=Object.freeze({json:Pm}),Vm=[{tfOpName:"Fill",category:"creation",inputs:[{start:0,name:"shape",type:"number[]"},{start:1,name:"value",type:"number"}],attrs:[{tfName:"T",name:"dtype",type:"dtype"}]},{tfOpName:"LinSpace",category:"creation",inputs:[{start:0,name:"start",type:"number"},{start:1,name:"stop",type:"number"},{start:2,name:"num",type:"number"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"OneHot",category:"creation",inputs:[{start:0,name:"indices",type:"tensor"},{start:1,name:"depth",type:"number"},{start:2,name:"onValue",type:"number",defaultValue:1},{start:3,name:"offValue",type:"number",defaultValue:0}],attrs:[{tfName:"axis",name:"axis",type:"number",notSupported:!0},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Ones",category:"creation",inputs:[{start:0,name:"shape",type:"number[]"}],attrs:[{tfName:"T",name:"dtype",type:"dtype"}]},{tfOpName:"OnesLike",category:"creation",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"dtype",name:"dtype",type:"dtype"}]},{tfOpName:"RandomUniform",category:"creation",inputs:[{start:0,name:"shape",type:"number[]"}],attrs:[{tfName:"minval",name:"minval",type:"number",defaultValue:0},{tfName:"maxval",name:"maxval",type:"number",defaultValue:1},{tfName:"dtype",name:"dtype",type:"dtype"},{tfName:"seed",name:"seed",type:"number",defaultValue:0},{tfName:"seed2",name:"seed2",type:"number",defaultValue:0,notSupported:!0},{tfName:"T",name:"T",type:"number",notSupported:!0}]},{tfOpName:"Range",category:"creation",inputs:[{start:0,name:"start",type:"number"},{start:1,name:"stop",type:"number"},{start:2,name:"step",type:"number",defaultValue:0}],attrs:[{tfName:"Tidx",name:"dtype",type:"dtype"}]},{tfOpName:"TruncatedNormal",category:"creation",inputs:[{start:0,name:"shape",type:"number[]"}],attrs:[{tfName:"means",name:"mean",type:"number",defaultValue:0},{tfName:"stddev",name:"stdDev",type:"number",defaultValue:1},{tfName:"seed",name:"seed",type:"number"},{tfName:"seed2",name:"seed2",type:"number",defaultValue:0,notSupported:!0},{tfName:"dtype",name:"dtype",type:"dtype"},{tfName:"T",name:"T",type:"number",notSupported:!0}]},{tfOpName:"Zeros",category:"creation",inputs:[{start:0,name:"shape",type:"number[]"}],attrs:[{tfName:"T",name:"dtype",type:"dtype"}]},{tfOpName:"ZerosLike",category:"creation",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype"}]},{tfOpName:"Multinomial",category:"creation",inputs:[{start:0,name:"logits",type:"tensor"},{start:1,name:"numSamples",type:"number"}],attrs:[{tfName:"seed",name:"seed",type:"number"},{tfName:"seed2",name:"seed2",type:"number"},{tfName:"T",name:"dtype",type:"dtype"},{tfName:"output_dtype",name:"output_dtype",type:"dtype"}]}],Wm=Object.freeze({json:Vm}),zm=[{tfOpName:"NonMaxSuppressionV2",category:"dynamic",inputs:[{start:0,name:"boxes",type:"tensor"},{start:1,name:"scores",type:"tensor"},{start:2,name:"maxOutputSize",type:"number"},{start:3,name:"iouThreshold",type:"number"}]},{tfOpName:"NonMaxSuppressionV3",category:"dynamic",inputs:[{start:0,name:"boxes",type:"tensor"},{start:1,name:"scores",type:"tensor"},{start:2,name:"maxOutputSize",type:"number"},{start:3,name:"iouThreshold",type:"number"},{start:4,name:"scoreThreshold",type:"number"}]},{tfOpName:"NonMaxSuppressionV5",category:"dynamic",inputs:[{start:0,name:"boxes",type:"tensor"},{start:1,name:"scores",type:"tensor"},{start:2,name:"maxOutputSize",type:"number"},{start:3,name:"iouThreshold",type:"number"},{start:4,name:"scoreThreshold",type:"number"},{start:5,name:"softNmsSigma",type:"number"}]},{tfOpName:"Where",category:"dynamic",inputs:[{start:0,name:"condition",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"ListDiff",category:"dynamic",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"y",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]}],Um=Object.freeze({json:zm}),Gm=[{tfOpName:"TopKV2",category:"evaluation",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"k",type:"number"}],attrs:[{tfName:"sorted",name:"sorted",type:"bool"}]}],Hm=Object.freeze({json:Gm}),qm=[{tfOpName:"PlaceholderWithDefault",category:"graph",inputs:[{start:0,name:"default",type:"tensor"}],attrs:[{tfName:"shape",name:"shape",type:"shape"},{tfName:"dtype",name:"dtype",type:"dtype"}]},{tfOpName:"Placeholder",category:"graph",attrs:[{tfName:"shape",name:"shape",type:"shape"},{tfName:"dtype",name:"dtype",type:"dtype"}]},{tfOpName:"Const",category:"graph"},{tfOpName:"Identity",category:"graph",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"IdentityN",category:"graph",inputs:[{start:0,end:0,name:"x",type:"tensors"}]},{tfOpName:"Snapshot",category:"graph",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"Rank",category:"graph",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"Size",category:"graph",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"Shape",category:"graph",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"ShapeN",category:"graph",inputs:[{start:0,end:0,name:"x",type:"tensors"}]},{tfOpName:"Print",category:"graph",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"data",type:"tensors"}],attrs:[{tfName:"message",name:"message",type:"string"},{tfName:"first_n",name:"firstN",type:"number",notSupported:!0},{tfName:"summarize",name:"summarize",type:"number",defaultValue:3}]},{tfOpName:"NoOp",category:"graph",inputs:[]},{tfOpName:"StopGradient",category:"graph",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"FakeQuantWithMinMaxVars",category:"graph",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"min",name:"min",type:"number"},{tfName:"max",name:"max",type:"number"}]}],jm=Object.freeze({json:qm}),Km=[{tfOpName:"ResizeBilinear",category:"image",inputs:[{start:0,name:"images",type:"tensor"},{start:1,name:"size",type:"number[]"}],attrs:[{tfName:"align_corners",name:"alignCorners",type:"bool"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"ResizeNearestNeighbor",category:"image",inputs:[{start:0,name:"images",type:"tensor"},{start:1,name:"size",type:"number[]"}],attrs:[{tfName:"align_corners",name:"alignCorners",type:"bool"},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"CropAndResize",category:"image",inputs:[{start:0,name:"image",type:"tensor"},{start:1,name:"boxes",type:"tensor"},{start:2,name:"boxInd",type:"tensor"},{start:3,name:"cropSize",type:"number[]"}],attrs:[{tfName:"method",name:"method",type:"string"},{tfName:"extrapolation_value",name:"extrapolationValue",type:"number"}]}],Xm=Object.freeze({json:Km}),$m=[{tfOpName:"Equal",category:"logical",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"NotEqual",category:"logical",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Greater",category:"logical",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"GreaterEqual",category:"logical",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Less",category:"logical",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"LessEqual",category:"logical",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"LogicalAnd",category:"logical",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"LogicalNot",category:"logical",inputs:[{start:0,name:"a",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"LogicalOr",category:"logical",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Select",category:"logical",inputs:[{start:0,name:"condition",type:"tensor"},{start:1,name:"a",type:"tensor"},{start:2,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"SelectV2",category:"logical",inputs:[{start:0,name:"condition",type:"tensor"},{start:1,name:"a",type:"tensor"},{start:2,name:"b",type:"tensor"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]}],Ym=Object.freeze({json:$m}),Qm=[{tfOpName:"_FusedMatMul",category:"matrices",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"},{start:2,end:0,name:"args",type:"tensors"}],attrs:[{tfName:"num_args",name:"numArgs",type:"number"},{tfName:"fused_ops",name:"fusedOps",type:"string[]",defaultValue:[]},{tfName:"epsilon",name:"epsilon",type:"number",defaultValue:1e-4},{tfName:"transpose_a",name:"transposeA",type:"bool",defaultValue:!1},{tfName:"transpose_b",name:"transposeB",type:"bool",defaultValue:!1},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"MatMul",category:"matrices",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"transpose_a",name:"transposeA",type:"bool",defaultValue:!1},{tfName:"transpose_b",name:"transposeB",type:"bool",defaultValue:!1},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"BatchMatMul",category:"matrices",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"adj_x",name:"transposeA",type:"bool",defaultValue:!1},{tfName:"adj_y",name:"transposeB",type:"bool",defaultValue:!1},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"BatchMatMulV2",category:"matrices",inputs:[{start:0,name:"a",type:"tensor"},{start:1,name:"b",type:"tensor"}],attrs:[{tfName:"adj_x",name:"transposeA",type:"bool",defaultValue:!1},{tfName:"adj_y",name:"transposeB",type:"bool",defaultValue:!1},{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]},{tfOpName:"Transpose",category:"matrices",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"perm",type:"number[]"}],attrs:[{tfName:"T",name:"dtype",type:"dtype",notSupported:!0}]}],Jm=Object.freeze({json:Qm}),Zm=[{tfOpName:"FusedBatchNorm",category:"normalization",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"scale",type:"tensor"},{start:2,name:"offset",type:"tensor"},{start:3,name:"mean",type:"tensor"},{start:4,name:"variance",type:"tensor"}],attrs:[{tfName:"epsilon",name:"epsilon",type:"number",defaultValue:.001},{tfName:"data_format",name:"dataFormat",type:"string",notSupported:!0}]},{tfOpName:"FusedBatchNormV2",category:"normalization",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"scale",type:"tensor"},{start:2,name:"offset",type:"tensor"},{start:3,name:"mean",type:"tensor"},{start:4,name:"variance",type:"tensor"}],attrs:[{tfName:"epsilon",name:"epsilon",type:"number",defaultValue:.001},{tfName:"data_format",name:"dataFormat",type:"string",notSupported:!0}]},{tfOpName:"FusedBatchNormV3",category:"normalization",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"scale",type:"tensor"},{start:2,name:"offset",type:"tensor"},{start:3,name:"mean",type:"tensor"},{start:4,name:"variance",type:"tensor"}],attrs:[{tfName:"epsilon",name:"epsilon",type:"number",defaultValue:.001},{tfName:"data_format",name:"dataFormat",type:"string",notSupported:!0}]},{tfOpName:"LRN",category:"normalization",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"depth_radius",name:"radius",type:"number",defaultValue:5},{tfName:"bias",name:"bias",type:"number",defaultValue:1},{tfName:"alpha",name:"alpha",type:"number",defaultValue:1},{tfName:"beta",name:"beta",type:"number",defaultValue:.5}]},{tfOpName:"Softmax",category:"normalization",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"LogSoftmax",category:"normalization",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"SparseToDense",category:"normalization",inputs:[{start:0,name:"sparseIndices",type:"tensor"},{start:1,name:"outputShape",type:"number[]"},{start:2,name:"sparseValues",type:"tensor"},{start:3,name:"defaultValue",type:"tensor"}],attrs:[{tfName:"validate_indices",name:"validateIndices",type:"bool",defaultValue:!0,notSupported:!0}]}],ev=Object.freeze({json:Zm}),tv=[{tfOpName:"Max",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number[]"}],attrs:[{tfName:"keep_dims",name:"keepDims",type:"bool"}]},{tfOpName:"Mean",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number[]"}],attrs:[{tfName:"keep_dims",name:"keepDims",type:"bool"}]},{tfOpName:"Min",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number[]"}],attrs:[{tfName:"keep_dims",name:"keepDims",type:"bool"}]},{tfOpName:"Sum",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number[]"}],attrs:[{tfName:"keep_dims",name:"keepDims",type:"bool"}]},{tfOpName:"All",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number[]"}],attrs:[{tfName:"keep_dims",name:"keepDims",type:"bool"}]},{tfOpName:"Any",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number[]"}],attrs:[{tfName:"keep_dims",name:"keepDims",type:"bool"}]},{tfOpName:"ArgMax",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number"}]},{tfOpName:"ArgMin",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number"}]},{tfOpName:"Prod",category:"reduction",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number[]"}],attrs:[{tfName:"keep_dims",name:"keepDims",type:"bool"}]}],nv=Object.freeze({json:tv}),rv=[{tfOpName:"ConcatV2",category:"slice_join",inputs:[{start:0,end:-1,name:"tensors",type:"tensors"},{start:-1,name:"axis",type:"number"}],attrs:[{tfName:"N",name:"n",type:"number",defaultValue:2}]},{tfOpName:"Concat",category:"slice_join",inputs:[{start:1,end:0,name:"tensors",type:"tensors"},{start:0,name:"axis",type:"number"}],attrs:[{tfName:"N",name:"n",type:"number",defaultValue:2}]},{tfOpName:"GatherV2",category:"slice_join",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"indices",type:"tensor"},{start:2,name:"axis",type:"number",defaultValue:0}]},{tfOpName:"Gather",category:"slice_join",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"indices",type:"tensor"}],attrs:[{tfName:"axis",name:"axis",type:"number",defaultValue:0},{tfName:"validate_indices",name:"validateIndices",type:"bool",notSupported:!0}]},{tfOpName:"Reverse",category:"slice_join",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"dims",type:"bool",notSupported:!0}]},{tfOpName:"ReverseV2",category:"slice_join",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number[]"}]},{tfOpName:"Slice",category:"slice_join",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"begin",type:"number[]"},{start:2,name:"size",type:"number[]"}]},{tfOpName:"StridedSlice",category:"slice_join",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"begin",type:"number[]"},{start:2,name:"end",type:"number[]"},{start:3,name:"strides",type:"number[]"}],attrs:[{tfName:"begin_mask",name:"beginMask",type:"number",defaultValue:0},{tfName:"end_mask",name:"endMask",type:"number",defaultValue:0},{tfName:"new_axis_mask",name:"newAxisMask",type:"number",defaultValue:0},{tfName:"ellipsis_mask",name:"ellipsisMask",type:"number",defaultValue:0},{tfName:"shrink_axis_mask",name:"shrinkAxisMask",type:"number",defaultValue:0}]},{tfOpName:"Pack",category:"slice_join",inputs:[{start:0,end:0,name:"tensors",type:"tensors"}],attrs:[{tfName:"axis",name:"axis",type:"number",defaultValue:0}]},{tfOpName:"Unpack",category:"slice_join",inputs:[{start:0,name:"tensor",type:"tensor"}],attrs:[{tfName:"axis",name:"axis",type:"number",defaultValue:0},{tfName:"num",name:"num",type:"number",defaultValue:0,notSupported:!0}]},{tfOpName:"Tile",category:"slice_join",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"reps",type:"number[]"}]},{tfOpName:"Split",category:"slice_join",inputs:[{start:0,name:"axis",type:"number",defaultValue:0},{start:1,name:"x",type:"tensor"}],attrs:[{tfName:"num_split",name:"numOrSizeSplits",type:"number",defaultValue:1}]},{tfOpName:"SplitV",category:"slice_join",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"numOrSizeSplits",type:"number[]"},{start:2,name:"axis",type:"number",defaultValue:0}]},{tfOpName:"ScatterNd",category:"slice_join",inputs:[{start:0,name:"indices",type:"tensor"},{start:1,name:"values",type:"tensor"},{start:2,name:"shape",type:"number[]"}]},{tfOpName:"GatherNd",category:"slice_join",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"indices",type:"tensor"}]},{tfOpName:"SparseToDense",category:"slice_join",inputs:[{start:0,name:"sparseIndices",type:"tensor"},{start:1,name:"outputShape",type:"number[]"},{start:2,name:"sparseValues",type:"tensor"},{start:3,name:"defaultValue",type:"tensor"}],attrs:[{tfName:"validate_indices",name:"validateIndices",type:"bool",defaultValue:!1,notSupported:!0}]}],av=Object.freeze({json:rv}),ov=[{tfOpName:"FFT",category:"spectral",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"IFFT",category:"spectral",inputs:[{start:0,name:"x",type:"tensor"}]},{tfOpName:"RFFT",category:"spectral",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"fft_length",type:"number",notSupported:!0}]},{tfOpName:"IRFFT",category:"spectral",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"fft_length",type:"number",notSupported:!0}]}],iv=Object.freeze({json:ov}),sv=[{tfOpName:"Cast",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"SrcT",name:"sdtype",type:"dtype",notSupported:!0},{tfName:"DstT",name:"dtype",type:"dtype"}]},{tfOpName:"ExpandDims",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"axis",type:"number"}]},{tfOpName:"Pad",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"padding",type:"number[]"}],attrs:[{tfName:"constant_value",name:"constantValue",type:"number",defaultValue:0}]},{tfOpName:"PadV2",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"padding",type:"number[]"},{start:2,name:"constantValue",type:"number",defaultValue:0}]},{tfOpName:"Reshape",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"shape",type:"number[]"}]},{tfOpName:"Squeeze",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"axis",tfDeprecatedName:"squeeze_dims",name:"axis",type:"number[]"}]},{tfOpName:"SpaceToBatchND",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"blockShape",type:"number[]"},{start:2,name:"paddings",type:"number[]"}]},{tfOpName:"BatchToSpaceND",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"},{start:1,name:"blockShape",type:"number[]"},{start:2,name:"crops",type:"number[]"}]},{tfOpName:"DepthToSpace",category:"transformation",inputs:[{start:0,name:"x",type:"tensor"}],attrs:[{tfName:"block_size",name:"blockSize",type:"number"},{tfName:"data_format",name:"dataFormat",type:"string"}]}],uv=Object.freeze({json:sv}),cv=(function(){function r(){var t=[Om,Fm,Bm,Lm,Wm,Um,Hm,Ym,Xm,jm,Jm,ev,nv,av,iv,uv],e=[].concat.apply([],t.map(function(n){return n.json}));this.opMappers=e.reduce(function(n,a){return n[a.tfOpName]=a,n},{})}return Object.defineProperty(r,"Instance",{get:function(){return this._instance||(this._instance=new this)},enumerable:!0,configurable:!0}),r.prototype.transformGraph=function(t,e){var n=this;e===void 0&&(e={});var a=[],o=[],i=t.node.reduce(function(d,h){return d[h.name]=n.mapNode(h),h.op.startsWith("Placeholder")&&a.push(d[h.name]),h.op==="Const"&&o.push(d[h.name]),d},{}),s=[],u=[],c={},l={};e!=null&&(c=this.mapSignatureEntries(e.inputs),l=this.mapSignatureEntries(e.outputs));var p=Object.keys(i);return p.forEach(function(d){var h=i[d];h.inputNames.forEach(function(f){var m=Bn(f)[0];h.inputs.push(i[m]),i[m].children.push(h)})}),Object.keys(l).length===0?p.forEach(function(d){var h=i[d];h.children.length===0&&u.push(h)}):Object.keys(l).forEach(function(d){var h=Bn(d)[0],f=i[h];f!=null&&(f.signatureKey=l[d],u.push(f))}),Object.keys(c).length>0?Object.keys(c).forEach(function(d){var h=Bn(d)[0],f=i[h];f&&(f.signatureKey=c[d],s.push(f))}):s=a,{nodes:i,inputs:s,outputs:u,weights:o,placeholders:a,signature:e}},r.prototype.mapSignatureEntries=function(t){return Object.keys(t||{}).reduce(function(e,n){return e[t[n].name]=n,e},{})},r.prototype.mapNode=function(t){var e=Hl(t.op)||this.opMappers[t.op]||{};t.attr==null&&(t.attr={});var n={name:t.name,op:t.op,category:e.category,inputNames:(t.input||[]).map(function(a){return a.startsWith("^")?a.substr(1):a}),inputs:[],children:[],inputParams:{},attrParams:{},rawAttrs:t.attr};return e.inputs!=null&&(n.inputParams=e.inputs.reduce(function(a,o){return a[o.name]={type:o.type,inputIndexStart:o.start,inputIndexEnd:o.end},a},{})),e.attrs!=null&&(n.attrParams=e.attrs.reduce(function(a,o){var i=o.type,s=void 0;switch(o.type){case"string":(s=hs(t.attr,o.tfName,o.defaultValue))===void 0&&o.tfDeprecatedName&&(s=hs(t.attr,o.tfDeprecatedName,o.defaultValue));break;case"string[]":(s=bs(t.attr,o.tfName,o.defaultValue))===void 0&&o.tfDeprecatedName&&(s=bs(t.attr,o.tfDeprecatedName,o.defaultValue));break;case"number":(s=ms(t.attr,o.tfName,o.defaultValue||0))===void 0&&o.tfDeprecatedName&&(s=ms(t.attr,o.tfDeprecatedName,o.defaultValue));break;case"number[]":(s=xs(t.attr,o.tfName,o.defaultValue))===void 0&&o.tfDeprecatedName&&(s=xs(t.attr,o.tfDeprecatedName,o.defaultValue));break;case"bool":(s=fs(t.attr,o.tfName,o.defaultValue))===void 0&&o.tfDeprecatedName&&(s=fs(t.attr,o.tfDeprecatedName,o.defaultValue));break;case"bool[]":(s=Cs(t.attr,o.tfName,o.defaultValue))===void 0&&o.tfDeprecatedName&&(s=Cs(t.attr,o.tfDeprecatedName,o.defaultValue));break;case"shape":(s=ys(t.attr,o.tfName,o.defaultValue))===void 0&&o.tfDeprecatedName&&(s=ys(t.attr,o.tfDeprecatedName,o.defaultValue));break;case"shape[]":(s=ws(t.attr,o.tfName,o.defaultValue))===void 0&&o.tfDeprecatedName&&(s=ws(t.attr,o.tfDeprecatedName,o.defaultValue));break;case"dtype":(s=vs(t.attr,o.tfName,o.defaultValue))===void 0&&o.tfDeprecatedName&&(s=vs(t.attr,o.tfDeprecatedName,o.defaultValue));break;case"dtype[]":(s=gs(t.attr,o.tfName,o.defaultValue))===void 0&&o.tfDeprecatedName&&(s=gs(t.attr,o.tfDeprecatedName,o.defaultValue));break;case"tensor":case"tensors":break;default:throw new Error("Unsupported param type: "+o.type+" for op: "+t.op)}return a[o.name]={value:s,type:i},a},{})),n},r})();function lv(r){var t=B().global;if(t.atob!==void 0)return t.atob(r);if(typeof Buffer<"u")return new Buffer(r,"base64").toString();throw new Error("Unable to decode base64 in this environment. Missing built-in atob() or Buffer()")}function ql(r,t){var e=Array.isArray(r)?String.fromCharCode.apply(null,r):lv(r);return t?e:e.toLowerCase()}function hs(r,t,e,n){n===void 0&&(n=!1);var a=r[t];return a!=null?ql(a.s,n):e}function fs(r,t,e){var n=r[t];return n?n.b:e}function ms(r,t,e){var n=r[t]||{},a=n.i!=null?n.i:n.f!=null?n.f:e;return typeof a=="number"?a:parseInt(a,10)}function jl(r){switch(typeof r=="string"&&(r=ut[r]),r){case ut.DT_FLOAT:return"float32";case ut.DT_INT32:case ut.DT_INT64:case ut.DT_INT8:case ut.DT_UINT8:return"int32";case ut.DT_BOOL:return"bool";case ut.DT_DOUBLE:return"float32";case ut.DT_STRING:return"string";default:return null}}function vs(r,t,e){var n=r[t];return n&&n.type?jl(n.type):e}function gs(r,t,e){var n=r[t];return n&&n.list&&n.list.type?n.list.type.map(function(a){return jl(a)}):e}function Kl(r){if(!r.unknownRank)return r.dim!=null?r.dim.map(function(t){return typeof t.size=="number"?t.size:parseInt(t.size,10)}):[]}function ys(r,t,e){var n=r[t];return n&&n.shape?Kl(n.shape):e}function xs(r,t,e){var n=r[t];return n?((n.list.f&&n.list.f.length?n.list.f:n.list.i)||[]).map(function(a){return typeof a=="number"?a:parseInt(a,10)}):e}function bs(r,t,e,n){n===void 0&&(n=!1);var a=r[t];return a&&a.list&&a.list.s?a.list.s.map(function(o){return ql(o,n)}):e}function ws(r,t,e){var n=r[t];return n&&n.list&&n.list.shape?n.list.shape.map(function(a){return Kl(a)}):e}function Cs(r,t,e){var n=r[t];return n&&n.list&&n.list.b?n.list.b:e}var pv=(function(){function r(t,e,n){var a=this;this.node=t,this.tensorMap=e,this.context=n,this.inputs=[],this.attrs={},this.inputs=t.inputNames.map(function(o){return a.getInput(o)}),t.rawAttrs!=null&&(this.attrs=Object.keys(t.rawAttrs).reduce(function(o,i){return o[i]=a.getAttr(i),o},{}))}return r.prototype.getInput=function(t){return Ve(t,this.tensorMap,this.context)},r.prototype.getAttr=function(t,e){var n=this.node.rawAttrs[t];if(n.tensor!=null)return Ve(t,this.tensorMap,this.context);if(n.i!=null||n.f!=null)return ms(this.node.rawAttrs,t,e);if(n.s!=null)return hs(this.node.rawAttrs,t,e);if(n.b!=null)return fs(this.node.rawAttrs,t,e);if(n.shape!=null)return ys(this.node.rawAttrs,t,e);if(n.type!=null)return vs(this.node.rawAttrs,t,e);if(n.list!=null){if(n.list.i!=null||n.list.f!=null)return xs(this.node.rawAttrs,t,e);if(n.list.s!=null)return bs(this.node.rawAttrs,t,e);if(n.list.shape!=null)return ws(this.node.rawAttrs,t,e);if(n.list.b!=null)return Cs(this.node.rawAttrs,t,e);if(n.list.type!=null)return gs(this.node.rawAttrs,t,e)}return e},r})(),dv=function(r,t,e){switch(r.op){case"BiasAdd":case"AddV2":case"Add":return[xt(w("a",r,t,e),w("b",r,t,e))];case"AddN":return[Si(w("tensors",r,t,e))];case"FloorMod":case"Mod":return[li(w("a",r,t,e),w("b",r,t,e))];case"Mul":return[Se(w("a",r,t,e),w("b",r,t,e))];case"RealDiv":case"Div":return[bt(w("a",r,t,e),w("b",r,t,e))];case"DivNoNan":return[da(w("a",r,t,e),w("b",r,t,e))];case"FloorDiv":return[ra(w("a",r,t,e),w("b",r,t,e))];case"Sub":return[vt(w("a",r,t,e),w("b",r,t,e))];case"Minimum":return[aa(w("a",r,t,e),w("b",r,t,e))];case"Maximum":return[ir(w("a",r,t,e),w("b",r,t,e))];case"Pow":return[Rn(w("a",r,t,e),w("b",r,t,e))];case"SquaredDifference":return[ma(w("a",r,t,e),w("b",r,t,e))];default:throw TypeError("Node type "+r.op+" is not implemented")}},hv=function(r,t,e){switch(r.op){case"Abs":case"ComplexAbs":return[Bo(w("x",r,t,e))];case"Acos":return[Po(w("x",r,t,e))];case"Acosh":return[Lo(w("x",r,t,e))];case"Asin":return[Vo(w("x",r,t,e))];case"Asinh":return[Wo(w("x",r,t,e))];case"Atan":return[zo(w("x",r,t,e))];case"Atan2":return[ci(w("x",r,t,e),w("y",r,t,e))];case"Atanh":return[Uo(w("x",r,t,e))];case"Ceil":return[Go(w("x",r,t,e))];case"Complex":return[Ae(w("real",r,t,e),w("imag",r,t,e))];case"Cos":return[qo(w("x",r,t,e))];case"Cosh":return[jo(w("x",r,t,e))];case"Elu":return[ba(w("x",r,t,e))];case"Erf":return[Ko(w("x",r,t,e))];case"Exp":return[Xo(w("x",r,t,e))];case"Expm1":return[$o(w("x",r,t,e))];case"Floor":return[Yo(w("x",r,t,e))];case"Log":return[Qo(w("x",r,t,e))];case"Log1p":return[Jo(w("x",r,t,e))];case"Imag":return[Ze(w("x",r,t,e))];case"Neg":return[or(w("x",r,t,e))];case"Reciprocal":return[Zo(w("x",r,t,e))];case"Real":return[ze(w("x",r,t,e))];case"Relu":return[Ca(w("x",r,t,e))];case"Round":return[ei(w("x",r,t,e))];case"Selu":return[Qi(w("x",r,t,e))];case"Sigmoid":return[ti(w("x",r,t,e))];case"Sin":return[ri(w("x",r,t,e))];case"Sign":return[ni(w("x",r,t,e))];case"Sinh":return[ai(w("x",r,t,e))];case"Softplus":return[oi(w("x",r,t,e))];case"Sqrt":return[ii(w("x",r,t,e))];case"Square":return[fa(w("x",r,t,e))];case"Tanh":return[ui(w("x",r,t,e))];case"Tan":return[si(w("x",r,t,e))];case"Relu6":case"ClipByValue":return[Ho(w("x",r,t,e),w("clipValueMin",r,t,e),w("clipValueMax",r,t,e))];case"Rsqrt":return[na(Ve(r.inputNames[0],t,e))];case"Prod":return[xa(w("x",r,t,e),w("axes",r,t,e))];case"LeakyRelu":return[Yi(w("x",r,t,e),w("alpha",r,t,e))];case"Prelu":return[wa(w("x",r,t,e),w("alpha",r,t,e))];default:throw TypeError("Node type "+r.op+" is not implemented")}},fv=(function(){function r(t,e,n,a,o,i,s){this.name=t,this.dtype=e,this.maxSize=n,this.elementShape=a,this.identicalElementShapes=o,this.dynamicSize=i,this.clearAfterRead=s,this.tensors=[],this.closed_=!1,this.id=r.nextId++}return Object.defineProperty(r.prototype,"closed",{get:function(){return this.closed_},enumerable:!0,configurable:!0}),r.prototype.clearAndClose=function(){this.tensors.forEach(function(t){return t.tensor.dispose()}),this.tensors=[],this.closed_=!0},r.prototype.size=function(){return this.tensors.length},r.prototype.read=function(t){if(this.closed_)throw new Error("TensorArray "+this.name+" has already been closed.");if(t<0||t>=this.tensors.length)throw new Error("Tried to read from index "+t+", but array size is: "+this.tensors.length);var e=this.tensors[t];if(e.cleared)throw new Error("TensorArray "+this.name+": Could not read index "+t+" twice because it was cleared after a previous read (perhaps try setting clear_after_read = false?).");return this.clearAfterRead&&(e.cleared=!0),e.read=!0,e.tensor},r.prototype.readMany=function(t){var e=this;return t.map(function(n){return e.read(n)})},r.prototype.write=function(t,e){if(this.closed_)throw new Error("TensorArray "+this.name+" has already been closed.");if(t<0||!this.dynamicSize&&t>=this.maxSize)throw new Error("Tried to write to index "+t+", but array is not resizeable and size is: "+this.maxSize);var n=this.tensors[t]||{};if(e.dtype!==this.dtype)throw new Error("TensorArray "+this.name+": Could not write to TensorArray index "+t+`,
          because the value dtype is `+e.dtype+", but TensorArray dtype is "+this.dtype+".");if(this.size()!==0||this.elementShape!=null&&this.elementShape.length!==0||(this.elementShape=e.shape),this.assertShapesMatchAllowUndefinedSize(this.elementShape,e.shape,"TensorArray "+this.name+": Could not write to TensorArray index "+t+"."),n&&n.read)throw new Error("TensorArray "+this.name+": Could not write to TensorArray index "+t+", because it has already been read.");if(n&&n.written)throw new Error("TensorArray "+this.name+": Could not write to TensorArray index "+t+", because it has already been written.");n.tensor=e,n.written=!0,this.tensors[t]=n},r.prototype.writeMany=function(t,e){var n=this;if(t.length!==e.length)throw new Error("TensorArray "+this.name+": could not write multiple tensors,because the index size: "+t.length+" is not the same as tensors size: "+e.length+".");t.forEach(function(a,o){return n.write(a,e[o])})},r.prototype.gather=function(t,e){if(e&&e!==this.dtype)throw new Error("TensorArray dtype is "+this.dtype+" but gather requested dtype "+e);if(!t){t=[];for(var n=0;n<this.size();n++)t.push(n)}if(t.length===0)return De([],[0].concat(this.elementShape));var a=this.readMany(t);return this.assertShapesMatchAllowUndefinedSize(this.elementShape,a[0].shape,"TensorArray shape mismatch: "),yt(a,0)},r.prototype.concat=function(t){if(t&&t!==this.dtype)throw new Error("TensorArray dtype is "+this.dtype+" but concat requested dtype "+t);if(this.size()===0)return De([],[0].concat(this.elementShape));for(var e=[],n=0;n<this.size();n++)e.push(n);var a=this.readMany(e);return this.assertShapesMatchAllowUndefinedSize(this.elementShape,a[0].shape,"TensorArray shape mismatch: tensor array shape ("+this.elementShape+") vs first tensor shape ("+a[0].shape+")"),Qe(a,0)},r.prototype.scatter=function(t,e){if(e.dtype!==this.dtype)throw new Error("TensorArray dtype is "+this.dtype+" but tensor has dtype "+e.dtype);if(t.length!==e.shape[0])throw new Error("Expected len(indices) == tensor.shape[0], but saw: "+t.length+" vs. "+e.shape[0]);var n=Math.max.apply(Math,t);if(!this.dynamicSize&&n>=this.maxSize)throw new Error("Max index must be < array size ("+n+"  vs. "+this.maxSize+")");this.writeMany(t,_n(e,0))},r.prototype.split=function(t,e){var n=this;if(e.dtype!==this.dtype)throw new Error("TensorArray dtype is "+this.dtype+" but tensor has dtype "+e.dtype);var a=0,o=t.map(function(l){return a+=l});if(a!==e.shape[0])throw new Error(`Expected sum of lengths to be equal to
          tensor.shape[0], but sum of lengths is
        `+a+", and tensor's shape is: "+e.shape);if(!this.dynamicSize&&t.length!==this.maxSize)throw new Error("TensorArray's size is not equal to the size of lengths ("+this.maxSize+" vs. "+t.length+"), and the TensorArray is not marked as dynamically resizeable");var i=a===0?0:e.size/a,s=[];oe(function(){e=e.reshape([1,a,i]);for(var l=0;l<t.length;++l){var p=[0,l===0?0:o[l-1],0],d=[1,t[l],i];s[l]=rt(e,p,d).reshape(n.elementShape)}return s});for(var u=[],c=0;c<t.length;c++)u[c]=c;this.writeMany(u,s)},r.prototype.assertShapesMatchAllowUndefinedSize=function(t,e,n){n===void 0&&(n=""),wt.assert(this.shapesEqualAllowUndefinedSize(t,e),function(){return n+" Shapes "+t+" and "+e+" must match"})},r.prototype.shapesEqualAllowUndefinedSize=function(t,e){if(t.length!==e.length)return!1;for(var n=0;n<t.length;n++)if(t[n]!==-1&&e[n]!==-1&&t[n]!==e[n])return!1;return!0},r.nextId=0,r})(),mv=void 0,vv=function(r,t,e){return jt(mv,void 0,void 0,function(){var n,a,o,i,s,u,c,l,p,d,h,f,m,v,g,y,x,b,C,E,R,I,k,T,O,_,W,L,P,U,G,V,H,q,j;return Kt(this,function(J){switch(J.label){case 0:switch(r.op){case"LoopCond":return[3,1];case"Switch":return[3,2];case"Merge":return[3,4];case"Enter":return[3,5];case"Exit":return[3,6];case"NextIteration":return[3,7];case"TensorArrayV3":return[3,8];case"TensorArrayWriteV3":return[3,9];case"TensorArrayReadV3":return[3,10];case"TensorArrayGatherV3":return[3,11];case"TensorArrayScatterV3":return[3,12];case"TensorArrayConcatV3":return[3,13];case"TensorArraySplitV3":return[3,14];case"TensorArraySizeV3":return[3,15];case"TensorArrayCloseV3":return[3,16]}return[3,17];case 1:return[2,[w("pred",r,t,e).clone()]];case 2:return n=w("pred",r,t,e),a=w("data",r,t,e),[4,n.data()];case 3:return[2,J.sent()[0]?[void 0,a.clone()]:[a.clone(),void 0]];case 4:return[2,(o=r.inputNames.find(function(Z){return Ve(Z,t,e)!==void 0}))?[Ve(o,t,e).clone()]:void 0];case 5:return i=w("frameName",r,t,e),s=w("tensor",r,t,e),e.enterFrame(i),[2,[s.clone()]];case 6:return u=w("tensor",r,t,e),e.exitFrame(),[2,[u.clone()]];case 7:return c=w("tensor",r,t,e),e.nextIteration(),[2,[c.clone()]];case 8:return l=w("size",r,t,e),p=w("dtype",r,t,e),d=w("elementShape",r,t,e),h=w("dynamicSize",r,t,e),f=w("clearAfterRead",r,t,e),m=w("identicalElementShapes",r,t,e),v=w("name",r,t,e),g=new fv(v,p,l,d,m,h,f),e.addTensorArray(g),[2,[K(g.id),K(1)]];case 9:return y=w("tensorArrayId",r,t,e),x=w("index",r,t,e),b=w("tensor",r,t,e),e.getTensorArray(y).write(x,b),[2,[K(1)]];case 10:return C=w("tensorArrayId",r,t,e),E=w("index",r,t,e),[2,[e.getTensorArray(C).read(E)]];case 11:return R=w("tensorArrayId",r,t,e),I=w("indices",r,t,e),k=w("dtype",r,t,e),[2,[e.getTensorArray(R).gather(I,k)]];case 12:return T=w("tensorArrayId",r,t,e),O=w("indices",r,t,e),_=w("tensor",r,t,e),e.getTensorArray(T).scatter(O,_),[2,[K(1)]];case 13:return W=w("tensorArrayId",r,t,e),L=e.getTensorArray(W),P=w("dtype",r,t,e),[2,[L.concat(P)]];case 14:return U=w("tensorArrayId",r,t,e),G=w("tensor",r,t,e),V=w("lengths",r,t,e),e.getTensorArray(U).split(V,G),[2,[K(1)]];case 15:return H=w("tensorArrayId",r,t,e),q=e.getTensorArray(H),[2,[K(q.size(),"int32")]];case 16:return j=w("tensorArrayId",r,t,e),e.getTensorArray(j).clearAndClose(),[2,[K(0)]];case 17:throw TypeError("Node type "+r.op+" is not implemented")}})})},gv=function(r,t,e){switch(r.op){case"Conv1D":var n=w("stride",r,t,e),a=w("pad",r,t,e),o=w("dataFormat",r,t,e).toUpperCase(),i=w("dilation",r,t,e);return[Fi(w("x",r,t,e),w("filter",r,t,e),n,a,o,i)];case"Conv2D":n=w("strides",r,t,e),a=w("pad",r,t,e),o=w("dataFormat",r,t,e).toUpperCase();var s=w("dilations",r,t,e);return[cn(w("x",r,t,e),w("filter",r,t,e),[n[1],n[2]],a,o,[s[1],s[2]])];case"_FusedConv2D":case"FusedDepthwiseConv2dNative":var u=w("fusedOps",r,t,e),c=u[0],l=u[1],p=c==="biasadd",d=l==="prelu",h=c==="fusedbatchnorm",f=w("numArgs",r,t,e);if(p){if(d&&f!==2)throw new Error("FusedConv2d and DepthwiseConv2d with BiasAdd and Prelu must have two extra arguments: bias and alpha.");if(!d&&f!==1)throw new Error("FusedConv2d and DepthwiseConv2d with BiasAdd must have one extra argument: bias.")}if(h)throw new Error("FusedConv2d and DepthwiseConv2d with FusedBatchNorm is not supported.");n=w("strides",r,t,e),a=w("pad",r,t,e),o=w("dataFormat",r,t,e).toUpperCase(),s=w("dilations",r,t,e);var m=w("args",r,t,e),v=m[0],g=m[1];return[(r.op==="_FusedConv2D"?hr.conv2d:hr.depthwiseConv2d)({x:w("x",r,t,e),filter:w("filter",r,t,e),strides:[n[1],n[2]],pad:a,dataFormat:o,dilations:[s[1],s[2]],bias:v,activation:l,preluActivationWeights:g})];case"Conv2DBackpropInput":case"Conv2dTranspose":var y=w("outputShape",r,t,e);return n=w("strides",r,t,e),a=w("pad",r,t,e),[Pi(w("x",r,t,e),w("filter",r,t,e),y,[n[1],n[2]],a)];case"DepthwiseConv2dNative":case"DepthwiseConv2d":return n=w("strides",r,t,e),a=w("pad",r,t,e),s=w("dilations",r,t,e),o=w("dataFormat",r,t,e).toUpperCase(),[lr(w("input",r,t,e),w("filter",r,t,e),[n[1],n[2]],a,o,[s[1],s[2]])];case"Conv3D":return n=w("strides",r,t,e),a=w("pad",r,t,e),o=w("dataFormat",r,t,e).toUpperCase(),s=w("dilations",r,t,e),[Mi(w("x",r,t,e),w("filter",r,t,e),[n[1],n[2],n[3]],a,o,[s[1],s[2],s[3]])];case"AvgPool":n=w("strides",r,t,e),a=w("pad",r,t,e);var x=w("kernelSize",r,t,e);return[Vi(w("x",r,t,e),[x[1],x[2]],[n[1],n[2]],a)];case"MaxPool":return n=w("strides",r,t,e),a=w("pad",r,t,e),x=w("kernelSize",r,t,e),[Li(w("x",r,t,e),[x[1],x[2]],[n[1],n[2]],a)];case"MaxPoolWithArgmax":n=w("strides",r,t,e),a=w("pad",r,t,e),x=w("kernelSize",r,t,e);var b=w("includeBatchInIndex",r,t,e),C=Ui(w("x",r,t,e),[x[1],x[2]],[n[1],n[2]],a,b);return[C.result,C.indexes];case"AvgPool3D":return n=w("strides",r,t,e),a=w("pad",r,t,e),x=w("kernelSize",r,t,e),[zi(w("x",r,t,e),[x[1],x[2],x[3]],[n[1],n[2],n[3]],a)];case"MaxPool3D":return n=w("strides",r,t,e),a=w("pad",r,t,e),x=w("kernelSize",r,t,e),[Wi(w("x",r,t,e),[x[1],x[2],x[3]],[n[1],n[2],n[3]],a)];default:throw TypeError("Node type "+r.op+" is not implemented")}},yv=function(r,t,e){switch(r.op){case"Fill":var n=w("shape",r,t,e),a=w("dtype",r,t,e),o=w("value",r,t,e);return[rr(n,o,a)];case"LinSpace":var i=w("start",r,t,e),s=w("stop",r,t,e),u=w("num",r,t,e);return[Oo(i,s,u)];case"Multinomial":var c=w("logits",r,t,e),l=w("numSamples",r,t,e),p=w("seed",r,t,e);return[ki(c,l,p)];case"OneHot":var d=w("indices",r,t,e),h=w("depth",r,t,e),f=w("onValue",r,t,e),m=w("offValue",r,t,e);return[Tn(d,h,f,m)];case"Ones":return[Gt(w("shape",r,t,e),w("dtype",r,t,e))];case"OnesLike":return[Yr(w("x",r,t,e))];case"RandomUniform":return[ha(w("shape",r,t,e),w("minval",r,t,e),w("maxval",r,t,e),w("dtype",r,t,e))];case"Range":i=w("start",r,t,e);var v=w("stop",r,t,e),g=w("step",r,t,e);return[kn(i,v,g,w("dtype",r,t,e))];case"TruncatedNormal":n=w("shape",r,t,e);var y=w("mean",r,t,e),x=w("stdDev",r,t,e);return p=w("seed",r,t,e),[Ti(n,y,x,w("dtype",r,t,e),p)];case"Zeros":return[ye(w("shape",r,t,e),w("dtype",r,t,e))];case"ZerosLike":return[ue(w("x",r,t,e))];default:throw TypeError("Node type "+r.op+" is not implemented")}},xv=void 0,bv=function(r,t,e){return jt(xv,void 0,void 0,function(){var n,a,o,i,s,u,c,l;return Kt(this,function(p){switch(p.label){case 0:switch(r.op){case"NonMaxSuppressionV5":case"NonMaxSuppressionV3":case"NonMaxSuppressionV2":return[3,1];case"Where":return[3,5];case"ListDiff":return[3,7]}return[3,8];case 1:return n=w("boxes",r,t,e),a=w("scores",r,t,e),o=w("maxOutputSize",r,t,e),i=w("iouThreshold",r,t,e),s=w("scoreThreshold",r,t,e),r.op!=="NonMaxSuppressionV5"?[3,3]:(u=w("softNmsSigma",r,t,e),[4,pn.nonMaxSuppressionWithScoreAsync(n,a,o,i,s,u)]);case 2:return[2,[(l=p.sent()).selectedIndices,l.selectedScores]];case 3:return[4,pn.nonMaxSuppressionAsync(n,a,o,i,s)];case 4:return[2,[p.sent()]];case 5:return c=w("condition",r,t,e).asType("bool"),[4,pa(c)];case 6:return l=[p.sent()],c.dispose(),[2,l];case 7:return[2,Mo(w("x",r,t,e),w("y",r,t,e))];case 8:throw TypeError("Node type "+r.op+" is not implemented")}})})},wv=function(r,t,e){switch(r.op){case"TopKV2":var n=w("x",r,t,e),a=w("k",r,t,e),o=w("sorted",r,t,e),i=es(n,a,o);return[i.values,i.indices];default:throw TypeError("Node type "+r.op+" is not implemented")}},Cv=function(r,t,e){switch(r.op){case"Const":return t[r.name];case"PlaceholderWithDefault":var n=w("default",r,t,e);return[Ve(r.name,t,e)||n];case"Placeholder":return[Ve(r.name,t,e)];case"Identity":case"StopGradient":case"FakeQuantWithMinMaxVars":return[w("x",r,t,e).clone()];case"IdentityN":return w("x",r,t,e).map(function(c){return c.clone()});case"Snapshot":return[w("x",r,t,e).clone()];case"Shape":return[nt(w("x",r,t,e).shape,"int32")];case"ShapeN":return w("x",r,t,e).map(function(c){return nt(c.shape)});case"Size":return[K(w("x",r,t,e).size,"int32")];case"Rank":return[K(w("x",r,t,e).rank,"int32")];case"NoOp":return[K(1)];case"Print":var a=w("x",r,t,e),o=w("data",r,t,e),i=w("message",r,t,e),s=w("summarize",r,t,e);console.warn("The graph has a tf.print() operation,usually used for debugging, which slows down performance."),console.log(i);for(var u=0;u<o.length;u++)console.log(Array.prototype.slice.call(o[u].dataSync()).slice(0,s));return[a];default:throw TypeError("Node type "+r.op+" is not implemented")}},Nv=function(r,t,e){switch(r.op){case"ResizeBilinear":var n=w("images",r,t,e),a=w("size",r,t,e),o=w("alignCorners",r,t,e);return[pn.resizeBilinear(n,[a[0],a[1]],o)];case"ResizeNearestNeighbor":return n=w("images",r,t,e),a=w("size",r,t,e),o=w("alignCorners",r,t,e),[pn.resizeNearestNeighbor(n,[a[0],a[1]],o)];case"CropAndResize":var i=w("image",r,t,e),s=w("boxes",r,t,e),u=w("boxInd",r,t,e),c=w("cropSize",r,t,e),l=w("method",r,t,e),p=w("extrapolationValue",r,t,e);return[pn.cropAndResize(i,s,u,c,l,p)];default:throw TypeError("Node type "+r.op+" is not implemented")}},Ev=function(r,t,e){switch(r.op){case"Equal":return[va(w("a",r,t,e),w("b",r,t,e))];case"NotEqual":return[_i(w("a",r,t,e),w("b",r,t,e))];case"Greater":return[Ai(w("a",r,t,e),w("b",r,t,e))];case"GreaterEqual":return[ga(w("a",r,t,e),w("b",r,t,e))];case"Less":return[Di(w("a",r,t,e),w("b",r,t,e))];case"LessEqual":return[Oi(w("a",r,t,e),w("b",r,t,e))];case"LogicalAnd":return[Fn(w("a",r,t,e),w("b",r,t,e))];case"LogicalNot":return[Ii(w("a",r,t,e))];case"LogicalOr":return[la(w("a",r,t,e),w("b",r,t,e))];case"Select":case"SelectV2":return[At(w("condition",r,t,e),w("a",r,t,e),w("b",r,t,e))];default:throw TypeError("Node type "+r.op+" is not implemented")}},Sv=function(r,t,e){switch(r.op){case"BatchMatMul":case"BatchMatMulV2":case"MatMul":return[ya(w("a",r,t,e),w("b",r,t,e),w("transposeA",r,t,e),w("transposeB",r,t,e))];case"Transpose":return[Ke(w("x",r,t,e),w("perm",r,t,e))];case"_FusedMatMul":var n=w("fusedOps",r,t,e),a=n[0],o=n[1],i=a==="biasadd",s=o==="prelu",u=w("numArgs",r,t,e);if(i){if(s&&u!==2)throw new Error("Fused MatMul with BiasAdd and Prelu must have two extra arguments: bias and alpha.");if(!s&&u!==1)throw new Error("Fused MatMul with BiasAdd must have one extra argument: bias.")}var c=w("args",r,t,e),l=c[0],p=c[1];return[hr.matMul({a:w("a",r,t,e),b:w("b",r,t,e),transposeA:w("transposeA",r,t,e),transposeB:w("transposeB",r,t,e),bias:l,activation:o,preluActivationWeights:p})];default:throw TypeError("Node type "+r.op+" is not implemented")}},Iv=function(r,t,e){switch(r.op){case"FusedBatchNorm":case"FusedBatchNormV2":case"FusedBatchNormV3":return[un(w("x",r,t,e),w("mean",r,t,e),w("variance",r,t,e),w("offset",r,t,e),w("scale",r,t,e),w("epsilon",r,t,e))];case"LRN":return[Ji(w("x",r,t,e),w("radius",r,t,e),w("bias",r,t,e),w("alpha",r,t,e),w("beta",r,t,e))];case"Softmax":return[sr(w("x",r,t,e))];case"LogSoftmax":return[mi(w("x",r,t,e))];case"SparseToDense":return[Ea(w("sparseIndices",r,t,e),w("outputShape",r,t,e),w("sparseValues",r,t,e),w("defaultValue",r,t,e))];default:throw TypeError("Node type "+r.op+" is not implemented")}},kv=function(r,t,e){switch(r.op){case"Max":var n=w("axis",r,t,e),a=w("keepDims",r,t,e);return[Ki(w("x",r,t,e),n,a)];case"Mean":return n=w("axis",r,t,e),a=w("keepDims",r,t,e),[Xi(w("x",r,t,e),n,a)];case"Min":return n=w("axis",r,t,e),a=w("keepDims",r,t,e),[$i(w("x",r,t,e),n,a)];case"Sum":return n=w("axis",r,t,e),a=w("keepDims",r,t,e),[ft(w("x",r,t,e),n,a)];case"All":return n=w("axis",r,t,e),a=w("keepDims",r,t,e),[Gi(w("x",r,t,e),n,a)];case"Any":return n=w("axis",r,t,e),a=w("keepDims",r,t,e),[Hi(w("x",r,t,e),n,a)];case"ArgMax":return n=w("axis",r,t,e),[qi(w("x",r,t,e),n)];case"ArgMin":return n=w("axis",r,t,e),[ji(w("x",r,t,e),n)];case"Prod":return n=w("axis",r,t,e),a=w("keepDims",r,t,e),[xa(w("x",r,t,e),n,a)];default:throw TypeError("Node type "+r.op+" is not implemented")}},Rv=function(r,t,e){switch(r.op){case"ConcatV2":case"Concat":var n=w("n",r,t,e),a=w("axis",r,t,e),o=w("tensors",r,t,e);return o=o.slice(0,n),[Qe(o,a)];case"GatherV2":case"Gather":a=w("axis",r,t,e);var i=w("x",r,t,e),s=w("indices",r,t,e);return[cr(i,s.asType("int32"),a)];case"ReverseV2":case"Reverse":return a=w("axis",r,t,e),i=w("x",r,t,e),[ln(i,a)];case"Slice":var u=w("begin",r,t,e),c=w("size",r,t,e);return[rt(w("x",r,t,e),u,c)];case"StridedSlice":u=w("begin",r,t,e);var l=w("end",r,t,e),p=w("strides",r,t,e),d=w("beginMask",r,t,e),h=w("endMask",r,t,e),f=w("ellipsisMask",r,t,e),m=w("newAxisMask",r,t,e),v=w("shrinkAxisMask",r,t,e),g=w("x",r,t,e);if(u.length===1&&g.shape.length>1)for(var y=1;y<g.shape.length;y++)u.push(0),l.push(g.shape[y]),p.push(p[0]);return[Zi(g,u,l,p,d,h,f,m,v)];case"Pack":return oe(function(){var T=w("axis",r,t,e),O=w("tensors",r,t,e),_=O[0].shape,W=O[0].squeeze().shape,L=O.map(function(P){var U=wt.arraysEqual(P.shape,_);if(!U&&!wt.arraysEqual(P.squeeze().shape,W))throw new Error("the input tensors shape does not match");return U?P:P.reshape(_)});return[yt(L,T)]});case"Unpack":return oe(function(){var T=w("axis",r,t,e),O=w("tensor",r,t,e);return _n(O,T)});case"Tile":var x=w("reps",r,t,e);return[Vt(w("x",r,t,e),x)];case"Split":case"SplitV":a=w("axis",r,t,e);var b=w("numOrSizeSplits",r,t,e);return ar(w("x",r,t,e),b,a);case"ScatterNd":s=w("indices",r,t,e);var C=w("values",r,t,e),E=w("shape",r,t,e);return[ts(s,C,E)];case"GatherNd":var R=w("x",r,t,e);return s=w("indices",r,t,e),[ns(R,s)];case"SparseToDense":s=w("sparseIndices",r,t,e),E=w("outputShape",r,t,e);var I=w("sparseValues",r,t,e),k=w("defaultValue",r,t,e);return[Ea(s,I,E,I.dtype===k.dtype?k:k.asType(I.dtype))];default:throw TypeError("Node type "+r.op+" is not implemented")}},Tv=function(r,t,e){switch(r.op){case"FFT":return[pr(w("x",r,t,e))];case"IFFT":return[An(w("x",r,t,e))];case"RFFT":return[dr(w("x",r,t,e))];case"IRFFT":return[Na(w("x",r,t,e))];default:throw TypeError("Node type "+r.op+" is not implemented")}},Av=function(r,t,e){switch(r.op){case"Cast":return[_o(w("x",r,t,e),w("dtype",r,t,e))];case"ExpandDims":var n=w("axis",r,t,e);return[ht(w("x",r,t,e),n)];case"Squeeze":return n=w("axis",r,t,e),[Zr(w("x",r,t,e),n)];case"Reshape":return[tt(w("x",r,t,e),w("shape",r,t,e))];case"PadV2":case"Pad":return[Ot(w("x",r,t,e),ps(w("padding",r,t,e),2),w("constantValue",r,t,e))];case"SpaceToBatchND":var a=w("blockShape",r,t,e),o=ps(w("paddings",r,t,e),2);return[Jr(w("x",r,t,e),a,o)];case"BatchToSpaceND":a=w("blockShape",r,t,e);var i=ps(w("crops",r,t,e),2);return[Qr(w("x",r,t,e),a,i)];case"DepthToSpace":var s=w("blockSize",r,t,e),u=w("dataFormat",r,t,e).toUpperCase();return[Fo(w("x",r,t,e),s,u)];default:throw TypeError("Node type "+r.op+" is not implemented")}};function zl(r,t,e){var n=(function(a,o,i){switch(a.category){case"arithmetic":return oe(function(){return dv(a,o,i)});case"basic_math":return oe(function(){return hv(a,o,i)});case"control":return vv(a,o,i);case"convolution":return oe(function(){return gv(a,o,i)});case"creation":return oe(function(){return yv(a,o,i)});case"dynamic":return bv(a,o,i);case"evaluation":return oe(function(){return wv(a,o,i)});case"image":return oe(function(){return Nv(a,o,i)});case"graph":return oe(function(){return Cv(a,o,i)});case"logical":return oe(function(){return Ev(a,o,i)});case"matrices":return oe(function(){return Sv(a,o,i)});case"normalization":return oe(function(){return Iv(a,o,i)});case"reduction":return oe(function(){return kv(a,o,i)});case"slice_join":return oe(function(){return Rv(a,o,i)});case"spectral":return oe(function(){return Tv(a,o,i)});case"transformation":return oe(function(){return Av(a,o,i)});case"custom":var s=Hl(a.op);if(s&&s.customExecutor)return s.customExecutor(new pv(a,o,i));throw TypeError("Custom op "+a.op+" is not registered.");default:throw TypeError("Unknown op '"+a.op+"'. File an issue at https://github.com/tensorflow/tfjs/issues so we can add it, or register a custom execution with tf.registerOp()")}})(r,t,e);return n instanceof Promise?n.then(function(a){return[].concat(a)}):[].concat(n)}var Ul=(function(){function r(t,e){this.weightMap=t,this.tensorArrayMap=e,this.rootContext={id:0,frameName:"",iterationId:0},this.contexts=[this.rootContext],this.lastId=0,this.generateCurrentContextIds()}return r.prototype.newFrame=function(t,e){return{id:t,frameName:e,iterationId:0}},Object.defineProperty(r.prototype,"currentContext",{get:function(){return this.contexts},set:function(t){this.contexts!==t&&(this.contexts=t,this.generateCurrentContextIds())},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"currentContextId",{get:function(){return this._currentContextIds[0]},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"currentContextIds",{get:function(){return this._currentContextIds},enumerable:!0,configurable:!0}),r.prototype.generateCurrentContextIds=function(){for(var t=[],e=0;e<this.contexts.length-1;e++){var n=this.contexts.slice(0,this.contexts.length-e);t.push(this.contextIdforContexts(n))}t.push(""),this._currentContextIds=t},r.prototype.contextIdforContexts=function(t){return t?t.map(function(e){return e.id===0&&e.iterationId===0?"":e.frameName+"-"+e.iterationId}).join("/"):""},r.prototype.enterFrame=function(t){this.contexts&&(this.lastId++,this.contexts=this.contexts.slice(),this.contexts.push(this.newFrame(this.lastId,t)),this._currentContextIds.unshift(this.contextIdforContexts(this.contexts)))},r.prototype.exitFrame=function(){if(!(this.contexts&&this.contexts.length>1))throw new Error("Cannot exit frame, the context is empty");this.contexts=this.contexts.slice(),this.contexts.splice(-1),this.currentContextIds.shift()},r.prototype.nextIteration=function(){if(!(this.contexts&&this.contexts.length>0))throw new Error("Cannot increase frame iteration, the context is empty");this.contexts=this.contexts.slice(),this.lastId++;var t=Object.assign({},this.contexts[this.contexts.length-1]);t.iterationId+=1,t.id=this.lastId,this.contexts.splice(-1,1,t),this._currentContextIds.splice(0,1,this.contextIdforContexts(this.contexts))},r.prototype.getWeight=function(t){return this.weightMap[t]},r.prototype.addTensorArray=function(t){this.tensorArrayMap[t.id]=t},r.prototype.getTensorArray=function(t){return this.tensorArrayMap[t]},r})();function Gl(r,t,e){for(var n=new Set,a=[],o=null,i=null,s=new Set,u=Object.keys(r).map(function(p){return Je(p)[0]}),c=t.slice();c.length>0;){var l=c.pop();(Xl(l)||Fv(l))&&o==null&&(i=(o=l).children.map(function(p){return p.name}).filter(function(p){return n.has(p)})),n.add(l.name),e[l.name]==null&&u.indexOf(l.name)===-1&&(l.inputs.length!==0?l.inputs.forEach(function(p){s.has(p.name)||(s.add(p.name),c.push(p))}):a.push(l.name))}return{inputs:r,outputs:t,usedNodes:n,missingInputs:a,dynamicNode:o,syncInputs:i}}function Dv(r,t,e){var n=e.usedNodes,a=e.inputs,o=[];Object.keys(a).map(function(c){return Je(c)[0]}).map(function(c){return r.nodes[c]}).forEach(function(c){n.has(c.name)&&o.push(c)}),r.weights.forEach(function(c){n.has(c.name)&&o.push(c)});for(var i=new Set,s=[];o.length>0;){var u=o.pop();i.add(u.name),t[u.name]||s.push(u),u.children.forEach(function(c){!i.has(c.name)&&n.has(c.name)&&c.inputs.every(function(l){return i.has(l.name)})&&o.push(c)})}return s}var Ov=["Switch","Merge","Enter","Exit","NextIteration"],_v=["NonMaxSuppressionV2","NonMaxSuppressionV3","NonMaxSuppressionV5","Where"];function Xl(r){return Ov.indexOf(r.op)>=0}function Fv(r){return _v.indexOf(r.op)>=0}var Mv=(function(){function r(t){this.graph=t,this.compiledMap=new Map,this._weightMap={},this.SEPERATOR=",",this._outputs=t.outputs,this._inputs=t.inputs,this._signature=t.signature}return Object.defineProperty(r.prototype,"weightMap",{get:function(){return this._weightMap},set:function(t){var e=Object.keys(t).map(function(n){return t[n].map(function(a){return a.id})});this.weightIds=[].concat.apply([],e),this._weightMap=t},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"inputs",{get:function(){return this._inputs.map(function(t){return{name:t.name,shape:t.attrParams.shape?t.attrParams.shape.value:void 0,dtype:t.attrParams.dtype?t.attrParams.dtype.value:void 0}})},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"outputs",{get:function(){return this._outputs.map(function(t){return{name:t.name,shape:t.attrParams.shape?t.attrParams.shape.value:void 0,dtype:t.attrParams.dtype?t.attrParams.dtype.value:void 0}})},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"inputNodes",{get:function(){return this._inputs.map(function(t){return t.signatureKey||t.name})},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"outputNodes",{get:function(){return this._outputs.map(function(t){return t.signatureKey||t.name})},enumerable:!0,configurable:!0}),r.prototype.getCompilationKey=function(t,e){var n=t.map(function(o){return o.name}).sort(),a=e.map(function(o){return o.name}).sort();return n.join(this.SEPERATOR)+"--"+a.join(this.SEPERATOR)},r.prototype.compile=function(t,e){var n=Gl(t,e,this.weightMap),a=n.missingInputs,o=n.dynamicNode,i=n.syncInputs;if(o!=null)throw new Error("This execution contains the node '"+o.name+"', which has the dynamic op '"+o.op+"'. Please use model.executeAsync() instead. Alternatively, to avoid the dynamic ops, specify the inputs ["+i+"]");if(a.length>0){var s=e.map(function(c){return c.name}),u=Object.keys(t);throw new Error("Cannot compute the outputs ["+s+"] from the provided inputs ["+u+"]. Missing the following inputs: ["+a+"]")}return Dv(this.graph,this.weightMap,n)},r.prototype.execute=function(t,e){var n=this;t=this.mapInputs(t);var a=Object.keys(t).sort();this.checkInputs(t),this.checkInputShapeAndType(t),e=this.mapOutputs(e),this.checkOutputs(e);var o=a.map(function(l){return n.graph.nodes[Je(l)[0]]}),i=e.map(function(l){return n.graph.nodes[Je(l)[0]]}),s=this.getCompilationKey(o,i),u=this.compiledMap.get(s);u==null&&(u=this.compile(t,i),this.compiledMap.set(s,u));var c={};return oe(function(){var l=new Ul(n._weightMap,c),p=ds({},n.weightMap);Object.keys(t).forEach(function(g){var y=Je(g),x=y[0],b=[];b[y[1]]=t[g],p[x]=b});for(var d=n.getFrozenTensorIds(p),h={},f=0;f<u.length;f++){var m=u[f];if(!p[m.name]){var v=zl(m,p,l);if(v instanceof Promise)throw new Error("The execution of the op '"+m.op+"' returned a promise. Please use model.executeAsync() instead.");p[m.name]=v,n.checkTensorForDisposal(m.name,m,p,l,d,e,h)}}return e.map(function(g){return Ve(g,p,l)})})},r.prototype.getFrozenTensorIds=function(t){var e=[].concat.apply([],Object.keys(t).map(function(n){return t[n]}).map(function(n){return n.map(function(a){return a.id})}));return new Set(e)},r.prototype.checkTensorForDisposal=function(t,e,n,a,o,i,s){e.category!=="control"&&i.indexOf(t)===-1&&(n[t].forEach(function(u){u!=null&&(s[u.id]=(s[u.id]||0)+e.children.length)}),e.inputs.forEach(function(u){if(u.category!=="control"){var c=Am(u.name,n,a);c?.forEach(function(l){if(l&&!o.has(l.id)){var p=s[l.id];p===1?(l.dispose(),delete s[l.id]):p!=null&&s[l.id]--}})}}))},r.prototype.executeAsync=function(t,e){return jt(this,void 0,void 0,function(){var n,a,o,i,s,u,c=this;return Kt(this,function(l){switch(l.label){case 0:return t=this.mapInputs(t),this.checkInputs(t),this.checkInputShapeAndType(t),e=this.mapOutputs(e),this.checkOutputs(e),n={},a=new Ul(this._weightMap,n),[4,this.executeWithControlFlow(t,a,e)];case 1:return o=l.sent(),i=e.map(function(p){return Ve(p,o,a)}),s=new Set(i.map(function(p){return p.id})),u=new Set(Object.keys(t).map(function(p){return t[p].id})),Object.keys(o).forEach(function(p){o[p].forEach(function(d){!d||d.isDisposed||s.has(d.id)||u.has(d.id)||c.weightIds.indexOf(d.id)!==-1||d.dispose()})}),[2,i]}})})},r.prototype.executeWithControlFlow=function(t,e,n){return jt(this,void 0,void 0,function(){var a,o,i,s,u,c,l,p,d,h,f,m,v,g,y,x,b=this;return Kt(this,function(C){switch(C.label){case 0:a=Object.keys(t),o=a.map(function(E){return b.graph.nodes[Je(E)[0]]}),i=n.map(function(E){return b.graph.nodes[Je(E)[0]]}),s=Gl(t,i,this.weightMap),u=s.usedNodes,c=s.missingInputs,l=s.dynamicNode,p=s.syncInputs,d=o.concat(this.graph.weights).map(function(E){return{node:E,contexts:e.currentContext}}),h=ds({},this.weightMap),Object.keys(t).forEach(function(E){var R=Je(E),I=R[0],k=[];k[R[1]]=t[E],h[I]=k}),f={},m=this.getFrozenTensorIds(h),v={},C.label=1;case 1:return d.length>0?(g=this.processStack(o,d,e,h,v,m,n,f,u),[4,Promise.all(g)]):[3,3];case 2:return C.sent(),[3,1];case 3:if(l==null&&console.warn("This model execution did not contain any nodes with control flow or dynamic output shapes. You can use model.execute() instead."),(y=i.filter(function(E){return!Xl(E)&&!Ve(E.name,h,e)}).map(function(E){return E.name})).length>0)throw x="",l!=null&&(x="Alternatively, to avoid the dynamic ops, use model.execute() and specify the inputs ["+p+"]"),new Error("Cannot compute the outputs ["+y+"] from the provided inputs ["+a+"]. Consider providing the following inputs: ["+c+"]. "+x);return[2,h]}})})},r.prototype.processStack=function(t,e,n,a,o,i,s,u,c){for(var l=this,p=[],d=function(){var f=e.pop();n.currentContext=f.contexts;var m="";if(f.node.op==="Enter"&&w("isConstant",f.node,a,n)&&(m=Bn(f.node.name,n)[0]),t.indexOf(f.node)===-1){var v=zl(f.node,a,n);m||(m=Bn(f.node.name,n)[0]);var g=n.currentContext;v instanceof Promise?p.push(v.then(function(y){return a[m]=y,n.currentContext=g,l.checkTensorForDisposal(m,f.node,a,n,i,s,u),l.processChildNodes(f.node,e,n,a,o,c),y})):(a[m]=v,h.checkTensorForDisposal(m,f.node,a,n,i,s,u),h.processChildNodes(f.node,e,n,a,o,c))}else h.processChildNodes(f.node,e,n,a,o,c)},h=this;e.length>0;)d();return p},r.prototype.processChildNodes=function(t,e,n,a,o,i){t.children.forEach(function(s){var u=Bn(s.name,n)[0];!o[u]&&i.has(s.name)&&(s.op==="Merge"?s.inputNames.some(function(c){return!!Ve(c,a,n)})&&(o[u]=!0,e.push({contexts:n.currentContext,node:s})):s.inputNames.every(function(c){return!!Ve(c,a,n)})&&(o[u]=!0,e.push({contexts:n.currentContext,node:s})))})},r.prototype.dispose=function(){var t=this;Object.keys(this.weightMap).forEach(function(e){return t.weightMap[e].forEach(function(n){return n.dispose()})})},r.prototype.checkInputShapeAndType=function(t){var e=this;Object.keys(t).forEach(function(n){var a=t[n],o=Je(n)[0],i=e.graph.nodes[o];if(i.attrParams.shape&&i.attrParams.shape.value){var s=i.attrParams.shape.value,u=s.length===a.shape.length&&a.shape.every(function(c,l){return s[l]===-1||s[l]===c});wt.assert(u,function(){return"The shape of dict['"+i.name+"'] provided in model.execute(dict) must be ["+s+"], but was ["+a.shape+"]"})}i.attrParams.dtype&&i.attrParams.dtype.value&&wt.assert(a.dtype===i.attrParams.dtype.value,function(){return"The dtype of dict['"+i.name+"'] provided in model.execute(dict) must be "+i.attrParams.dtype.value+", but was "+a.dtype})})},r.prototype.mapInputs=function(t){var e={};for(var n in t)this._signature!=null&&this._signature.inputs!=null&&this._signature.inputs[n]!=null?e[this._signature.inputs[n].name]=t[n]:e[n]=t[n];return e},r.prototype.checkInputs=function(t){var e=this,n=Object.keys(t).filter(function(a){var o=Je(a)[0];return e.graph.nodes[o]==null});if(n.length>0)throw new Error("The dict provided in model.execute(dict) has keys: ["+n+"] that are not part of graph")},r.prototype.mapOutputs=function(t){var e=this;return t.map(function(n){return e._signature!=null&&e._signature.outputs!=null&&e._signature.outputs[n]!=null?e._signature.outputs[n].name:n},{})},r.prototype.checkOutputs=function(t){var e=this;t.forEach(function(n){var a=Je(n)[0];if(!e.graph.nodes[a])throw new Error("The output '"+n+"' is not found in the graph")})},r})(),Bv="?tfjs-format=file",Pv="model.json",Lv=(function(){function r(t,e){e===void 0&&(e={}),this.modelUrl=t,this.loadOptions=e,this.version="n/a",e==null&&(this.loadOptions={})}return Object.defineProperty(r.prototype,"modelVersion",{get:function(){return this.version},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"inputNodes",{get:function(){return this.executor.inputNodes},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"outputNodes",{get:function(){return this.executor.outputNodes},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"inputs",{get:function(){return this.executor.inputs},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"outputs",{get:function(){return this.executor.outputs},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"weights",{get:function(){return this.executor.weightMap},enumerable:!0,configurable:!0}),r.prototype.findIOHandler=function(){var t=this.modelUrl;if(t.load!=null)this.handler=t;else if(this.loadOptions.requestInit!=null)this.handler=Mn.browserHTTPRequest(t,this.loadOptions);else{var e=Mn.getLoadHandlers(t,this.loadOptions.onProgress);if(e.length===0)e.push(Mn.browserHTTPRequest(t,this.loadOptions));else if(e.length>1)throw new Error("Found more than one ("+e.length+") load handlers for URL '"+[t]+"'");this.handler=e[0]}},r.prototype.load=function(){return jt(this,void 0,void 0,function(){var t,e,n,a;return Kt(this,function(o){switch(o.label){case 0:if(this.findIOHandler(),this.handler.load==null)throw new Error("Cannot proceed with model loading because the IOHandler provided does not have the `load` method implemented.");return t=this,[4,this.handler.load()];case 1:return t.artifacts=o.sent(),e=this.artifacts.modelTopology,n={},this.artifacts.userDefinedMetadata!=null&&(n=this.artifacts.userDefinedMetadata.signature),this.version=e.versions.producer+"."+e.versions.minConsumer,a=Mn.decodeWeights(this.artifacts.weightData,this.artifacts.weightSpecs),this.executor=new Mv(cv.Instance.transformGraph(e,n)),this.executor.weightMap=this.convertTensorMapToTensorsMap(a),[2,!0]}})})},r.prototype.save=function(t,e){return jt(this,void 0,void 0,function(){var n;return Kt(this,function(a){if(typeof t=="string"){if((n=Mn.getSaveHandlers(t)).length===0)throw new Error("Cannot find any save handlers for URL '"+t+"'");if(n.length>1)throw new Error("Found more than one ("+n.length+") save handlers for URL '"+t+"'");t=n[0]}if(t.save==null)throw new Error("GraphModel.save() cannot proceed because the IOHandler provided does not have the `save` attribute defined.");return[2,t.save(this.artifacts)]})})},r.prototype.predict=function(t,e){return this.execute(t,this.outputNodes)},r.prototype.normalizeInputs=function(t){if(!(t instanceof ge||Array.isArray(t)))return t;if((t=Array.isArray(t)?t:[t]).length!==this.inputNodes.length)throw new Error("Input tensor count mismatch,the graph model has "+this.inputNodes.length+" placeholders, while there are "+t.length+" input tensors.");return this.inputNodes.reduce(function(e,n,a){return e[n]=t[a],e},{})},r.prototype.normalizeOutputs=function(t){return t=t||this.outputNodes,Array.isArray(t)?t:[t]},r.prototype.execute=function(t,e){t=this.normalizeInputs(t),e=this.normalizeOutputs(e);var n=this.executor.execute(t,e);return n.length>1?n:n[0]},r.prototype.executeAsync=function(t,e){return jt(this,void 0,void 0,function(){var n;return Kt(this,function(a){switch(a.label){case 0:return t=this.normalizeInputs(t),e=this.normalizeOutputs(e),[4,this.executor.executeAsync(t,e)];case 1:return[2,(n=a.sent()).length>1?n:n[0]]}})})},r.prototype.convertTensorMapToTensorsMap=function(t){return Object.keys(t).reduce(function(e,n){return e[n]=[t[n]],e},{})},r.prototype.dispose=function(){this.executor.dispose()},r})();function $l(r,t){return t===void 0&&(t={}),jt(this,void 0,void 0,function(){var e;return Kt(this,function(n){switch(n.label){case 0:if(r==null)throw new Error("modelUrl in loadGraphModel() cannot be null. Please provide a url or an IOHandler that loads the model");return t==null&&(t={}),t.fromTFHub&&r.load==null&&(r.endsWith("/")||(r+="/"),r=""+r+Pv+Bv),[4,(e=new Lv(r,t)).load()];case 1:return n.sent(),[2,e]}})})}function mr(r,t,e,n){return new(e||(e=Promise))(function(a,o){function i(c){try{u(n.next(c))}catch(l){o(l)}}function s(c){try{u(n.throw(c))}catch(l){o(l)}}function u(c){c.done?a(c.value):new e(function(l){l(c.value)}).then(i,s)}u((n=n.apply(r,t||[])).next())})}function vr(r,t){var e,n,a,o,i={label:0,sent:function(){if(1&a[0])throw a[1];return a[1]},trys:[],ops:[]};return o={next:s(0),throw:s(1),return:s(2)},typeof Symbol=="function"&&(o[Symbol.iterator]=function(){return this}),o;function s(u){return function(c){return(function(l){if(e)throw new TypeError("Generator is already executing.");for(;i;)try{if(e=1,n&&(a=2&l[0]?n.return:l[0]?n.throw||((a=n.return)&&a.call(n),0):n.next)&&!(a=a.call(n,l[1])).done)return a;switch(n=0,a&&(l=[2&l[0],a.value]),l[0]){case 0:case 1:a=l;break;case 4:return i.label++,{value:l[1],done:!1};case 5:i.label++,n=l[1],l=[0];continue;case 7:l=i.ops.pop(),i.trys.pop();continue;default:if(!(a=(a=i.trys).length>0&&a[a.length-1])&&(l[0]===6||l[0]===2)){i=0;continue}if(l[0]===3&&(!a||l[1]>a[0]&&l[1]<a[3])){i.label=l[1];break}if(l[0]===6&&i.label<a[1]){i.label=a[1],a=l;break}if(a&&i.label<a[2]){i.label=a[2],i.ops.push(l);break}a[2]&&i.ops.pop(),i.trys.pop();continue}l=t.call(r,i)}catch(p){l=[6,p],n=0}finally{e=a=0}if(5&l[0])throw l[1];return{value:l[0]?l[1]:void 0,done:!0}})([u,c])}}}function Jl(r,t,e,n){return new(e||(e=Promise))(function(a,o){function i(c){try{u(n.next(c))}catch(l){o(l)}}function s(c){try{u(n.throw(c))}catch(l){o(l)}}function u(c){c.done?a(c.value):new e(function(l){l(c.value)}).then(i,s)}u((n=n.apply(r,t||[])).next())})}function Zl(r,t){var e,n,a,o,i={label:0,sent:function(){if(1&a[0])throw a[1];return a[1]},trys:[],ops:[]};return o={next:s(0),throw:s(1),return:s(2)},typeof Symbol=="function"&&(o[Symbol.iterator]=function(){return this}),o;function s(u){return function(c){return(function(l){if(e)throw new TypeError("Generator is already executing.");for(;i;)try{if(e=1,n&&(a=2&l[0]?n.return:l[0]?n.throw||((a=n.return)&&a.call(n),0):n.next)&&!(a=a.call(n,l[1])).done)return a;switch(n=0,a&&(l=[2&l[0],a.value]),l[0]){case 0:case 1:a=l;break;case 4:return i.label++,{value:l[1],done:!1};case 5:i.label++,n=l[1],l=[0];continue;case 7:l=i.ops.pop(),i.trys.pop();continue;default:if(!(a=(a=i.trys).length>0&&a[a.length-1])&&(l[0]===6||l[0]===2)){i=0;continue}if(l[0]===3&&(!a||l[1]>a[0]&&l[1]<a[3])){i.label=l[1];break}if(l[0]===6&&i.label<a[1]){i.label=a[1],a=l;break}if(a&&i.label<a[2]){i.label=a[2],i.ops.push(l);break}a[2]&&i.ops.pop(),i.trys.pop();continue}l=t.call(r,i)}catch(p){l=[6,p],n=0}finally{e=a=0}if(5&l[0])throw l[1];return{value:l[0]?l[1]:void 0,done:!0}})([u,c])}}}var ep=function(r){for(var t=[],e=0,n=r;e<n.length;e++){var a=n[e];t.push(a)}return t},Yl=function(){this.parent=null,this.children={},this.end=!1,this.word=[[],0,0]},Vv=(function(){function r(){this.root=new Yl}return r.prototype.insert=function(t,e,n){for(var a=this.root,o=ep(t),i=0;i<o.length;i++)a.children[o[i]]||(a.children[o[i]]=new Yl,a.children[o[i]].parent=a,a.children[o[i]].word[0]=a.word[0].concat(o[i])),a=a.children[o[i]],i===o.length-1&&(a.end=!0,a.word[1]=e,a.word[2]=n)},r.prototype.commonPrefixSearch=function(t){for(var e=[],n=this.root.children[t[0]],a=0;a<t.length&&n;a++)n.end&&e.push(n.word),n=n.children[t[a+1]];return e.length||e.push([[t[0]],0,0]),e},r})(),Ql="\u2581";function Wv(r){var t=r.normalize("NFKC");return Ql+t.replace(/ /g,Ql)}var zv=6,Uv=(function(){function r(t){this.vocabulary=t,this.trie=new Vv;for(var e=zv;e<this.vocabulary.length;e++)this.trie.insert(this.vocabulary[e][0],this.vocabulary[e][1],e)}return r.prototype.encode=function(t){var e=[],n=[],a=[];t=Wv(t);for(var o=ep(t),i=0;i<=o.length;i++)e.push({}),n.push(0),a.push(0);for(i=0;i<o.length;i++)for(var s=this.trie.commonPrefixSearch(o.slice(i)),u=0;u<s.length;u++){var c=s[u],l={key:c[0],score:c[1],index:c[2]};e[i+(p=c[0].length)][i]==null&&(e[i+p][i]=[]),e[i+p][i].push(l)}for(var p=0;p<=o.length;p++)for(var d in e[p]){var h=e[p][d];for(u=0;u<h.length;u++){var f=h[u],m=f.score+a[p-f.key.length];(a[p]===0||m>=a[p])&&(a[p]=m,n[p]=h[u].index)}}for(var v=[],g=n.length-1;g>0;)v.push(n[g]),g-=this.vocabulary[n[g]][0].length;var y=[],x=!1;for(i=0;i<v.length;i++){var b=v[i];x&&b===0||y.push(b),x=b===0}return y.reverse()},r})(),Gv="https://storage.googleapis.com/tfjs-models/savedmodel/universal_sentence_encoder/";function Hv(r){return Jl(this,void 0,void 0,function(){var t;return Zl(this,function(e){switch(e.label){case 0:return[4,qv(r)];case 1:return t=e.sent(),[2,new Uv(t)]}})})}function qv(r){return r===void 0&&(r=Gv+"vocab.json"),Jl(this,void 0,void 0,function(){return Zl(this,function(t){switch(t.label){case 0:return[4,wt.fetch(r)];case 1:return[2,t.sent().json()]}})})}function tp(r,t){return mr(this,void 0,void 0,function(){var e;return vr(this,function(n){switch(n.label){case 0:return[4,(e=new jv(r,t)).load()];case 1:return n.sent(),[2,e]}})})}var jv=(function(){function r(t,e){t===void 0&&(t=.85),e===void 0&&(e=[]),this.threshold=t,this.toxicityLabels=e}return r.prototype.loadModel=function(){return mr(this,void 0,void 0,function(){return vr(this,function(t){return[2,$l("https://tfhub.dev/tensorflow/tfjs-model/toxicity/1/default/1",{fromTFHub:!0})]})})},r.prototype.loadTokenizer=function(){return mr(this,void 0,void 0,function(){return vr(this,function(t){return[2,Hv()]})})},r.prototype.load=function(){return mr(this,void 0,void 0,function(){var t,e,n,a=this;return vr(this,function(o){switch(o.label){case 0:return[4,Promise.all([this.loadModel(),this.loadTokenizer()])];case 1:return t=o.sent(),e=t[0],n=t[1],this.model=e,this.tokenizer=n,this.labels=e.outputs.map(function(i){return i.name.split("/")[0]}),this.toxicityLabels.length===0?this.toxicityLabels=this.labels:wt.assert(this.toxicityLabels.every(function(i){return a.labels.indexOf(i)>-1}),function(){return"toxicityLabels argument must contain only items from the model heads "+a.labels.join(", ")+", got "+a.toxicityLabels.join(", ")}),[2]}})})},r.prototype.classify=function(t){return mr(this,void 0,void 0,function(){var e,n,a,o,i,s,u,c=this;return vr(this,function(l){switch(l.label){case 0:for(typeof t=="string"&&(t=[t]),e=t.map(function(p){return c.tokenizer.encode(p)}),n=e.map(function(p,d){return p.map(function(h,f){return[d,f]})}),a=[],o=0;o<n.length;o++)a=a.concat(n[o]);return i=Lt(a,[a.length,2],"int32"),s=nt(wt.flatten(e),"int32"),[4,this.model.executeAsync({Placeholder_1:i,Placeholder:s})];case 1:return u=l.sent(),i.dispose(),s.dispose(),[2,u.map(function(p,d){return{data:p,headIndex:d}}).filter(function(p){return c.toxicityLabels.indexOf(c.labels[p.headIndex])>-1}).map(function(p){for(var d=p.data.dataSync(),h=[],f=0;f<t.length;f++){var m=d.slice(2*f,2*f+2),v=null;Math.max(m[0],m[1])>c.threshold&&(v=m[0]<m[1]),h.push({probabilities:m,match:v})}return{label:c.labels[p.headIndex],results:h}})]}})})},r})();var Ta=self.__sieveToxicModel=self.__sieveToxicModel||{},Ns="https://storage.googleapis.com/tfjs-models/savedmodel/",Ra=null,ka=null,np=!1;function Xv(r){let t=String(r).split("?")[0],e=t.match(/toxicity\/1\/default\/1\/(.+)$/);return e?Ns+"toxicity/"+e[1]:/toxicity\/1\/default\/1$/.test(t)?Ns+"toxicity/model.json":(e=t.match(/\/savedmodel\/(.+)$/),e?Ns+e[1]:null)}function $v(){if(np)return;np=!0;let r=self.fetch.bind(self);self.fetch=async(t,e)=>{let n=typeof t=="string"?t:t&&t.url||"",a=Xv(n);if(a){let o=self.SieveModelCache&&await self.SieveModelCache.getResponse(a);return o?o.clone():new Response(null,{status:504,statusText:"Sieve: model file not cached"})}return r(t,e)}}Ta.load=function(){return Ra?Promise.resolve():ka||(ka=(async()=>{$v(),await nc(),Ra=await tp(.5)})(),ka)};async function Yv(r){if(!r||r.length===0)return[];await Ta.load();let t=await Ra.classify(r),e=r.map(()=>({prob:0,label:null}));for(let n of t){let a=n.results||[];for(let o=0;o<a.length;o++){let i=a[o].probabilities,s=i&&i.length>1?i[1]:0;s>e[o].prob&&(e[o]={prob:s,label:n.label})}}return e}var rp=Promise.resolve();Ta.classify=function(t){let e=rp.then(()=>Yv(t));return rp=e.catch(()=>{}),e};Object.defineProperty(Ta,"isLoaded",{get:()=>!!Ra});console.log("[Sieve] Layer-2 model bundle ready.");})();
