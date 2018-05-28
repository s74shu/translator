/*
 * (C) Copyright 2014-2015 Kurento (http://kurento.org/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

var ws = new WebSocket('wss://' + location.host + '/magicmirror');
var videoInput;
var videoOutput;
var webRtcPeer;
var state = null;
var ipFromHtml = "127.0.0.1";

const I_CAN_START = 0;
const I_CAN_STOP = 1;
const I_AM_STARTING = 2;

window.onload = function () {
	console = new Console();
	console.log('Page loaded ...');
	videoInput = document.getElementById('videoInput');
	videoOutput = document.getElementById('videoOutput');
	setState(I_CAN_START);
}

window.onbeforeunload = function () {
	ws.close();
}

ws.onmessage = function (message) {
	var parsedMessage = JSON.parse(message.data);
	//console.info('Received message: ' + message.data);

	switch (parsedMessage.id) {
		case 'startResponse':
			startResponse(parsedMessage);
			break;
		case 'error':
			if (state == I_AM_STARTING) {
				setState(I_CAN_START);
			}
			onError('Error message from server: ' + parsedMessage.message);
			break;
		case 'iceCandidate':
			webRtcPeer.addIceCandidate(parsedMessage.candidate)
			break;
		case 'ffmpeg':
			console.log('From ffmpeg:', parsedMessage.message);
			break;
		case "rtmp":
			console.log('Recv rtmp request:', parsedMessage.message);
			playrtmp('rtmp://' + location.hostname + parsedMessage.message);
			break;
		default:
			if (state == I_AM_STARTING) {
				setState(I_CAN_START);
			}
			onError('Unrecognized message', parsedMessage);
	}
}

function start() {
	console.log('Starting video call ...')

	// Disable start button
	setState(I_AM_STARTING);
	//showSpinner(videoInput, videoOutput);

	console.log('Creating WebRtcPeer and generating local sdp offer ...');

	var options = {
		localVideo: videoInput,
		remoteVideo: videoOutput,
		onicecandidate: onIceCandidate,
		mediaConstraints: {
      audio: true,
      video: {
        width: 620,
        framerate: 15
      }
    }
	}

	webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function (error) {
		if (error) return onError(error);
		this.generateOffer(onOffer);
	});
}
function playrtmp(rtmpaddress) {
	var parameters = {
		src: rtmpaddress,
		autoPlay: "true",
		controlBarAutoHide: "true",
		poster: "img/adobe.jpg",
		javascriptCallbackFunction: "jsbridge"
	};
	console.log(parameters);
	// Embed the player SWF:
	swfobject.embedSWF(
		"GrindPlayer.swf"
		, "VideoElement"
		, 480
		, 360
		, "10.2"
		, "expressInstall.swf"
		, parameters
		,
		{
			allowFullScreen: "true",
			wmode: "transparent"
		}
		, {
			name: "GrindPlayer"
		}
	);
}

function hlsplayer() {
    var inVideo = document.getElementById('inVideo');
    if(Hls.isSupported()) {
        var hls = new Hls();
        hls.loadSource('https://video-dev.github.io/streams/x36xhzz/x36xhzz.m3u8');
        hls.attachMedia(inVideo);
        videoInput = inVideo;
        hls.on(Hls.Events.MANIFEST_PARSED,function() {
               inVideo.play();
             });
     }
 // hls.js is not supported on platforms that do not have Media Source Extensions (MSE) enabled.
 // When the browser has built-in HLS support (check using `canPlayType`), we can provide an HLS manifest (i.e. .m3u8 URL) directly to the video element throught the `src` property.
 // This is using the built-in support of the plain video element, without using hls.js.
 // Note: it would be more normal to wait on the 'canplay' event below however on Safari (where you are most likely to find built-in HLS support) the video.src URL must be on the user-driven
 // white-list before a 'canplay' event will be emitted; the last video event that can be reliably listened-for when the URL is not on the white-list is 'loadedmetadata'.
    else if (inVideo.canPlayType('application/vnd.apple.mpegurl')) {
        inVideo.src = 'https://video-dev.github.io/streams/x36xhzz/x36xhzz.m3u8';
        inVideo.addEventListener('loadedmetadata',function() {
                                                 inVideo.play();
                                                           });
    }
}

function captureLclMedia() {
    var btn = document.querySelector("button");
    var txtFld = document.querySelector("input");
    defBtnColor = btn.style.backgroundColor;
    curBtnColor = defBtnColor; 
    ipFromHtml = txtFld.value;
    var clicked = false;
/*    navigator.getUserMedia = navigator.getUserMedia || 
                             navigator.webkitGetUserMedia || 
                             navigator.mozGetUserMedia || 
                             navigator.msGetUserMedia;    
*/
    var onFailSoHard = function(e) {
                             console.log('Reject', e);
                                   };                            
/*    navigator.getUserMedia({video:true,audio:true},  
                           function( localMediaStream) { //function
                             //var video = document.querySelector('video');        
                             var audio = document.querySelector('audio');
                             audioRecorder = new MediaRecorder(localMediaStream);
                             audioRecorder.ondataavailable = function(sample) {
                                                              chunks.push(sample.data);
                                                             }*/
                             btn.addEventListener("click", 
                                                  function(e) {
                                    if (!clicked) {
//                                     audioRecorder.start();
                                       clicked = true;
                                       btn.style.backgroundColor="#FF0000";
                                       btn.innerHTML = "ON AIR";
                                       console.log("Capture started");
                                       start();
                                    } else {
                                       btn.style.backgroundColor=defBtnColor;
                                       btn.innerHTML = " AIR ";
                                       clicked = false;
                                       stop();
                                    }  
                                  }); 
                          /* }, // end function
                           onFailSoHard );*/
}

function onIceCandidate(candidate) {
	console.log('Local candidate' + JSON.stringify(candidate));

	var message = {
		id: 'onIceCandidate',
		candidate: candidate
	};
	sendMessage(message);
}

function onOffer(error, offerSdp) {
	if (error) return onError(error);

	console.info('Invoking SDP offer callback function ' + location.host);
	var message = {
		id: 'start',
		sdpOffer: offerSdp
	}
	sendMessage(message);
}

function onError(error) {
	console.error(error);
}

function startResponse(message) {
	setState(I_CAN_STOP);
	console.log('SDP answer received from server. Processing ...');
	webRtcPeer.processAnswer(message.sdpAnswer);
}

function stop() {
	console.log('Stopping video call ...');
	setState(I_CAN_START);
	if (webRtcPeer) {
		webRtcPeer.dispose();
		webRtcPeer = null;

		var message = {
			id: 'stop'
		}
		sendMessage(message);
	}
	hideSpinner(videoInput, videoOutput);
}

function setState(nextState) {
	switch (nextState) {
		case I_CAN_START:
			$('#start').attr('disabled', false);
			$('#start').attr('onclick', 'start()');
			$('#stop').attr('disabled', true);
			$('#stop').removeAttr('onclick');
			break;

		case I_CAN_STOP:
			$('#start').attr('disabled', true);
			$('#stop').attr('disabled', false);
			$('#stop').attr('onclick', 'stop()');
			break;

		case I_AM_STARTING:
			$('#start').attr('disabled', true);
			$('#start').removeAttr('onclick');
			$('#stop').attr('disabled', true);
			$('#stop').removeAttr('onclick');
			break;

		default:
			onError('Unknown state ' + nextState);
			return;
	}
	state = nextState;
}

function sendMessage(message) {
	var jsonMessage = JSON.stringify(message);
	console.log('Senging message: ' + jsonMessage);
	ws.send(jsonMessage);
}

function showSpinner() {
	for (var i = 0; i < arguments.length - 1; i++) {
		arguments[i].poster = './img/transparent-1px.png';
		arguments[i].style.background = 'center transparent url("./img/spinner.gif") no-repeat';
	}
}

function hideSpinner() {
	for (var i = 0; i < arguments.length - 1; i++) {
		arguments[i].src = '';
		arguments[i].poster = './img/webrtc.png';
		arguments[i].style.background = '';
	}
}

/**
 * Lightbox utility (to display media pipeline image in a modal dialog)
 */
$(document).delegate('*[data-toggle="lightbox"]', 'click', function (event) {
	event.preventDefault();
	$(this).ekkoLightbox();
});


