/*
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



var ws = new WebSocket('wss://' + window.location.host + '/mbs');
var msclient = new WebSocket('wss://' + window.location.host + '/mbsmedia');
msclient.binaryType = 'arraybuffer';

var state = null;
var ipFromHtml = "127.0.0.1";
var btn;
var consol;

const I_CAN_START = 0;
const I_CAN_STOP = 1;
const I_AM_STARTING = 2;

//ws.binaryType = 'arraybuffer';

window.onload = function () {
	consol = new Console();
	consol.log('Page loaded ...');
	//setState(I_CAN_START);
}

window.onbeforeunload = function () {
	ws.close();
        msclient.close(); 
}

ws.onmessage = function (message) {
	var parsedMessage = JSON.parse(message.data);
	console.info('client Received message: ' + message.data);
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
		case 'ffprobe_result':
                        jarray = JSON.parse(parsedMessage.message);
                        var div = document.getElementById('streams');
                        for( i = 0; i < jarray.streams.length; i++) {
                            var p = document.createElement('p');
                            var inp = document.createElement('input');
                            inp.type = 'checkbox';
                            label = jarray.streams[i].codec_type;
                            if(label == 'video')
                                label = label+" "+jarray.streams[i].width+'x'+jarray.streams[i].height;
                            if(label == 'audio')
                                label = label+' '+jarray.streams[i].sample_rate;
                            inp.id = 'stream'+i;
                            
                            p.appendChild(inp);
                            p.insertAdjacentHTML('beforeend', '<label for="stream'+i+'">  '+label+'</label>');
                            div.appendChild(p);    
                        }
			break;
                case 'ffprobe_error':
                        consol.log(parsedMessage.message);
                        break;
		case 'ffmpeg':
			console.log('From ffmpeg:', parsedMessage.message);
			break;
		default:
			if (state == I_AM_STARTING) {
				setState(I_CAN_START);
			}
			onError('Unrecognized message', parsedMessage);
	}
}

//ws_media.onmessage = function (message) {
//        console.info('client media Received message: ' + message.data);
//}

msclient.addEventListener('open', function (event) {
      //consol.log('msclient open');
      function convertFloat32ToInt16(buffer) {
        l = buffer.length;
        buf = new Int16Array(l);
        while (l--) {
           buf[l] = Math.min(1, buffer[l])*0x7FFF;
        }
        return buf.buffer;
      }   
      navigator.getUserMedia = navigator.getUserMedia || 
                             navigator.webkitGetUserMedia || 
                             navigator.mozGetUserMedia || 
                             navigator.msGetUserMedia;
      navigator.mediaDevices.getUserMedia( {"audio":true} )
            .then( function(stream) {
                       var lclAContext = window.AudioContext;
                       var acontext = new lclAContext();
                       var audioInput = acontext.createMediaStreamSource(stream);
                       var bufferSize = 2048;       
                       var recorder = acontext.createScriptProcessor(bufferSize, 1, 1);
                       recorder.onaudioprocess = recorderProcess;
                       audioInput.connect(recorder);
                       recorder.connect(acontext.destination);
                       function recorderProcess(ev) {
                           var left = ev.inputBuffer.getChannelData(0);
                           //var data = convertFloat32ToInt16(left);
                           //consol.log(left[0],left[1]);
                           
                           //if ( left[0] >= 0){
                           //consol.log(left.length);
                           //}else{
                           // consol.log((~left[0]).toString(16));
                           //}
                           //if ( left[1] >= 0){
                           // consol.log(left[1].toString(16));
                           //}else{
                           // consol.log((~left[1]).toString(16));
                          // }
                           
                           msclient.send(left);
                           
                       } 
      }) 
           .catch( function (err){
           window.console.log('failed '+ err.message);
      }); // navigator.
        
});


function hlsplayer() {
    var inVideo = document.getElementById('inVideo');
    if(Hls.isSupported()) {
        var hls = new Hls();
        hls.loadSource('https://video-dev.github.io/streams/x36xhzz/x36xhzz.m3u8');
        //inVideo.src = 'http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8';
        hls.attachMedia(inVideo);
        videoInput = inVideo;
        hls.on(Hls.Events.MANIFEST_PARSED,function() {
             });
    }
    else if (inVideo.canPlayType('application/vnd.apple.mpegurl')) {
        inVideo.src = 'https://video-dev.github.io/streams/x36xhzz/x36xhzz.m3u8';
        //inVideo.src = 'http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8';
        inVideo.addEventListener('loadedmetadata',function() {
//                                                 inVideo.play();
                                                           });
    }
}

function captureLclMedia() {
    btn = document.getElementById("btnAir");
    var urlBtn = document.getElementById("btnUrl");
    var streamUrlFld = document.getElementById("strUrl");
    var defBtnColor = btn.bgcolor;
    defBtnColor = btn.style.backgroundColor;
    var curBtnColor = defBtnColor; 
    //ipFromHtml = txtFld.value;
    var clicked = false;
    


    //var signalingChannel = createSignalingChannel();
//    srv = new RTCPeerConnection();
//    srv.onaddstream = function (evt) {
//        remoteView.srcObject = evt.stream;
//    };
//    srv.ontrack = function() {
//        consol.log('ontrack');
//    }


  
/* var streamFunc = function(localMediaStream) {
             var options = {
                  audioBitsPerSecond : 128000,
                  videoBitsPerSecond : 2500000,
                  mimeType : 'video/mp4'
             }             
             mediaRecorder = new MediaRecorder(localMediaStream );
             mediaRecorder.start(5000);
   
             mediaRecorder.ondataavailable = function(sample) {
               var fr = new FileReader();
               //var chunks = [];
               fr.readAsArrayBuffer(sample.data, function(e) {
                 console.log(e);
               });
               var chunks = fr.result;  
                                                   //chunks.push(sample.data);
                                                   console.log(mediaRecorder.mimeType);
                                                   sample.data.type = mediaRecorder.mimeType;
                                                   console.log('blob size '+sample.data.size);
                                                   //console.log('chunks size '+chunks.lenght);
                                                   //var bytes = new Uint8Array(chunks,'binary');
                                                   //console.log('u8a len '+bytes.byteLength);
                                                   //ws_media.send(bytes);
               
                                                   //var data = new Uint8Array(sample.data, 'binary');
                                                   ws_media.send(sample.data);
                                                   
                                                    
                                                   //ws.send(JSON.stringify(message));  
             }//onDataavail
   };//streamFunc
*/    
   var onFailSoHard = function(e) {
                             consol.log('Reject', e);
   };//onFailSoHard                            
   //navigator.getUserMedia({video:true,audio:true}, streamFunc, onFailSoHard ); 

   urlBtn.addEventListener("click", function(e) {
           var div = document.getElementById('streams');
           div.innerHTML = '';
           var message = {
               id: 'streamurl',
               streamurl: streamUrlFld.value
           };
       sendMessage(message); 
   });

   btn.addEventListener("click", function(e) {
                                      if (!clicked) {
                                          clicked = true;
                                          btn.style.backgroundColor="#FF0000";
                                          btn.innerHTML = "ON AIR";
                                          consol.log("Capture started");
                                          //mediaRecorder.start(5000);

                                      } else {
                                          btn.style.backgroundColor=defBtnColor;
                                          btn.innerHTML = " AIR ";
                                          clicked = false;  
                                          consol.log("Capture stopped");
                                          //mediaRecorder.stop();
                                      }
   });//addeventlistener
  

}//capturelslmedia


function onError(error) {
	consol.error(error);
}

function startResponse(message) {
	setState(I_CAN_STOP);
	consol.log('SDP answer received from server. Processing ...');
}

function stop() {
	consol.log('Stopping ...');
	setState(I_CAN_START);
		webRtcPeer = null;

		var message = {
			id: 'stop'
		}
		sendMessage(message);
}

/*function setState(nextState) {
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
}*/

function sendMessage(message) {
	var jsonMessage = JSON.stringify(message);
	consol.log('Client Senging message: ' + jsonMessage);
	ws.send(jsonMessage);
}
/**
 * Lightbox utility (to display media pipeline image in a modal dialog)
 */
$(document).delegate('*[data-toggle="lightbox"]', 'click', function (event) {
	event.preventDefault();
	$(this).ekkoLightbox();
});


