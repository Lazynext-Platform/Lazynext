/**
 * Amplitude provider — growth analytics, user journeys, A/B testing.
 * Free tier: 50K MTUs/month, unlimited events.
 *
 * @module components/providers/amplitude-provider
 */

"use client";

import Script from "next/script";

/** React component rendering AmplitudeProvider. */
export function AmplitudeProvider() {
	const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
	if (!apiKey) return null;

	return (
		<Script
			id="amplitude-init"
			strategy="afterInteractive"
			dangerouslySetInnerHTML={{
				__html: `!function(){var e=window.amplitude||{_q:[],_iq:{}};if(e.invoked)window.console&&console.error&&console.error("Amplitude snippet already loaded.");else{e.invoked=!0;var t=document.createElement("script");t.type="text/javascript";t.integrity="sha384-ZtEijHHLBUu5iJTEhuXLKMc1MOpuR3zSULYOKxhMwbZpXBNLxu7ZvBSpn0RkhfFq";t.crossOrigin="anonymous";t.async=!0;t.src="https://cdn.amplitude.com/libs/analytics-browser-2.11.7-min.js.gz";t.onload=function(){window.amplitude.runQueuedFunctions||console.log("[Amplitude] Script loaded")};var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s);var n=function(e,t){e.prototype[t]=function(){this._q.push([t].concat(Array.prototype.slice.call(arguments,0)));return this}};var a=function(){this._q=[];return this};var r=["add","append","clearAll","prepend","set","setOnce","unset","preInsert","postInsert","remove"];for(var o=0;o<r.length;o++)n(a,r[o]);e.Identify=a;var i=function(){this._q=[];return this;};var c=["setProductId","setQuantity","setPrice","setRevenueType","setEventProperties"];for(var u=0;u<c.length;u++)n(i,c[u]);e.Revenue=i;var l=["init","logEvent","logRevenue","setUserId","setUserProperties","setOptOut","setVersionName","setDomain","setDeviceId","enableTracking","setGlobalUserProperties","identify","clearUserProperties","setGroup","logRevenueV2","regenerateDeviceId","groupIdentify","onInit","onLogEvent","onIdentify","onSessionStart","onSessionEnd"];function p(e){function t(t){e[t]=function(){e._q.push([t].concat(Array.prototype.slice.call(arguments,0)))}}for(var n=0;n<l.length;n++)t(l[n])}p(e);e.getInstance=function(e){e=(!e||e.length===0?"$default_instance":e).toLowerCase();if(!Object.prototype.hasOwnProperty.call(e._iq,e)){e._iq[e]={_q:[]};p(e._iq[e])}return e._iq[e]};e.runQueuedFunctions=function(){for(var e=0;e<this._q.length;e++){var t=this._q[e][0],n=this._q[e].slice(1);this[t].apply(this,n)}this._q=[]}}window.amplitude=e}();amplitude.init("${apiKey}",{defaultTracking:{sessions:true,pageViews:true,formInteractions:true,fileDownloads:true}});`,
			}}
		/>
	);
}
